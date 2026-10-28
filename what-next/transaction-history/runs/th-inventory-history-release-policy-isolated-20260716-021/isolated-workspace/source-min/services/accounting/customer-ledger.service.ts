import { LedgerEntryType, Prisma } from "@prisma/client"

import { BusinessRuleError } from "@/services/_shared/action-errors"

type CustomerLedgerAmount = Prisma.Decimal | Prisma.Decimal.Value

export type CreateCustomerLedgerEntryInput = {
  customerId: string
  organizationId: string
  type: LedgerEntryType
  debit?: CustomerLedgerAmount
  credit?: CustomerLedgerAmount
  balanceAfter: CustomerLedgerAmount
  description: string
  referenceType?: string | null
  referenceId?: string | null
  entryDate?: Date | string | null
}

function toMoney(value: CustomerLedgerAmount | undefined) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2)
}

function normalizeEntryDate(value: Date | string | null | undefined) {
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError("Customer ledger entry date is invalid")
  }

  return date
}

export async function createCustomerLedgerEntry(
  tx: Prisma.TransactionClient,
  input: CreateCustomerLedgerEntryInput,
) {
  const debit = toMoney(input.debit)
  const credit = toMoney(input.credit)
  const balanceAfter = toMoney(input.balanceAfter)

  if (debit.lt(0) || credit.lt(0)) {
    throw new BusinessRuleError("Customer ledger amounts cannot be negative")
  }
  if (debit.gt(0) && credit.gt(0)) {
    throw new BusinessRuleError("Customer ledger entry cannot contain both debit and credit")
  }
  if (debit.eq(0) && credit.eq(0)) {
    throw new BusinessRuleError("Customer ledger entry amount must be greater than zero")
  }

  return tx.customerLedgerEntry.create({
    data: {
      customerId: input.customerId,
      organizationId: input.organizationId,
      entryDate: normalizeEntryDate(input.entryDate),
      type: input.type,
      debit,
      credit,
      balanceAfter,
      description: input.description,
      referenceType: input.referenceType || undefined,
      referenceId: input.referenceId || undefined,
    },
  })
}
