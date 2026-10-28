import "server-only"

import {
  Prisma,
  ProviderAccountStatus,
  ReconciliationRunStatus,
} from "@prisma/client"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import type {
  ModuleAccessIntent,
  ModuleEntitlementDecision,
} from "@/services/modules/module-control-contracts"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { OperatingAccessScopeDecision } from "@/services/operating-access/operating-access-scope-contracts"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"

import {
  PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE,
  type PaymentReconciliationSignOffCommandAuthority,
  type PaymentReconciliationSignOffCommandCandidate,
  type PaymentReconciliationSignOffCommandStateInput,
  type PaymentReconciliationSignOffCommandStateResult,
} from "./payment-reconciliation-sign-off-command-state-contracts"
import { buildPaymentReconciliationSignOffSourceVersionHash } from "./payment-reconciliation-sign-off-source-version"

const MODULE_SURFACE =
  "services/reconciliation/payment-reconciliation-sign-off-command-state.service.ts"

const STATE_CONTROLS = {
  projectionPurpose: "SOURCE_OWNED_SIGN_OFF_COMMAND_STATE_ONLY",
  sourceOfTruth: "ReconciliationRun",
  tenantWideOnly: true,
  moduleEntitlementEnforced: true,
  makerCheckerRequired: true,
  freshAuthRequired: true,
  minimumAssurance: "L1",
  sourceRevalidatedAtWrite: true,
  clientResolutionAccepted: false,
} as const

const READY_RUN_SELECT = {
  id: true,
  organizationId: true,
  providerAccountId: true,
  businessDate: true,
  periodStart: true,
  periodEnd: true,
  status: true,
  totalInternalAmount: true,
  totalExternalAmount: true,
  matchedAmount: true,
  suspenseAmount: true,
  exceptionCount: true,
  matchCount: true,
  runById: true,
  createdAt: true,
  updatedAt: true,
  providerAccount: {
    select: {
      id: true,
      organizationId: true,
      displayName: true,
      status: true,
      currencyCode: true,
      archivedAt: true,
    },
  },
  runBy: {
    select: {
      id: true,
      organizationId: true,
    },
  },
} satisfies Prisma.ReconciliationRunSelect

type StoredReadyRun = Prisma.ReconciliationRunGetPayload<{
  select: typeof READY_RUN_SELECT
}>

type ResultState = Pick<
  PaymentReconciliationSignOffCommandStateResult,
  "state" | "reason" | "commandAllowed" | "candidate"
>

