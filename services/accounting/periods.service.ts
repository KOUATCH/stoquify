import {
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentExceptionStatus,
  ReconciliationRunStatus,
  SuspenseStatus,
  Prisma,
  type AccountingPeriod,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  auditSensitiveActionDecision,
  evaluateSensitiveAction,
  type SensitiveActionDecision,
} from "@/services/controls/sensitive-action.service"
import { assertOpenPeriod } from "./invariants"
import { lockAccountingPeriodCatalogInTx } from "./accounting-period-catalog.service"

import { lockPeriodControlInTx, requirePeriodCloseApprovalInTx } from "./period-control.service"
import { readCloseAssessmentPublicationTimeInTx } from "./close-assessment-order.service"

export type AccountingPeriodControlContext = {
  expectedVersion?: number
  actorPermissions: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
}

type ControlledResult<T> =
  | { denied: SensitiveActionDecision; value?: never }
  | { denied?: never; value: T }

export type FiscalYearCreateInput = {
  name: string
  startDate: Date
  endDate: Date
  createMonthlyPeriods?: boolean
}

function endOfDay(date: Date) {
  const value = new Date(date)
  value.setUTCHours(23, 59, 59, 999)
  return value
}

function periodName(date: Date) {
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
}

function addMonths(date: Date, amount: number) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  value.setUTCMonth(value.getUTCMonth() + amount)
  return value
}

function zeroDecimal() {
  return new Prisma.Decimal(0)
}

