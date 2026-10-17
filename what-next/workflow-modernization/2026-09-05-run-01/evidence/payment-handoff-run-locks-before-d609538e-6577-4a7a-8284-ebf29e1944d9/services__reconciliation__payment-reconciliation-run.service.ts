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
  SettlementAccountApprovalStatus,
  StatementLineDirection,
  StatementLineStatus,
  SuspenseStatus,
  SuspenseType,
  Prisma,
} from "@prisma/client"
import { randomUUID } from "node:crypto"

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { assertModuleNewWorkInTx } from "@/services/modules/module-admission.service"
import { loadProviderOperationIntent } from "@/services/payments/provider-operation-evidence"

import { assertProviderAccountReconciliationReady } from "./payment-reconciliation-evidence.service"
import { publishPaymentReconciliationNotification } from "./payment-reconciliation-notifications"

export type RunPaymentReconciliationInput = {
  organizationId: string
  providerAccountId: string
  businessDate: Date
  runById?: string
  correlationId?: string
  providerOperationId?: string
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
  const map = new Map<string, T[]>()
  for (const record of records) {
    const recordKey = key(pick(record))
    if (recordKey) map.set(recordKey, [...(map.get(recordKey) ?? []), record])
  }
  return map
}

function getByMaybeKey<T>(map: Map<string, T[]>, value: string | null | undefined) {
  const recordKey = key(value)
  return (recordKey ? map.get(recordKey) : undefined) ?? []
}

