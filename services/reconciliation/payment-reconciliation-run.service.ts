import {
  ExceptionSeverity,
  MatchRule,
  MatchStatus,
  PaymentDirection,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentTransactionState,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementLineStatus,
  SuspenseStatus,
  SuspenseType,
  Prisma,
} from "@prisma/client"
import { randomUUID } from "node:crypto"

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"

import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"

export type RunPaymentReconciliationInput = {
  organizationId: string
  providerAccountId: string
  businessDate: Date
  runById?: string
  correlationId?: string
}

export type RunPaymentReconciliationResult = {
  runId: string
  status: ReconciliationRunStatus
  matchCount: number
  exceptionCount: number
  suspenseCount: number
  suspenseAmount: string
  correlationId: string
}

export type ProposeManualMatchInput = {
  organizationId: string
  providerAccountId: string
  paymentTransactionId: string
  providerEventId?: string
  statementLineId?: string
  proposedById: string
  amountMatched: Prisma.Decimal.Value
  currencyCode?: string
  correlationId?: string
}

export type ApproveManualMatchInput = {
  organizationId: string
  proposedMatchId: string
  approvedById: string
  correlationId?: string
}

function money(value: Prisma.Decimal.Value | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = startOfDay(date)
  next.setUTCDate(next.getUTCDate() + 1)
  return next
}

function sameAmount(
  left: Prisma.Decimal.Value | null | undefined,
  right: Prisma.Decimal.Value | null | undefined,
) {
  return money(left).eq(money(right))
}

function key(value: string | null | undefined) {
  return value?.trim().toUpperCase() || null
}

function mapByKey<T>(records: T[], pick: (record: T) => string | null | undefined) {
  const map = new Map<string, T>()
  for (const record of records) {
    const recordKey = key(pick(record))
    if (recordKey && !map.has(recordKey)) map.set(recordKey, record)
  }
  return map
}

