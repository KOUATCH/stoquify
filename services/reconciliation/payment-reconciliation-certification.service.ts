import {
  AccountingPeriodStatus,
  PaymentExceptionStatus,
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  SettlementAccountApprovalStatus,
  SuspenseStatus,
  Prisma,
} from "@prisma/client"
import { createHash, randomUUID } from "node:crypto"

import { db } from "@/prisma/db"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import {
  ApplicationError,
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
  type SensitiveActionDecision,
} from "@/services/controls/sensitive-action.service"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"
import {
  assertProviderAccountReconciliationReady,
  buildReconciliationEvidenceManifestInTx,
  reconciliationCertificateSourceEvidenceHash,
} from "./payment-reconciliation-evidence.service"
import {
  buildPaymentReconciliationSignOffSourceVersionHash,
  isPaymentReconciliationSourceVersionHash,
} from "./payment-reconciliation-sign-off-source-version"
type ControlContext = {
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
}

type ControlledResult<T> =
  | { denied: SensitiveActionDecision; value?: never }
  | { denied?: never; value: T }
type CertificateExportTransactionResult =
  | ControlledResult<ReconciliationCertificateExportResult>
  | { driftError: string }

export type SignReconciliationRunInput = {
  organizationId: string
  runId: string
  signedById: string
  expectedSourceVersionHash?: string
  control: ControlContext
  correlationId?: string
}

export type SignReconciliationRunResult = {
  runId: string
  status: ReconciliationRunStatus
  outcome: "SIGNED" | "ALREADY_SIGNED"
  replayed: boolean
  completedByAnotherActor: boolean
  certificateHash: string
  sourceVersionHash: string | null
  signedAt: string
  correlationId: string
}

export type ReconciliationCertificateExportInput = {
  organizationId: string
  runId: string
  exportedById: string
  fileType?: "json"
  control: ControlContext
  correlationId?: string
}

export type ReconciliationCertificateExportResult = {
  runId: string
  fileName: string
  mimeType: "application/json"
  content: string
  certificateHash: string
  watermarkId: string
  rowCount: number
  inboxItemId: string
  correlationId: string
}

export type ReconciliationRunDetail = {
  source: {
    mode: "DURABLE_EVIDENCE_KERNEL"
    asOf: string
    organizationScoped: true
    certificationStatus: ReconciliationRunStatus
  }
  run: {
    id: string
    providerAccountId: string
    paymentRailId: string
    businessDate: string
    periodStart: string
    periodEnd: string
    status: ReconciliationRunStatus
    runById: string | null
    signedById: string | null
    signedAt: string | null
    certificateHash: string | null
    totals: {
      internalAmount: string
      externalAmount: string
      matchedAmount: string
      suspenseAmount: string
      matchCount: number
      exceptionCount: number
    }
  }
  providerAccount: {
    id: string
    displayName: string
    providerCode: string
    currencyCode: string
    railName: string
    railType: string
  }
  evidence: {
    providerEventCount: number
    statementLineCount: number
    matchRecordCount: number
    openExceptionCount: number
    openSuspenseCount: number
  }
  matchRecords: Array<{
    id: string
    status: string
    rule: string
    confidence: string
    paymentTransactionId: string | null
    providerEventId: string | null
    statementLineId: string | null
    ledgerPostingBatchId: string | null
  }>
  exceptions: Array<{
    id: string
    type: string
    severity: string
    status: string
    sourceType: string | null
    sourceId: string | null
    suspenseItemId: string | null
  }>
  suspenseItems: Array<{
    id: string
    type: string
    status: string
    severity: string
    amount: string
    currencyCode: string
    ledgerPostingBatchId: string | null
  }>
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function certificatePayloadHash(payload: unknown) {
  return sha256(stableStringify(payload))
}

function decimalString(value: Prisma.Decimal.Value | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toFixed(2)
}

function asJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject
}

function openExceptionStatuses(): PaymentExceptionStatus[] {
  return [
    PaymentExceptionStatus.OPEN,
    PaymentExceptionStatus.ASSIGNED,
    PaymentExceptionStatus.ACKNOWLEDGED,
    PaymentExceptionStatus.ESCALATED,
    PaymentExceptionStatus.RESOLUTION_PROPOSED,
    PaymentExceptionStatus.REOPENED,
  ]
}

