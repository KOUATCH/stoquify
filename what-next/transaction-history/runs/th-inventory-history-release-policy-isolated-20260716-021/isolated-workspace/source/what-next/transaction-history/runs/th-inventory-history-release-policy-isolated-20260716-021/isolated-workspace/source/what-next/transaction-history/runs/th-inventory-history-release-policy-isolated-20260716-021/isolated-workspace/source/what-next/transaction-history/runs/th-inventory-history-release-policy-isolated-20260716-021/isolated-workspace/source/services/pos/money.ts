import { Prisma } from "@prisma/client"
import type { Decimal } from "@prisma/client/runtime/library"

export type MoneyValue = Decimal | Prisma.Decimal | number | string | null | undefined

export function toDecimal(value: MoneyValue): Prisma.Decimal {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0)
  }

  return new Prisma.Decimal(value)
}

export function addMoney(left: MoneyValue, right: MoneyValue): Prisma.Decimal {
  return toDecimal(left).plus(toDecimal(right))
}

export function subtractMoney(left: MoneyValue, right: MoneyValue): Prisma.Decimal {
  return toDecimal(left).minus(toDecimal(right))
}

export function multiplyMoney(left: MoneyValue, right: MoneyValue): Prisma.Decimal {
  return toDecimal(left).times(toDecimal(right))
}

export function divideMoney(left: MoneyValue, right: MoneyValue): Prisma.Decimal {
  return toDecimal(left).div(toDecimal(right))
}

export function moneyToNumber(value: MoneyValue): number {
  return toDecimal(value).toNumber()
}

export function moneyToString(value: MoneyValue): string {
  return toDecimal(value).toFixed(2)
}
