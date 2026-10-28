import {
  PaymentTransactionState,
  ProviderAccountStatus,
  ProviderEventStatus,
  Prisma,
} from "@prisma/client"
import { createHash } from "node:crypto"

import { BusinessRuleError } from "@/services/_shared/action-errors"

export type ProviderAccountReconciliationContext = {
  id: string
  status: ProviderAccountStatus
  settlementLedgerAccountId: string | null
  suspenseLedgerAccountId: string | null
  paymentRail: {
    id: string
    isActive: boolean
  }
  settlementAccounts: Array<{ id: string }>
}

export type ReconciliationEvidenceManifestResult = {
  version: 1
  sourceHash: string
  counts: {
    paymentTransactionCount: number
    providerEventCount: number
    statementFileCount: number
    statementLineCount: number
    matchRecordCount: number
    exceptionCount: number
    suspenseCount: number
  }
}

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null
}

function decimal(value: Prisma.Decimal | null | undefined) {
  return value?.toDecimalPlaces(2).toFixed(2) ?? null
}

function sortedById<T extends { id: string }>(rows: T[]) {
  return [...rows].sort((left, right) => left.id.localeCompare(right.id))
}

export function stableReconciliationEvidenceStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableReconciliationEvidenceStringify).join(",")}]`

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableReconciliationEvidenceStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`
}

export function reconciliationCertificateSourceEvidenceHash(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
  const evidence = (payload as Record<string, unknown>).evidence
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) return null
  const sourceHash = (evidence as Record<string, unknown>).sourceHash
  return typeof sourceHash === "string" && sourceHash.length > 0 ? sourceHash : null
}
export function assertProviderAccountReconciliationReady(
  providerAccount: ProviderAccountReconciliationContext,
) {
  if (providerAccount.status !== ProviderAccountStatus.ACTIVE) {
    throw new BusinessRuleError("An active provider account is required for payment reconciliation.")
  }
  if (!providerAccount.paymentRail.isActive) {
    throw new BusinessRuleError("An active payment rail is required for payment reconciliation.")
  }
  if (!providerAccount.settlementLedgerAccountId || !providerAccount.suspenseLedgerAccountId) {
    throw new BusinessRuleError("Provider settlement and suspense ledger mappings are required for payment reconciliation.")
  }
  if (providerAccount.settlementAccounts.length === 0) {
    throw new BusinessRuleError("An approved effective settlement account is required for payment reconciliation.")
  }
}