function openSuspenseStatuses(): SuspenseStatus[] {
  return [
    SuspenseStatus.OPEN,
    SuspenseStatus.ASSIGNED,
    SuspenseStatus.IN_REVIEW,
    SuspenseStatus.POSTED_TO_SUSPENSE,
    SuspenseStatus.RESOLUTION_PROPOSED,
    SuspenseStatus.REOPENED,
  ]
}

async function auditReconciliationCertification(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    action: string
    runId: string
    message: string
    metadata: Prisma.InputJsonValue
  },
) {
  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: "ReconciliationRun",
      resourceId: params.runId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

async function loadRunForCertification(
  tx: Prisma.TransactionClient,
  organizationId: string,
  runId: string,
  at: Date = new Date(),
) {
  const run = await tx.reconciliationRun.findFirst({
    where: { id: runId, organizationId },
    include: {
      accountingPeriod: { select: { id: true, status: true, startDate: true, endDate: true } },
      paymentRail: { select: { id: true, name: true, type: true, isActive: true } },
      providerAccount: {
        select: {
          id: true,
          displayName: true,
          providerCode: true,
          currencyCode: true,
          status: true,
          settlementLedgerAccountId: true,
          suspenseLedgerAccountId: true,
          settlementAccounts: {
            where: {
              approvalStatus: SettlementAccountApprovalStatus.APPROVED,
              effectiveFrom: { lte: at },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
            },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  })

  if (!run) throw new NotFoundError("Reconciliation run not found")
  return run
}

async function resolveOpenAccountingPeriod(
  tx: Prisma.TransactionClient,
  organizationId: string,
  businessDate: Date,
) {
  return tx.accountingPeriod.findFirst({
    where: {
      organizationId,
      startDate: { lte: businessDate },
      endDate: { gte: businessDate },
      status: AccountingPeriodStatus.OPEN,
    },
    select: { id: true, status: true, startDate: true, endDate: true },
  })
}

export async function getReconciliationRunDetail(
  organizationId: string,
  runId: string,
): Promise<ReconciliationRunDetail> {
  const run = await loadRunForCertification(db, organizationId, runId)

  const [providerEventCount, statementLineCount, matchRecords, exceptions, suspenseItems] = await Promise.all([
    db.providerEvent.count({
      where: {
        organizationId,
        providerAccountId: run.providerAccountId,
        receivedAt: { gte: run.periodStart, lt: run.periodEnd },
      },
    }),
    db.statementLine.count({
      where: {
        organizationId,
        providerAccountId: run.providerAccountId,
        occurredAt: { gte: run.periodStart, lt: run.periodEnd },
      },
    }),
    db.matchRecord.findMany({
      where: { organizationId, reconciliationRunId: run.id },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 100,
      select: {
        id: true,
        status: true,
        rule: true,
        confidence: true,
        paymentTransactionId: true,
        providerEventId: true,
        statementLineId: true,
        ledgerPostingBatchId: true,
      },
    }),
    db.paymentException.findMany({
      where: { organizationId, reconciliationRunId: run.id },
      orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
      take: 100,
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        sourceType: true,
        sourceId: true,
        suspenseItemId: true,
      },
    }),
    db.suspenseItem.findMany({
      where: { organizationId, reconciliationRunId: run.id },
      orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        severity: true,
        amount: true,
        currencyCode: true,
        ledgerPostingBatchId: true,
      },
    }),
  ])

  const openExceptionCount = exceptions.filter((item) => openExceptionStatuses().includes(item.status)).length
  const openSuspenseCount = suspenseItems.filter((item) => openSuspenseStatuses().includes(item.status)).length

  return {
    source: {
      mode: "DURABLE_EVIDENCE_KERNEL",
      asOf: new Date().toISOString(),
      organizationScoped: true,
      certificationStatus: run.status,
    },
    run: {
      id: run.id,
      providerAccountId: run.providerAccountId,
      paymentRailId: run.paymentRailId,
      businessDate: run.businessDate.toISOString(),
      periodStart: run.periodStart.toISOString(),
      periodEnd: run.periodEnd.toISOString(),
      status: run.status,
      runById: run.runById,
      signedById: run.signedById,
      signedAt: run.signedAt?.toISOString() ?? null,
      certificateHash: run.certificateHash,
      totals: {
        internalAmount: decimalString(run.totalInternalAmount),
        externalAmount: decimalString(run.totalExternalAmount),
        matchedAmount: decimalString(run.matchedAmount),
        suspenseAmount: decimalString(run.suspenseAmount),
        matchCount: run.matchCount,
        exceptionCount: run.exceptionCount,
      },
    },
    providerAccount: {
      id: run.providerAccount.id,
      displayName: run.providerAccount.displayName,
      providerCode: run.providerAccount.providerCode,
      currencyCode: run.providerAccount.currencyCode,
      railName: run.paymentRail.name,
      railType: run.paymentRail.type,
    },
    evidence: {
      providerEventCount,
      statementLineCount,
      matchRecordCount: matchRecords.length,
      openExceptionCount,
      openSuspenseCount,
    },
    matchRecords: matchRecords.map((record) => ({
      id: record.id,
      status: record.status,
      rule: record.rule,
      confidence: decimalString(record.confidence),
      paymentTransactionId: record.paymentTransactionId,
      providerEventId: record.providerEventId,
      statementLineId: record.statementLineId,
      ledgerPostingBatchId: record.ledgerPostingBatchId,
    })),
    exceptions: exceptions.map((exception) => ({
      id: exception.id,
      type: exception.type,
      severity: exception.severity,
      status: exception.status,
      sourceType: exception.sourceType,
      sourceId: exception.sourceId,
      suspenseItemId: exception.suspenseItemId,
    })),
    suspenseItems: suspenseItems.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      severity: item.severity,
      amount: decimalString(item.amount),
      currencyCode: item.currencyCode,
      ledgerPostingBatchId: item.ledgerPostingBatchId,
    })),
  }
}