function getByMaybeKey<T>(map: Map<string, T>, value: string | null | undefined) {
  const recordKey = key(value)
  return recordKey ? map.get(recordKey) : undefined
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function reconciliationRunDedupeKey(input: {
  organizationId: string
  providerAccountId: string
  periodStart: Date
}) {
  return [
    input.organizationId,
    input.providerAccountId,
    input.periodStart.toISOString().slice(0, 10),
  ].join(":")
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002")
}

function duplicateRunMessage(status?: ReconciliationRunStatus | null) {
  if (status === ReconciliationRunStatus.RUNNING) {
    return "A payment reconciliation run is already in progress for this provider and business date."
  }
  return "A payment reconciliation run already exists for this provider and business date."
}

function suspenseTypeForException(type: PaymentExceptionType) {
  if (type === PaymentExceptionType.MISSING_PROVIDER_EVENT) return SuspenseType.MISSING_CALLBACK
  if (type === PaymentExceptionType.MISSING_STATEMENT_LINE) return SuspenseType.MISSING_STATEMENT_LINE
  if (type === PaymentExceptionType.AMOUNT_MISMATCH) return SuspenseType.AMOUNT_MISMATCH
  if (type === PaymentExceptionType.MISSING_INTERNAL_PAYMENT) return SuspenseType.UNKNOWN_CREDIT
  if (type === PaymentExceptionType.FEE_DEVIATION) return SuspenseType.FEE_DEVIATION
  return SuspenseType.OTHER
}

async function createExceptionAndSuspense(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    providerAccountId: string
    reconciliationRunId: string
    paymentTransactionId?: string | null
    providerEventId?: string | null
    statementLineId?: string | null
    type: PaymentExceptionType
    severity: ExceptionSeverity
    amount: Prisma.Decimal.Value
    currencyCode: string
    direction: PaymentDirection
    evidence: Prisma.InputJsonObject
    correlationId: string
    now: Date
  },
) {
  const exception = await tx.paymentException.create({
    data: {
      organizationId: input.organizationId,
      providerAccountId: input.providerAccountId,
      paymentTransactionId: input.paymentTransactionId,
      providerEventId: input.providerEventId,
      statementLineId: input.statementLineId,
      reconciliationRunId: input.reconciliationRunId,
      type: input.type,
      severity: input.severity,
      status: PaymentExceptionStatus.OPEN,
      sourceType: "ReconciliationRun",
      sourceId: input.reconciliationRunId,
      evidence: input.evidence,
      slaDeadline: addDays(input.now, input.severity === ExceptionSeverity.CRITICAL ? 1 : 3),
      correlationId: input.correlationId,
    },
    select: { id: true },
  })

  const suspense = await tx.suspenseItem.create({
    data: {
      organizationId: input.organizationId,
      providerAccountId: input.providerAccountId,
      paymentTransactionId: input.paymentTransactionId,
      reconciliationRunId: input.reconciliationRunId,
      type: suspenseTypeForException(input.type),
      status: SuspenseStatus.OPEN,
      severity: input.severity,
      direction: input.direction,
      amount: money(input.amount),
      currencyCode: input.currencyCode,
      slaDeadline: addDays(input.now, input.severity === ExceptionSeverity.CRITICAL ? 1 : 3),
      evidence: {
        ...input.evidence,
        exceptionId: exception.id,
      },
      correlationId: input.correlationId,
    },
    select: { id: true },
  })

  await publishPaymentReconciliationNotification({
    type: "payment-reconciliation.exception.created",
    organizationId: input.organizationId,
    providerAccountId: input.providerAccountId,
    severity: input.severity,
    amount: money(input.amount).toFixed(2),
    currency: input.currencyCode,
    dueAt: addDays(input.now, input.severity === ExceptionSeverity.CRITICAL ? 1 : 3),
    evidenceRef: {
      providerEventId: input.providerEventId,
      statementLineId: input.statementLineId,
      paymentTransactionId: input.paymentTransactionId,
      reconciliationRunId: input.reconciliationRunId,
      suspenseItemId: suspense.id,
      exceptionId: exception.id,
    },
    correlationId: input.correlationId,
  }, tx)

  await publishPaymentReconciliationNotification({
    type: "payment-reconciliation.suspense.created",
    organizationId: input.organizationId,
    providerAccountId: input.providerAccountId,
    severity: input.severity,
    amount: money(input.amount).toFixed(2),
    currency: input.currencyCode,
    dueAt: addDays(input.now, input.severity === ExceptionSeverity.CRITICAL ? 1 : 3),
    evidenceRef: {
      providerEventId: input.providerEventId,
      statementLineId: input.statementLineId,
      paymentTransactionId: input.paymentTransactionId,
      reconciliationRunId: input.reconciliationRunId,
      suspenseItemId: suspense.id,
      exceptionId: exception.id,
    },
    correlationId: input.correlationId,
  }, tx)

  return { exceptionId: exception.id, suspenseItemId: suspense.id }
}

