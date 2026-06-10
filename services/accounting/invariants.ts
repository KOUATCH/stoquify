import { Prisma } from "@prisma/client"

export type AccountingAmount = Prisma.Decimal | number | string | null | undefined

export type JournalBalanceLine = {
  debit?: AccountingAmount
  credit?: AccountingAmount
  currency?: string | null
}

export type AccountOrganizationCheck = {
  id: string
  code?: string | null
  organizationId: string
}

export type AccountingPeriodCheck = {
  id: string
  organizationId?: string | null
  name?: string | null
  startDate: Date
  endDate: Date
  status: "OPEN" | "LOCKED" | "CLOSED" | string
}

export type PostingIdempotencyInput = {
  organizationId: string
  sourceType: string
  sourceId: string
  postingPurpose: string
  sourceVersion?: number | string | null
}

function toDecimal(value: AccountingAmount): Prisma.Decimal {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0)
  }

  return new Prisma.Decimal(value)
}

function normalizeToken(value: string) {
  return value.trim().replace(/\s+/g, "-").toUpperCase()
}

function dateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

export function assertBalancedJournalEntry(lines: JournalBalanceLine[]) {
  if (!lines.length) {
    throw new Error("Journal entry requires at least one line")
  }

  const totals = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>()

  for (const line of lines) {
    const currency = normalizeToken(line.currency || "XAF")
    const debit = toDecimal(line.debit).toDecimalPlaces(2)
    const credit = toDecimal(line.credit).toDecimalPlaces(2)

    if (debit.lt(0) || credit.lt(0)) {
      throw new Error("Journal entry lines cannot contain negative amounts")
    }

    if (debit.gt(0) && credit.gt(0)) {
      throw new Error("A journal line cannot contain both debit and credit amounts")
    }

    const current = totals.get(currency) ?? {
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(0),
    }

    current.debit = current.debit.plus(debit).toDecimalPlaces(2)
    current.credit = current.credit.plus(credit).toDecimalPlaces(2)
    totals.set(currency, current)
  }

  for (const [currency, total] of totals) {
    if (total.debit.eq(0) && total.credit.eq(0)) {
      throw new Error(`Journal entry currency ${currency} has no amount`)
    }

    if (!total.debit.eq(total.credit)) {
      throw new Error(
        `Journal entry is not balanced for ${currency}: debit ${total.debit.toFixed(2)} credit ${total.credit.toFixed(2)}`,
      )
    }
  }

  return true
}

export function assertSameOrganizationAccounts(
  organizationId: string,
  accounts: AccountOrganizationCheck[],
) {
  const mismatched = accounts.find((account) => account.organizationId !== organizationId)

  if (mismatched) {
    throw new Error(`Account ${mismatched.code || mismatched.id} does not belong to this organization`)
  }

  return true
}

export function buildPostingIdempotencyKey(input: PostingIdempotencyInput) {
  const parts = [
    input.organizationId,
    input.sourceType,
    input.sourceId,
    input.postingPurpose,
    input.sourceVersion === null || input.sourceVersion === undefined ? "v1" : `v${input.sourceVersion}`,
  ]

  return parts.map((part) => normalizeToken(String(part))).join(":")
}

export function assertOpenPeriod(
  period: AccountingPeriodCheck | null | undefined,
  entryDate: Date = new Date(),
  organizationId?: string,
) {
  if (!period) {
    throw new Error("Accounting period was not found")
  }

  if (organizationId && period.organizationId && period.organizationId !== organizationId) {
    throw new Error("Accounting period does not belong to this organization")
  }

  if (period.status !== "OPEN") {
    throw new Error(`Accounting period ${period.name || period.id} is not open`)
  }

  const candidate = dateOnly(entryDate)
  const start = dateOnly(period.startDate)
  const end = dateOnly(period.endDate)

  if (candidate < start || candidate > end) {
    throw new Error(`Entry date is outside accounting period ${period.name || period.id}`)
  }

  return true
}
