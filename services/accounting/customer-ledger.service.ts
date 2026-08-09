import { LedgerEntryType, Prisma } from "@prisma/client"

import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"

type CustomerLedgerAmount = Prisma.Decimal | Prisma.Decimal.Value

export type CreateCustomerLedgerEntryInput = {
  customerId: string
  organizationId: string
  type: LedgerEntryType
  debit?: CustomerLedgerAmount
  credit?: CustomerLedgerAmount
  enforceCreditLimit?: boolean
  description: string
  referenceType?: string | null
  referenceId?: string | null
  entryDate?: Date | string | null
}

const CUSTOMER_DEBIT_TYPES = new Set<LedgerEntryType>([
  LedgerEntryType.SALE,
  LedgerEntryType.DEBIT_NOTE,
  LedgerEntryType.OPENING_BALANCE,
  LedgerEntryType.PAYMENT_REVERSAL,
])

const CUSTOMER_CREDIT_TYPES = new Set<LedgerEntryType>([
  LedgerEntryType.PAYMENT,
  LedgerEntryType.REFUND,
  LedgerEntryType.CREDIT_NOTE,
  LedgerEntryType.WRITE_OFF,
])

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(`${label} is required`)
  return normalized
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

function validateTypePolarity(
  type: LedgerEntryType,
  debit: Prisma.Decimal,
  credit: Prisma.Decimal,
) {
  if (type === LedgerEntryType.PURCHASE) {
    throw new BusinessRuleError(
      "Purchase entries are not supported in the customer ledger",
    )
  }
  if (type === LedgerEntryType.ADJUSTMENT) return
  if (debit.gt(0) && !CUSTOMER_DEBIT_TYPES.has(type)) {
    throw new BusinessRuleError(
      `Customer ledger entry type ${type} does not support a debit`,
    )
  }
  if (credit.gt(0) && !CUSTOMER_CREDIT_TYPES.has(type)) {
    throw new BusinessRuleError(
      `Customer ledger entry type ${type} does not support a credit`,
    )
  }
}

export async function createCustomerLedgerEntry(
  tx: Prisma.TransactionClient,
  input: CreateCustomerLedgerEntryInput,
) {
  const organizationId = requiredText(input.organizationId, "Organization")
  const customerId = requiredText(input.customerId, "Customer")
  const description = requiredText(input.description, "Description")
  const debit = toMoney(input.debit)
  const credit = toMoney(input.credit)
  const entryDate = normalizeEntryDate(input.entryDate)

  if (debit.lt(0) || credit.lt(0)) {
    throw new BusinessRuleError("Customer ledger amounts cannot be negative")
  }
  if (debit.gt(0) && credit.gt(0)) {
    throw new BusinessRuleError("Customer ledger entry cannot contain both debit and credit")
  }
  if (debit.eq(0) && credit.eq(0)) {
    throw new BusinessRuleError("Customer ledger entry amount must be greater than zero")
  }
  validateTypePolarity(input.type, debit, credit)

  const customer = await tx.customer.findFirst({
    where: {
      id: customerId,
      organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      currentBalance: true,
      creditLimit: true,
    },
  })
  if (!customer) throw new NotFoundError("Customer not found")

  const currentBalance = toMoney(customer.currentBalance)
  const balanceAfter = currentBalance
    .plus(debit)
    .minus(credit)
    .toDecimalPlaces(2)
  if (balanceAfter.lt(0)) {
    throw new BusinessRuleError(
      "Customer balance cannot become negative from this ledger entry",
    )
  }
  if (
    input.enforceCreditLimit &&
    customer.creditLimit != null &&
    balanceAfter.gt(toMoney(customer.creditLimit))
  ) {
    throw new BusinessRuleError("Customer credit limit would be exceeded")
  }

  const balanceClaim = await tx.customer.updateMany({
    where: {
      id: customerId,
      organizationId,
      deletedAt: null,
      currentBalance,
    },
    data: { currentBalance: balanceAfter },
  })
  if (balanceClaim.count !== 1) {
    throw new ConflictError(
      "Customer balance changed; refresh before recording this ledger entry",
    )
  }

  return tx.customerLedgerEntry.create({
    data: {
      customerId,
      organizationId,
      entryDate,
      type: input.type,
      debit,
      credit,
      balanceAfter,
      description,
      referenceType: input.referenceType?.trim() || undefined,
      referenceId: input.referenceId?.trim() || undefined,
    },
  })
}
