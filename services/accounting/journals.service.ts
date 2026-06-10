import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  assertBalancedJournalEntry,
  assertSameOrganizationAccounts,
  type AccountingAmount,
} from "./invariants"
import { getOpenPeriodForDate } from "./periods.service"

export type ManualJournalLineInput = {
  accountId: string
  description?: string | null
  debit?: AccountingAmount
  credit?: AccountingAmount
  currency?: string | null
  exchangeRate?: AccountingAmount
  locationId?: string | null
  customerId?: string | null
  supplierId?: string | null
  itemId?: string | null
  dimensions?: Prisma.InputJsonValue | null
  metadata?: Prisma.InputJsonValue | null
}

export type CreateManualJournalEntryInput = {
  journalId: string
  entryDate: Date
  memo?: string | null
  reference?: string | null
  lines: ManualJournalLineInput[]
}

const journalEntryInclude = {
  journal: true,
  period: true,
  lines: {
    include: {
      account: {
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameFr: true,
          type: true,
          normalBalance: true,
        },
      },
    },
    orderBy: { lineNumber: "asc" },
  },
  postingBatch: true,
} satisfies Prisma.JournalEntryInclude

const defaultJournals: Array<{
  code: string
  nameEn: string
  nameFr: string
  type: JournalType
  allowManualEntries: boolean
}> = [
  { code: "GEN", nameEn: "General Journal", nameFr: "Journal general", type: "GENERAL", allowManualEntries: true },
  { code: "OD", nameEn: "Adjustment Journal", nameFr: "Journal des operations diverses", type: "ADJUSTMENT", allowManualEntries: true },
  { code: "AN", nameEn: "Opening Balance Journal", nameFr: "Journal d'ouverture", type: "OPENING", allowManualEntries: true },
  { code: "VT", nameEn: "Sales Journal", nameFr: "Journal des ventes", type: "SALES", allowManualEntries: false },
  { code: "AC", nameEn: "Purchase Journal", nameFr: "Journal des achats", type: "PURCHASE", allowManualEntries: false },
  { code: "CA", nameEn: "Cash Journal", nameFr: "Journal de caisse", type: "CASH", allowManualEntries: true },
  { code: "BQ", nameEn: "Bank Journal", nameFr: "Journal de banque", type: "BANK", allowManualEntries: true },
  { code: "ST", nameEn: "Inventory Journal", nameFr: "Journal des stocks", type: "INVENTORY", allowManualEntries: false },
]

function normalizeCurrency(currency?: string | null) {
  return (currency || "XAF").trim().toUpperCase()
}

function toDecimal(value: AccountingAmount) {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0)
  }

  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setUTCHours(0, 0, 0, 0)
  return value
}

function endOfDay(date: Date) {
  const value = new Date(date)
  value.setUTCHours(23, 59, 59, 999)
  return value
}

async function nextEntryNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  entryDate: Date,
  prefix = "JE",
) {
  const count = await tx.journalEntry.count({
    where: {
      organizationId,
      entryDate: {
        gte: startOfDay(entryDate),
        lte: endOfDay(entryDate),
      },
    },
  })

  return `${prefix}-${compactDate(entryDate)}-${String(count + 1).padStart(4, "0")}`
}

