import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SalesOrderStatus,
  TransactionReferenceType,
  TransactionType,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { assertSourceTraceComplete } from "../source-link.service"
import {
  postPOSReversalInTransaction,
  type POSReversalPostingInput,
  type POSReversalPostingSource,
} from "./pos-reversal-helpers"

export type PostVoidInput = POSReversalPostingInput & {
  salesOrderId: string
}

const voidSaleForPostingSelect = {
  id: true,
  organizationId: true,
  orderNumber: true,
  status: true,
  orderDate: true,
  total: true,
  taxAmount: true,
  locationId: true,
  customerId: true,
  createdById: true,
  deletedAt: true,
  payments: {
    select: {
      id: true,
      paymentNumber: true,
      amount: true,
      method: true,
      status: true,
      deletedAt: true,
      refunds: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.SalesOrderSelect

type VoidSaleForPosting = Prisma.SalesOrderGetPayload<{
  select: typeof voidSaleForPostingSelect
}>

function toAmount(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0)
  }

  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

async function loadVoidSaleForPosting(
  organizationId: string,
  salesOrderId: string,
  tx: Prisma.TransactionClient,
) {
  const sale = await tx.salesOrder.findFirst({
    where: {
      id: salesOrderId,
      organizationId,
      deletedAt: null,
    },
    select: voidSaleForPostingSelect,
  })

  if (!sale) throw new NotFoundError("Sales order not found")
  if (sale.status !== SalesOrderStatus.CANCELLED) {
    throw new BusinessRuleError("Only cancelled POS sales can be posted as voids")
  }
  if (sale.payments.some((payment) => payment.refunds.length > 0)) {
    throw new BusinessRuleError("Refunded sales cannot be voided; use refund reversal entries instead")
  }

  const grossAmount = toAmount(sale.total)
  if (grossAmount.lte(0)) throw new BusinessRuleError("Void source sale total must be greater than zero")

  const activePayments = sale.payments.filter((payment) => !payment.deletedAt)
  if (activePayments.length === 0) {
    throw new BusinessRuleError("Void source sale has no payment rows to reverse")
  }

  const invalidPayment = activePayments.find(
    (payment) =>
      payment.status !== PaymentStatus.CANCELLED &&
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIAL &&
      payment.status !== PaymentStatus.REFUNDED &&
      payment.status !== PaymentStatus.PENDING,
  )
  if (invalidPayment) {
    throw new BusinessRuleError(`Payment ${invalidPayment.paymentNumber} is not voidable`)
  }

  return sale
}

async function getOriginalSaleCost(
  organizationId: string,
  salesOrderId: string,
  tx: Prisma.TransactionClient,
) {
  const movements = await tx.inventoryTransaction.findMany({
    where: {
      organizationId,
      referenceType: TransactionReferenceType.SALES_ORDER,
      referenceId: salesOrderId,
      type: TransactionType.SALE,
    },
    select: { totalCost: true },
  })

  return movements
    .reduce((total, movement) => total.plus(toAmount(movement.totalCost)), new Prisma.Decimal(0))
    .toDecimalPlaces(2)
}

function buildPaymentMethodAmounts(sale: VoidSaleForPosting) {
  const paymentMethodAmounts: Partial<Record<PaymentMethod, Prisma.Decimal>> = {}

  for (const payment of sale.payments) {
    if (payment.deletedAt) continue
    const amount = toAmount(payment.amount)
    if (amount.lte(0)) continue
    paymentMethodAmounts[payment.method] = (paymentMethodAmounts[payment.method] || new Prisma.Decimal(0))
      .plus(amount)
      .toDecimalPlaces(2)
  }

  return paymentMethodAmounts
}

function buildVoidAmounts(sale: VoidSaleForPosting, originalSaleCost: Prisma.Decimal) {
  const sourceAmount = toAmount(sale.total)
  const taxAmount = toAmount(sale.taxAmount)
  const netAmount = sourceAmount.minus(taxAmount).toDecimalPlaces(2)
  const paymentMethodAmounts = buildPaymentMethodAmounts(sale)
  const tenderTotal = Object.values(paymentMethodAmounts)
    .reduce((total, amount) => total.plus(amount || new Prisma.Decimal(0)), new Prisma.Decimal(0))
    .toDecimalPlaces(2)

  if (taxAmount.lt(0) || netAmount.lt(0)) throw new BusinessRuleError("Void source sale tax is invalid")
  if (!tenderTotal.eq(sourceAmount)) {
    throw new BusinessRuleError("Void payment rows do not reconcile to the source sale total")
  }

  return {
    sourceAmount,
    netAmount,
    taxAmount,
    costAmount: originalSaleCost,
    paymentMethodAmounts,
  }
}

async function buildVoidPostingSource(
  organizationId: string,
  sale: VoidSaleForPosting,
  tx: Prisma.TransactionClient,
): Promise<POSReversalPostingSource> {
  const originalSaleCost = await getOriginalSaleCost(organizationId, sale.id, tx)
  const amounts = buildVoidAmounts(sale, originalSaleCost)

  return {
    sourceId: sale.id,
    sourceNumber: sale.orderNumber,
    sourceDate: sale.orderDate,
    salesOrderId: sale.id,
    salesOrderNumber: sale.orderNumber,
    locationId: sale.locationId,
    customerId: sale.customerId,
    createdById: sale.createdById,
    amounts,
    metadata: {
      paymentIds: sale.payments.filter((payment) => !payment.deletedAt).map((payment) => payment.id),
      paymentNumbers: sale.payments.filter((payment) => !payment.deletedAt).map((payment) => payment.paymentNumber),
    },
  }
}

async function assertOriginalPaymentTraces(
  organizationId: string,
  sale: VoidSaleForPosting,
  tx: Prisma.TransactionClient,
) {
  for (const payment of sale.payments) {
    if (payment.deletedAt || payment.method === PaymentMethod.CREDIT) continue

    await assertSourceTraceComplete(
      organizationId,
      {
        sourceType: AccountingSourceType.POS_PAYMENT,
        sourceId: payment.id,
        postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
      },
      tx,
    )
  }
}

async function postVoidInTransaction(
  organizationId: string,
  input: PostVoidInput,
  tx: Prisma.TransactionClient,
) {
  const sale = await loadVoidSaleForPosting(organizationId, input.salesOrderId, tx)

  await assertSourceTraceComplete(
    organizationId,
    {
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: sale.id,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
    },
    tx,
  )
  await assertOriginalPaymentTraces(organizationId, sale, tx)

  const source = await buildVoidPostingSource(organizationId, sale, tx)

  return postPOSReversalInTransaction(
    organizationId,
    input,
    source,
    {
      sourceType: AccountingSourceType.POS_VOID,
      postingPurpose: AccountingPostingPurpose.VOID,
      entryPrefix: "VD",
      journalType: JournalType.GENERAL,
      memoPrefix: "POS void",
      auditAction: "POS_VOID_POST",
      auditResourceType: "SalesOrder",
    },
    tx,
  )
}

export async function postVoid(
  organizationId: string,
  input: PostVoidInput,
  tx?: Prisma.TransactionClient,
) {
  if (tx) return postVoidInTransaction(organizationId, input, tx)
  return db.$transaction((transaction) => postVoidInTransaction(organizationId, input, transaction))
}