export async function buildReconciliationEvidenceManifestInTx(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    providerAccountId: string
    reconciliationRunId: string
    periodStart: Date
    periodEnd: Date
  },
): Promise<ReconciliationEvidenceManifestResult> {
  const [
    paymentTransactions,
    providerEvents,
    statementFiles,
    statementLines,
    matchRecords,
    exceptions,
    suspenseItems,
  ] = await Promise.all([
    tx.paymentTransaction.findMany({
      where: {
        organizationId: input.organizationId,
        providerAccountId: input.providerAccountId,
        state: { in: [PaymentTransactionState.CONFIRMED, PaymentTransactionState.SETTLED] },
        occurredAt: { gte: input.periodStart, lt: input.periodEnd },
      },
      select: {
        id: true,
        state: true,
        amount: true,
        feeAmount: true,
        currencyCode: true,
        payloadHash: true,
        ledgerPostingBatchId: true,
        occurredAt: true,
      },
    }),
    tx.providerEvent.findMany({
      where: {
        organizationId: input.organizationId,
        providerAccountId: input.providerAccountId,
        status: { in: [ProviderEventStatus.VERIFIED, ProviderEventStatus.PROCESSED] },
        OR: [
          { occurredAt: { gte: input.periodStart, lt: input.periodEnd } },
          { receivedAt: { gte: input.periodStart, lt: input.periodEnd } },
        ],
      },
      select: {
        id: true,
        status: true,
        rawPayloadHash: true,
        signatureValid: true,
        amount: true,
        currencyCode: true,
        occurredAt: true,
        receivedAt: true,
      },
    }),
    tx.statementFile.findMany({
      where: {
        organizationId: input.organizationId,
        providerAccountId: input.providerAccountId,
        lines: {
          some: { occurredAt: { gte: input.periodStart, lt: input.periodEnd } },
        },
      },
      select: {
        id: true,
        fileHash: true,
        status: true,
        _count: { select: { lines: true } },
        periodStart: true,
        periodEnd: true,
      },
    }),
    tx.statementLine.findMany({
      where: {
        organizationId: input.organizationId,
        providerAccountId: input.providerAccountId,
        occurredAt: { gte: input.periodStart, lt: input.periodEnd },
      },
      select: {
        id: true,
        statementFileId: true,
        fingerprint: true,
        status: true,
        direction: true,
        amount: true,
        currencyCode: true,
        occurredAt: true,
      },
    }),
    tx.matchRecord.findMany({
      where: { organizationId: input.organizationId, reconciliationRunId: input.reconciliationRunId },
      select: {
        id: true,
        status: true,
        rule: true,
        paymentTransactionId: true,
        providerEventId: true,
        statementLineId: true,
        ledgerPostingBatchId: true,
        amountMatched: true,
        currencyCode: true,
      },
    }),
    tx.paymentException.findMany({
      where: { organizationId: input.organizationId, reconciliationRunId: input.reconciliationRunId },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        paymentTransactionId: true,
        providerEventId: true,
        statementLineId: true,
        suspenseItemId: true,
        resolvedAt: true,
      },
    }),
    tx.suspenseItem.findMany({
      where: { organizationId: input.organizationId, reconciliationRunId: input.reconciliationRunId },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        amount: true,
        currencyCode: true,
        ledgerPostingBatchId: true,
        resolvedAt: true,
      },
    }),
  ])

  const manifest = {
    version: 1,
    providerAccountId: input.providerAccountId,
    reconciliationRunId: input.reconciliationRunId,
    periodStart: input.periodStart.toISOString(),
    periodEnd: input.periodEnd.toISOString(),
    paymentTransactions: sortedById(paymentTransactions).map((row) => ({
      id: row.id,
      state: row.state,
      amount: decimal(row.amount),
      feeAmount: decimal(row.feeAmount),
      currencyCode: row.currencyCode,
      payloadHash: row.payloadHash,
      ledgerPostingBatchId: row.ledgerPostingBatchId,
      occurredAt: iso(row.occurredAt),
    })),
    providerEvents: sortedById(providerEvents).map((row) => ({
      id: row.id,
      status: row.status,
      payloadHash: row.rawPayloadHash,
      signatureValid: row.signatureValid,
      amount: decimal(row.amount),
      currencyCode: row.currencyCode,
      occurredAt: iso(row.occurredAt),
      receivedAt: row.receivedAt.toISOString(),
    })),
    statementFiles: sortedById(statementFiles).map((row) => ({
      id: row.id,
      fileHash: row.fileHash,
      status: row.status,
      lineCount: row._count.lines,
      periodStart: iso(row.periodStart),
      periodEnd: iso(row.periodEnd),
    })),
    statementLines: sortedById(statementLines).map((row) => ({
      id: row.id,
      statementFileId: row.statementFileId,
      fingerprint: row.fingerprint,
      status: row.status,
      direction: row.direction,
      amount: decimal(row.amount),
      currencyCode: row.currencyCode,
      occurredAt: row.occurredAt.toISOString(),
    })),
    matchRecords: sortedById(matchRecords).map((row) => ({
      id: row.id,
      status: row.status,
      rule: row.rule,
      paymentTransactionId: row.paymentTransactionId,
      providerEventId: row.providerEventId,
      statementLineId: row.statementLineId,
      ledgerPostingBatchId: row.ledgerPostingBatchId,
      amountMatched: decimal(row.amountMatched),
      currencyCode: row.currencyCode,
    })),
    exceptions: sortedById(exceptions).map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      status: row.status,
      paymentTransactionId: row.paymentTransactionId,
      providerEventId: row.providerEventId,
      statementLineId: row.statementLineId,
      suspenseItemId: row.suspenseItemId,
      resolvedAt: iso(row.resolvedAt),
    })),
    suspenseItems: sortedById(suspenseItems).map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      status: row.status,
      amount: decimal(row.amount),
      currencyCode: row.currencyCode,
      ledgerPostingBatchId: row.ledgerPostingBatchId,
      resolvedAt: iso(row.resolvedAt),
    })),
  }

  return {
    version: 1,
    sourceHash: createHash("sha256").update(stableReconciliationEvidenceStringify(manifest)).digest("hex"),
    counts: {
      paymentTransactionCount: paymentTransactions.length,
      providerEventCount: providerEvents.length,
      statementFileCount: statementFiles.length,
      statementLineCount: statementLines.length,
      matchRecordCount: matchRecords.length,
      exceptionCount: exceptions.length,
      suspenseCount: suspenseItems.length,
    },
  }
}