function journalAudit(
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
      resourceType: "JournalEntry",
      resourceId: params.resourceId,
      journalEntryId: params.resourceId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

async function assertJournalIsManualReady(
  organizationId: string,
  journalId: string,
  tx: Prisma.TransactionClient,
) {
  const journal = await tx.journal.findFirst({
    where: { id: journalId, organizationId, isActive: true },
  })

  if (!journal) throw new Error("Journal not found")
  if (!journal.allowManualEntries) {
    throw new Error("This journal does not allow manual entries")
  }

  return journal
}

async function assertLinesUsePostableAccounts(
  organizationId: string,
  lines: ManualJournalLineInput[],
  tx: Prisma.TransactionClient,
) {
  if (lines.length < 2) {
    throw new Error("Journal entry requires at least two lines")
  }

  const uniqueAccountIds = Array.from(new Set(lines.map((line) => line.accountId).filter(Boolean)))

  if (uniqueAccountIds.length !== lines.length) {
    const missing = lines.find((line) => !line.accountId)
    if (missing) throw new Error("Every journal line requires an account")
  }

  const accounts = await tx.chartOfAccount.findMany({
    where: {
      organizationId,
      id: { in: uniqueAccountIds },
      deletedAt: null,
    },
    include: {
      _count: { select: { children: true } },
    },
  })

  if (accounts.length !== uniqueAccountIds.length) {
    throw new Error("One or more journal accounts were not found")
  }

  assertSameOrganizationAccounts(organizationId, accounts)

  const accountById = new Map(accounts.map((account) => [account.id, account]))

  for (const line of lines) {
    const account = accountById.get(line.accountId)
    if (!account) throw new Error("One or more journal accounts were not found")
    if (!account.isActive) throw new Error(`Account ${account.code} is inactive`)
    if (account._count.children > 0) throw new Error(`Account ${account.code} has child accounts`)
    if (!account.allowManualPost) throw new Error(`Account ${account.code} does not allow manual posting`)

    const debit = toDecimal(line.debit)
    const credit = toDecimal(line.credit)
    if (debit.eq(0) && credit.eq(0)) {
      throw new Error(`Journal line for account ${account.code} requires a debit or credit amount`)
    }

    const lineCurrency = normalizeCurrency(line.currency)
    if (account.currency && normalizeCurrency(account.currency) !== lineCurrency) {
      throw new Error(`Account ${account.code} only accepts ${account.currency}`)
    }
  }

  return accounts
}

export async function listJournals(organizationId: string, includeInactive = false) {
  return db.journal.findMany({
    where: {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })
}

export async function ensureDefaultJournals(organizationId: string, actorId?: string | null) {
  return db.$transaction(async (tx) => {
    const journals = []

    for (const journal of defaultJournals) {
      journals.push(
        await tx.journal.upsert({
          where: {
            organizationId_code: {
              organizationId,
              code: journal.code,
            },
          },
          update: {
            nameEn: journal.nameEn,
            nameFr: journal.nameFr,
            type: journal.type,
            isDefault: true,
            isActive: true,
            allowManualEntries: journal.allowManualEntries,
          },
          create: {
            organizationId,
            code: journal.code,
            nameEn: journal.nameEn,
            nameFr: journal.nameFr,
            type: journal.type,
            isDefault: true,
            allowManualEntries: journal.allowManualEntries,
          },
        }),
      )
    }

    await tx.ledgerAuditEvent.create({
      data: {
        organizationId,
        actorId,
        action: "DEFAULT_JOURNALS_ENSURE",
        resourceType: "Journal",
        message: "Default accounting journals ensured",
        metadata: { journalCodes: journals.map((journal) => journal.code) },
      },
    })

    return journals
  })
}

export async function listJournalEntries(
  organizationId: string,
  input: {
    status?: "DRAFT" | "POSTED" | "REVERSED" | "VOIDED"
    journalId?: string
    take?: number
  } = {},
) {
  return db.journalEntry.findMany({
    where: {
      organizationId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.journalId ? { journalId: input.journalId } : {}),
    },
    include: journalEntryInclude,
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    take: input.take ?? 50,
  })
}

export async function createManualJournalEntry(
  organizationId: string,
  input: CreateManualJournalEntryInput,
  actorId?: string | null,
) {
  const entryDate = new Date(input.entryDate)

  return db.$transaction(async (tx) => {
    const journal = await assertJournalIsManualReady(organizationId, input.journalId, tx)
    const period = await getOpenPeriodForDate(organizationId, entryDate, tx)

    await assertLinesUsePostableAccounts(organizationId, input.lines, tx)
    assertBalancedJournalEntry(input.lines)

    const entry = await tx.journalEntry.create({
      data: {
        organizationId,
        journalId: journal.id,
        periodId: period.id,
        entryNumber: await nextEntryNumber(tx, organizationId, entryDate),
        entryDate,
        currency: normalizeCurrency(input.lines[0]?.currency),
        memo: input.memo?.trim() || null,
        reference: input.reference?.trim() || null,
        sourceType: AccountingSourceType.MANUAL,
        postingPurpose: AccountingPostingPurpose.MANUAL_JOURNAL,
        createdById: actorId,
        lines: {
          create: input.lines.map((line, index) => {
            const debit = toDecimal(line.debit)
            const credit = toDecimal(line.credit)
            const exchangeRate = line.exchangeRate ? new Prisma.Decimal(line.exchangeRate) : new Prisma.Decimal(1)

            return {
              organizationId,
              accountId: line.accountId,
              lineNumber: index + 1,
              description: line.description?.trim() || null,
              debit,
              credit,
              currency: normalizeCurrency(line.currency),
              exchangeRate,
              baseDebit: debit,
              baseCredit: credit,
              locationId: line.locationId || null,
              customerId: line.customerId || null,
              supplierId: line.supplierId || null,
              itemId: line.itemId || null,
              dimensions: line.dimensions ?? undefined,
              metadata: line.metadata ?? undefined,
            }
          }),
        },
      },
    })

    const saved = await tx.journalEntry.update({
      where: { id: entry.id },
      data: { sourceId: entry.id },
      include: journalEntryInclude,
    })

    await journalAudit(tx, {
      organizationId,
      actorId,
      action: "MANUAL_JOURNAL_DRAFT_CREATE",
      resourceId: saved.id,
      message: `Manual journal entry ${saved.entryNumber} created as draft`,
      metadata: { journalCode: journal.code, periodId: period.id },
    })

    return saved
  })
}
