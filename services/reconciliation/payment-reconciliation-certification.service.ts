import {
  AccountingPeriodStatus,
  PaymentExceptionStatus,
  PaymentReconciliationInboxSource,
  PaymentReconciliationInboxStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  SuspenseStatus,
  Prisma,
} from "@prisma/client"
import { createHash, randomUUID } from "node:crypto"

import { db } from "@/prisma/db"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
  type SensitiveActionDecision,
} from "@/services/controls/sensitive-action.service"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"

type ControlContext = {
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
}

type ControlledResult<T> =
  | { denied: SensitiveActionDecision; value?: never }
  | { denied?: never; value: T }

export type SignReconciliationRunInput = {
  organizationId: string
  runId: string
  signedById: string
  control: ControlContext
  correlationId?: string
}

export type SignReconciliationRunResult = {
  runId: string
  status: ReconciliationRunStatus
  certificateHash: string
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
) {
  const run = await tx.reconciliationRun.findFirst({
    where: { id: runId, organizationId },
    include: {
      accountingPeriod: { select: { id: true, status: true, startDate: true, endDate: true } },
      paymentRail: { select: { id: true, name: true, type: true } },
      providerAccount: { select: { id: true, displayName: true, providerCode: true, currencyCode: true } },
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

export async function signReconciliationRun(input: SignReconciliationRunInput): Promise<SignReconciliationRunResult> {
  const correlationId = input.correlationId ?? randomUUID()
  const now = input.control.now ? new Date(input.control.now) : new Date()

  const result = await db.$transaction(async (tx): Promise<ControlledResult<SignReconciliationRunResult>> => {
    const run = await loadRunForCertification(tx, input.organizationId, input.runId)

    const decision = evaluateSensitiveAction({
      action: "payment.reconciliation.sign",
      actorId: input.signedById,
      organizationId: input.organizationId,
      actorPermissions: input.control.actorPermissions,
      resourceType: "ReconciliationRun",
      resourceId: run.id,
      subjectActorId: run.runById,
      lastAuthAt: input.control.lastAuthAt,
      now,
      metadata: {
        providerAccountId: run.providerAccountId,
        businessDate: run.businessDate.toISOString(),
        status: run.status,
      },
    })
    await auditSensitiveActionDecision(tx, decision)
    if (!decision.allowed) return { denied: decision }

    if (run.status !== ReconciliationRunStatus.READY_FOR_SIGNOFF) {
      throw new BusinessRuleError("Only reconciliation runs ready for sign-off can be signed.")
    }

    if (run.signedAt || run.signedById || run.certificateHash) {
      throw new BusinessRuleError("Reconciliation run is already signed.")
    }

    const period = run.accountingPeriod ?? (await resolveOpenAccountingPeriod(tx, input.organizationId, run.businessDate))
    if (!period || period.status !== AccountingPeriodStatus.OPEN) {
      throw new BusinessRuleError("An open accounting period is required before reconciliation sign-off.")
    }

    const [providerEventCount, statementLineCount, openExceptionCount, openSuspenseCount, suspenseWithoutLedgerCount] = await Promise.all([
      tx.providerEvent.count({
        where: {
          organizationId: input.organizationId,
          providerAccountId: run.providerAccountId,
          status: { in: [ProviderEventStatus.VERIFIED, ProviderEventStatus.PROCESSED] },
          receivedAt: { gte: run.periodStart, lt: run.periodEnd },
        },
      }),
      tx.statementLine.count({
        where: {
          organizationId: input.organizationId,
          providerAccountId: run.providerAccountId,
          occurredAt: { gte: run.periodStart, lt: run.periodEnd },
        },
      }),
      tx.paymentException.count({
        where: {
          organizationId: input.organizationId,
          reconciliationRunId: run.id,
          status: { in: openExceptionStatuses() },
        },
      }),
      tx.suspenseItem.count({
        where: {
          organizationId: input.organizationId,
          reconciliationRunId: run.id,
          status: { in: openSuspenseStatuses() },
        },
      }),
      tx.suspenseItem.count({
        where: {
          organizationId: input.organizationId,
          reconciliationRunId: run.id,
          status: SuspenseStatus.POSTED_TO_SUSPENSE,
          ledgerPostingBatchId: null,
        },
      }),
    ])

    if (providerEventCount + statementLineCount === 0) {
      throw new BusinessRuleError("Provider events or statement lines are required before reconciliation sign-off.")
    }

    if (openExceptionCount > 0) {
      throw new BusinessRuleError("Open reconciliation exceptions must be resolved before sign-off.")
    }

    if (openSuspenseCount > 0) {
      throw new BusinessRuleError("Open suspense items must be resolved before sign-off.")
    }

    if (suspenseWithoutLedgerCount > 0) {
      throw new BusinessRuleError("Posted suspense items must include a ledger posting batch before sign-off.")
    }

    const certificatePayload = {
      version: 1,
      mode: "DURABLE_EVIDENCE_KERNEL",
      organizationId: input.organizationId,
      runId: run.id,
      providerAccountId: run.providerAccountId,
      paymentRailId: run.paymentRailId,
      providerCode: run.providerAccount.providerCode,
      businessDate: run.businessDate.toISOString(),
      periodStart: run.periodStart.toISOString(),
      periodEnd: run.periodEnd.toISOString(),
      accountingPeriodId: period.id,
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
      },
      controls: {
        makerCheckerEnforced: true,
        freshAuthEnforced: true,
        periodOpenVerified: true,
        suspensePostingGatewayOnly: true,
      },
      signedById: input.signedById,
      signedAt: now.toISOString(),
      correlationId,
    }
    const certificateHash = certificatePayloadHash(certificatePayload)

    const signed = await tx.reconciliationRun.update({
      where: { id: run.id },
      data: {
        status: ReconciliationRunStatus.SIGNED,
        signedById: input.signedById,
        signedAt: now,
        certificateHash,
        certificatePayload: asJsonObject(certificatePayload),
        accountingPeriodId: period.id,
        metadata: asJsonObject({
          immutableAfterSignoff: true,
          signedCorrelationId: correlationId,
        }),
      },
      select: {
        id: true,
        status: true,
        certificateHash: true,
        signedAt: true,
      },
    })

    await auditReconciliationCertification(tx, {
      organizationId: input.organizationId,
      actorId: input.signedById,
      action: "PAYMENT_RECONCILIATION_RUN_SIGN",
      runId: run.id,
      message: `Payment reconciliation run ${run.id} signed`,
      metadata: asJsonObject({
        certificateHash,
        providerEventCount,
        statementLineCount,
        correlationId,
      }),
    })

    await recordBusinessEventInTx(tx, {
      organizationId: input.organizationId,
      eventType: "payment.reconciliation.signed",
      eventSource: "SYSTEM",
      idempotencyKey: `reconciliation-run:${run.id}:signed`,
      actorId: input.signedById,
      sourceType: "PAYMENT_RECONCILIATION",
      sourceId: run.id,
      documentHash: certificateHash,
      payload: {
        runId: run.id,
        providerAccountId: run.providerAccountId,
        paymentRailId: run.paymentRailId,
        accountingPeriodId: period.id,
        certificateHash,
        providerEventCount,
        statementLineCount,
        signedById: input.signedById,
        signedAt: now.toISOString(),
        correlationId,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "payment.reconciliation.signed",
          payload: {
            runId: run.id,
            providerAccountId: run.providerAccountId,
            certificateHash,
            signedAt: now.toISOString(),
            correlationId,
          },
        },
      ],
    })
    await recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
      sourceCode: "PAYMENT_RECONCILIATION_SIGNED",
      sourceId: run.id,
      periodId: period.id,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      staleReason: "Payment reconciliation sign-off changed certified close evidence.",
      newEvidenceHash: certificateHash,
      correlationId,
    }, {
      actorId: input.signedById,
      now,
    })

    return {
      value: {
        runId: signed.id,
        status: signed.status,
        certificateHash: signed.certificateHash ?? certificateHash,
        signedAt: (signed.signedAt ?? now).toISOString(),
        correlationId,
      },
    }
  })

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
    throw new BusinessRuleError("Sensitive action denied.")
  }

  return result.value
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

  const result = await db.$transaction(async (tx): Promise<ControlledResult<ReconciliationCertificateExportResult>> => {
    const run = await loadRunForCertification(tx, input.organizationId, input.runId)

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
      throw new BusinessRuleError("Reconciliation certificate hash drift detected; rerun sign-off before export.")
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

  if ("denied" in result && result.denied) {
    assertSensitiveActionAllowed(result.denied)
    throw new BusinessRuleError("Sensitive action denied.")
  }

  return result.value
}
