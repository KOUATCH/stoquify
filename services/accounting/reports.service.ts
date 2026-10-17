import { createHash, randomUUID } from "node:crypto"

import { JournalEntryStatus, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import {
  assertSensitiveActionAllowed,
  evaluateAndAuditSensitiveAction,
} from "@/services/controls/sensitive-action.service"

export type TrialBalanceInput = {
  organizationId: string
  periodId?: string | null
  startDate?: Date | null
  endDate?: Date | null
  includeZeroBalance?: boolean
}

export type GeneralLedgerInput = {
  organizationId: string
  accountId: string
  startDate?: Date | null
  endDate?: Date | null
}

export type ExportAccountingReportInput = {
  organizationId: string
  actorId?: string | null
  actorPermissions: readonly string[]
  reportType: "TRIAL_BALANCE" | "GENERAL_LEDGER"
  fileType: "json" | "csv"
  periodId?: string | null
  accountId?: string | null
  startDate?: Date | null
  endDate?: Date | null
  includeZeroBalance?: boolean
}

function decimalZero() {
  return new Prisma.Decimal(0)
}

function toMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toFixed(2)
}

function functionalAmounts(line: { baseDebit: Prisma.Decimal | null; baseCredit: Prisma.Decimal | null }) {
  if (line.baseDebit === null || line.baseCredit === null) {
    throw new BusinessRuleError("Functional-currency evidence is missing from a journal line. Review the historical entry before reporting.")
  }
  return { debit: line.baseDebit, credit: line.baseCredit }
}

function entryDateFilter(input: TrialBalanceInput | GeneralLedgerInput) {
  if (!input.startDate && !input.endDate) return {}

  return {
    entryDate: {
      ...(input.startDate ? { gte: input.startDate } : {}),
      ...(input.endDate ? { lte: input.endDate } : {}),
    },
  }
}