export async function getPaymentReconciliationSignOffCommandState(
  input: PaymentReconciliationSignOffCommandStateInput,
): Promise<PaymentReconciliationSignOffCommandStateResult> {
  const now = normalizeInput(input)
  const access = await resolveOperatingAccessScope(input.accessContext)
  assertAccessIdentity(access, input)

  if (!access.allowed) {
    return buildResult({
      access,
      now,
      state: "HIDDEN",
      reason: "OPERATING_ACCESS_DENIED",
      commandAllowed: false,
      candidate: null,
    })
  }

  if (
    access.authority.kind !== "TENANT_WIDE" ||
    access.scope.kind !== "TENANT"
  ) {
    return buildResult({
      access,
      now,
      state: "HIDDEN",
      reason: "TENANT_WIDE_REQUIRED",
      commandAllowed: false,
      candidate: null,
    })
  }

  if (
    !hasRbacPermission(
      input.accessContext.permissions,
      PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.readPermission,
    )
  ) {
    return buildResult({
      access,
      now,
      state: "HIDDEN",
      reason: "READ_PERMISSION_REQUIRED",
      commandAllowed: false,
      candidate: null,
    })
  }

  const readDecision = await moduleDecision(input, now, "read")
  if (!readDecision.allowed) {
    return buildResult({
      access,
      now,
      state: "HIDDEN",
      reason: "MODULE_READ_UNAVAILABLE",
      commandAllowed: false,
      candidate: null,
    })
  }

  const hasSignPermission = hasRbacPermission(
    input.accessContext.permissions,
    PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.signPermission,
  )
  const writeDecision = hasSignPermission
    ? await moduleDecision(input, now, "write")
    : null

  const run = await db.reconciliationRun.findFirst({
    where: {
      organizationId: access.organizationId,
      status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
    },
    orderBy: [
      { businessDate: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: READY_RUN_SELECT,
  })

  if (!run) {
    return buildResult({
      access,
      now,
      state: "EMPTY",
      reason: "NO_READY_RUN",
      commandAllowed: false,
      candidate: null,
    })
  }

  const candidate = candidateFromRun(run, access.organizationId, now)
  if (!hasSignPermission) {
    return buildResult({
      access,
      now,
      state: "READ_ONLY",
      reason: "SIGN_PERMISSION_REQUIRED",
      commandAllowed: false,
      candidate,
    })
  }
  if (!writeDecision?.allowed) {
    return buildResult({
      access,
      now,
      state: "READ_ONLY",
      reason: "MODULE_WRITE_UNAVAILABLE",
      commandAllowed: false,
      candidate,
    })
  }
  if (candidate.makerActorId === input.accessContext.userId) {
    return buildResult({
      access,
      now,
      state: "READ_ONLY",
      reason: "MAKER_CHECKER_REQUIRED",
      commandAllowed: false,
      candidate,
    })
  }

  return buildResult({
    access,
    now,
    state: "AVAILABLE",
    reason: null,
    commandAllowed: true,
    candidate,
  })
}

function normalizeInput(input: PaymentReconciliationSignOffCommandStateInput) {
  if (!input.accessContext?.orgId?.trim()) {
    throw new BusinessRuleError(
      "An organization is required for reconciliation sign-off command state.",
    )
  }
  if (!input.accessContext.userId?.trim()) {
    throw new BusinessRuleError(
      "An actor is required for reconciliation sign-off command state.",
    )
  }

  const now =
    input.now === null || input.now === undefined
      ? new Date()
      : new Date(input.now)
  if (Number.isNaN(now.getTime())) {
    throw new BusinessRuleError(
      "Reconciliation sign-off command state now must be a valid date.",
    )
  }
  return now
}

function assertAccessIdentity(
  access: OperatingAccessScopeDecision,
  input: PaymentReconciliationSignOffCommandStateInput,
) {
  if (
    access.organizationId !== input.accessContext.orgId ||
    access.actorId !== input.accessContext.userId
  ) {
    throw inconsistentEvidence()
  }
}

async function moduleDecision(
  input: PaymentReconciliationSignOffCommandStateInput,
  now: Date,
  accessIntent: ModuleAccessIntent,
) {
  const decision = await observeModuleAccess({
    organizationId: input.accessContext.orgId,
    userId: input.accessContext.userId,
    actorPermissions: input.accessContext.permissions,
    moduleSlug: PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.moduleSlug,
    surfaceType: "action",
    surface: MODULE_SURFACE,
    accessIntent,
    mode: "enforce",
    audit: true,
    now,
  })
  assertModuleDecision(decision, input, accessIntent)
  return decision
}

function assertModuleDecision(
  decision: ModuleEntitlementDecision,
  input: PaymentReconciliationSignOffCommandStateInput,
  accessIntent: ModuleAccessIntent,
) {
  if (
    decision.organizationId !== input.accessContext.orgId ||
    decision.userId !== input.accessContext.userId ||
    decision.moduleSlug !==
      PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.moduleSlug ||
    decision.surfaceType !== "action" ||
    decision.surface !== MODULE_SURFACE ||
    decision.accessIntent !== accessIntent ||
    decision.mode !== "enforce" ||
    decision.allowed !== (decision.result === "allow") ||
    decision.allowed === decision.wouldBlock
  ) {
    throw inconsistentEvidence()
  }
}

function candidateFromRun(
  run: StoredReadyRun,
  organizationId: string,
  now: Date,
): PaymentReconciliationSignOffCommandCandidate {
  assertReadyRun(run, organizationId, now)

  const sourceFacts = {
    version: PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.version,
    sourceType: "ReconciliationRun" as const,
    organizationId,
    runId: run.id,
    providerAccountId: run.providerAccountId,
    provider: {
      id: run.providerAccount.id,
      displayName: run.providerAccount.displayName.trim(),
      currencyCode: run.providerAccount.currencyCode,
    },
    businessDate: run.businessDate.toISOString(),
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    status: "READY_FOR_SIGNOFF" as const,
    makerActorId: run.runById!,
    totals: {
      internalAmount: moneyString(run.totalInternalAmount),
      externalAmount: moneyString(run.totalExternalAmount),
      matchedAmount: moneyString(run.matchedAmount),
      suspenseAmount: moneyString(run.suspenseAmount),
    },
    matchCount: run.matchCount,
    exceptionCount: run.exceptionCount,
    updatedAt: run.updatedAt.toISOString(),
  }
  const versionHash =
    buildPaymentReconciliationSignOffSourceVersionHash(sourceFacts)

  return {
    commandId: `payment-reconciliation-sign:${run.id}`,
    actionPath:
      PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.actionPath,
    requiredPermission:
      PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.signPermission,
    source: {
      type: "ReconciliationRun",
      id: run.id,
      status: "READY_FOR_SIGNOFF",
      updatedAt: run.updatedAt.toISOString(),
      versionHash,
    },
    provider: {
      ...sourceFacts.provider,
    },
    businessDate: run.businessDate.toISOString(),
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    makerActorId: run.runById!,
    totals: sourceFacts.totals,
    matchCount: run.matchCount,
    exceptionCount: run.exceptionCount,
  }
}

function assertReadyRun(
  run: StoredReadyRun,
  organizationId: string,
  now: Date,
) {
  if (
    !run.id.trim() ||
    run.organizationId !== organizationId ||
    run.status !== ReconciliationRunStatus.READY_FOR_SIGNOFF ||
    !run.providerAccountId.trim() ||
    run.providerAccount.id !== run.providerAccountId ||
    run.providerAccount.organizationId !== organizationId ||
    run.providerAccount.status !== ProviderAccountStatus.ACTIVE ||
    run.providerAccount.archivedAt !== null ||
    !run.providerAccount.displayName.trim() ||
    !/^[A-Z]{3}$/.test(run.providerAccount.currencyCode) ||
    !run.runById?.trim() ||
    !run.runBy ||
    run.runBy.id !== run.runById ||
    run.runBy.organizationId !== organizationId ||
    !validDate(run.businessDate) ||
    !validDate(run.periodStart) ||
    !validDate(run.periodEnd) ||
    !validDate(run.createdAt) ||
    !validDate(run.updatedAt) ||
    run.periodStart.getTime() >= run.periodEnd.getTime() ||
    run.businessDate.getTime() < run.periodStart.getTime() ||
    run.businessDate.getTime() >= run.periodEnd.getTime() ||
    run.createdAt.getTime() > run.updatedAt.getTime() ||
    run.updatedAt.getTime() > now.getTime() ||
    !validCount(run.matchCount) ||
    !validCount(run.exceptionCount)
  ) {
    throw inconsistentEvidence()
  }

  moneyString(run.totalInternalAmount)
  moneyString(run.totalExternalAmount)
  moneyString(run.matchedAmount)
  moneyString(run.suspenseAmount)
}

function moneyString(value: Prisma.Decimal) {
  const numeric = value.toNumber()
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw inconsistentEvidence()
  }
  return value.toFixed(2)
}

function buildResult(input: {
  access: OperatingAccessScopeDecision
  now: Date
} & ResultState): PaymentReconciliationSignOffCommandStateResult {
  const authority = authoritySummary(input.access)
  const scope =
    input.access.allowed && input.access.scope.kind === "TENANT"
      ? ({ kind: "TENANT" } as const)
      : ({ kind: "NONE" } as const)
  const projectionFacts = {
    version: PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.version,
    kind: PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.kind,
    organizationId: input.access.organizationId,
    actorId: input.access.actorId,
    authority,
    scope,
    state: input.state,
    reason: input.reason,
    commandAllowed: input.commandAllowed,
    candidate: input.candidate,
    controls: STATE_CONTROLS,
  }
  const base = {
    kind: PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.kind,
    version: PAYMENT_RECONCILIATION_SIGN_OFF_COMMAND_STATE.version,
    organizationId: input.access.organizationId,
    actorId: input.access.actorId,
    generatedAt: input.now.toISOString(),
    authority,
    scope,
    controls: STATE_CONTROLS,
    projectionHash: `sha256:${hashBusinessPayload(projectionFacts)}`,
  }

  return {
    ...base,
    state: input.state,
    reason: input.reason,
    commandAllowed: input.commandAllowed,
    candidate: input.candidate,
  } as PaymentReconciliationSignOffCommandStateResult
}

function authoritySummary(
  access: OperatingAccessScopeDecision,
): PaymentReconciliationSignOffCommandAuthority {
  if (!access.allowed) {
    return {
      kind: "DENIED",
      basis: access.authority.basis,
    }
  }
  if (access.authority.kind === "TENANT_WIDE") {
    return {
      kind: "TENANT_WIDE",
      basis: access.authority.basis,
    }
  }
  return {
    kind: "LOCATION_RESPONSIBILITY",
    basis: access.authority.basis,
  }
}

function validDate(value: Date) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

function validCount(value: number) {
  return Number.isInteger(value) && value >= 0
}

function inconsistentEvidence() {
  return new ForbiddenError(
    "Payment reconciliation sign-off command state evidence is inconsistent.",
  )
}
