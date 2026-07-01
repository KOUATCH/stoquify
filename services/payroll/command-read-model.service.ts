import "server-only"

import {
  CloseRunStatus,
  PayrollAttendanceSnapshotStatus,
  PayrollContractStatus,
  PayrollDeclarationStatus,
  PayrollEmployeeStatus,
  PayrollPaymentBatchStatus,
  PayrollPaymentDestinationChangeStatus,
  PayrollPeriodStatus,
  PayrollRubriqueAssignmentStatus,
  PayrollRunStatus,
  PayrollSalaryChangeStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ForbiddenError } from "@/services/_shared/action-errors"
import type { ModuleEntitlementDecision } from "@/services/modules/module-control-contracts"
import { evaluateRedaction, type RedactionDecision } from "@/services/security/redaction-policy.service"
import { getPayrollEmployeeSourceData } from "./employee.service"
import { getPaymentEvidenceReadiness } from "./payment-evidence.service"
import { getPayrollAdapterOperationsReadModel, type PayrollAdapterOperationsReadModel } from "./adapter-operations-read-model.service"
import { getPayrollEmployeeBalanceWorkbenchData } from "./payroll-employee-balance.service"
import { getPayrollWorkbenchData, type PayrollWorkbenchData } from "./payroll-control.service"
import {
  buildPayrollFinalReleaseReadinessPack,
  type PayrollFinalReleaseReadinessPack,
} from "./payroll-final-release-readiness.service"

type DbClient = typeof db | Prisma.TransactionClient
type ReadinessState = "READY" | "ACTION_REQUIRED" | "BLOCKED" | "UNKNOWN"
type BlockerSeverity = "critical" | "high" | "medium"
type NextActionPriority = "critical" | "high" | "normal"
type PilotCertificationStatus =
  | "NOT_EVALUATED"
  | "BLOCKED"
  | "READY_FOR_SIGNOFF"
  | "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW"

type PayrollCommandFinalReleaseEvidence = {
  decision: PayrollFinalReleaseReadinessPack["decision"]
  generatedAt: string
  packHash: string
  blockerCount: number
  criticalBlockerCount: number
  highBlockerCount: number
  gateCount: number
  passGateCount: number
  actionRequiredGateCount: number
  blockedGateCount: number
  missingGateCount: number
  blockerCodes: string[]
  releaseGateRequirementCount: number
  statutorySetup: {
    status: string | null
    evidenceHash: string | null
    blockerCodes: string[]
    families: string | number | boolean | null
    missingReviewEvidenceCount: string | number | boolean | null
    sourceEvidenceHashCount: string | number | boolean | null
    requiredReviewTopicCount: string | number | boolean | null
    requiredReviewTopics: string | number | boolean | null
  } | null
  countryPackReviewIntake: {
    status: string | null
    evidenceHash: string | null
    blockerCodes: string[]
    approvalHash: string | null
    approvedAt: string | null
    certificateHash: string | null
    proposedPackVersion: string | null
    targetFamilyCount: number | null
    targetFamilies: string[]
    freshAuthSatisfied: boolean | null
    approvalEvidenceHashPresent: boolean
  } | null
  gates: Array<{
    key: string
    label: string
    status: string
    blockerCodes: string[]
    evidenceHash: string | null
    source: string
  }>
  redactionPolicy: PayrollFinalReleaseReadinessPack["redaction"]["policy"]
}

export const payrollCommandReadModelInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1).optional().nullable(),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
  limit: z.number().int().positive().max(100).default(25),
  asOf: z.coerce.date().optional(),
  moduleDecision: z.custom<ModuleEntitlementDecision>().optional().nullable(),
})

export type PayrollCommandReadModelInput = z.input<typeof payrollCommandReadModelInputSchema>

export type PayrollCommandBlocker = {
  code: string
  domain: "hr" | "compensation" | "attendance" | "payment" | "payroll" | "posting" | "declaration" | "register" | "close" | "adapter" | "certification"
  severity: BlockerSeverity
  message: string
  source: string
  count?: number
}

export type PayrollCommandNextAction = {
  id: string
  label: string
  priority: NextActionPriority
  requiredPermission: string
  source: string
  blockedBy: string[]
  href: string | null
  allowed: boolean
}

export type PayrollCommandReadiness = {
  state: ReadinessState
  blockerCodes: string[]
  source: string
  counts?: Record<string, number>
  message: string
}

export type PayrollCommandReadModel = {
  organizationId: string
  asOf: string
  currentPeriod: {
    id: string
    name: string
    status: PayrollPeriodStatus
    periodStart: string
    periodEnd: string
    payDate: string
    inputLockedAt: string | null
    countryCode: string
    countryPackVersion: string | null
    countryPackResolutionHash: string | null
    countryPackCapabilityStatus: string | null
    accountingPeriodId: string | null
    selection: "calendar-match" | "latest-period"
  } | null
  roleScope: {
    canReadCommand: boolean
    canReadSalaryAmounts: boolean
    canManageEmployees: boolean
    canManageContracts: boolean
    canManageCompensation: boolean
    canReviewRuns: boolean
    canCalculateRuns: boolean
    canApproveRuns: boolean
    canReleasePayments: boolean
    canPrepareDeclarations: boolean
    canExportPayroll: boolean
    canReadPaymentEvidence: boolean
    canReadAttendanceReadiness: boolean
  }
  redaction: {
    payrollAmounts: Pick<RedactionDecision, "allowed" | "mode" | "reasonCode" | "policy" | "replacement" | "requiredPermissions">
  }
  trustedCounts: {
    activeEmployees: number
    linkedEmployees: number
    unmappedEmployees: number
    activeContracts: number
    activeRubriqueAssignments: number
    frozenAttendanceSnapshots: number
    pendingSalaryChangeRequests: number
    approvedSalaryChangeRequests: number
    pendingPaymentDestinationChanges: number
    approvedPaymentDestinations: number
    missingPaymentDestinations: number
    pendingPaymentDestinations: number
    attendanceReadyEmployees: number
    attendanceDriftEmployees: number
    openPeriods: number
    calculatedRuns: number
    postedRuns: number
    releasedPaymentBatches: number
    openDeclarations: number
    ledgerBlockers: number
    reconciliationExceptions: number
    activeEmployeeBalanceCases: number
    openEmployeeBalanceCases: number
    partiallySettledEmployeeBalanceCases: number
    currentPeriodRuns: number
    currentPeriodPaymentBatches: number
    currentPeriodDeclarations: number
  }
  readiness: Record<"employees" | "contracts" | "compensation" | "attendance" | "paymentDestinations" | "employeeBalances" | "payrollRun" | "payrollRegister" | "payments" | "declarations" | "posting" | "close" | "adapterOperations" | "pilotCertification" | "finalRelease", PayrollCommandReadiness>
  blockers: PayrollCommandBlocker[]
  nextActions: PayrollCommandNextAction[]
  adapterOperations: Pick<PayrollAdapterOperationsReadModel, "summary" | "providerHealth" | "authorityExecutions" | "paymentAdapterGaps" | "adapterChaosGate" | "redaction">
  evidence: {
    latestRun: {
      id: string
      runNumber: string
      status: PayrollRunStatus
      documentHash: string | null
      evidenceHash: string | null
      calculationHash: string
      attendanceSnapshotHash: string
      countryPackResolutionHash: string
      ledgerPostingBatchId: string | null
      postedBusinessEventId: string | null
      payslipCount: number
      lineCount: number
      paymentBatchCount: number
      declarationCount: number
      updatedAt: string
    } | null
    latestPaymentBatch: {
      id: string
      batchNumber: string
      status: PayrollPaymentBatchStatus
      documentHash: string | null
      evidenceHash: string | null
      bankFileHash: string | null
      ledgerPostingBatchId: string | null
      postedBusinessEventId: string | null
      reconciliationStatus: string | null
      updatedAt: string
    } | null
    latestDeclaration: {
      id: string
      authority: string
      declarationType: string
      status: PayrollDeclarationStatus
      payloadHash: string | null
      countryPackResolutionHash: string
      dueDate: string | null
      updatedAt: string
    } | null
    closeRun: {
      id: string
      status: CloseRunStatus
      readinessScore: number
      criticalBlockerCount: number
      highBlockerCount: number
      evidenceCoveragePct: string | null
      asOf: string
    } | null
    pilotCertification: {
      status: PilotCertificationStatus
      auditLogId: string | null
      certificateHash: string | null
      generatedAt: string | null
      evaluatedAt: string | null
      blockerCount: number
      blockerCodes: string[]
      missingSignoffRoles: string[]
      releaseGateCount: number
      redactionPolicy: string | null
    }
    pilotCertificationInput: {
      payrollRunId: string | null
      runNumber: string | null
      expectedSourceRegisterHash: string | null
      expectedAdapterChaosReleaseGateHash: string | null
      expectedProofBackfillCertificateHash: string | null
      proofBackfillStatus: string | null
      proofBackfillAuditLogId: string | null
      inputComplete: boolean
      missingInputs: string[]
    }
    finalRelease: PayrollCommandFinalReleaseEvidence
  }
  freshness: Array<{ source: string; asOf: string | null; status: "fresh" | "stale" | "unknown"; ageHours: number | null }>
  sourceScope: {
    limit: number
    employeeSourceReturned: number
    paymentEvidenceReturned: number
    employeeBalanceReturned: number
    employeeCoverageComplete: boolean
    paymentEvidenceCoverageComplete: boolean
    employeeBalanceCoverageComplete: boolean
    sourceServices: string[]
  }
  workbench: PayrollWorkbenchData
}

