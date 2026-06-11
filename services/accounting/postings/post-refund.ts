import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  RefundStatus,
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

export type PostRefundInput = POSReversalPostingInput & {
  refundId: string
}

const refundForPostingSelect = {
  id: true,
  organizationId: true,
  refundNumber: true,
  amount: true,
  reason: true,
  status: true,
  processedAt: true,
  processedById: true,
  notes: true,
  createdAt: true,
  paymentId: true,
  payment: {
    select: {
      id: true,
      organizationId: true,
      paymentNumber: true,
      amount: true,
      method: true,
      status: true,
      refundedAmount: true,
      salesOrderId: true,
      processedAt: true,
      processedById: true,
      salesOrder: {
        select: {
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
        },
      },
    },
  },
} satisfies Prisma.PaymentRefundSelect

type RefundForPosting = Prisma.PaymentRefundGetPayload<{
  select: typeof refundForPostingSelect
}>

function toAmount(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(0)
  }

  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function journalTypeForRefund(method: PaymentMethod) {
  if (method === PaymentMethod.CASH) return JournalType.CASH
  if (method === PaymentMethod.STORE_CREDIT) return JournalType.GENERAL
  return JournalType.BANK
}

async function loadRefundForPosting(
  organizationId: string,
  refundId: string,
  tx: Prisma.TransactionClient,
) {
  const refund = await tx.paymentRefund.findFirst({
    where: { id: refundId, organizationId },
    select: refundForPostingSelect,
  })

  if (!refund) throw new NotFoundError("Payment refund not found")
  if (refund.status !== RefundStatus.PROCESSED) {
    throw new BusinessRuleError("Only processed POS refunds can be posted to accounting")
  }
  if (refund.payment.organizationId !== organizationId) {
    throw new BusinessRuleError("Refund payment is not valid for this organization")
  }
  if (!refund.payment.salesOrder || !refund.payment.salesOrderId) {
    throw new BusinessRuleError("Only POS sale refunds can be posted to accounting")
  }
  if (refund.payment.salesOrder.organizationId !== organizationId || refund.payment.salesOrder.deletedAt) {
    throw new BusinessRuleError("Refund source sale is not valid for this organization")
  }
  if (
    refund.payment.salesOrder.status !== SalesOrderStatus.COMPLETED &&
    refund.payment.salesOrder.status !== SalesOrderStatus.RETURNED
  ) {
    throw new BusinessRuleError("Only completed or returned POS sales can be refunded to accounting")
  }
  if (refund.payment.method === PaymentMethod.CREDIT || refund.payment.method === PaymentMethod.MIXED) {
    throw new BusinessRuleError("Credit and mixed payment rows cannot be posted as direct POS refunds")
  }
  if (
    refund.payment.status !== PaymentStatus.PAID &&
    refund.payment.status !== PaymentStatus.PARTIAL &&
    refund.payment.status !== PaymentStatus.REFUNDED
  ) {
    throw new BusinessRuleError("Only captured POS payments can be refunded to accounting")
  }

  const refundAmount = toAmount(refund.amount)
  const paymentAmount = toAmount(refund.payment.amount)
  if (refundAmount.lte(0)) throw new BusinessRuleError("Refund amount must be greater than zero")
  if (refundAmount.gt(paymentAmount)) throw new BusinessRuleError("Refund amount cannot exceed the payment amount")

  return refund
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

function buildRefundAmounts(refund: RefundForPosting, originalSaleCost: Prisma.Decimal) {
  const sale = refund.payment.salesOrder!
  const sourceAmount = toAmount(refund.amount)
  const grossAmount = toAmount(sale.total)
  const taxTotal = toAmount(sale.taxAmount)
  const netTotal = grossAmount.minus(taxTotal).toDecimalPlaces(2)

  if (grossAmount.lte(0)) throw new BusinessRuleError("Refund source sale total must be greater than zero")
  if (sourceAmount.gt(grossAmount)) throw new BusinessRuleError("Refund amount cannot exceed the source sale total")
  if (taxTotal.lt(0) || netTotal.lt(0)) throw new BusinessRuleError("Refund source sale tax is invalid")

  const netAmount = netTotal.mul(sourceAmount).div(grossAmount).toDecimalPlaces(2)
  const taxAmount = sourceAmount.minus(netAmount).toDecimalPlaces(2)
  const costAmount = originalSaleCost.mul(sourceAmount).div(grossAmount).toDecimalPlaces(2)

  return {
    sourceAmount,
    netAmount,
    taxAmount,
    costAmount,
    paymentMethodAmounts: {
      [refund.payment.method]: sourceAmount,
    },
  }
}

async function buildRefundPostingSource(
  organizationId: string,
  refund: RefundForPosting,
  tx: Prisma.TransactionClient,
): Promise<POSReversalPostingSource> {
  const sale = refund.payment.salesOrder!
  const originalSaleCost = await getOriginalSaleCost(organizationId, sale.id, tx)
  const amounts = buildRefundAmounts(refund, originalSaleCost)

  return {
    sourceId: refund.id,
    sourceNumber: refund.refundNumber,
    sourceDate: refund.processedAt || refund.createdAt,
    salesOrderId: sale.id,
    salesOrderNumber: sale.orderNumber,
    locationId: sale.locationId,
    customerId: sale.customerId,
    createdById: refund.processedById || refund.payment.processedById || sale.createdById,
    amounts,
    metadata: {
      paymentId: refund.payment.id,
      paymentNumber: refund.payment.paymentNumber,
      paymentMethod: refund.payment.method,
      refundReason: refund.reason,
      refundNotes: refund.notes || null,
    },
  }
}

async function postRefundInTransaction(
  organizationId: string,
  input: PostRefundInput,
  tx: Prisma.TransactionClient,
) {
  const refund = await loadRefundForPosting(organizationId, input.refundId, tx)
  const sale = refund.payment.salesOrder!

  await assertSourceTraceComplete(
    organizationId,
    {
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: sale.id,
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
    },
    tx,
  )
  await assertSourceTraceComplete(
    organizationId,
    {
      sourceType: AccountingSourceType.POS_PAYMENT,
      sourceId: refund.payment.id,
      postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
    },
    tx,
  )

  const source = await buildRefundPostingSource(organizationId, refund, tx)

  return postPOSReversalInTransaction(
    organizationId,
    input,
    source,
    {
      sourceType: AccountingSourceType.POS_REFUND,
      postingPurpose: AccountingPostingPurpose.REFUND,
      entryPrefix: "RF",
      journalType: journalTypeForRefund(refund.payment.method),
      memoPrefix: "POS refund",
      auditAction: "POS_REFUND_POST",
      auditResourceType: "PaymentRefund",
    },
    tx,
  )
}

export async function postRefund(
  organizationId: string,
  input: PostRefundInput,
  tx?: Prisma.TransactionClient,
) {
  if (tx) return postRefundInTransaction(organizationId, input, tx)
  return db.$transaction((transaction) => postRefundInTransaction(organizationId, input, transaction))
}