function periodAudit(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    action: string
    resourceId?: string | null
    message: string
    metadata?: Prisma.InputJsonValue
  },
) {
  return tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: "AccountingPeriod",
      resourceId: params.resourceId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

export async function listFiscalYears(organizationId: string) {
  return db.fiscalYear.findMany({
    where: { organizationId },
    include: { periods: { orderBy: { periodNumber: "asc" } } },
    orderBy: { startDate: "desc" },
  })
}

export async function listAccountingPeriods(organizationId: string) {
  return db.accountingPeriod.findMany({
    where: { organizationId },
    include: { fiscalYear: true },
    orderBy: [{ startDate: "desc" }, { periodNumber: "asc" }],
  })
}

export async function createFiscalYearWithPeriods(
  organizationId: string,
  input: FiscalYearCreateInput,
  actorId?: string | null,
) {
  if (input.endDate <= input.startDate) {
    throw new BusinessRuleError("Fiscal year end date must be after start date")
  }

  return db.$transaction(async (tx) => {
    // One creation contract, including requests without monthly periods. This
    // must precede all writes; count evidence readers hold the shared key.
    await lockAccountingPeriodCatalogInTx(tx, organizationId, "exclusive")
    const fiscalYear = await tx.fiscalYear.create({
      data: {
        organizationId,
        name: input.name.trim(),
        startDate: input.startDate,
        endDate: endOfDay(input.endDate),
      },
    })

    if (input.createMonthlyPeriods !== false) {
      const periods = []
      let cursor = new Date(Date.UTC(input.startDate.getUTCFullYear(), input.startDate.getUTCMonth(), 1))
      const finalMonth = new Date(Date.UTC(input.endDate.getUTCFullYear(), input.endDate.getUTCMonth(), 1))
      let periodNumber = 1

      while (cursor <= finalMonth) {
        const nextMonth = addMonths(cursor, 1)
        const monthEnd = new Date(nextMonth.getTime() - 1)
        periods.push({
          organizationId,
          fiscalYearId: fiscalYear.id,
          periodNumber,
          name: periodName(cursor),
          startDate: cursor < input.startDate ? input.startDate : cursor,
          endDate: monthEnd > input.endDate ? endOfDay(input.endDate) : monthEnd,
        })
        cursor = nextMonth
        periodNumber += 1
      }

      await tx.accountingPeriod.createMany({ data: periods })
    }

    await periodAudit(tx, {
      organizationId,
      actorId,
      action: "FISCAL_YEAR_CREATE",
      resourceId: fiscalYear.id,
      message: `Fiscal year ${fiscalYear.name} created`,
    })

    return tx.fiscalYear.findUniqueOrThrow({
      where: { id: fiscalYear.id },
      include: { periods: { orderBy: { periodNumber: "asc" } } },
    })
  })
}

export async function getOpenPeriodForDate(
  organizationId: string,
  entryDate: Date,
  tx: Prisma.TransactionClient | typeof db = db,
) {
  // Transactional writers hold a shared row lock until commit. Period close
  // takes the conflicting lock before preflight, so neither side can rely on
  // an open-state read made before the other transaction completed.
  // Root-client calls are read-only checks; they cannot hold a transaction lock.
  // Prisma stores DateTime as UTC timestamp without time zone, but raw Date
  // parameters are timestamptz. Match UTC storage instead of the session zone.
  const period = !("$transaction" in tx)
    ? (await tx.$queryRaw<AccountingPeriod[]>`
        SELECT * FROM accounting_periods
        WHERE "organizationId" = ${organizationId}
          AND "startDate" <= (${entryDate}::timestamptz AT TIME ZONE 'UTC')
          AND "endDate" >= (${entryDate}::timestamptz AT TIME ZONE 'UTC')
        ORDER BY "startDate" DESC LIMIT 1 FOR SHARE
      `)[0]
    : await tx.accountingPeriod.findFirst({
    where: {
      organizationId,
      startDate: { lte: entryDate },
      endDate: { gte: entryDate },
    },
    orderBy: { startDate: "desc" },
  })

  assertOpenPeriod(period, entryDate, organizationId)
  return period!
}

export type PeriodClosePreflight = {
  missingFunctionalAmountCount: number
  functionalBalanceIssue: { debit: Prisma.Decimal; credit: Prisma.Decimal } | null
  draftEntryCount: number
  unresolvedPostingBatchCount: number
  unlinkedPostedEntryCount: number
  openReconciliationExceptionCount: number
  openReconciliationSuspenseCount: number
  unsignedReconciliationRunCount: number
  trialBalanceIssues: Array<{
    currency: string
    debit: Prisma.Decimal
    credit: Prisma.Decimal
  }>
}

export async function getPeriodClosePreflight(
  organizationId: string,
  periodId: string,
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<PeriodClosePreflight> {
  const period = await tx.accountingPeriod.findFirst({
    where: { id: periodId, organizationId },
  })

  if (!period) throw new NotFoundError("Accounting period not found")
  assertOpenPeriod(period, period.endDate, organizationId)

  const [draftEntryCount, unresolvedPostingBatchCount, unlinkedPostedEntryCount, openReconciliationExceptionCount, openReconciliationSuspenseCount, unsignedReconciliationRunCount, lines] = await Promise.all([
    tx.journalEntry.count({
      where: { organizationId, periodId, status: JournalEntryStatus.DRAFT },
    }),
    tx.ledgerPostingBatch.count({
      where: {
        organizationId,
        periodId,
        status: { in: [LedgerPostingBatchStatus.PENDING, LedgerPostingBatchStatus.FAILED] },
      },
    }),
    tx.journalEntry.count({
      where: {
        organizationId,
        periodId,
        status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
        postingBatchId: null,
      },
    }),
    tx.paymentException.count({
      where: {
        organizationId,
        status: {
          in: [
            PaymentExceptionStatus.OPEN,
            PaymentExceptionStatus.ASSIGNED,
            PaymentExceptionStatus.ACKNOWLEDGED,
            PaymentExceptionStatus.ESCALATED,
            PaymentExceptionStatus.RESOLUTION_PROPOSED,
            PaymentExceptionStatus.REOPENED,
          ],
        },
        reconciliationRun: {
          businessDate: { gte: period.startDate, lte: period.endDate },
        },
      },
    }),
    tx.suspenseItem.count({
      where: {
        organizationId,
        status: {
          in: [
            SuspenseStatus.OPEN,
            SuspenseStatus.ASSIGNED,
            SuspenseStatus.IN_REVIEW,
            SuspenseStatus.POSTED_TO_SUSPENSE,
            SuspenseStatus.RESOLUTION_PROPOSED,
            SuspenseStatus.REOPENED,
          ],
        },
        reconciliationRun: {
          businessDate: { gte: period.startDate, lte: period.endDate },
        },
      },
    }),
    tx.reconciliationRun.count({
      where: {
        organizationId,
        businessDate: { gte: period.startDate, lte: period.endDate },
        status: { notIn: [ReconciliationRunStatus.SIGNED, ReconciliationRunStatus.VOIDED] },
      },
    }),
    tx.journalEntryLine.findMany({
      where: {
        organizationId,
        journalEntry: {
          organizationId,
          periodId,
          status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
        },
      },
      select: {
        debit: true,
        credit: true,
        baseDebit: true,
        baseCredit: true,
        currency: true,
      },
    }),
  ])

  const totalsByCurrency = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>()
  let missingFunctionalAmountCount = 0
  let functionalDebit = zeroDecimal()
  let functionalCredit = zeroDecimal()

  for (const line of lines) {
    if (line.baseDebit == null || line.baseCredit == null) {
      missingFunctionalAmountCount += 1
    } else {
      functionalDebit = functionalDebit.add(line.baseDebit)
      functionalCredit = functionalCredit.add(line.baseCredit)
    }
    const currency = (line.currency || "XAF").trim().toUpperCase()
    const totals = totalsByCurrency.get(currency) ?? { debit: zeroDecimal(), credit: zeroDecimal() }
    totals.debit = totals.debit.add(line.debit ?? 0)
    totals.credit = totals.credit.add(line.credit ?? 0)
    totalsByCurrency.set(currency, totals)
  }

  const trialBalanceIssues = Array.from(totalsByCurrency.entries())
    .filter(([, totals]) => !totals.debit.eq(totals.credit))
    .map(([currency, totals]) => ({ currency, debit: totals.debit, credit: totals.credit }))

  return {
    missingFunctionalAmountCount,
    functionalBalanceIssue: functionalDebit.eq(functionalCredit) ? null : { debit: functionalDebit, credit: functionalCredit },
    draftEntryCount,
    unresolvedPostingBatchCount,
    unlinkedPostedEntryCount,
    openReconciliationExceptionCount,
    openReconciliationSuspenseCount,
    unsignedReconciliationRunCount,
    trialBalanceIssues,
  }
}

export function getPeriodClosePreflightFailures(preflight: PeriodClosePreflight) {
  const failures: string[] = []

  if (preflight.missingFunctionalAmountCount > 0) {
    failures.push(`${preflight.missingFunctionalAmountCount} posted journal lines are missing functional-currency amounts`)
  }
  if (preflight.functionalBalanceIssue) {
    failures.push(`Functional-currency trial balance is not balanced: debits ${preflight.functionalBalanceIssue.debit.toFixed(2)} credits ${preflight.functionalBalanceIssue.credit.toFixed(2)}`)
  }

  if (preflight.draftEntryCount > 0) {
    failures.push(`${preflight.draftEntryCount} draft journal entr${preflight.draftEntryCount === 1 ? "y" : "ies"} must be posted or voided`)
  }

  if (preflight.unresolvedPostingBatchCount > 0) {
    failures.push(`${preflight.unresolvedPostingBatchCount} pending or failed posting batch${preflight.unresolvedPostingBatchCount === 1 ? "" : "es"} must be resolved`)
  }

  if (preflight.unlinkedPostedEntryCount > 0) {
    failures.push(`${preflight.unlinkedPostedEntryCount} posted journal entr${preflight.unlinkedPostedEntryCount === 1 ? "y is" : "ies are"} missing a posting batch link`)
  }

  if (preflight.openReconciliationExceptionCount > 0) {
    failures.push(`${preflight.openReconciliationExceptionCount} open payment reconciliation exception${preflight.openReconciliationExceptionCount === 1 ? "" : "s"} must be resolved`)
  }

  if (preflight.openReconciliationSuspenseCount > 0) {
    failures.push(`${preflight.openReconciliationSuspenseCount} open payment reconciliation suspense item${preflight.openReconciliationSuspenseCount === 1 ? "" : "s"} must be resolved`)
  }

  if (preflight.unsignedReconciliationRunCount > 0) {
    failures.push(`${preflight.unsignedReconciliationRunCount} payment reconciliation run${preflight.unsignedReconciliationRunCount === 1 ? "" : "s"} must be signed or voided`)
  }

  for (const issue of preflight.trialBalanceIssues) {
    failures.push(`Trial balance is not balanced for ${issue.currency}: debits ${issue.debit.toFixed(2)} credits ${issue.credit.toFixed(2)}`)
  }

  return failures
}

export async function closeAccountingPeriod(
  organizationId: string,
  periodId: string,
  actorId?: string | null,
  control?: AccountingPeriodControlContext,
) {
  const result = await db.$transaction(async (tx) => {
    const { period, sourceRevision } = await lockPeriodControlInTx(tx, organizationId, periodId)
    const preflight = await getPeriodClosePreflight(organizationId, periodId, tx)
    const failures = getPeriodClosePreflightFailures(preflight)

    if (failures.length > 0) {
      throw new BusinessRuleError(`Accounting period cannot be closed: ${failures.join("; ")}`)
    }

    const controlDecision = evaluateSensitiveAction({
      action: "accounting.period.close",
      actorId,
      organizationId,
      actorPermissions: control?.actorPermissions ?? [],
      lastAuthAt: control?.lastAuthAt,
      now: new Date(),
      resourceType: "AccountingPeriod",
      resourceId: periodId,
      metadata: {
        periodId,
        draftEntryCount: preflight.draftEntryCount,
        unresolvedPostingBatchCount: preflight.unresolvedPostingBatchCount,
        unlinkedPostedEntryCount: preflight.unlinkedPostedEntryCount,
        openReconciliationExceptionCount: preflight.openReconciliationExceptionCount,
        openReconciliationSuspenseCount: preflight.openReconciliationSuspenseCount,
        unsignedReconciliationRunCount: preflight.unsignedReconciliationRunCount,
      },
    })
    await auditSensitiveActionDecision(tx, controlDecision)
    if (!controlDecision.allowed) return { denied: controlDecision }

    if (period.controlVersion !== control?.expectedVersion) throw new ConflictError("The period changed; refresh before closing.")
    const now = await readCloseAssessmentPublicationTimeInTx(tx)
    if (period.endDate >= now) throw new BusinessRuleError("Only a completed accounting period can be closed.")
    const approval = await requirePeriodCloseApprovalInTx(tx, organizationId, periodId, sourceRevision)
    assertSensitiveActionAllowed(evaluateSensitiveAction({ action: "accounting.period.close", actorId, organizationId,
      actorPermissions: control?.actorPermissions ?? [], lastAuthAt: control?.lastAuthAt, now: new Date() }))
    const event = await tx.periodControlEvent.create({ data: {
      organizationId, periodId, version: period.controlVersion + 1, operation: "CLOSE", fromStatus: "OPEN", toStatus: "CLOSED",
      actorId: actorId!, reason: "Current independently certified close approval accepted", idempotencyKey: "close:" + periodId + ":" + period.controlVersion,
      sourceRevision: sourceRevision.revision, approval, createdAt: now,
    } })

    const closed = await tx.accountingPeriod.update({
      where: { id: periodId },
      data: {
        status: "CLOSED",
        closedAt: now,
        lockedAt: now,
        controlVersion: event.version,
        lastControlEventId: event.id,
        closedById: actorId,
      },
    })

    await periodAudit(tx, {
      organizationId,
      actorId,
      action: "ACCOUNTING_PERIOD_CLOSE",
      resourceId: periodId,
      message: `Accounting period ${closed.name} closed`,
      metadata: {
        closeRunId: approval.closeRunId,
        certifiedExportId: approval.certifiedExportId,
        contentHash: approval.contentHash,
        eventId: event.id,
        version: event.version,
        draftEntryCount: preflight.draftEntryCount,
        unresolvedPostingBatchCount: preflight.unresolvedPostingBatchCount,
        unlinkedPostedEntryCount: preflight.unlinkedPostedEntryCount,
        openReconciliationExceptionCount: preflight.openReconciliationExceptionCount,
        openReconciliationSuspenseCount: preflight.openReconciliationSuspenseCount,
        unsignedReconciliationRunCount: preflight.unsignedReconciliationRunCount,
      },
    })

    return { value: closed }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000 })

  if (result.denied) {
    assertSensitiveActionAllowed(result.denied)
  }

  return result.value
}
