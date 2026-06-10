import { JournalEntryStatus, LedgerPostingBatchStatus, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { assertOpenPeriod } from "./invariants"

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
    throw new Error("Fiscal year end date must be after start date")
  }

  return db.$transaction(async (tx) => {
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
          startDate: cursor,
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
  const period = await tx.accountingPeriod.findFirst({
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
  draftEntryCount: number
  unresolvedPostingBatchCount: number
  unlinkedPostedEntryCount: number
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

  const [draftEntryCount, unresolvedPostingBatchCount, unlinkedPostedEntryCount, lines] = await Promise.all([
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
        currency: true,
      },
    }),
  ])

  const totalsByCurrency = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>()

  for (const line of lines) {
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
    draftEntryCount,
    unresolvedPostingBatchCount,
    unlinkedPostedEntryCount,
    trialBalanceIssues,
  }
}

export function getPeriodClosePreflightFailures(preflight: PeriodClosePreflight) {
  const failures: string[] = []

  if (preflight.draftEntryCount > 0) {
    failures.push(`${preflight.draftEntryCount} draft journal entr${preflight.draftEntryCount === 1 ? "y" : "ies"} must be posted or voided`)
  }

  if (preflight.unresolvedPostingBatchCount > 0) {
    failures.push(`${preflight.unresolvedPostingBatchCount} pending or failed posting batch${preflight.unresolvedPostingBatchCount === 1 ? "" : "es"} must be resolved`)
  }

  if (preflight.unlinkedPostedEntryCount > 0) {
    failures.push(`${preflight.unlinkedPostedEntryCount} posted journal entr${preflight.unlinkedPostedEntryCount === 1 ? "y is" : "ies are"} missing a posting batch link`)
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
) {
  return db.$transaction(async (tx) => {
    const preflight = await getPeriodClosePreflight(organizationId, periodId, tx)
    const failures = getPeriodClosePreflightFailures(preflight)

    if (failures.length > 0) {
      throw new BusinessRuleError(`Accounting period cannot be closed: ${failures.join("; ")}`)
    }

    const closed = await tx.accountingPeriod.update({
      where: { id: periodId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
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
        draftEntryCount: preflight.draftEntryCount,
        unresolvedPostingBatchCount: preflight.unresolvedPostingBatchCount,
        unlinkedPostedEntryCount: preflight.unlinkedPostedEntryCount,
      },
    })

    return closed
  })
}
