import { MobileMoneyProvider, Prisma } from "@prisma/client"
import { z } from "zod"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"

export const customerSettlementWorkbenchInputSchema = z.object({
  customerId: z.string().trim().min(1).max(191),
  referenceId: z.string().trim().min(1).max(191),
}).strict()

export type CustomerSettlementWorkbench = {
  scope: { organizationId: string; actorUserId: string }
  document: {
    customerId: string
    referenceId: string
    salesOrderId: string | null
    documentNumber: string
    currency: string
    openAmount: string
    status: string
  }
  canCollect: boolean
  providerReceipts: Array<{
    id: string
    method: "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER"
    providerReference: string
    accountLabel: string
    amount: string
    currency: string
    occurredAt: string
  }>
  settlements: Array<{
    id: string
    settlementNumber: string
    method: string
    amount: string
    allocatedAmount: string
    currency: string
    settlementDate: string
    status: string
    externalReference: string | null
    canReverse: boolean
  }>
}

type WorkbenchContext = {
  organizationId: string
  actorUserId: string
  permissions: readonly string[]
}

/** A bounded projection; evidence hashes and actor identities remain server-side. */
export async function getCustomerSettlementWorkbench(
  input: z.infer<typeof customerSettlementWorkbenchInputSchema>,
  context: WorkbenchContext,
  client = db,
): Promise<CustomerSettlementWorkbench> {
  const parsed = customerSettlementWorkbenchInputSchema.parse(input)
  const { organizationId, actorUserId, permissions } = context
  const document = await client.customerReceivableDocument.findFirst({
    where: {
      id: parsed.referenceId,
      organizationId,
      customerId: parsed.customerId,
      customer: { organizationId },
    },
    select: {
      id: true,
      organizationId: true,
      customerId: true,
      sourceSalesOrderId: true,
      sourceSalesOrder: { select: { id: true, organizationId: true, customerId: true } },
      documentNumber: true,
      currency: true,
      totalAmount: true,
      lifecycleStates: {
        where: { organizationId },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { organizationId: true, documentId: true, status: true, paidAmount: true, unpaidAmount: true },
      },
    },
  })
  if (!document || document.organizationId !== organizationId || document.customerId !== parsed.customerId) {
    throw new NotFoundError("Posted customer receivable not found")
  }
  if (document.sourceSalesOrderId && (
    document.sourceSalesOrder?.id !== document.sourceSalesOrderId ||
    document.sourceSalesOrder.organizationId !== organizationId ||
    document.sourceSalesOrder.customerId !== parsed.customerId
  )) {
    throw new ConflictError("Receivable sales order scope does not match")
  }
  const state = document.lifecycleStates[0]
  if (!state || state.organizationId !== organizationId || state.documentId !== document.id) {
    throw new ConflictError("Posted customer receivable lifecycle evidence is missing")
  }
  if (state.paidAmount.lt(0) || state.unpaidAmount.lt(0) || !state.paidAmount.plus(state.unpaidAmount).eq(document.totalAmount)) {
    throw new ConflictError("Posted receivable state does not conserve its document total")
  }

  const allocationScope = {
    organizationId,
    OR: [
      { customerReceivableDocumentId: document.id },
      ...(document.sourceSalesOrderId ? [{ salesOrderId: document.sourceSalesOrderId }] : []),
    ],
  }
  const settlements = await client.customerSettlement.findMany({
    where: { organizationId, customerId: document.customerId, allocations: { some: allocationScope } },
    orderBy: [{ settlementDate: "desc" }, { id: "desc" }],
    select: {
      id: true,
      organizationId: true,
      customerId: true,
      receivedById: true,
      settlementNumber: true,
      method: true,
      amount: true,
      currency: true,
      settlementDate: true,
      status: true,
      externalReference: true,
      allocations: {
        where: allocationScope,
        select: { organizationId: true, customerReceivableDocumentId: true, salesOrderId: true, amount: true },
      },
    },
  })
  const canReverse = hasRbacPermission(permissions, "finance.receivables.reverse")
  const canCollect = hasRbacPermission(permissions, "finance.receivables.collect") &&
    ["ISSUED", "PARTIALLY_PAID"].includes(state.status) && state.unpaidAmount.gt(0)
  // A selection preview is not a reservation. The collection owner revalidates
  // provider authority and claims the native receipt inside its write transaction.
  const providerTransactions = canCollect ? await client.paymentTransaction.findMany({
    where: {
      organizationId,
      direction: "INBOUND",
      state: { in: ["CONFIRMED", "SETTLED"] },
      legacyPaymentId: null,
      ledgerPostingBatchId: null,
      OR: [{ sourceType: null }, { sourceType: { not: "CUSTOMER_SETTLEMENT" } }],
      currencyCode: document.currency,
      amount: { gt: 0, lte: state.unpaidAmount },
      confirmedAt: { not: null },
      providerAccount: { is: { organizationId, status: "ACTIVE", currencyCode: document.currency,
        paymentRail: { is: { organizationId, isActive: true, currencyCode: document.currency, type: { in: ["CARD", "MOBILE_MONEY", "BANK_TRANSFER"] } } },
        settlementLedgerAccount: { is: { organizationId, isActive: true, deletedAt: null, type: "ASSET", normalBalance: "DEBIT", OR: [{ currency: null }, { currency: document.currency }] } },
      } },
      providerAuthorityEvent: { is: { organizationId, status: "PROCESSED", signatureValid: true, direction: "INBOUND", currencyCode: document.currency, occurredAt: { not: null } } },
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true, organizationId: true, direction: true, state: true, amount: true, currencyCode: true, legacyPaymentId: true, ledgerPostingBatchId: true, sourceType: true,
      providerAccountId: true, providerAuthorityEventId: true, providerTransactionId: true, providerReference: true, confirmedAt: true, occurredAt: true,
      providerAccount: { select: { id: true, organizationId: true, status: true, currencyCode: true, providerCode: true, displayName: true,
        paymentRail: { select: { organizationId: true, isActive: true, currencyCode: true, type: true } },
        settlementLedgerAccount: { select: { organizationId: true, isActive: true, deletedAt: true, type: true, normalBalance: true, currency: true } },
      } },
      providerAuthorityEvent: { select: { id: true, organizationId: true, providerAccountId: true, status: true, signatureValid: true, direction: true, amount: true, currencyCode: true, providerTransactionId: true, providerReference: true, occurredAt: true } },
    },
  }) : []
  const providerReceipts: CustomerSettlementWorkbench["providerReceipts"] = providerTransactions.flatMap(transaction => {
    const account = transaction.providerAccount, event = transaction.providerAuthorityEvent
    const rail = account?.paymentRail, ledger = account?.settlementLedgerAccount
    const method = rail?.type
    if (!account || !event || !rail || !ledger || !["CARD", "MOBILE_MONEY", "BANK_TRANSFER"].includes(method ?? "")) return []
    if (transaction.organizationId !== organizationId || transaction.direction !== "INBOUND" || !["CONFIRMED", "SETTLED"].includes(transaction.state) ||
      transaction.legacyPaymentId || transaction.ledgerPostingBatchId || transaction.sourceType === "CUSTOMER_SETTLEMENT" ||
      transaction.providerAccountId !== account.id || transaction.providerAuthorityEventId !== event.id ||
      account.organizationId !== organizationId || account.status !== "ACTIVE" || rail.organizationId !== organizationId || !rail.isActive ||
      ledger.organizationId !== organizationId || !ledger.isActive || ledger.deletedAt || ledger.type !== "ASSET" || ledger.normalBalance !== "DEBIT" ||
      [transaction.currencyCode, account.currencyCode, rail.currencyCode, event.currencyCode].some(currency => currency.trim().toUpperCase() !== document.currency) ||
      (ledger.currency && ledger.currency !== document.currency) || transaction.amount.lte(0) || transaction.amount.gt(state.unpaidAmount) ||
      !transaction.confirmedAt || !Number.isFinite(transaction.confirmedAt.getTime()) ||
      event.organizationId !== organizationId || event.providerAccountId !== account.id || event.status !== "PROCESSED" || !event.signatureValid || event.direction !== "INBOUND" ||
      !event.amount || !event.amount.eq(transaction.amount) || !event.occurredAt || !Number.isFinite(event.occurredAt.getTime()) ||
      (transaction.occurredAt && transaction.occurredAt.getTime() !== event.occurredAt.getTime()) ||
      !transaction.providerTransactionId?.trim() || transaction.providerTransactionId.trim() !== event.providerTransactionId?.trim() ||
      (transaction.providerReference && event.providerReference && transaction.providerReference.trim() !== event.providerReference.trim()) ||
      (method === "MOBILE_MONEY" && !Object.values(MobileMoneyProvider).includes(account.providerCode as MobileMoneyProvider))) return []
    const providerReference = transaction.providerReference?.trim() || event.providerReference?.trim() || transaction.providerTransactionId.trim()
    if (providerReference.length > 160) return []
    return [{ id: transaction.id, method: method as "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER", providerReference,
      accountLabel: account.displayName.slice(0, 160), amount: transaction.amount.toFixed(2), currency: document.currency, occurredAt: event.occurredAt.toISOString() }]
  })
  return {
    scope: { organizationId, actorUserId },
    document: {
      customerId: document.customerId,
      referenceId: document.id,
      salesOrderId: document.sourceSalesOrderId,
      documentNumber: document.documentNumber,
      currency: document.currency,
      openAmount: state.unpaidAmount.toFixed(2),
      status: state.status,
    },
    canCollect,
    providerReceipts,
    settlements: settlements.map(settlement => {
      if (settlement.organizationId !== organizationId || settlement.customerId !== document.customerId || settlement.currency !== document.currency) {
        throw new ConflictError("Customer settlement scope does not match")
      }
      if (!settlement.allocations.length) throw new ConflictError("Customer settlement allocation evidence is missing")
      const allocatedAmount = settlement.allocations.reduce((total, allocation) => {
        if (allocation.organizationId !== organizationId || !(
          allocation.customerReceivableDocumentId === document.id ||
          Boolean(document.sourceSalesOrderId && allocation.salesOrderId === document.sourceSalesOrderId)
        )) throw new ConflictError("Customer settlement allocation scope does not match")
        return total.plus(allocation.amount)
      }, new Prisma.Decimal(0))
      return {
        id: settlement.id,
        settlementNumber: settlement.settlementNumber,
        method: settlement.method,
        amount: settlement.amount.toFixed(2),
        allocatedAmount: allocatedAmount.toFixed(2),
        currency: settlement.currency,
        settlementDate: settlement.settlementDate.toISOString(),
        status: settlement.status,
        externalReference: settlement.externalReference,
        canReverse: canReverse && settlement.receivedById !== actorUserId && settlement.status === "POSTED",
      }
    }),
  }
}