function candidatesFor<T extends { id: string }>(
  byTransactionId: Map<string, T[]>,
  byReference: Map<string, T[]>,
  transaction: { providerTransactionId: string | null; providerReference: string | null },
) {
  return [...new Map([
    ...getByMaybeKey(byTransactionId, transaction.providerTransactionId),
    ...getByMaybeKey(byReference, transaction.providerReference),
  ].map(record => [record.id, record])).values()].sort((left, right) => left.id.localeCompare(right.id))
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

  // Both directions are needed by assignment, review and source-owned recovery.
  // Keep the relational link in the same transaction as the two records.
  await tx.paymentException.update({
    where: { id: exception.id, organizationId: input.organizationId },
    data: { suspenseItemId: suspense.id },
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

// Shared matcher for a new run and explicitly reviewed additions. Existing allocations
// are checked before any new disposition is created; callers own the transaction.
export async function reconcileUnallocatedSourcesInTx(tx: Prisma.TransactionClient, input: {
  organizationId: string
  providerAccount: { id: string }
  run: { id: string }
  transactions: Prisma.PaymentTransactionGetPayload<{}>[]
  providerEvents: Prisma.ProviderEventGetPayload<{}>[]
  statementLines: Prisma.StatementLineGetPayload<{}>[]
  correlationId: string
  now: Date
  reservedReferences?: readonly string[]
}) {
  const { providerAccount, run, transactions, providerEvents, statementLines, correlationId, now } = input
  const reserved = new Set(input.reservedReferences ?? [])
  const touchesRetained = (source: { providerTransactionId: string | null; providerReference: string | null }) =>
    [key(source.providerTransactionId), key(source.providerReference)].some(value => value !== null && reserved.has(value))
  const eventByTransactionId = mapByKey(providerEvents, (event) => event.providerTransactionId)
  const eventByReference = mapByKey(providerEvents, (event) => event.providerReference)
  const lineByTransactionId = mapByKey(statementLines, (line) => line.providerTransactionId)
  const lineByReference = mapByKey(statementLines, (line) => line.providerReference)
  const matchedEventIds = new Set<string>()
  const matchedLineIds = new Set<string>()
  const matchedTransactionIds = new Set<string>()
  // Resolve all claims before choosing a match: query order must not decide
  // which internal payment receives shared external evidence.
  const candidates = transactions.map(transaction => ({
    transaction,
    events: candidatesFor(eventByTransactionId, eventByReference, transaction),
    lines: candidatesFor(lineByTransactionId, lineByReference, transaction),
  }))
  const eventClaims = new Map<string, number>()
  const lineClaims = new Map<string, number>()
  for (const candidate of candidates) {
    for (const event of candidate.events) eventClaims.set(event.id, (eventClaims.get(event.id) ?? 0) + 1)
    for (const line of candidate.lines) lineClaims.set(line.id, (lineClaims.get(line.id) ?? 0) + 1)
  }
  const priorMatches = await tx.matchRecord.findMany({
    where: {
      organizationId: input.organizationId,
      providerAccountId: providerAccount.id,
      status: { in: [MatchStatus.AUTO_MATCHED, MatchStatus.APPROVED, MatchStatus.CORRECTED] },
      OR: [
        { paymentTransactionId: { in: transactions.map(transaction => transaction.id) } },
        { providerEventId: { in: providerEvents.map(event => event.id) } },
        { statementLineId: { in: statementLines.map(line => line.id) } },
      ],
    },
    select: { id: true, paymentTransactionId: true, providerEventId: true, statementLineId: true },
  })
  if (priorMatches.length > 0) {
    // A new suspense row would itself duplicate an existing allocation.
    // Roll back this run and require review of the retained match instead.
    throw new ConflictError("Payment evidence is already allocated to an existing match. Review the existing reconciliation before starting another run.")
  }

  let matchCount = 0
  let exceptionCount = 0
  let suspenseCount = 0
  let suspenseAmount = new Prisma.Decimal(0)

  for (const { transaction, events, lines } of candidates) {
    const event = events.length === 1 ? events[0] : undefined
    const line = lines.length === 1 ? lines[0] : undefined
    const ambiguous = touchesRetained(transaction) || events.some(touchesRetained) || lines.some(touchesRetained)
      || events.length > 1 || lines.length > 1
      || events.some(candidate => eventClaims.get(candidate.id)! > 1)
      || lines.some(candidate => lineClaims.get(candidate.id)! > 1)

    const externalAmount = event?.amount ?? line?.amount
    const externalCurrency = event?.currencyCode ?? line?.currencyCode ?? transaction.currencyCode
    const mismatchReasons = [
      ambiguous ? "AMBIGUOUS_EXTERNAL_EVIDENCE" : null,
      event?.amount !== null && event?.amount !== undefined && !sameAmount(transaction.amount, event.amount)
        ? "PROVIDER_EVENT_AMOUNT"
        : null,
      line && !sameAmount(transaction.amount, line.amount)
        ? "STATEMENT_LINE_AMOUNT"
        : null,
      event && event.currencyCode !== transaction.currencyCode
        ? "PROVIDER_EVENT_CURRENCY"
        : null,
      line && line.currencyCode !== transaction.currencyCode
        ? "STATEMENT_LINE_CURRENCY"
        : null,
      event && (event.amount === null || event.amount === undefined)
        ? "PROVIDER_EVENT_AMOUNT_MISSING"
        : null,
      event && event.direction !== transaction.direction ? "PROVIDER_EVENT_DIRECTION" : null,
      line && !(
        (transaction.direction === PaymentDirection.INBOUND && line.direction === StatementLineDirection.CREDIT)
        || (transaction.direction === PaymentDirection.OUTBOUND && line.direction === StatementLineDirection.DEBIT)
      ) ? "STATEMENT_LINE_DIRECTION" : null,
      event && event.signatureValid !== true ? "PROVIDER_EVENT_SIGNATURE" : null,
    ].filter((reason): reason is string => reason !== null)

    if (mismatchReasons.length > 0) {
      const exceptionType = ambiguous ? PaymentExceptionType.DUPLICATE_PROVIDER_REFERENCE
        : mismatchReasons.includes("PROVIDER_EVENT_SIGNATURE") ? PaymentExceptionType.SIGNATURE_FAILURE
        : mismatchReasons.some(reason => reason.endsWith("_DIRECTION"))
          ? PaymentExceptionType.MANUAL_REVIEW_REQUIRED : PaymentExceptionType.AMOUNT_MISMATCH
      await createExceptionAndSuspense(tx, {
        organizationId: input.organizationId,
        providerAccountId: providerAccount.id,
        reconciliationRunId: run.id,
        paymentTransactionId: transaction.id,
        providerEventId: event?.id,
        statementLineId: line?.id,
        type: exceptionType,
        severity: ExceptionSeverity.HIGH,
        amount: transaction.amount,
        currencyCode: transaction.currencyCode,
        direction: transaction.direction,
        evidence: {
          transactionAmount: money(transaction.amount).toFixed(2),
          transactionCurrency: transaction.currencyCode,
          providerAmount: event?.amount === null || event?.amount === undefined
            ? null
            : money(event.amount).toFixed(2),
          providerCurrency: event?.currencyCode ?? null,
          statementAmount: line ? money(line.amount).toFixed(2) : null,
          statementCurrency: line?.currencyCode ?? null,
          transactionDirection: transaction.direction,
          providerDirection: event?.direction ?? null,
          statementDirection: line?.direction ?? null,
          providerEventIds: events.map(candidate => candidate.id),
          statementLineIds: lines.map(candidate => candidate.id),
          mismatchReasons,
          rule: "EXTERNAL_EVIDENCE_MISMATCH",
        },
        correlationId,
        now,
      })
      exceptionCount += 1
      suspenseCount += 1
      suspenseAmount = suspenseAmount.plus(transaction.amount)
      // These rows are explained by the exception, not successful matches.
      // Do not count the same candidates again as orphan suspense below.
      for (const candidate of events) matchedEventIds.add(candidate.id)
      for (const candidate of lines) matchedLineIds.add(candidate.id)
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
          rule: key(transaction.providerTransactionId) && (
            key(transaction.providerTransactionId) === key(event?.providerTransactionId)
            || key(transaction.providerTransactionId) === key(line?.providerTransactionId)
          )
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
  }

  for (const event of providerEvents) {
    if (matchedEventIds.has(event.id)) continue

    await createExceptionAndSuspense(tx, {
      organizationId: input.organizationId,
      providerAccountId: providerAccount.id,
      reconciliationRunId: run.id,
      providerEventId: event.id,
      type: touchesRetained(event) ? PaymentExceptionType.MANUAL_REVIEW_REQUIRED : PaymentExceptionType.MISSING_INTERNAL_PAYMENT,
      severity: ExceptionSeverity.HIGH,
      amount: event.amount ?? 0,
      currencyCode: event.currencyCode,
      direction: event.direction ?? PaymentDirection.INBOUND,
      evidence: {
        providerEventId: event.providerEventId,
        providerTransactionId: event.providerTransactionId,
        providerReference: event.providerReference,
        rule: touchesRetained(event) ? "ADDITIONAL_EVIDENCE_FOR_RETAINED_SOURCE" : "ORPHAN_PROVIDER_EVENT",
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
      type: touchesRetained(line) ? PaymentExceptionType.MANUAL_REVIEW_REQUIRED : PaymentExceptionType.MISSING_INTERNAL_PAYMENT,
      severity: ExceptionSeverity.HIGH,
      amount: line.amount,
      currencyCode: line.currencyCode,
      direction: line.direction === "DEBIT" ? PaymentDirection.OUTBOUND : PaymentDirection.INBOUND,
      evidence: {
        statementLineId: line.id,
        providerTransactionId: line.providerTransactionId,
        providerReference: line.providerReference,
        fingerprint: line.fingerprint,
        rule: touchesRetained(line) ? "ADDITIONAL_EVIDENCE_FOR_RETAINED_SOURCE" : "ORPHAN_STATEMENT_LINE",
      },
      correlationId,
      now,
    })
    exceptionCount += 1
    suspenseCount += 1
    suspenseAmount = suspenseAmount.plus(line.amount)
  }

  return { matchCount, exceptionCount, suspenseCount, suspenseAmount,
    matchedAmount: transactions.filter(transaction => matchedTransactionIds.has(transaction.id))
      .reduce((sum, transaction) => sum.plus(transaction.amount), new Prisma.Decimal(0)) }
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
        select: {
          id: true,
          paymentRailId: true,
          currencyCode: true,
          status: true,
          settlementLedgerAccountId: true,
          suspenseLedgerAccountId: true,
          paymentRail: { select: { id: true, isActive: true } },
          settlementAccounts: {
            where: {
              approvalStatus: SettlementAccountApprovalStatus.APPROVED,
              effectiveFrom: { lte: now },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
            },
            select: { id: true },
            take: 1,
          },
        },
      })

      if (!providerAccount) throw new NotFoundError("Provider account not found")
      assertProviderAccountReconciliationReady(providerAccount)
      if (input.providerOperationId) {
        const { intent } = await loadProviderOperationIntent(tx, input.organizationId, input.providerOperationId)
        if (intent.actorId !== input.runById || intent.providerAccountId !== input.providerAccountId || intent.businessDate !== periodStart.toISOString()
          || input.correlationId !== input.providerOperationId || !await tx.statementFile.findFirst({ where: { organizationId: input.organizationId, providerAccountId: input.providerAccountId, fileHash: intent.fileHash }, select: { id: true } }))
          throw new ConflictError("The provider operation does not match current run sources.")
      }

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

      await assertModuleNewWorkInTx(tx, {
        organizationId: input.organizationId,
        moduleSlug: "payment_reconciliation",
        operation: "payment.reconciliation.run.create",
      })

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
            ...(input.providerOperationId ? { providerOperationId: input.providerOperationId } : {}),
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

      const { matchCount, exceptionCount, suspenseCount, suspenseAmount, matchedAmount } = await reconcileUnallocatedSourcesInTx(tx, {
        organizationId: input.organizationId, providerAccount, run, transactions, providerEvents, statementLines, correlationId, now,
      })

      const status = exceptionCount > 0 ? ReconciliationRunStatus.NEEDS_REVIEW : ReconciliationRunStatus.READY_FOR_SIGNOFF
      await tx.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status,
          totalInternalAmount: transactions.reduce((sum, transaction) => sum.plus(transaction.amount), new Prisma.Decimal(0)),
          totalExternalAmount: providerEvents
            .reduce((sum, event) => sum.plus(event.amount ?? 0), new Prisma.Decimal(0))
            .plus(statementLines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0))),
          matchedAmount,
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

export { proposeManualMatch, approveManualMatch } from "./payment-reconciliation-manual-match.service"
export type { ProposeManualMatchInput, ApproveManualMatchInput } from "./payment-reconciliation-manual-match.service"