export async function signReconciliationRun(
  input: SignReconciliationRunInput,
): Promise<SignReconciliationRunResult> {
  const normalized = normalizeSignInput(input)
  let result: ControlledResult<SignReconciliationRunResult>

  try {
    result = await db.$transaction(
      async (tx): Promise<ControlledResult<SignReconciliationRunResult>> => {
        const run = await loadRunForCertification(
          tx,
          normalized.organizationId,
          normalized.runId,
          normalized.now,
        )

        const decision = evaluateSensitiveAction({
          action: "payment.reconciliation.sign",
          actorId: normalized.signedById,
          organizationId: normalized.organizationId,
          actorPermissions: normalized.actorPermissions,
          resourceType: "ReconciliationRun",
          resourceId: run.id,
          subjectActorId: run.runById,
          lastAuthAt: normalized.lastAuthAt,
          now: normalized.now,
          metadata: {
            providerAccountId: run.providerAccountId,
            businessDate: run.businessDate.toISOString(),
            status: run.status,
          },
        })
        if (!decision.allowed) {
          await auditSensitiveActionDecision(tx, decision)
          return { denied: decision }
        }

        if (run.status === ReconciliationRunStatus.SIGNED) {
          return {
            value: signedRunResult(run, normalized, {
              created: false,
              committedSourceVersionHash: null,
            }),
          }
        }
        if (run.status !== ReconciliationRunStatus.READY_FOR_SIGNOFF) {
          throw new BusinessRuleError(
            "Only reconciliation runs ready for sign-off can be signed.",
          )
        }
        if (run.signedAt || run.signedById || run.certificateHash) {
          throw inconsistentSignedEvidence()
        }
        if (!run.runById?.trim()) {
          throw new BusinessRuleError(
            "A reconciliation maker is required before sign-off.",
          )
        }

        assertProviderAccountReconciliationReady({
          ...run.providerAccount,
          paymentRail: run.paymentRail,
        })

        const sourceVersionHash = sourceVersionHashForRun(run)
        if (
          normalized.expectedSourceVersionHash &&
          normalized.expectedSourceVersionHash !== sourceVersionHash
        ) {
          throw new BusinessRuleError(
            "Reconciliation source evidence changed; refresh before signing.",
          )
        }

        const period =
          run.accountingPeriod ??
          (await resolveOpenAccountingPeriod(
            tx,
            normalized.organizationId,
            run.businessDate,
          ))
        if (!period || period.status !== AccountingPeriodStatus.OPEN) {
          throw new BusinessRuleError(
            "An open accounting period is required before reconciliation sign-off.",
          )
        }

        const [
          providerEventCount,
          statementLineCount,
          openExceptionCount,
          openSuspenseCount,
          suspenseWithoutLedgerCount,
        ] = await Promise.all([
          tx.providerEvent.count({
            where: {
              organizationId: normalized.organizationId,
              providerAccountId: run.providerAccountId,
              status: {
                in: [
                  ProviderEventStatus.VERIFIED,
                  ProviderEventStatus.PROCESSED,
                ],
              },
              receivedAt: { gte: run.periodStart, lt: run.periodEnd },
            },
          }),
          tx.statementLine.count({
            where: {
              organizationId: normalized.organizationId,
              providerAccountId: run.providerAccountId,
              occurredAt: { gte: run.periodStart, lt: run.periodEnd },
            },
          }),
          tx.paymentException.count({
            where: {
              organizationId: normalized.organizationId,
              reconciliationRunId: run.id,
              status: { in: openExceptionStatuses() },
            },
          }),
          tx.suspenseItem.count({
            where: {
              organizationId: normalized.organizationId,
              reconciliationRunId: run.id,
              status: { in: openSuspenseStatuses() },
            },
          }),
          tx.suspenseItem.count({
            where: {
              organizationId: normalized.organizationId,
              reconciliationRunId: run.id,
              status: SuspenseStatus.POSTED_TO_SUSPENSE,
              ledgerPostingBatchId: null,
            },
          }),
        ])

        if (providerEventCount + statementLineCount === 0) {
          throw new BusinessRuleError(
            "Provider events or statement lines are required before reconciliation sign-off.",
          )
        }
        if (openExceptionCount > 0) {
          throw new BusinessRuleError(
            "Open reconciliation exceptions must be resolved before sign-off.",
          )
        }
        if (openSuspenseCount > 0) {
          throw new BusinessRuleError(
            "Open suspense items must be resolved before sign-off.",
          )
        }
        if (suspenseWithoutLedgerCount > 0) {
          throw new BusinessRuleError(
            "Posted suspense items must include a ledger posting batch before sign-off.",
          )
        }

        const sourceEvidence = await buildReconciliationEvidenceManifestInTx(
          tx,
          {
            organizationId: normalized.organizationId,
            providerAccountId: run.providerAccountId,
            reconciliationRunId: run.id,
            periodStart: run.periodStart,
            periodEnd: run.periodEnd,
          },
        )
        if (
          sourceEvidence.counts.providerEventCount !== providerEventCount ||
          sourceEvidence.counts.statementLineCount !== statementLineCount
        ) {
          throw new BusinessRuleError(
            "Reconciliation source evidence changed during sign-off; rerun reconciliation.",
          )
        }

        const certificatePayload = {
          version: 2,
          mode: "DURABLE_EVIDENCE_KERNEL",
          organizationId: normalized.organizationId,
          runId: run.id,
          providerAccountId: run.providerAccountId,
          paymentRailId: run.paymentRailId,
          providerCode: run.providerAccount.providerCode,
          businessDate: run.businessDate.toISOString(),
          periodStart: run.periodStart.toISOString(),
          periodEnd: run.periodEnd.toISOString(),
          accountingPeriodId: period.id,
          sourceVersionHash,
          totals: {
            internalAmount: decimalString(run.totalInternalAmount),
            externalAmount: decimalString(run.totalExternalAmount),
            matchedAmount: decimalString(run.matchedAmount),
            suspenseAmount: decimalString(run.suspenseAmount),
            matchCount: run.matchCount,
            exceptionCount: run.exceptionCount,
          },
          evidence: {
            providerEventCount,
            statementLineCount,
            openExceptionCount,
            openSuspenseCount,
            sourceManifestVersion: sourceEvidence.version,
            sourceHash: sourceEvidence.sourceHash,
            sourceCounts: sourceEvidence.counts,
          },
          controls: {
            makerCheckerEnforced: true,
            freshAuthEnforced: true,
            periodOpenVerified: true,
            providerAccountReadyVerified: true,
            suspensePostingGatewayOnly: true,
            sourceVersionGuardEnforced: true,
            conditionalTerminalTransition: true,
          },
          signedById: normalized.signedById,
          signedAt: normalized.now.toISOString(),
          correlationId: normalized.correlationId,
        }
        const certificateHash = certificatePayloadHash(certificatePayload)

        await auditSensitiveActionDecision(tx, decision)

        const transition = await tx.reconciliationRun.updateMany({
          where: {
            id: run.id,
            organizationId: normalized.organizationId,
            status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
            updatedAt: run.updatedAt,
            signedById: null,
            signedAt: null,
            certificateHash: null,
          },
          data: {
            status: ReconciliationRunStatus.SIGNED,
            signedById: normalized.signedById,
            signedAt: normalized.now,
            certificateHash,
            certificatePayload: asJsonObject(certificatePayload),
            accountingPeriodId: period.id,
            metadata: asJsonObject({
              ...metadataRecord(run.metadata),
              immutableAfterSignoff: true,
              signedCorrelationId: normalized.correlationId,
              signedSourceVersionHash: sourceVersionHash,
            }),
          },
        })
        if (transition.count !== 1) {
          throw new ReconciliationSignTransitionConflict()
        }

        const signed = await tx.reconciliationRun.findUnique({
          where: { id: run.id },
          select: SIGNED_RUN_RESULT_SELECT,
        })
        if (!signed) throw inconsistentSignedEvidence()

        await auditReconciliationCertification(tx, {
          organizationId: normalized.organizationId,
          actorId: normalized.signedById,
          action: "PAYMENT_RECONCILIATION_RUN_SIGN",
          runId: run.id,
          message: `Payment reconciliation run ${run.id} signed`,
          metadata: asJsonObject({
            certificateHash,
            sourceVersionHash,
            providerEventCount,
            statementLineCount,
            correlationId: normalized.correlationId,
          }),
        })

        await recordBusinessEventInTx(tx, {
          organizationId: normalized.organizationId,
          eventType: "payment.reconciliation.signed",
          eventSource: "SYSTEM",
          idempotencyKey: `reconciliation-run:${run.id}:signed`,
          actorId: normalized.signedById,
          sourceType: "PAYMENT_RECONCILIATION",
          sourceId: run.id,
          documentHash: certificateHash,
          payload: {
            runId: run.id,
            providerAccountId: run.providerAccountId,
            paymentRailId: run.paymentRailId,
            accountingPeriodId: period.id,
            certificateHash,
            sourceVersionHash,
            providerEventCount,
            statementLineCount,
            signedById: normalized.signedById,
            signedAt: normalized.now.toISOString(),
            correlationId: normalized.correlationId,
          },
          outboxMessages: [
            {
              channel: "NOTIFICATION",
              eventName: "payment.reconciliation.signed",
              payload: {
                runId: run.id,
                providerAccountId: run.providerAccountId,
                certificateHash,
                sourceVersionHash,
                signedAt: normalized.now.toISOString(),
                correlationId: normalized.correlationId,
              },
            },
          ],
        })
        await recordCloseCertificationInvalidationsForSourceInTx(
          tx,
          normalized.organizationId,
          {
            sourceCode: "PAYMENT_RECONCILIATION_SIGNED",
            sourceId: run.id,
            periodId: period.id,
            periodStart: run.periodStart,
            periodEnd: run.periodEnd,
            staleReason:
              "Payment reconciliation sign-off changed certified close evidence.",
            newEvidenceHash: certificateHash,
            correlationId: normalized.correlationId,
          },
          {
            actorId: normalized.signedById,
            now: normalized.now,
          },
        )

        return {
          value: signedRunResult(signed, normalized, {
            created: true,
            committedSourceVersionHash: sourceVersionHash,
          }),
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
  } catch (error) {
    if (
      error instanceof ReconciliationSignTransitionConflict ||
      ["P2002", "P2034"].includes(prismaErrorCode(error) ?? "")
    ) {
      return recoverConcurrentReconciliationSign(normalized)
    }
    if (error instanceof ApplicationError) throw error
    throw new BusinessRuleError("Payment reconciliation sign-off could not be completed safely.")
  }

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
    throw new BusinessRuleError("Sensitive action denied.")
  }

  return result.value
}

const SIGNED_RUN_RESULT_SELECT = {
  id: true,
  organizationId: true,
  status: true,
  runById: true,
  signedById: true,
  signedAt: true,
  certificateHash: true,
  certificatePayload: true,
  metadata: true,
} satisfies Prisma.ReconciliationRunSelect

type StoredSignedRun = Prisma.ReconciliationRunGetPayload<{
  select: typeof SIGNED_RUN_RESULT_SELECT
}>

type NormalizedSignInput = {
  organizationId: string
  runId: string
  signedById: string
  actorPermissions: readonly string[]
  lastAuthAt: Date | number | string | null | undefined
  expectedSourceVersionHash: string | null
  now: Date
  correlationId: string
}

class ReconciliationSignTransitionConflict extends Error {
  constructor() {
    super("Reconciliation sign transition lost a concurrent race.")
    this.name = "ReconciliationSignTransitionConflict"
  }
}

function normalizeSignInput(
  input: SignReconciliationRunInput,
): NormalizedSignInput {
  const organizationId = requiredSignText(
    input.organizationId,
    "An organization is required for reconciliation sign-off.",
  )
  const runId = requiredSignText(
    input.runId,
    "A reconciliation run is required for sign-off.",
  )
  const signedById = requiredSignText(
    input.signedById,
    "A signer is required for reconciliation sign-off.",
  )
  const now = input.control?.now
    ? new Date(input.control.now)
    : new Date()
  if (Number.isNaN(now.getTime())) {
    throw new BusinessRuleError(
      "Reconciliation sign-off now must be a valid date.",
    )
  }

  const expectedSourceVersionHash =
    input.expectedSourceVersionHash?.trim() ?? null
  if (
    expectedSourceVersionHash !== null &&
    !isPaymentReconciliationSourceVersionHash(expectedSourceVersionHash)
  ) {
    throw new BusinessRuleError(
      "Reconciliation source version must be a valid SHA-256 hash.",
    )
  }

  return {
    organizationId,
    runId,
    signedById,
    actorPermissions: input.control?.actorPermissions ?? [],
    lastAuthAt: input.control?.lastAuthAt,
    expectedSourceVersionHash,
    now,
    correlationId: input.correlationId?.trim() || randomUUID(),
  }
}

function sourceVersionHashForRun(
  run: Awaited<ReturnType<typeof loadRunForCertification>>,
) {
  return buildPaymentReconciliationSignOffSourceVersionHash({
    version: 1,
    sourceType: "ReconciliationRun",
    organizationId: run.organizationId,
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
    status: "READY_FOR_SIGNOFF",
    makerActorId: run.runById!,
    totals: {
      internalAmount: decimalString(run.totalInternalAmount),
      externalAmount: decimalString(run.totalExternalAmount),
      matchedAmount: decimalString(run.matchedAmount),
      suspenseAmount: decimalString(run.suspenseAmount),
    },
    matchCount: run.matchCount,
    exceptionCount: run.exceptionCount,
    updatedAt: run.updatedAt.toISOString(),
  })
}

async function recoverConcurrentReconciliationSign(
  normalized: NormalizedSignInput,
) {
  const signed = await db.reconciliationRun.findFirst({
    where: {
      id: normalized.runId,
      organizationId: normalized.organizationId,
    },
    select: SIGNED_RUN_RESULT_SELECT,
  })
  if (signed?.status === ReconciliationRunStatus.SIGNED) {
    return signedRunResult(signed, normalized, {
      created: false,
      committedSourceVersionHash: null,
    })
  }

  throw new BusinessRuleError(
    "Reconciliation source evidence changed; refresh before signing.",
  )
}

function signedRunResult(
  run: StoredSignedRun,
  normalized: NormalizedSignInput,
  options: {
    created: boolean
    committedSourceVersionHash: string | null
  },
): SignReconciliationRunResult {
  const certificatePayload = metadataRecord(run.certificatePayload)
  const metadata = metadataRecord(run.metadata)
  const payloadSourceVersionHash = stringField(
    certificatePayload.sourceVersionHash,
  )
  const metadataSourceVersionHash = stringField(
    metadata.signedSourceVersionHash,
  )
  if (
    payloadSourceVersionHash &&
    metadataSourceVersionHash &&
    payloadSourceVersionHash !== metadataSourceVersionHash
  ) {
    throw inconsistentSignedEvidence()
  }
  const sourceVersionHash =
    payloadSourceVersionHash ?? metadataSourceVersionHash

  if (
    run.id !== normalized.runId ||
    run.organizationId !== normalized.organizationId ||
    run.status !== ReconciliationRunStatus.SIGNED ||
    !run.signedById?.trim() ||
    !run.signedAt ||
    Number.isNaN(run.signedAt.getTime()) ||
    run.signedAt.getTime() > normalized.now.getTime() ||
    !run.certificateHash ||
    !/^[a-f0-9]{64}$/.test(run.certificateHash) ||
    Object.keys(certificatePayload).length === 0 ||
    certificatePayloadHash(run.certificatePayload) !== run.certificateHash ||
    run.runById === run.signedById ||
    (sourceVersionHash !== null &&
      !isPaymentReconciliationSourceVersionHash(sourceVersionHash)) ||
    (options.created &&
      (run.signedById !== normalized.signedById ||
        !options.committedSourceVersionHash ||
        sourceVersionHash !== options.committedSourceVersionHash))
  ) {
    throw inconsistentSignedEvidence()
  }

  const completedByAnotherActor =
    run.signedById !== normalized.signedById
  if (
    !completedByAnotherActor &&
    normalized.expectedSourceVersionHash &&
    sourceVersionHash &&
    normalized.expectedSourceVersionHash !== sourceVersionHash
  ) {
    throw new BusinessRuleError(
      "Reconciliation source evidence changed; refresh before signing.",
    )
  }

  return {
    runId: run.id,
    status: ReconciliationRunStatus.SIGNED,
    outcome: completedByAnotherActor ? "ALREADY_SIGNED" : "SIGNED",
    replayed: !options.created && !completedByAnotherActor,
    completedByAnotherActor,
    certificateHash: run.certificateHash,
    sourceVersionHash,
    signedAt: run.signedAt.toISOString(),
    correlationId: normalized.correlationId,
  }
}

function requiredSignText(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new BusinessRuleError(message)
  }
  return value.trim()
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function prismaErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null
  const code = (error as { code?: unknown }).code
  return typeof code === "string" ? code : null
}

function inconsistentSignedEvidence() {
  return new ForbiddenError(
    "Payment reconciliation signed evidence is inconsistent.",
  )
}

export async function exportReconciliationCertificate(
  input: ReconciliationCertificateExportInput,
): Promise<ReconciliationCertificateExportResult> {
  const correlationId = input.correlationId ?? randomUUID()
  const fileType = input.fileType ?? "json"
  const now = input.control.now ? new Date(input.control.now) : new Date()

  if (fileType !== "json") {
    throw new BusinessRuleError("Only JSON certificate export is enabled for this reconciliation build.")
  }

  const result = await db.$transaction(async (tx): Promise<CertificateExportTransactionResult> => {
    const run = await loadRunForCertification(tx, input.organizationId, input.runId, now)

    if (run.status !== ReconciliationRunStatus.SIGNED || !run.certificateHash || !run.certificatePayload) {
      throw new BusinessRuleError("Only signed reconciliation runs can be exported as certificates.")
    }

    const [matchCount, exceptionCount, suspenseCount] = await Promise.all([
      tx.matchRecord.count({ where: { organizationId: input.organizationId, reconciliationRunId: run.id } }),
      tx.paymentException.count({ where: { organizationId: input.organizationId, reconciliationRunId: run.id } }),
      tx.suspenseItem.count({ where: { organizationId: input.organizationId, reconciliationRunId: run.id } }),
    ])
    const rowCount = matchCount + exceptionCount + suspenseCount
    const watermarkId = `recon-cert-${run.id}-${run.certificateHash.slice(0, 12)}`

    const decision = evaluateSensitiveAction({
      action: "payment.reconciliation.certificate.export",
      actorId: input.exportedById,
      organizationId: input.organizationId,
      actorPermissions: input.control.actorPermissions,
      resourceType: "ReconciliationRun",
      resourceId: run.id,
      lastAuthAt: input.control.lastAuthAt,
      now,
      exportContext: {
        scope: "payment-reconciliation-certificate",
        filtersHash: run.certificateHash,
        rowCount,
        fileType,
        sensitivity: "statutory",
        watermarkId,
      },
      metadata: {
        providerAccountId: run.providerAccountId,
        businessDate: run.businessDate.toISOString(),
      },
    })
    await auditSensitiveActionDecision(tx, decision)
    if (!decision.allowed) return { denied: decision }

    const currentCertificateHash = certificatePayloadHash(run.certificatePayload)
    if (currentCertificateHash !== run.certificateHash) {
      await recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
        sourceCode: "PAYMENT_RECONCILIATION_CERTIFICATE_HASH_DRIFT",
        sourceId: run.id,
        periodId: run.accountingPeriodId ?? run.accountingPeriod?.id ?? null,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        staleReason: "Payment reconciliation certificate hash drift was detected before export.",
        previousEvidenceHash: run.certificateHash,
        newEvidenceHash: currentCertificateHash,
        correlationId,
      }, {
        actorId: input.exportedById,
        now,
      })
      return { driftError: "Reconciliation certificate hash drift detected; rerun sign-off before export." }
    }

    const sourceEvidence = await buildReconciliationEvidenceManifestInTx(tx, {
      organizationId: input.organizationId,
      providerAccountId: run.providerAccountId,
      reconciliationRunId: run.id,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
    })
    const signedSourceHash = reconciliationCertificateSourceEvidenceHash(run.certificatePayload)
    if (!signedSourceHash || signedSourceHash !== sourceEvidence.sourceHash) {
      await recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
        sourceCode: "PAYMENT_RECONCILIATION_CERTIFICATE_HASH_DRIFT",
        sourceId: run.id,
        periodId: run.accountingPeriodId ?? run.accountingPeriod?.id ?? null,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        staleReason: "Payment reconciliation source evidence changed after sign-off.",
        previousEvidenceHash: signedSourceHash,
        newEvidenceHash: sourceEvidence.sourceHash,
        correlationId,
      }, {
        actorId: input.exportedById,
        now,
      })
      return { driftError: "Reconciliation source evidence drift detected; rerun reconciliation and sign-off before export." }
    }

    const payload = {
      certificate: run.certificatePayload,
      export: {
        exportedAt: now.toISOString(),
        exportedById: input.exportedById,
        correlationId,
        watermarkId,
        rowCount,
        redaction: "raw provider payloads and secrets excluded",
      },
    }
    const content = JSON.stringify(payload, null, 2)
    const exportHash = sha256(content)

    const inbox = await tx.paymentReconciliationInboxItem.upsert({
      where: {
        organizationId_source_idempotencyKey: {
          organizationId: input.organizationId,
          source: PaymentReconciliationInboxSource.CERTIFICATE_EXPORT,
          idempotencyKey: `${run.id}:${run.certificateHash}:${fileType}`,
        },
      },
      create: {
        organizationId: input.organizationId,
        providerAccountId: run.providerAccountId,
        source: PaymentReconciliationInboxSource.CERTIFICATE_EXPORT,
        status: PaymentReconciliationInboxStatus.PROCESSED,
        idempotencyKey: `${run.id}:${run.certificateHash}:${fileType}`,
        externalId: watermarkId,
        payloadHash: exportHash,
        payloadSummary: asJsonObject({
          runId: run.id,
          certificateHash: run.certificateHash,
          rowCount,
          fileType,
          watermarkId,
        }),
        processedAt: now,
        correlationId,
      },
      update: {
        attempts: { increment: 1 },
        payloadHash: exportHash,
        processedAt: now,
        correlationId,
      },
      select: { id: true },
    })

    await auditReconciliationCertification(tx, {
      organizationId: input.organizationId,
      actorId: input.exportedById,
      action: "PAYMENT_RECONCILIATION_CERTIFICATE_EXPORT",
      runId: run.id,
      message: `Payment reconciliation certificate ${watermarkId} exported`,
      metadata: asJsonObject({
        certificateHash: run.certificateHash,
        exportHash,
        rowCount,
        watermarkId,
        correlationId,
      }),
    })
    await recordBusinessEventInTx(tx, {
      organizationId: input.organizationId,
      eventType: "payment.reconciliation.certificate.exported",
      eventSource: "SYSTEM",
      idempotencyKey: `reconciliation-run:${run.id}:certificate-export:${exportHash}`,
      actorId: input.exportedById,
      sourceType: "PAYMENT_RECONCILIATION",
      sourceId: run.id,
      documentHash: exportHash,
      payload: {
        runId: run.id,
        providerAccountId: run.providerAccountId,
        paymentRailId: run.paymentRailId,
        accountingPeriodId: run.accountingPeriodId ?? run.accountingPeriod?.id ?? null,
        certificateHash: run.certificateHash,
        exportHash,
        rowCount,
        watermarkId,
        inboxItemId: inbox.id,
        exportedById: input.exportedById,
        exportedAt: now.toISOString(),
        correlationId,
      },
      outboxMessages: [
        {
          channel: "REPORT_EXPORT",
          eventName: "payment.reconciliation.certificate.exported",
          idempotencyKey: `reconciliation-run:${run.id}:certificate-export:${exportHash}:report-export`,
          payload: {
            runId: run.id,
            certificateHash: run.certificateHash,
            exportHash,
            watermarkId,
            rowCount,
            correlationId,
          },
        },
      ],
    })

    await recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
      sourceCode: "PAYMENT_RECONCILIATION_CERTIFICATE_EXPORTED",
      sourceId: run.id,
      periodId: run.accountingPeriodId ?? run.accountingPeriod?.id ?? null,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      staleReason: "Payment reconciliation certificate export changed certified close evidence.",
      previousEvidenceHash: run.certificateHash,
      newEvidenceHash: exportHash,
      correlationId,
    }, {
      actorId: input.exportedById,
      now,
    })

    return {
      value: {
        runId: run.id,
        fileName: `${watermarkId}.json`,
        mimeType: "application/json",
        content,
        certificateHash: run.certificateHash,
        watermarkId,
        rowCount,
        inboxItemId: inbox.id,
        correlationId,
      },
    }
  })

  if ("driftError" in result) {
    throw new BusinessRuleError(result.driftError)
  }

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
    throw new BusinessRuleError("Sensitive action denied.")
  }

  return result.value
}