export async function runPaymentReconciliation(
  input: RunPaymentReconciliationInput,
): Promise<RunPaymentReconciliationResult> {
  const correlationId = input.correlationId ?? randomUUID()
  const periodStart = startOfDay(input.businessDate)
  const periodEnd = endOfDay(input.businessDate)
  const runDedupeKey = reconciliationRunDedupeKey({
    organizationId: input.organizationId,
    providerAccountId: input.providerAccountId,
    periodStart,
  })
  const now = new Date()

  logger.info("payment-reconciliation.run.start", {
    organizationId: input.organizationId,
    providerAccountId: input.providerAccountId,
    businessDate: periodStart.toISOString(),
    correlationId,
  })

  return db.$transaction(
    async (tx) => {
      const providerAccount = await tx.providerAccount.findFirst({
        where: { id: input.providerAccountId, organizationId: input.organizationId },
        select: { id: true, paymentRailId: true, currencyCode: true },
      })

      if (!providerAccount) throw new NotFoundError("Provider account not found")

      const existingRun = await tx.reconciliationRun.findFirst({
        where: {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          businessDate: periodStart,
          voidedAt: null,
        },
        select: {
          id: true,
          status: true,
          correlationId: true,
        },
      })

      if (existingRun) {
        throw new ConflictError(duplicateRunMessage(existingRun.status))
      }

      let run: { id: string }
      try {
        run = await tx.reconciliationRun.create({
          data: {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          paymentRailId: providerAccount.paymentRailId,
          businessDate: periodStart,
          periodStart,
          periodEnd,
          status: ReconciliationRunStatus.RUNNING,
          runById: input.runById,
          correlationId,
          metadata: {
            runDedupeKey,
            concurrencyGuard: "same_provider_business_date",
          },
        },
          select: { id: true },
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ConflictError(duplicateRunMessage())
        }
        throw new ConflictError("Payment reconciliation run could not be started safely.")
      }

      const [transactions, providerEvents, statementLines] = await Promise.all([
        tx.paymentTransaction.findMany({
          where: {
            organizationId: input.organizationId,
            providerAccountId: providerAccount.id,
            occurredAt: { gte: periodStart, lt: periodEnd },
            state: { in: [PaymentTransactionState.CONFIRMED, PaymentTransactionState.SETTLED] },
          },
        }),
        tx.providerEvent.findMany({
          where: {
            organizationId: input.organizationId,
            providerAccountId: providerAccount.id,
            status: { in: [ProviderEventStatus.VERIFIED, ProviderEventStatus.PROCESSED] },
            OR: [{ occurredAt: { gte: periodStart, lt: periodEnd } }, { receivedAt: { gte: periodStart, lt: periodEnd } }],
          },
        }),
        tx.statementLine.findMany({
          where: {
            organizationId: input.organizationId,
            providerAccountId: providerAccount.id,
            status: StatementLineStatus.UNMATCHED,
            occurredAt: { gte: periodStart, lt: periodEnd },
          },
        }),
      ])

      const eventByTransactionId = mapByKey(providerEvents, (event) => event.providerTransactionId)
      const eventByReference = mapByKey(providerEvents, (event) => event.providerReference)
      const lineByTransactionId = mapByKey(statementLines, (line) => line.providerTransactionId)
      const lineByReference = mapByKey(statementLines, (line) => line.providerReference)
      const matchedEventIds = new Set<string>()
      const matchedLineIds = new Set<string>()
      const matchedTransactionIds = new Set<string>()

      let matchCount = 0
      let exceptionCount = 0
      let suspenseCount = 0
      let suspenseAmount = new Prisma.Decimal(0)

      for (const transaction of transactions) {
        const event =
          getByMaybeKey(eventByTransactionId, transaction.providerTransactionId) ??
          getByMaybeKey(eventByReference, transaction.providerReference)
        const line =
          getByMaybeKey(lineByTransactionId, transaction.providerTransactionId) ??
          getByMaybeKey(lineByReference, transaction.providerReference)

        const externalAmount = event?.amount ?? line?.amount
        const externalCurrency = event?.currencyCode ?? line?.currencyCode ?? transaction.currencyCode

        if (event && event.amount && !sameAmount(transaction.amount, event.amount)) {
          const suspense = await createExceptionAndSuspense(tx, {
            organizationId: input.organizationId,
            providerAccountId: providerAccount.id,
            reconciliationRunId: run.id,
            paymentTransactionId: transaction.id,
            providerEventId: event.id,
            statementLineId: line?.id,
            type: PaymentExceptionType.AMOUNT_MISMATCH,
            severity: ExceptionSeverity.HIGH,
            amount: transaction.amount,
            currencyCode: transaction.currencyCode,
            direction: transaction.direction,
            evidence: {
              transactionAmount: money(transaction.amount).toFixed(2),
              providerAmount: money(event.amount).toFixed(2),
              rule: "AMOUNT_MISMATCH",
            },
            correlationId,
            now,
          })
          exceptionCount += 1
          suspenseCount += 1
          suspenseAmount = suspenseAmount.plus(transaction.amount)
          matchedEventIds.add(event.id)
          if (line) matchedLineIds.add(line.id)
          matchedTransactionIds.add(transaction.id)
          continue
        }

        if (event || line) {
          await tx.matchRecord.create({
            data: {
              organizationId: input.organizationId,
              providerAccountId: providerAccount.id,
              paymentTransactionId: transaction.id,
              providerEventId: event?.id,
              statementLineId: line?.id,
              reconciliationRunId: run.id,
              rule: event?.providerTransactionId || line?.providerTransactionId
                ? MatchRule.EXACT_PROVIDER_TRANSACTION_ID
                : MatchRule.EXACT_PROVIDER_REFERENCE,
              status: MatchStatus.AUTO_MATCHED,
              confidence: new Prisma.Decimal(100),
              amountMatched: externalAmount ? money(externalAmount) : money(transaction.amount),
              currencyCode: externalCurrency,
              matchedAt: now,
              correlationId,
              metadata: {
                matchedBy: "SYSTEM",
                cascade: event ? "PROVIDER_EVENT" : "STATEMENT_LINE",
              },
            },
          })

          matchCount += 1
          matchedTransactionIds.add(transaction.id)
          if (event) matchedEventIds.add(event.id)
          if (line) matchedLineIds.add(line.id)
          continue
        }

        await createExceptionAndSuspense(tx, {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          reconciliationRunId: run.id,
          paymentTransactionId: transaction.id,
          type: PaymentExceptionType.MISSING_PROVIDER_EVENT,
          severity: ExceptionSeverity.HIGH,
          amount: transaction.amount,
          currencyCode: transaction.currencyCode,
          direction: transaction.direction,
          evidence: {
            providerTransactionId: transaction.providerTransactionId,
            providerReference: transaction.providerReference,
            rule: "MISSING_EXTERNAL_EVIDENCE",
          },
          correlationId,
          now,
        })
        exceptionCount += 1
        suspenseCount += 1
        suspenseAmount = suspenseAmount.plus(transaction.amount)
        matchedTransactionIds.add(transaction.id)
      }

      for (const event of providerEvents) {
        if (matchedEventIds.has(event.id)) continue

        await createExceptionAndSuspense(tx, {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          reconciliationRunId: run.id,
          providerEventId: event.id,
          type: PaymentExceptionType.MISSING_INTERNAL_PAYMENT,
          severity: ExceptionSeverity.HIGH,
          amount: event.amount ?? 0,
          currencyCode: event.currencyCode,
          direction: event.direction ?? PaymentDirection.INBOUND,
          evidence: {
            providerEventId: event.providerEventId,
            providerTransactionId: event.providerTransactionId,
            providerReference: event.providerReference,
            rule: "ORPHAN_PROVIDER_EVENT",
          },
          correlationId,
          now,
        })
        exceptionCount += 1
        suspenseCount += 1
        suspenseAmount = suspenseAmount.plus(event.amount ?? 0)
      }

      for (const line of statementLines) {
        if (matchedLineIds.has(line.id)) continue

        await createExceptionAndSuspense(tx, {
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          reconciliationRunId: run.id,
          statementLineId: line.id,
          type: PaymentExceptionType.MISSING_INTERNAL_PAYMENT,
          severity: ExceptionSeverity.HIGH,
          amount: line.amount,
          currencyCode: line.currencyCode,
          direction: line.direction === "DEBIT" ? PaymentDirection.OUTBOUND : PaymentDirection.INBOUND,
          evidence: {
            statementLineId: line.id,
            providerTransactionId: line.providerTransactionId,
            providerReference: line.providerReference,
            fingerprint: line.fingerprint,
            rule: "ORPHAN_STATEMENT_LINE",
          },
          correlationId,
          now,
        })
        exceptionCount += 1
        suspenseCount += 1
        suspenseAmount = suspenseAmount.plus(line.amount)
      }

      const status = exceptionCount > 0 ? ReconciliationRunStatus.NEEDS_REVIEW : ReconciliationRunStatus.READY_FOR_SIGNOFF
      await tx.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status,
          totalInternalAmount: transactions.reduce((sum, transaction) => sum.plus(transaction.amount), new Prisma.Decimal(0)),
          totalExternalAmount: providerEvents
            .reduce((sum, event) => sum.plus(event.amount ?? 0), new Prisma.Decimal(0))
            .plus(statementLines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0))),
          matchedAmount: transactions
            .filter((transaction) => matchedTransactionIds.has(transaction.id))
            .reduce((sum, transaction) => sum.plus(transaction.amount), new Prisma.Decimal(0)),
          suspenseAmount,
          exceptionCount,
          matchCount,
          invariantResult: {
            openSuspenseAmount: suspenseAmount.toFixed(2),
            matchCount,
            exceptionCount,
            suspenseCount,
            ledgerPostingRequested: false,
          },
        },
      })

      if (status === ReconciliationRunStatus.READY_FOR_SIGNOFF) {
        await publishPaymentReconciliationNotification({
          type: "payment-reconciliation.run.ready-for-signoff",
          organizationId: input.organizationId,
          providerAccountId: providerAccount.id,
          paymentRailId: providerAccount.paymentRailId,
          evidenceRef: { reconciliationRunId: run.id },
          correlationId,
        }, tx)
      }

      logger.info("payment-reconciliation.run.completed", {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        runId: run.id,
        status,
        matchCount,
        exceptionCount,
        suspenseCount,
        correlationId,
      })

      return {
        runId: run.id,
        status,
        matchCount,
        exceptionCount,
        suspenseCount,
        suspenseAmount: suspenseAmount.toFixed(2),
        correlationId,
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

export async function proposeManualMatch(input: ProposeManualMatchInput) {
  if (!input.providerEventId && !input.statementLineId) {
    throw new BusinessRuleError("Manual match requires provider event or statement line evidence.")
  }

  const correlationId = input.correlationId ?? randomUUID()
  const match = await db.matchRecord.create({
    data: {
      organizationId: input.organizationId,
      providerAccountId: input.providerAccountId,
      paymentTransactionId: input.paymentTransactionId,
      providerEventId: input.providerEventId,
      statementLineId: input.statementLineId,
      rule: MatchRule.MANUAL,
      status: MatchStatus.PROPOSED,
      confidence: new Prisma.Decimal(75),
      amountMatched: money(input.amountMatched),
      currencyCode: input.currencyCode ?? "XAF",
      matchedById: input.proposedById,
      matchedAt: new Date(),
      correlationId,
      metadata: {
        proposedById: input.proposedById,
        makerCheckerRequired: true,
      },
    },
    select: { id: true },
  })

  await publishPaymentReconciliationNotification({
    type: "payment-reconciliation.manual-match.proposed",
    organizationId: input.organizationId,
    providerAccountId: input.providerAccountId,
    amount: money(input.amountMatched).toFixed(2),
    currency: input.currencyCode ?? "XAF",
    evidenceRef: {
      paymentTransactionId: input.paymentTransactionId,
      providerEventId: input.providerEventId,
      statementLineId: input.statementLineId,
    },
    correlationId,
  })

  return { matchId: match.id, correlationId }
}

export async function approveManualMatch(input: ApproveManualMatchInput) {
  const correlationId = input.correlationId ?? randomUUID()
  const proposed = await db.matchRecord.findFirst({
    where: {
      id: input.proposedMatchId,
      organizationId: input.organizationId,
      status: MatchStatus.PROPOSED,
    },
  })

  if (!proposed) throw new NotFoundError("Proposed match not found")
  if (proposed.matchedById === input.approvedById) {
    throw new BusinessRuleError("Manual match approval requires an independent reviewer.")
  }

  const approved = await db.matchRecord.create({
    data: {
      organizationId: proposed.organizationId,
      providerAccountId: proposed.providerAccountId,
      paymentTransactionId: proposed.paymentTransactionId,
      providerEventId: proposed.providerEventId,
      statementLineId: proposed.statementLineId,
      reconciliationRunId: proposed.reconciliationRunId,
      ledgerPostingBatchId: proposed.ledgerPostingBatchId,
      rule: MatchRule.MANUAL,
      status: MatchStatus.APPROVED,
      confidence: proposed.confidence,
      amountMatched: proposed.amountMatched,
      currencyCode: proposed.currencyCode,
      matchedById: input.approvedById,
      matchedAt: new Date(),
      correctionOfId: proposed.id,
      correctionReason: "MANUAL_MATCH_APPROVED",
      correlationId,
      metadata: {
        approvedById: input.approvedById,
        proposedById: proposed.matchedById,
      },
    },
    select: { id: true },
  })

  await publishPaymentReconciliationNotification({
    type: "payment-reconciliation.manual-match.approved",
    organizationId: input.organizationId,
    providerAccountId: proposed.providerAccountId,
    amount: proposed.amountMatched?.toFixed(2) ?? null,
    currency: proposed.currencyCode,
    evidenceRef: {
      paymentTransactionId: proposed.paymentTransactionId,
      providerEventId: proposed.providerEventId,
      statementLineId: proposed.statementLineId,
      reconciliationRunId: proposed.reconciliationRunId,
    },
    correlationId,
  })

  return { matchId: approved.id, correlationId }
}