function hashFilters(input: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(input)).digest("hex")}`
}

function hashContent(input: unknown) {
  return "sha256:" + createHash("sha256").update(JSON.stringify(input)).digest("hex")
}

export async function getTrialBalance(input: TrialBalanceInput) {
  const entryWhere = {
    organizationId: input.organizationId,
    status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
    ...(input.periodId ? { periodId: input.periodId } : {}),
    ...entryDateFilter(input),
  } satisfies Prisma.JournalEntryWhereInput

  const [accounts, lines] = await Promise.all([
    db.chartOfAccount.findMany({
      where: { organizationId: input.organizationId, deletedAt: null },
      orderBy: { code: "asc" },
    }),
    db.journalEntryLine.findMany({
      where: {
        organizationId: input.organizationId,
        journalEntry: entryWhere,
      },
      include: {
        account: true,
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            status: true,
          },
        },
      },
      orderBy: [{ account: { code: "asc" } }, { createdAt: "asc" }],
    }),
  ])

  const rowsByAccount = new Map(
    accounts.map((account) => [
      account.id,
      {
        accountId: account.id,
        code: account.code,
        nameEn: account.nameEn,
        nameFr: account.nameFr,
        type: account.type,
        normalBalance: account.normalBalance,
        activityDebit: decimalZero(),
        activityCredit: decimalZero(),
      },
    ]),
  )

  for (const line of lines) {
    let row = rowsByAccount.get(line.accountId)
    if (!row) {
      const account = line.account
      if (!account || account.id !== line.accountId || account.organizationId !== input.organizationId) {
        throw new BusinessRuleError("Posted journal account evidence is unavailable for this organization")
      }
      row = {
        accountId: account.id,
        code: account.code,
        nameEn: account.nameEn,
        nameFr: account.nameFr,
        type: account.type,
        normalBalance: account.normalBalance,
        activityDebit: decimalZero(),
        activityCredit: decimalZero(),
      }
      rowsByAccount.set(account.id, row)
    }

    const amounts = functionalAmounts(line)
    row.activityDebit = row.activityDebit.plus(amounts.debit)
    row.activityCredit = row.activityCredit.plus(amounts.credit)
  }

  const rows = Array.from(rowsByAccount.values())
    .sort((left, right) => left.code.localeCompare(right.code) || left.accountId.localeCompare(right.accountId))
    .map((row) => {
      const net = row.activityDebit.minus(row.activityCredit)
      const debitBalance = net.gte(0) ? net : decimalZero()
      const creditBalance = net.lt(0) ? net.abs() : decimalZero()

      return {
        accountId: row.accountId,
        code: row.code,
        nameEn: row.nameEn,
        nameFr: row.nameFr,
        type: row.type,
        normalBalance: row.normalBalance,
        activityDebit: toMoney(row.activityDebit),
        activityCredit: toMoney(row.activityCredit),
        debitBalance: toMoney(debitBalance),
        creditBalance: toMoney(creditBalance),
      }
    })
    .filter((row) => {
      if (input.includeZeroBalance) return true
      return row.activityDebit !== "0.00" || row.activityCredit !== "0.00"
    })

  const totalDebit = rows.reduce((sum, row) => sum.plus(row.activityDebit), decimalZero())
  const totalCredit = rows.reduce((sum, row) => sum.plus(row.activityCredit), decimalZero())
  const totalDebitBalance = rows.reduce((sum, row) => sum.plus(row.debitBalance), decimalZero())
  const totalCreditBalance = rows.reduce((sum, row) => sum.plus(row.creditBalance), decimalZero())

  return {
    rows,
    totals: {
      activityDebit: toMoney(totalDebit),
      activityCredit: toMoney(totalCredit),
      debitBalance: toMoney(totalDebitBalance),
      creditBalance: toMoney(totalCreditBalance),
      isBalanced: totalDebit.eq(totalCredit) && totalDebitBalance.eq(totalCreditBalance),
    },
    filters: {
      periodId: input.periodId || null,
      startDate: input.startDate?.toISOString() || null,
      endDate: input.endDate?.toISOString() || null,
    },
  }
}

export async function getGeneralLedger(input: GeneralLedgerInput) {
  return (await getGeneralLedgerReport(input)).rows
}

async function getGeneralLedgerReport(input: GeneralLedgerInput) {
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    throw new BusinessRuleError("General ledger end date must not precede start date")
  }
  // Opening and in-range activity must describe the same ledger snapshot,
  // including when another transaction posts a backdated entry concurrently.
  return db.$transaction(async (tx) => {
  const opening = input.startDate
    ? await tx.journalEntryLine.aggregate({
      where: {
        organizationId: input.organizationId,
        accountId: input.accountId,
        journalEntry: {
          organizationId: input.organizationId,
          status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
          entryDate: { lt: input.startDate },
        },
      },
      _sum: { baseDebit: true, baseCredit: true },
      _count: { _all: true, baseDebit: true, baseCredit: true },
    })
    : null
  if (opening && (opening._count._all !== opening._count.baseDebit || opening._count._all !== opening._count.baseCredit)) {
    throw new BusinessRuleError("Functional-currency evidence is missing from the opening ledger. Review the historical entries before reporting.")
  }
  const openingBalance = (opening?._sum.baseDebit ?? decimalZero()).minus(opening?._sum.baseCredit ?? decimalZero())
  const lines = await tx.journalEntryLine.findMany({
    where: {
      organizationId: input.organizationId,
      accountId: input.accountId,
      journalEntry: {
        organizationId: input.organizationId,
        status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
        ...entryDateFilter(input),
      },
    },
    include: {
      account: true,
      journalEntry: {
        include: {
          journal: true,
          period: true,
        },
      },
    },
    orderBy: [{ journalEntry: { entryDate: "asc" } }, { journalEntryId: "asc" }, { lineNumber: "asc" }, { id: "asc" }],
  })

  let runningBalance = openingBalance
  let movementDebit = decimalZero()
  let movementCredit = decimalZero()

  const rows = lines.map((line) => {
    const amounts = functionalAmounts(line)
    runningBalance = runningBalance.plus(amounts.debit).minus(amounts.credit)
    movementDebit = movementDebit.plus(amounts.debit)
    movementCredit = movementCredit.plus(amounts.credit)

    return {
      id: line.id,
      entryId: line.journalEntryId,
      entryNumber: line.journalEntry.entryNumber,
      entryDate: line.journalEntry.entryDate,
      journalCode: line.journalEntry.journal.code,
      periodName: line.journalEntry.period.name,
      accountCode: line.account.code,
      accountName: line.account.nameEn,
      description: line.description,
      debit: toMoney(amounts.debit),
      credit: toMoney(amounts.credit),
      openingBalance: toMoney(openingBalance),
      periodMovement: toMoney(runningBalance.minus(openingBalance)),
      runningBalance: toMoney(runningBalance),
    }
  })
  return {
    rows,
    summary: {
      schemaVersion: "general-ledger-summary.v1" as const,
      accountId: input.accountId,
      amountBasis: "FUNCTIONAL_CURRENCY" as const,
      signConvention: "DEBIT_POSITIVE" as const,
      startDate: input.startDate?.toISOString() ?? null,
      endDate: input.endDate?.toISOString() ?? null,
      openingDebit: toMoney(opening?._sum.baseDebit ?? decimalZero()),
      openingCredit: toMoney(opening?._sum.baseCredit ?? decimalZero()),
      openingBalance: toMoney(openingBalance),
      movementDebit: toMoney(movementDebit),
      movementCredit: toMoney(movementCredit),
      movementBalance: toMoney(movementDebit.minus(movementCredit)),
      closingBalance: toMoney(runningBalance),
      rowCount: rows.length,
    },
  }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function getAccountingDashboardSummary(organizationId: string) {
  const [
    settings,
    accountCount,
    journalCount,
    openPeriodCount,
    draftEntryCount,
    postedEntryCount,
    latestEntries,
  ] = await Promise.all([
    db.organizationAccountingSettings.findUnique({ where: { organizationId } }),
    db.chartOfAccount.count({ where: { organizationId, deletedAt: null } }),
    db.journal.count({ where: { organizationId, isActive: true } }),
    db.accountingPeriod.count({ where: { organizationId, status: "OPEN" } }),
    db.journalEntry.count({ where: { organizationId, status: JournalEntryStatus.DRAFT } }),
    db.journalEntry.count({
      where: {
        organizationId,
        status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
      },
    }),
    db.journalEntry.findMany({
      where: { organizationId },
      include: {
        journal: true,
        period: true,
        lines: { select: { debit: true, credit: true } },
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ])

  return {
    settings,
    counts: {
      accounts: accountCount,
      journals: journalCount,
      openPeriods: openPeriodCount,
      draftEntries: draftEntryCount,
      postedEntries: postedEntryCount,
    },
    latestEntries: latestEntries.map((entry) => ({
      id: entry.id,
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate,
      status: entry.status,
      journalCode: entry.journal.code,
      periodName: entry.period.name,
      debit: toMoney(entry.lines.reduce((sum, line) => sum.plus(line.debit), decimalZero())),
      credit: toMoney(entry.lines.reduce((sum, line) => sum.plus(line.credit), decimalZero())),
    })),
  }
}

export async function exportAccountingReport(input: ExportAccountingReportInput) {
  if (input.reportType === "GENERAL_LEDGER" && !input.accountId) {
    throw new BusinessRuleError("General ledger export requires an account")
  }
  const period = input.periodId
    ? await db.accountingPeriod.findFirst({
      where: { id: input.periodId, organizationId: input.organizationId },
      select: { id: true, name: true, startDate: true, endDate: true, status: true },
    })
    : null
  if (input.periodId && !period) throw new BusinessRuleError("Accounting period is unavailable for this organization")
  let startDate = input.startDate
  let endDate = input.endDate
  if (input.reportType === "GENERAL_LEDGER" && period) {
    startDate = startDate ?? period.startDate
    endDate = endDate ?? period.endDate
    if (startDate < period.startDate || endDate > period.endDate || startDate > endDate) {
      throw new BusinessRuleError("General ledger date range must be within the selected accounting period")
    }
  }
  const normalizedFilters = {
    reportType: input.reportType,
    periodId: input.periodId || null,
    accountId: input.accountId || null,
    startDate: startDate?.toISOString() || null,
    endDate: endDate?.toISOString() || null,
    includeZeroBalance: input.includeZeroBalance ?? true,
  }

  const [report, accountingSettings, organization] = await Promise.all([
    input.reportType === "TRIAL_BALANCE"
      ? getTrialBalance({
          organizationId: input.organizationId,
          periodId: input.periodId,
          startDate: input.startDate,
          endDate: input.endDate,
          includeZeroBalance: input.includeZeroBalance ?? true,
        })
      : getGeneralLedgerReport({
          organizationId: input.organizationId,
          accountId: input.accountId!,
          startDate,
          endDate,
        }),
    db.organizationAccountingSettings.findUnique({
      where: { organizationId: input.organizationId },
      select: { baseCurrency: true },
    }),
    db.organization.findUnique({
      where: { id: input.organizationId },
      select: { currency: true },
    }),
  ])

  const currency = (accountingSettings?.baseCurrency || organization?.currency || "XAF").trim().toUpperCase()
  const rowCount = report.rows.length
  const exportId = randomUUID()
  const watermarkId = "acct-" + input.organizationId + "-" + exportId
  const filtersHash = hashFilters(normalizedFilters)
  const generatedAt = new Date().toISOString()
  const balanceStatus = "summary" in report
    ? "NOT_APPLICABLE"
    : report.totals.isBalanced
      ? "BALANCED"
      : "OUT_OF_BALANCE"
  const provenance = {
    source: "POSTED_LEDGER_READ_MODEL" as const,
    sourceLabel: "Posted and reversed journal entry lines",
    sourceTables:
      input.reportType === "TRIAL_BALANCE"
        ? ["chartOfAccount", "journalEntry", "journalEntryLine"]
        : ["chartOfAccount", "journal", "accountingPeriod", "journalEntry", "journalEntryLine"],
    currency,
    period: period
      ? {
          id: period.id,
          name: period.name,
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          status: period.status,
        }
      : null,
    periodStatus: period?.status || "UNSCOPED_DATE_RANGE",
    rowCount,
    filtersHash,
    balanceStatus,
    redactionStatus: "NO_CONTACT_OR_AUTHENTICATION_FIELDS_INCLUDED" as const,
    certification: {
      status: "INTERNAL_ACCOUNTING_REPORT_ONLY" as const,
      label: "Internal accounting report only",
      limitations: [
        "Not a certified OHADA statutory filing",
        "Not signed by Close & Assurance pack controls",
      ],
    },
  }
  const payload = {
    schemaVersion: "accounting-report-export.v1" as const,
    organizationId: input.organizationId,
    reportType: input.reportType,
    fileType: input.fileType,
    generatedAt,
    exportId,
    watermarkId,
    provenance,
    filters: normalizedFilters,
    data: "summary" in report ? report.rows : report,
    ...("summary" in report ? { summary: { ...report.summary, currency } } : {}),
  }
  const contentHash = hashContent(payload)

  const decision = await db.$transaction((tx) =>
    evaluateAndAuditSensitiveAction(tx, {
      action: "accounting.export",
      actorId: input.actorId,
      organizationId: input.organizationId,
      actorPermissions: input.actorPermissions,
      lastAuthAt: Date.now(),
      resourceType: "AccountingExport",
      resourceId: exportId,
      currency,
      exportContext: {
        scope: input.reportType,
        filtersHash,
        rowCount,
        fileType: input.fileType,
        sensitivity: "statutory",
        watermarkId,
      },
      metadata: {
        ...normalizedFilters,
        contentHash,
        periodStatus: provenance.periodStatus,
        balanceStatus,
        certificationStatus: provenance.certification.status,
        redactionStatus: provenance.redactionStatus,
      },
    }),
  )
  assertSensitiveActionAllowed(decision)

  return {
    ...payload,
    rowCount,
    filtersHash,
    contentHash,
  }
}