const COMMAND_READ_PERMISSIONS = ["payroll.command.read"] as const
const ACTIVE_CONTRACT_WHERE = {
  deletedAt: null,
  status: PayrollContractStatus.ACTIVE,
} as const

function assertCommandReadAllowed(input: z.output<typeof payrollCommandReadModelInputSchema>) {
  if (input.moduleDecision && !input.moduleDecision.allowed) {
    throw new ForbiddenError("Payroll module is not available for this tenant.")
  }

  if (!hasAnyRbacPermission(input.actorPermissions, COMMAND_READ_PERMISSIONS)) {
    throw new ForbiddenError("Missing permission for payroll command read model.")
  }
}

function can(actorPermissions: readonly string[], requiredPermissions: readonly string[]) {
  return hasAnyRbacPermission(actorPermissions, requiredPermissions)
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function decimalString(value: Prisma.Decimal | null | undefined) {
  return value ? value.toString() : null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function metadataString(value: unknown, key: string) {
  const entry = asRecord(value)[key]
  return typeof entry === "string" && entry.trim().length > 0 ? entry.trim() : null
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : []
}

function pilotStatus(value: string | null): PilotCertificationStatus {
  return value === "BLOCKED" || value === "READY_FOR_SIGNOFF" || value === "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW" ? value : "NOT_EVALUATED"
}

function proofBackfillAuditPayload(
  audit: { id: string; createdAt: Date; changes: Prisma.JsonValue | null } | null,
) {
  if (!audit) {
    return {
      auditLogId: null,
      status: null,
      certificateHash: null,
      adapterChaosReleaseGateHash: null,
    }
  }

  const changes = asRecord(audit.changes)
  const after = asRecord(changes.after)
  const payload = Object.keys(after).length ? after : changes
  const sourceCertificate = asRecord(payload.sourceCertificate)

  return {
    auditLogId: audit.id,
    status: metadataString(payload, "status"),
    certificateHash: metadataString(payload, "certificateHash"),
    adapterChaosReleaseGateHash: metadataString(
      sourceCertificate,
      "adapterChaosReleaseGateHash",
    ),
  }
}

function selectedAdapterChaosHash(input: {
  proofBackfillHash: string | null
  latestAuthorityHash: string | null
  latestProviderHash: string | null
}) {
  if (input.proofBackfillHash) return input.proofBackfillHash
  if (
    input.latestAuthorityHash &&
    input.latestProviderHash &&
    input.latestAuthorityHash === input.latestProviderHash
  ) {
    return input.latestAuthorityHash
  }
  return input.latestAuthorityHash ?? input.latestProviderHash ?? null
}

function pilotCertificationInputEvidence(input: {
  latestRun: { id: string; runNumber: string; evidenceHash: string | null } | null
  proofBackfillAudit: { id: string; createdAt: Date; changes: Prisma.JsonValue | null } | null
  adapterChaosGate: PayrollAdapterOperationsReadModel["adapterChaosGate"]
}) {
  const proofBackfill = proofBackfillAuditPayload(input.proofBackfillAudit)
  const expectedAdapterChaosReleaseGateHash = selectedAdapterChaosHash({
    proofBackfillHash: proofBackfill.adapterChaosReleaseGateHash,
    latestAuthorityHash: input.adapterChaosGate.latestAuthorityProofHash,
    latestProviderHash: input.adapterChaosGate.latestProviderProofHash,
  })
  const missingInputs = [
    [!input.latestRun?.id, "payrollRunId"],
    [!input.latestRun?.evidenceHash, "expectedSourceRegisterHash"],
    [!expectedAdapterChaosReleaseGateHash, "expectedAdapterChaosReleaseGateHash"],
    [!proofBackfill.certificateHash, "expectedProofBackfillCertificateHash"],
  ]
    .filter(([missing]) => Boolean(missing))
    .map(([, key]) => String(key))

  return {
    payrollRunId: input.latestRun?.id ?? null,
    runNumber: input.latestRun?.runNumber ?? null,
    expectedSourceRegisterHash: input.latestRun?.evidenceHash ?? null,
    expectedAdapterChaosReleaseGateHash,
    expectedProofBackfillCertificateHash: proofBackfill.certificateHash,
    proofBackfillStatus: proofBackfill.status,
    proofBackfillAuditLogId: proofBackfill.auditLogId,
    inputComplete: missingInputs.length === 0,
    missingInputs,
  }
}
function valueFromSummary(
  summary: Record<string, string | number | boolean | null>,
  key: string,
) {
  return Object.prototype.hasOwnProperty.call(summary, key) ? summary[key] : null
}

function finalReleaseEvidence(
  pack: PayrollFinalReleaseReadinessPack,
): PayrollCommandFinalReleaseEvidence {
  const statutoryGate = pack.gates.find((gate) => gate.key === "statutory_setup") ?? null
  const countryPackGate = pack.gates.find((gate) => gate.key === "country_pack_review_intake") ?? null
  const statutorySummary: Record<string, string | number | boolean | null> =
    statutoryGate?.summary ?? {}
  const countryPackReview = pack.evidence.countryPackReviewIntake

  return {
    decision: pack.decision,
    generatedAt: pack.generatedAt,
    packHash: pack.packHash,
    blockerCount: pack.blockers.length,
    criticalBlockerCount: pack.blockers.filter((blocker) => blocker.severity === "critical").length,
    highBlockerCount: pack.blockers.filter((blocker) => blocker.severity === "high").length,
    gateCount: pack.gates.length,
    passGateCount: pack.gates.filter((gate) => gate.status === "PASS").length,
    actionRequiredGateCount: pack.gates.filter((gate) => gate.status === "ACTION_REQUIRED").length,
    blockedGateCount: pack.gates.filter((gate) => gate.status === "BLOCKED").length,
    missingGateCount: pack.gates.filter((gate) => gate.status === "MISSING").length,
    blockerCodes: pack.blockers.map((blocker) => blocker.code),
    releaseGateRequirementCount: pack.releaseGateRequirements.length,
    statutorySetup: statutoryGate
      ? {
          status: metadataString(statutorySummary, "statutoryScenarioCoverageStatus"),
          evidenceHash: statutoryGate.evidenceHash,
          blockerCodes: statutoryGate.blockerCodes,
          families: valueFromSummary(statutorySummary, "statutoryScenarioFamilies"),
          missingReviewEvidenceCount: valueFromSummary(statutorySummary, "missingReviewEvidenceCount"),
          sourceEvidenceHashCount: valueFromSummary(statutorySummary, "sourceEvidenceHashCount"),
          requiredReviewTopicCount: valueFromSummary(statutorySummary, "requiredReviewTopicCount"),
          requiredReviewTopics: valueFromSummary(statutorySummary, "requiredReviewTopics"),
        }
      : null,
    countryPackReviewIntake: countryPackGate
      ? {
          status: countryPackReview.status,
          evidenceHash: countryPackGate.evidenceHash,
          blockerCodes: countryPackGate.blockerCodes,
          approvalHash: countryPackReview.approvalHash,
          approvedAt: countryPackReview.approvedAt,
          certificateHash: countryPackReview.certificateHash,
          proposedPackVersion: countryPackReview.proposedPackVersion,
          targetFamilyCount: countryPackReview.targetFamilyCount,
          targetFamilies: countryPackReview.targetFamilies,
          freshAuthSatisfied: countryPackReview.freshAuthSatisfied,
          approvalEvidenceHashPresent: countryPackReview.approvalEvidenceHashPresent,
        }
      : null,
    gates: pack.gates.map((gate) => ({
      key: gate.key,
      label: gate.label,
      status: gate.status,
      blockerCodes: gate.blockerCodes,
      evidenceHash: gate.evidenceHash,
      source: gate.source,
    })),
    redactionPolicy: pack.redaction.policy,
  }
}

function pilotCertificationEvidence(
  audit: { id: string; createdAt: Date; changes: Prisma.JsonValue | null } | null,
  latestRunId: string | null,
) {
  if (!latestRunId || !audit) {
    return {
      status: "NOT_EVALUATED" as const,
      auditLogId: null,
      certificateHash: null,
      generatedAt: null,
      evaluatedAt: null,
      blockerCount: 0,
      blockerCodes: [],
      missingSignoffRoles: [],
      releaseGateCount: 0,
      redactionPolicy: null,
    }
  }

  const changes = asRecord(audit.changes)
  const signoff = asRecord(changes.signoff)
  const redaction = asRecord(changes.redaction)
  const blockers = Array.isArray(changes.blockers) ? changes.blockers : []
  const releaseGateRequirements = Array.isArray(changes.releaseGateRequirements) ? changes.releaseGateRequirements : []

  return {
    status: pilotStatus(metadataString(changes, "status")),
    auditLogId: audit.id,
    certificateHash: metadataString(changes, "certificateHash"),
    generatedAt: metadataString(changes, "generatedAt"),
    evaluatedAt: audit.createdAt.toISOString(),
    blockerCount: blockers.length,
    blockerCodes: blockers.map((blocker) => metadataString(blocker, "code")).filter((code): code is string => Boolean(code)),
    missingSignoffRoles: stringArray(signoff.missingRoles),
    releaseGateCount: releaseGateRequirements.length,
    redactionPolicy: metadataString(redaction, "policy"),
  }
}

function toFreshness(source: string, value: string | Date | null | undefined, asOf: Date) {
  if (!value) return { source, asOf: null, status: "unknown" as const, ageHours: null }
  const date = typeof value === "string" ? new Date(value) : value
  const ageHours = Math.max(0, Math.round(((asOf.getTime() - date.getTime()) / 3_600_000) * 10) / 10)
  return {
    source,
    asOf: date.toISOString(),
    status: ageHours <= 24 ? "fresh" as const : "stale" as const,
    ageHours,
  }
}

function readiness(
  state: ReadinessState,
  source: string,
  message: string,
  blockerCodes: string[] = [],
  counts?: Record<string, number>,
): PayrollCommandReadiness {
  return { state, source, message, blockerCodes, ...(counts ? { counts } : {}) }
}

async function findCurrentPeriod(client: DbClient, organizationId: string, asOf: Date) {
  const current = await client.payrollPeriod.findFirst({
    where: {
      organizationId,
      periodStart: { lte: asOf },
      periodEnd: { gte: asOf },
    },
    orderBy: { periodStart: "desc" },
  })

  if (current) return { period: current, selection: "calendar-match" as const }

  const latest = await client.payrollPeriod.findFirst({
    where: { organizationId },
    orderBy: { periodStart: "desc" },
  })

  return latest ? { period: latest, selection: "latest-period" as const } : { period: null, selection: "latest-period" as const }
}

function addBlocker(blockers: PayrollCommandBlocker[], blocker: PayrollCommandBlocker) {
  blockers.push(blocker)
}

function routeForNextAction(source: string) {
  const routesBySource: Record<string, string> = {
    "accounting.close_assurance": "/dashboard/accounting/close",
    "payroll.attendance_readiness": "/dashboard/payroll/attendance",
    "payroll.compensation": "/dashboard/payroll/compensation",
    "payroll.contracts": "/dashboard/payroll/contracts",
    "payroll.employee_source": "/dashboard/payroll/employees",
    "payroll.ledger_posting": "/dashboard/accounting/control-center",
    "payroll.payment_destination": "/dashboard/payroll/attendance",
    "payroll.employee_balance": "/dashboard/payroll/payments",
    "payroll.adapter_operations": "/dashboard/payroll/payments",
    "payroll.payment_reconciliation": "/dashboard/finance/reconciliation",
    "payroll.payments": "/dashboard/finance/payments",
    "payroll.periods": "/dashboard/payroll/setup",
  }

  return routesBySource[source] ?? null
}

function addAction(
  actions: PayrollCommandNextAction[],
  actorPermissions: readonly string[],
  action: Omit<PayrollCommandNextAction, "href" | "allowed"> & { href?: string | null },
) {
  actions.push({
    ...action,
    href: action.href ?? routeForNextAction(action.source),
    allowed: can(actorPermissions, [action.requiredPermission]),
  })
}

async function writeCommandReadAudit(
  client: DbClient,
  input: {
    organizationId: string
    actorId?: string | null
    amountDecision: RedactionDecision
    blockerCount: number
    nextActionCount: number
    trustedCounts: PayrollCommandReadModel["trustedCounts"]
  },
) {
  await client.auditLog.create({
    data: {
      entityType: "PayrollCommandReadModel",
      entityId: input.organizationId,
      action: "PAYROLL_COMMAND_READ_MODEL_READ",
      userId: input.actorId ?? null,
      organizationId: input.organizationId,
      changes: safeJson({
        amountAccess: {
          allowed: input.amountDecision.allowed,
          mode: input.amountDecision.mode,
          reasonCode: input.amountDecision.reasonCode,
          policy: input.amountDecision.policy,
          requiredPermissions: input.amountDecision.requiredPermissions,
        },
        blockerCount: input.blockerCount,
        nextActionCount: input.nextActionCount,
        trustedCounts: input.trustedCounts,
      }),
    },
  })
}

export async function getPayrollCommandReadModel(
  input: PayrollCommandReadModelInput,
  client: DbClient = db,
): Promise<PayrollCommandReadModel> {
  const parsed = payrollCommandReadModelInputSchema.parse(input)
  assertCommandReadAllowed(parsed)

  const asOf = parsed.asOf ?? new Date()
  const periodSelection = await findCurrentPeriod(client, parsed.organizationId, asOf)
  const currentPeriod = periodSelection.period

  const amountDecision = evaluateRedaction({
    field: "PayrollCommandReadModel.payrollAmounts",
    category: "payroll_person_amount",
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
  })

  const [
    workbench,
    employeeSourceData,
    paymentEvidence,
    employeeBalanceWorkbench,
    adapterOperations,
    activeEmployees,
    linkedEmployees,
    activeContracts,
    activeRubriqueAssignments,
    pendingSalaryChangeRequests,
    approvedSalaryChangeRequests,
    pendingPaymentDestinationChanges,
  ] = await Promise.all([
    getPayrollWorkbenchData({
      organizationId: parsed.organizationId,
      limit: parsed.limit,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      moduleDecision: parsed.moduleDecision ?? null,
    }, client),
    getPayrollEmployeeSourceData({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      limit: parsed.limit,
      asOf,
      moduleDecision: parsed.moduleDecision ?? null,
    }, client),
    getPaymentEvidenceReadiness({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId ?? undefined,
      actorPermissions: parsed.actorPermissions,
      limit: parsed.limit,
      ...(currentPeriod ? { periodStart: currentPeriod.periodStart, periodEnd: currentPeriod.periodEnd } : {}),
    }, client),
    getPayrollEmployeeBalanceWorkbenchData({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      limit: parsed.limit,
      asOf,
      moduleDecision: parsed.moduleDecision ?? null,
    }, client),
    getPayrollAdapterOperationsReadModel({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorPermissions: parsed.actorPermissions,
      limit: parsed.limit,
      asOf,
      moduleDecision: parsed.moduleDecision ?? null,
    }, client),
    client.payrollEmployee.count({
      where: { organizationId: parsed.organizationId, deletedAt: null, status: PayrollEmployeeStatus.ACTIVE },
    }),
    client.payrollEmployee.count({
      where: { organizationId: parsed.organizationId, deletedAt: null, status: PayrollEmployeeStatus.ACTIVE, userId: { not: null } },
    }),
    client.payrollContract.count({
      where: {
        organizationId: parsed.organizationId,
        ...ACTIVE_CONTRACT_WHERE,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      },
    }),
    client.payrollEmployeeRubriqueAssignment.count({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        status: PayrollRubriqueAssignmentStatus.ACTIVE,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      },
    }),
    client.payrollSalaryChangeRequest.count({
      where: { organizationId: parsed.organizationId, deletedAt: null, status: PayrollSalaryChangeStatus.REQUESTED },
    }),
    client.payrollSalaryChangeRequest.count({
      where: { organizationId: parsed.organizationId, deletedAt: null, status: PayrollSalaryChangeStatus.APPROVED },
    }),
    client.payrollPaymentDestinationChangeRequest.count({
      where: {
        organizationId: parsed.organizationId,
        deletedAt: null,
        status: { in: [PayrollPaymentDestinationChangeStatus.REQUESTED, PayrollPaymentDestinationChangeStatus.APPROVED] },
      },
    }),
  ])

  const currentRuns = currentPeriod
    ? await client.payrollRun.findMany({
        where: { organizationId: parsed.organizationId, deletedAt: null, payrollPeriodId: currentPeriod.id },
        include: { _count: { select: { lines: true, payslips: true, paymentBatches: true, declarations: true } } },
        orderBy: [{ createdAt: "desc" }],
        take: parsed.limit,
      })
    : []
  const currentRunIds = currentRuns.map((run) => run.id)
  const [currentPaymentBatches, currentDeclarations, closeRun, frozenAttendanceSnapshots] = await Promise.all([
    currentRunIds.length
      ? client.payrollPaymentBatch.findMany({
          where: { organizationId: parsed.organizationId, payrollRunId: { in: currentRunIds } },
          orderBy: [{ createdAt: "desc" }],
          take: parsed.limit,
        })
      : Promise.resolve([]),
    currentRunIds.length
      ? client.payrollDeclaration.findMany({
          where: { organizationId: parsed.organizationId, payrollRunId: { in: currentRunIds } },
          orderBy: [{ createdAt: "desc" }],
          take: parsed.limit,
        })
      : Promise.resolve([]),
    currentPeriod?.accountingPeriodId
      ? client.closeRun.findFirst({
          where: { organizationId: parsed.organizationId, periodId: currentPeriod.accountingPeriodId, voidedAt: null },
          orderBy: [{ createdAt: "desc" }],
        })
      : Promise.resolve(null),
    currentPeriod
      ? client.payrollAttendanceSnapshot.count({
          where: {
            organizationId: parsed.organizationId,
            status: PayrollAttendanceSnapshotStatus.FROZEN,
            periodStart: currentPeriod.periodStart,
            periodEnd: currentPeriod.periodEnd,
          },
        })
      : Promise.resolve(0),
  ])

  const latestRun = currentRuns[0] ?? null
  const latestPaymentBatch = currentPaymentBatches[0] ?? null
  const latestDeclaration = currentDeclarations[0] ?? null
  const [latestPilotCertificationAudit, latestProofBackfillAudit] = await Promise.all([
    latestRun
      ? client.auditLog.findFirst({
          where: {
            organizationId: parsed.organizationId,
            entityType: "PayrollPilotCycleCertification",
            entityId: latestRun.id,
            action: "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED",
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true, changes: true },
        })
      : Promise.resolve(null),
    client.auditLog.findFirst({
      where: {
        organizationId: parsed.organizationId,
        entityType: "PayrollProofBackfillReconciliationCertificate",
        action: "PAYROLL_PROOF_BACKFILL_RECONCILIATION_CERTIFICATE_RECORDED",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, changes: true },
    }),
  ])
  const pilotCertification = pilotCertificationEvidence(latestPilotCertificationAudit, latestRun?.id ?? null)
  const finalReleasePack = await buildPayrollFinalReleaseReadinessPack({
    organizationId: parsed.organizationId,
    payrollRunId: latestRun?.id ?? null,
    actorId: parsed.actorId,
    actorPermissions: parsed.actorPermissions,
    moduleDecision: parsed.moduleDecision ?? null,
    now: asOf,
    persistPack: false,
  }, client)
  const finalRelease = finalReleaseEvidence(finalReleasePack)
  const pilotCertificationInput = pilotCertificationInputEvidence({
    latestRun: latestRun
      ? {
          id: latestRun.id,
          runNumber: latestRun.runNumber,
          evidenceHash: latestRun.evidenceHash,
        }
      : null,
    proofBackfillAudit: latestProofBackfillAudit,
    adapterChaosGate: adapterOperations.adapterChaosGate,
  })
  const blockers: PayrollCommandBlocker[] = []
  const nextActions: PayrollCommandNextAction[] = []
  const unmappedEmployees = Math.max(activeEmployees - linkedEmployees, 0)
  const contractGap = Math.max(activeEmployees - activeContracts, 0)
  const attendanceGap = Math.max(activeEmployees - frozenAttendanceSnapshots, 0)
  const paymentMissing = paymentEvidence.summary.missingPaymentDestinationCount
  const paymentPending = paymentEvidence.summary.pendingPaymentDestinationCount

  if (activeEmployees === 0) {
    addBlocker(blockers, { code: "PAYROLL_ACTIVE_EMPLOYEE_SOURCE_EMPTY", domain: "hr", severity: "critical", message: "No active payroll employees are available for the command center.", source: "services/payroll/employee.service.ts" })
  }
  if (unmappedEmployees > 0) {
    addBlocker(blockers, { code: "PAYROLL_EMPLOYEE_USER_MAPPING_GAP", domain: "hr", severity: "high", message: "Some active payroll employees are not mapped to users.", source: "services/payroll/employee.service.ts", count: unmappedEmployees })
    addAction(nextActions, parsed.actorPermissions, { id: "map-payroll-employees", label: "Resolve payroll employee user mappings", priority: "high", requiredPermission: "payroll.employees.manage", source: "payroll.employee_source", blockedBy: ["PAYROLL_EMPLOYEE_USER_MAPPING_GAP"] })
  }
  if (contractGap > 0) {
    addBlocker(blockers, { code: "PAYROLL_ACTIVE_CONTRACT_GAP", domain: "hr", severity: "high", message: "Some active payroll employees do not have an active contract for the command period.", source: "services/payroll/contract.service.ts", count: contractGap })
    addAction(nextActions, parsed.actorPermissions, { id: "activate-payroll-contracts", label: "Activate missing payroll contracts", priority: "high", requiredPermission: "payroll.contracts.manage", source: "payroll.contracts", blockedBy: ["PAYROLL_ACTIVE_CONTRACT_GAP"] })
  }
  if (pendingSalaryChangeRequests + approvedSalaryChangeRequests > 0) {
    addBlocker(blockers, { code: "PAYROLL_SALARY_CHANGE_QUEUE_OPEN", domain: "compensation", severity: "medium", message: "Salary change requests are still awaiting decision or application.", source: "services/payroll/compensation.service.ts", count: pendingSalaryChangeRequests + approvedSalaryChangeRequests })
    addAction(nextActions, parsed.actorPermissions, { id: "clear-salary-change-queue", label: "Clear pending salary change approvals", priority: "normal", requiredPermission: "payroll.salary_changes.approve", source: "payroll.compensation", blockedBy: ["PAYROLL_SALARY_CHANGE_QUEUE_OPEN"] })
  }
  if (!currentPeriod) {
    addBlocker(blockers, { code: "PAYROLL_PERIOD_MISSING", domain: "payroll", severity: "critical", message: "No payroll period exists for command-center planning.", source: "services/payroll/payroll-control.service.ts" })
    addAction(nextActions, parsed.actorPermissions, { id: "create-payroll-period", label: "Create the payroll period before running payroll", priority: "critical", requiredPermission: "payroll.runs.calculate", source: "payroll.periods", blockedBy: ["PAYROLL_PERIOD_MISSING"] })
  }
  if (attendanceGap > 0) {
    addBlocker(blockers, { code: "PAYROLL_ATTENDANCE_FREEZE_GAP", domain: "attendance", severity: "high", message: "Some active payroll employees do not have a frozen attendance snapshot for the command period.", source: "services/payroll/payment-evidence.service.ts", count: attendanceGap })
    addAction(nextActions, parsed.actorPermissions, { id: "freeze-attendance-snapshots", label: "Freeze attendance snapshots for payroll", priority: "high", requiredPermission: "payroll.attendance.freeze", source: "payroll.attendance_readiness", blockedBy: ["PAYROLL_ATTENDANCE_FREEZE_GAP"] })
  }
  if (paymentMissing + paymentPending + pendingPaymentDestinationChanges > 0) {
    addBlocker(blockers, { code: "PAYROLL_PAYMENT_DESTINATION_EVIDENCE_GAP", domain: "payment", severity: "high", message: "Payroll payment destination approval evidence is incomplete.", source: "services/payroll/payment-evidence.service.ts", count: paymentMissing + paymentPending + pendingPaymentDestinationChanges })
    addAction(nextActions, parsed.actorPermissions, { id: "clear-payment-destination-evidence", label: "Approve or apply payroll payment destination evidence", priority: "high", requiredPermission: "payroll.payment_destination.approve", source: "payroll.payment_destination", blockedBy: ["PAYROLL_PAYMENT_DESTINATION_EVIDENCE_GAP"] })
  }
  if (!latestRun && currentPeriod) {
    addAction(nextActions, parsed.actorPermissions, {
      id: "calculate-current-payroll-run",
      label: "Calculate the current payroll run",
      priority: "high",
      requiredPermission: "payroll.runs.calculate",
      source: "payroll.runs",
      blockedBy: blockers.filter((blocker) => ["hr", "attendance", "payment"].includes(blocker.domain)).map((blocker) => blocker.code),
    })
  }
  if (workbench.counts.ledgerBlockers > 0) {
    addBlocker(blockers, { code: "PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN", domain: "posting", severity: "critical", message: "Payroll posting blockers remain open in the ledger posting gateway.", source: "services/payroll/payroll-control.service.ts", count: workbench.counts.ledgerBlockers })
    addAction(nextActions, parsed.actorPermissions, { id: "clear-payroll-ledger-blockers", label: "Clear payroll ledger posting blockers", priority: "critical", requiredPermission: "accounting.posting-rules.manage", source: "payroll.ledger_posting", blockedBy: ["PAYROLL_LEDGER_POSTING_BLOCKERS_OPEN"] })
  }
  if (workbench.counts.reconciliationExceptions > 0) {
    addBlocker(blockers, { code: "PAYROLL_PAYMENT_RECON_EXCEPTIONS_OPEN", domain: "payment", severity: "high", message: "Payroll payment reconciliation exceptions remain open.", source: "services/payroll/payroll-control.service.ts", count: workbench.counts.reconciliationExceptions })
    addAction(nextActions, parsed.actorPermissions, { id: "resolve-payroll-payment-exceptions", label: "Resolve payroll payment reconciliation exceptions", priority: "high", requiredPermission: "payments.reconciliation.exception.resolve", source: "payroll.payment_reconciliation", blockedBy: ["PAYROLL_PAYMENT_RECON_EXCEPTIONS_OPEN"] })
  }
  if (employeeBalanceWorkbench.summary.activeCases > 0) {
    addBlocker(blockers, { code: "PAYROLL_EMPLOYEE_BALANCE_CASES_OPEN", domain: "payment", severity: "high", message: "Employee receivable recovery cases are open and need settlement or review before payroll close/payment certification.", source: "services/payroll/payroll-employee-balance.service.ts", count: employeeBalanceWorkbench.summary.activeCases })
    addAction(nextActions, parsed.actorPermissions, { id: "settle-employee-balance-cases", label: "Review employee balance recovery cases", priority: "high", requiredPermission: "payroll.payments.reconcile", source: "payroll.employee_balance", blockedBy: ["PAYROLL_EMPLOYEE_BALANCE_CASES_OPEN"] })
  }
  if (adapterOperations.summary.providerBlocked > 0) {
    addBlocker(blockers, { code: "PAYROLL_PROVIDER_OPERATIONS_BLOCKED", domain: "adapter", severity: "critical", message: "Payroll provider operations have blocked accounts, dead-letter evidence, replay/tamper signals, or unresolved provider incidents.", source: "services/payroll/adapter-operations-read-model.service.ts", count: adapterOperations.summary.providerBlocked })
  }
  if (adapterOperations.summary.authorityDeadLetter > 0) {
    addBlocker(blockers, { code: "PAYROLL_AUTHORITY_ADAPTER_DEAD_LETTER", domain: "adapter", severity: "critical", message: "Payroll authority adapter executions are dead-lettered and require replay or manual evidence triage.", source: "services/payroll/adapter-operations-read-model.service.ts", count: adapterOperations.summary.authorityDeadLetter })
  }
  if (adapterOperations.summary.authorityHarnessGaps + adapterOperations.summary.paymentAdapterGaps > 0) {
    addBlocker(blockers, { code: "PAYROLL_ADAPTER_CERTIFICATION_GAPS", domain: "adapter", severity: "high", message: "Payroll authority or payment automation is missing adapter certification harness proof.", source: "services/payroll/adapter-operations-read-model.service.ts", count: adapterOperations.summary.authorityHarnessGaps + adapterOperations.summary.paymentAdapterGaps })
  }
  if (adapterOperations.summary.adapterChaosGateBlockers > 0) {
    addBlocker(blockers, { code: "PAYROLL_ADAPTER_CHAOS_GATE_MISSING", domain: "adapter", severity: "high", message: "Payroll authority or payment automation claims are missing certified adapter chaos release gate proof.", source: "services/payroll/payroll-adapter-chaos-release-gate.service.ts", count: adapterOperations.summary.adapterChaosGateBlockers })
  }
  if (adapterOperations.summary.providerBlocked + adapterOperations.summary.authorityDeadLetter + adapterOperations.summary.authorityHarnessGaps + adapterOperations.summary.paymentAdapterGaps + adapterOperations.summary.adapterChaosGateBlockers > 0) {
    addAction(nextActions, parsed.actorPermissions, { id: "review-payroll-adapter-operations", label: "Review payroll adapter operations", priority: "critical", requiredPermission: "payroll.payments.reconcile", source: "payroll.adapter_operations", blockedBy: ["PAYROLL_PROVIDER_OPERATIONS_BLOCKED", "PAYROLL_AUTHORITY_ADAPTER_DEAD_LETTER", "PAYROLL_ADAPTER_CERTIFICATION_GAPS", "PAYROLL_ADAPTER_CHAOS_GATE_MISSING"].filter((code) => blockers.some((blocker) => blocker.code === code)) })
  }
  if (latestRun && latestRun._count.lines === 0) {
    addBlocker(blockers, { code: "PAYROLL_REGISTER_EMPTY", domain: "register", severity: "critical", message: "The latest current-period payroll run has no register lines.", source: "services/payroll/payroll-control.service.ts", count: 0 })
  }
  if (latestRun && latestRun._count.declarations === 0) {
    addAction(nextActions, parsed.actorPermissions, { id: "prepare-payroll-declarations", label: "Prepare payroll declarations from the posted run", priority: "normal", requiredPermission: "payroll.declarations.prepare", source: "payroll.declarations", blockedBy: latestRun.status === PayrollRunStatus.POSTED ? [] : ["PAYROLL_RUN_NOT_POSTED"] })
  }
  if (latestDeclaration?.status === PayrollDeclarationStatus.REJECTED || latestDeclaration?.status === PayrollDeclarationStatus.PAYMENT_DUE) {
    addBlocker(blockers, { code: "PAYROLL_DECLARATION_ACTION_REQUIRED", domain: "declaration", severity: "high", message: "The latest current-period declaration still requires statutory follow-up.", source: "services/payroll/payroll-control.service.ts", count: 1 })
  }
  if (closeRun && closeRun.criticalBlockerCount > 0) {
    addBlocker(blockers, { code: "PAYROLL_CLOSE_CRITICAL_BLOCKERS_OPEN", domain: "close", severity: "critical", message: "Close assurance has critical blockers for the accounting period linked to payroll.", source: "services/accounting/close-assurance-pack.service.ts", count: closeRun.criticalBlockerCount })
  }
  if (latestRun && pilotCertification.status === "NOT_EVALUATED") {
    addBlocker(blockers, { code: "PAYROLL_PILOT_CYCLE_CERTIFICATE_MISSING", domain: "certification", severity: "medium", message: "The latest payroll run has no controlled pilot-cycle certification audit evidence yet.", source: "services/payroll/payroll-pilot-cycle-certification.service.ts", count: 1 })
  }
  if (pilotCertification.status === "BLOCKED") {
    addBlocker(blockers, { code: "PAYROLL_PILOT_CYCLE_CERTIFICATION_BLOCKED", domain: "certification", severity: "high", message: "The latest controlled pilot-cycle certificate is blocked by unresolved evidence gaps.", source: "services/payroll/payroll-pilot-cycle-certification.service.ts", count: pilotCertification.blockerCount })
  }
  if (pilotCertification.status === "READY_FOR_SIGNOFF") {
    addBlocker(blockers, { code: "PAYROLL_PILOT_CYCLE_SIGNOFF_REQUIRED", domain: "certification", severity: "medium", message: "The latest controlled pilot-cycle certificate is evidence-clean but still needs required signoffs.", source: "services/payroll/payroll-pilot-cycle-certification.service.ts", count: pilotCertification.missingSignoffRoles.length })
  }
  if (finalRelease.decision !== "READY_FOR_FULL_PRODUCTION_APPROVAL") {
    addBlocker(blockers, {
      code: "PAYROLL_FINAL_RELEASE_READINESS_BLOCKED",
      domain: "certification",
      severity: finalRelease.criticalBlockerCount > 0 ? "critical" : "high",
      message: "Final HR/payroll production release readiness still has open evidence blockers.",
      source: "services/payroll/payroll-final-release-readiness.service.ts",
      count: finalRelease.blockerCount,
    })
  }

  const trustedCounts: PayrollCommandReadModel["trustedCounts"] = {
    activeEmployees,
    linkedEmployees,
    unmappedEmployees,
    activeContracts,
    activeRubriqueAssignments,
    frozenAttendanceSnapshots,
    pendingSalaryChangeRequests,
    approvedSalaryChangeRequests,
    pendingPaymentDestinationChanges,
    approvedPaymentDestinations: paymentEvidence.summary.approvedPaymentDestinationCount,
    missingPaymentDestinations: paymentMissing,
    pendingPaymentDestinations: paymentPending,
    attendanceReadyEmployees: paymentEvidence.summary.attendanceReadyCount,
    attendanceDriftEmployees: paymentEvidence.summary.attendanceDriftCount,
    openPeriods: workbench.counts.openPeriods,
    calculatedRuns: workbench.counts.calculatedRuns,
    postedRuns: workbench.counts.postedRuns,
    releasedPaymentBatches: workbench.counts.releasedPaymentBatches,
    openDeclarations: workbench.counts.openDeclarations,
    ledgerBlockers: workbench.counts.ledgerBlockers,
    reconciliationExceptions: workbench.counts.reconciliationExceptions,
    activeEmployeeBalanceCases: employeeBalanceWorkbench.summary.activeCases,
    openEmployeeBalanceCases: employeeBalanceWorkbench.summary.openCases,
    partiallySettledEmployeeBalanceCases: employeeBalanceWorkbench.summary.partiallySettledCases,
    currentPeriodRuns: currentRuns.length,
    currentPeriodPaymentBatches: currentPaymentBatches.length,
    currentPeriodDeclarations: currentDeclarations.length,
  }

  const blockerCodes = (domain: PayrollCommandBlocker["domain"]) => blockers.filter((blocker) => blocker.domain === domain).map((blocker) => blocker.code)
  const employeeBalanceBlockerCodes = blockers.filter((blocker) => blocker.code === "PAYROLL_EMPLOYEE_BALANCE_CASES_OPEN").map((blocker) => blocker.code)
  const pilotCertificationBlockerCodes = blockers
    .filter((blocker) => blocker.code.startsWith("PAYROLL_PILOT_CYCLE_"))
    .map((blocker) => blocker.code)
  const pilotCertificationState: ReadinessState = !latestRun ? "UNKNOWN" : pilotCertification.status === "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW" ? "READY" : pilotCertification.status === "BLOCKED" ? "BLOCKED" : "ACTION_REQUIRED"
  const finalReleaseState: ReadinessState = finalRelease.decision === "READY_FOR_FULL_PRODUCTION_APPROVAL" ? "READY" : finalRelease.criticalBlockerCount > 0 ? "BLOCKED" : "ACTION_REQUIRED"
  const finalReleaseMessage = finalRelease.decision === "READY_FOR_FULL_PRODUCTION_APPROVAL"
    ? "Final release evidence pack is ready for full-production approval review."
    : "Final release evidence pack still has open production-readiness blockers."
  const pilotCertificationMessage = !latestRun
    ? "Pilot certification waits for a payroll run."
    : pilotCertification.status === "CERTIFIED_FOR_PRODUCTION_RELEASE_REVIEW"
      ? "Controlled pilot-cycle certificate is ready for production release review."
      : pilotCertification.status === "READY_FOR_SIGNOFF"
        ? "Controlled pilot-cycle evidence is clean and awaiting required signoffs."
        : pilotCertification.status === "BLOCKED"
          ? "Controlled pilot-cycle certificate is blocked by evidence gaps."
          : "Controlled pilot-cycle certificate has not been evaluated for the latest payroll run."
  const readModel: PayrollCommandReadModel = {
    organizationId: parsed.organizationId,
    asOf: asOf.toISOString(),
    currentPeriod: currentPeriod
      ? {
          id: currentPeriod.id,
          name: currentPeriod.name,
          status: currentPeriod.status,
          periodStart: currentPeriod.periodStart.toISOString(),
          periodEnd: currentPeriod.periodEnd.toISOString(),
          payDate: currentPeriod.payDate.toISOString(),
          inputLockedAt: iso(currentPeriod.inputLockedAt),
          countryCode: currentPeriod.countryCode,
          countryPackVersion: currentPeriod.countryPackVersion,
          countryPackResolutionHash: currentPeriod.countryPackResolutionHash,
          countryPackCapabilityStatus: currentPeriod.countryPackCapabilityStatus,
          accountingPeriodId: currentPeriod.accountingPeriodId,
          selection: periodSelection.selection,
        }
      : null,
    roleScope: {
      canReadCommand: true,
      canReadSalaryAmounts: amountDecision.allowed,
      canManageEmployees: can(parsed.actorPermissions, ["payroll.employees.manage"]),
      canManageContracts: can(parsed.actorPermissions, ["payroll.contracts.manage"]),
      canManageCompensation: can(parsed.actorPermissions, ["payroll.compensation.manage"]),
      canReviewRuns: can(parsed.actorPermissions, ["payroll.runs.review"]),
      canCalculateRuns: can(parsed.actorPermissions, ["payroll.runs.calculate"]),
      canApproveRuns: can(parsed.actorPermissions, ["payroll.runs.approve"]),
      canReleasePayments: can(parsed.actorPermissions, ["payroll.payments.release"]),
      canPrepareDeclarations: can(parsed.actorPermissions, ["payroll.declarations.prepare"]),
      canExportPayroll: can(parsed.actorPermissions, ["payroll.exports.create"]),
      canReadPaymentEvidence: can(parsed.actorPermissions, ["payroll.payment_destination.read", "payroll.command.read"]),
      canReadAttendanceReadiness: can(parsed.actorPermissions, ["payroll.attendance.readiness.read", "payroll.command.read"]),
    },
    redaction: {
      payrollAmounts: {
        allowed: amountDecision.allowed,
        mode: amountDecision.mode,
        reasonCode: amountDecision.reasonCode,
        policy: amountDecision.policy,
        replacement: amountDecision.replacement,
        requiredPermissions: amountDecision.requiredPermissions,
      },
    },
    trustedCounts,
    readiness: {
      employees: readiness(activeEmployees === 0 ? "BLOCKED" : unmappedEmployees > 0 ? "ACTION_REQUIRED" : "READY", "payroll.employee_source", activeEmployees === 0 ? "No active payroll employees are available." : unmappedEmployees > 0 ? "Employee/user mappings need cleanup." : "Employee source data is ready for command composition.", blockerCodes("hr"), { activeEmployees, linkedEmployees, unmappedEmployees }),
      contracts: readiness(contractGap > 0 ? "ACTION_REQUIRED" : activeEmployees === 0 ? "UNKNOWN" : "READY", "payroll.contracts", contractGap > 0 ? "Active contract coverage is incomplete." : "Active contract coverage is ready.", blockerCodes("hr"), { activeContracts, contractGap }),
      compensation: readiness(pendingSalaryChangeRequests + approvedSalaryChangeRequests > 0 ? "ACTION_REQUIRED" : "READY", "payroll.compensation", pendingSalaryChangeRequests + approvedSalaryChangeRequests > 0 ? "Salary change queue requires maker-checker follow-up." : "Compensation queue is clear for command composition.", blockerCodes("compensation"), { pendingSalaryChangeRequests, approvedSalaryChangeRequests, activeRubriqueAssignments }),
      attendance: readiness(attendanceGap > 0 || paymentEvidence.summary.attendanceDriftCount > 0 ? "ACTION_REQUIRED" : activeEmployees === 0 ? "UNKNOWN" : "READY", "payroll.attendance_readiness", attendanceGap > 0 ? "Attendance freeze coverage is incomplete." : paymentEvidence.summary.attendanceDriftCount > 0 ? "Attendance source drift requires review." : "Attendance readiness is ready for command composition.", blockerCodes("attendance"), { frozenAttendanceSnapshots, attendanceGap, attendanceDriftEmployees: paymentEvidence.summary.attendanceDriftCount }),
      paymentDestinations: readiness(paymentMissing + paymentPending + pendingPaymentDestinationChanges > 0 ? "ACTION_REQUIRED" : activeEmployees === 0 ? "UNKNOWN" : "READY", "payroll.payment_destination", paymentMissing + paymentPending + pendingPaymentDestinationChanges > 0 ? "Payment destination evidence requires approval/application." : "Payment destination evidence is ready for command composition.", blockerCodes("payment"), { approvedPaymentDestinations: paymentEvidence.summary.approvedPaymentDestinationCount, paymentMissing, paymentPending }),
      employeeBalances: readiness(employeeBalanceWorkbench.summary.activeCases > 0 ? "ACTION_REQUIRED" : "READY", "payroll.employee_balance", employeeBalanceWorkbench.summary.activeCases > 0 ? "Employee balance recovery cases require settlement or review before close/payment certification." : "Employee balance recovery cases are clear.", employeeBalanceBlockerCodes, { activeCases: employeeBalanceWorkbench.summary.activeCases, openCases: employeeBalanceWorkbench.summary.openCases, partiallySettledCases: employeeBalanceWorkbench.summary.partiallySettledCases }),
      payrollRun: readiness(!currentPeriod ? "BLOCKED" : latestRun ? "READY" : "ACTION_REQUIRED", "payroll.runs", !currentPeriod ? "A payroll period is required." : latestRun ? "Current-period payroll run data is available." : "The current-period payroll run has not been calculated yet.", blockerCodes("payroll"), { currentPeriodRuns: currentRuns.length }),
      payrollRegister: readiness(!latestRun ? "UNKNOWN" : latestRun._count.lines > 0 ? "READY" : "BLOCKED", "payroll.register", !latestRun ? "Register readiness waits for a current payroll run." : latestRun._count.lines > 0 ? "Payroll register lines are present." : "The payroll register is empty.", blockerCodes("register"), { lineCount: latestRun?._count.lines ?? 0, payslipCount: latestRun?._count.payslips ?? 0 }),
      payments: readiness(workbench.counts.reconciliationExceptions > 0 ? "ACTION_REQUIRED" : currentPaymentBatches.length > 0 ? "READY" : latestRun ? "ACTION_REQUIRED" : "UNKNOWN", "payroll.payments", workbench.counts.reconciliationExceptions > 0 ? "Payroll payment reconciliation exceptions are open." : currentPaymentBatches.length > 0 ? "Payment batch data is available." : "Payment batch creation waits for a payroll run.", blockerCodes("payment"), { currentPeriodPaymentBatches: currentPaymentBatches.length, reconciliationExceptions: workbench.counts.reconciliationExceptions }),
      declarations: readiness(latestDeclaration?.status === PayrollDeclarationStatus.REJECTED || latestDeclaration?.status === PayrollDeclarationStatus.PAYMENT_DUE ? "ACTION_REQUIRED" : currentDeclarations.length > 0 ? "READY" : latestRun ? "ACTION_REQUIRED" : "UNKNOWN", "payroll.declarations", currentDeclarations.length > 0 ? "Declaration data is available for the current period." : "Declaration preparation waits for a posted payroll run.", blockerCodes("declaration"), { currentPeriodDeclarations: currentDeclarations.length, openDeclarations: workbench.counts.openDeclarations }),
      posting: readiness(workbench.counts.ledgerBlockers > 0 ? "BLOCKED" : "READY", "payroll.ledger_posting", workbench.counts.ledgerBlockers > 0 ? "Ledger posting blockers must be cleared." : "Payroll posting blockers are clear.", blockerCodes("posting"), { ledgerBlockers: workbench.counts.ledgerBlockers }),
      close: readiness(!closeRun ? "UNKNOWN" : closeRun.criticalBlockerCount > 0 ? "BLOCKED" : closeRun.highBlockerCount > 0 ? "ACTION_REQUIRED" : "READY", "accounting.close_assurance", !closeRun ? "Close assurance has not produced a current linked close run." : closeRun.criticalBlockerCount > 0 ? "Critical close blockers are open." : "Close assurance is available for the payroll-linked period.", blockerCodes("close"), closeRun ? { criticalBlockerCount: closeRun.criticalBlockerCount, highBlockerCount: closeRun.highBlockerCount } : undefined),
      adapterOperations: readiness(adapterOperations.summary.providerBlocked + adapterOperations.summary.authorityDeadLetter > 0 ? "BLOCKED" : adapterOperations.summary.providerActionRequired + adapterOperations.summary.authorityHarnessGaps + adapterOperations.summary.paymentAdapterGaps + adapterOperations.summary.adapterChaosGateBlockers > 0 ? "ACTION_REQUIRED" : adapterOperations.summary.providerAccounts > 0 ? "READY" : "UNKNOWN", "payroll.adapter_operations", adapterOperations.summary.providerBlocked + adapterOperations.summary.authorityDeadLetter > 0 ? "Adapter operations have provider or authority dead-letter blockers." : adapterOperations.summary.providerActionRequired + adapterOperations.summary.authorityHarnessGaps + adapterOperations.summary.paymentAdapterGaps + adapterOperations.summary.adapterChaosGateBlockers > 0 ? "Adapter operations require evidence, certification, or chaos-gate follow-up." : adapterOperations.summary.providerAccounts > 0 ? "Adapter operations are ready for monitored payroll workflows." : "Adapter operations have no provider account evidence yet.", blockerCodes("adapter"), { providerBlocked: adapterOperations.summary.providerBlocked, authorityDeadLetter: adapterOperations.summary.authorityDeadLetter, authorityHarnessGaps: adapterOperations.summary.authorityHarnessGaps, paymentAdapterGaps: adapterOperations.summary.paymentAdapterGaps, adapterChaosGateBlockers: adapterOperations.summary.adapterChaosGateBlockers }),
      pilotCertification: readiness(pilotCertificationState, "payroll.pilot_cycle_certification", pilotCertificationMessage, pilotCertificationBlockerCodes, { blockerCount: pilotCertification.blockerCount, missingSignoffRoles: pilotCertification.missingSignoffRoles.length, releaseGateCount: pilotCertification.releaseGateCount }),
      finalRelease: readiness(finalReleaseState, "payroll.final_release_readiness", finalReleaseMessage, finalRelease.blockerCodes, { blockerCount: finalRelease.blockerCount, criticalBlockerCount: finalRelease.criticalBlockerCount, gateCount: finalRelease.gateCount, passGateCount: finalRelease.passGateCount }),
    },
    blockers,
    nextActions,
    adapterOperations: {
      summary: adapterOperations.summary,
      providerHealth: adapterOperations.providerHealth,
      authorityExecutions: adapterOperations.authorityExecutions,
      paymentAdapterGaps: adapterOperations.paymentAdapterGaps,
      adapterChaosGate: adapterOperations.adapterChaosGate,
      redaction: adapterOperations.redaction,
    },
    evidence: {
      latestRun: latestRun
        ? {
            id: latestRun.id,
            runNumber: latestRun.runNumber,
            status: latestRun.status,
            documentHash: latestRun.documentHash,
            evidenceHash: latestRun.evidenceHash,
            calculationHash: latestRun.calculationHash,
            attendanceSnapshotHash: latestRun.attendanceSnapshotHash,
            countryPackResolutionHash: latestRun.countryPackResolutionHash,
            ledgerPostingBatchId: latestRun.ledgerPostingBatchId,
            postedBusinessEventId: latestRun.postedBusinessEventId,
            payslipCount: latestRun._count.payslips,
            lineCount: latestRun._count.lines,
            paymentBatchCount: latestRun._count.paymentBatches,
            declarationCount: latestRun._count.declarations,
            updatedAt: latestRun.updatedAt.toISOString(),
          }
        : null,
      latestPaymentBatch: latestPaymentBatch
        ? {
            id: latestPaymentBatch.id,
            batchNumber: latestPaymentBatch.batchNumber,
            status: latestPaymentBatch.status,
            documentHash: latestPaymentBatch.documentHash,
            evidenceHash: latestPaymentBatch.evidenceHash,
            bankFileHash: latestPaymentBatch.bankFileHash,
            ledgerPostingBatchId: latestPaymentBatch.ledgerPostingBatchId,
            postedBusinessEventId: latestPaymentBatch.postedBusinessEventId,
            reconciliationStatus: latestPaymentBatch.reconciliationStatus,
            updatedAt: latestPaymentBatch.updatedAt.toISOString(),
          }
        : null,
      latestDeclaration: latestDeclaration
        ? {
            id: latestDeclaration.id,
            authority: latestDeclaration.authority,
            declarationType: latestDeclaration.declarationType,
            status: latestDeclaration.status,
            payloadHash: latestDeclaration.payloadHash,
            countryPackResolutionHash: latestDeclaration.countryPackResolutionHash,
            dueDate: iso(latestDeclaration.dueDate),
            updatedAt: latestDeclaration.updatedAt.toISOString(),
          }
        : null,
      closeRun: closeRun
        ? {
            id: closeRun.id,
            status: closeRun.status,
            readinessScore: closeRun.readinessScore,
            criticalBlockerCount: closeRun.criticalBlockerCount,
            highBlockerCount: closeRun.highBlockerCount,
            evidenceCoveragePct: decimalString(closeRun.evidenceCoveragePct),
            asOf: closeRun.asOf.toISOString(),
          }
        : null,
      pilotCertification,
      pilotCertificationInput,
      finalRelease,
    },
    freshness: [
      toFreshness("payroll.period", currentPeriod?.updatedAt, asOf),
      toFreshness("payroll.workbench", workbench.asOf, asOf),
      toFreshness("payroll.employee_source", employeeSourceData.asOf, asOf),
      toFreshness("payroll.payment_evidence", paymentEvidence.asOf, asOf),
      toFreshness("payroll.employee_balance", employeeBalanceWorkbench.asOf, asOf),
      toFreshness("payroll.latest_run", latestRun?.updatedAt, asOf),
      toFreshness("payroll.latest_payment_batch", latestPaymentBatch?.updatedAt, asOf),
      toFreshness("payroll.latest_declaration", latestDeclaration?.updatedAt, asOf),
      toFreshness("accounting.close_run", closeRun?.asOf, asOf),
      toFreshness("payroll.pilot_cycle_certification", pilotCertification.evaluatedAt, asOf),
      toFreshness("payroll.final_release_readiness", finalRelease.generatedAt, asOf),
    ],
    sourceScope: {
      limit: parsed.limit,
      employeeSourceReturned: employeeSourceData.employees.length,
      paymentEvidenceReturned: paymentEvidence.employees.length,
      employeeBalanceReturned: employeeBalanceWorkbench.sourceScope.returned,
      employeeCoverageComplete: activeEmployees <= employeeSourceData.employees.length,
      paymentEvidenceCoverageComplete: activeEmployees <= paymentEvidence.employees.length,
      employeeBalanceCoverageComplete: employeeBalanceWorkbench.sourceScope.coverageComplete,
      sourceServices: [
        adapterOperations.sourceScope.sourceService,
        "services/payroll/payroll-control.service.ts",
        "services/payroll/employee.service.ts",
        "services/payroll/payment-evidence.service.ts",
        employeeBalanceWorkbench.sourceScope.sourceService,
        "services/payroll/payroll-pilot-cycle-certification.service.ts",
        "services/payroll/payroll-final-release-readiness.service.ts",
        "services/payroll/command-read-model.service.ts",
      ],
    },
    workbench,
  }

  await writeCommandReadAudit(client, {
    organizationId: parsed.organizationId,
    actorId: parsed.actorId,
    amountDecision,
    blockerCount: readModel.blockers.length,
    nextActionCount: readModel.nextActions.length,
    trustedCounts,
  })

  return readModel
}
