import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { paymentRequestAuthority } from "./payment-request-authority"
import { paymentQueueQuerySchema, paymentSourcesQuerySchema, paymentWorkspaceKindSchema, paymentRequestApprovalSchema, paymentRequestScopeSchema, type PaymentSourcesQuery, type PaymentQueueQuery, type PaymentRequestScope } from "./payment-request-contracts"
import { readSupplierPaymentBalances } from "./supplier-payment-balance"
import { readVerifiedPaymentRequest, readVerifiedPaymentApproval } from "./payment-request-evidence"

export async function loadPaymentRequestSources(input: PaymentSourcesQuery, scopeInput: PaymentRequestScope) {
  const query = paymentSourcesQuerySchema.parse(input), scope = paymentRequestScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => {
    await paymentRequestAuthority(tx, scope, "request", false)
    const suppliers = await tx.supplier.findMany({ where: { organizationId: scope.organizationId, isActive: true, deletedAt: null, name: { contains: query.search, mode: "insensitive" }, ...(query.supplierAfter ? { id: { gt: query.supplierAfter } } : {}) }, select: { id: true, name: true }, orderBy: { id: "asc" }, take: 26 })
    const supplier = query.supplierId ? await tx.supplier.findFirst({ where: { id: query.supplierId, organizationId: scope.organizationId, isActive: true, deletedAt: null }, select: { id: true, name: true } }) : null
    if (query.supplierId && !supplier) throw new NotFoundError("Supplier is unavailable.")
    const banks = supplier ? await tx.supplierBankAccount.findMany({ where: { organizationId: scope.organizationId, supplierId: supplier.id, status: "APPROVED", deletedAt: null, ...(query.bankAfter ? { id: { gt: query.bankAfter } } : {}) }, select: { id: true, bankName: true, accountNumberMasked: true, mobileMoneyProvider: true, mobileMoneyPhoneMasked: true }, orderBy: { id: "asc" }, take: 26 }) : []
    const rows = supplier ? await tx.supplierInvoice.findMany({ where: { organizationId: scope.organizationId, supplierId: supplier.id, status: { in: ["POSTED", "PAYMENT_PENDING"] }, deletedAt: null, ...(query.invoiceAfter ? { id: { gt: query.invoiceAfter } } : {}) }, select: { id: true, organizationId: true, supplierId: true, invoiceNumber: true, currency: true, total: true, amountPaid: true }, orderBy: { id: "asc" }, take: 51 }) : []
    const balances = new Map<string, Prisma.Decimal>()
    for (const currency of new Set(rows.map(row => row.currency))) for (const [id, amount] of await readSupplierPaymentBalances(tx, scope.organizationId, rows.filter(row => row.currency === currency), currency)) balances.set(id, amount)
    const pendingBankChange = supplier ? await tx.supplierBankChangeRequest.count({ where: { organizationId: scope.organizationId, supplierId: supplier.id, status: "PENDING" } }) > 0 : false
    return { organizationId: scope.organizationId, actorId: scope.actorId, checkedAt: new Date().toISOString(), suppliers: suppliers.slice(0, 25), supplierNext: suppliers.length > 25 ? suppliers[24].id : null, supplier, pendingBankChange, banks: banks.slice(0, 25).map(bank => ({ id: bank.id, label: [bank.bankName, bank.accountNumberMasked, bank.mobileMoneyProvider, bank.mobileMoneyPhoneMasked].filter(Boolean).join(" · ") })), bankNext: banks.length > 25 ? banks[24].id : null, invoices: rows.slice(0, 50).map(row => ({ id: row.id, number: row.invoiceNumber, currency: row.currency, available: balances.get(row.id)!.toFixed(2) })), invoiceNext: rows.length > 50 ? rows[49].id : null }
  }, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function loadPaymentRequestQueue(input: PaymentQueueQuery, kindInput: "request" | "approve", scopeInput: PaymentRequestScope) {
  const query = paymentQueueQuerySchema.parse(input), kind = paymentWorkspaceKindSchema.parse(kindInput), scope = paymentRequestScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => {
    await paymentRequestAuthority(tx, scope, kind, false)
    const rows = await tx.supplierPayment.findMany({ where: { organizationId: scope.organizationId, deletedAt: null, ...(kind === "request" ? { requestedById: scope.actorId } : {}), ...(query.status === "DRAFT" ? { status: "DRAFT" } : {}), ...(query.after ? { id: { gt: query.after } } : {}), supplier: { organizationId: scope.organizationId }, OR: [{ paymentNumber: { contains: query.search, mode: "insensitive" } }, { supplier: { name: { contains: query.search, mode: "insensitive" } } }] }, select: { id: true, paymentNumber: true, status: true, amount: true, currency: true, requestedById: true, paymentDate: true, supplier: { select: { name: true } } }, orderBy: { id: "asc" }, take: 26 })
    return { organizationId: scope.organizationId, actorId: scope.actorId, checkedAt: new Date().toISOString(), rows: rows.slice(0, 25).map(row => ({ id: row.id, number: row.paymentNumber, status: row.status, amount: row.amount.toFixed(2), currency: row.currency, supplierName: row.supplier.name, paymentDate: row.paymentDate.toISOString(), independentApproverRequired: row.requestedById === scope.actorId })), next: rows.length > 25 ? rows[24].id : null }
  }, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function loadPaymentRequestHistory(idInput: string, kindInput: "request" | "approve", scopeInput: PaymentRequestScope) {
  const id = paymentRequestApprovalSchema.shape.paymentRequestId.parse(idInput), kind = paymentWorkspaceKindSchema.parse(kindInput), scope = paymentRequestScopeSchema.parse(scopeInput)
  return db.$transaction(async tx => {
    await paymentRequestAuthority(tx, scope, kind, false)
    const payment = await tx.supplierPayment.findFirst({ where: { id, organizationId: scope.organizationId, ...(kind === "request" ? { requestedById: scope.actorId } : {}), supplier: { organizationId: scope.organizationId } }, select: { id: true, paymentNumber: true, status: true, deletedAt: true } })
    if (!payment) throw new NotFoundError("Payment request is unavailable.")
    let requestedAt: string | null = null, approvedAt: string | null = null, requestEventId: string | null = null, approvalEventId: string | null = null
    try {
      const request = await readVerifiedPaymentRequest(tx, scope.organizationId, id)
      requestedAt = request.event.occurredAt.toISOString(); requestEventId = request.event.id
      if (request.payment.approvedById) {
        const approval = await readVerifiedPaymentApproval(tx, scope.organizationId, id)
        approvedAt = approval.approvalEvent.occurredAt.toISOString(); approvalEventId = approval.approvalEvent.id
      }
    } catch (error) {
      // Missing or inconsistent retained proof is an explicit review state; database failures still propagate.
      if (!(error instanceof BusinessRuleError) && !(error instanceof NotFoundError)) throw error
    }
    return { organizationId: scope.organizationId, actorId: scope.actorId, paymentRequestId: id, number: payment.paymentNumber, status: payment.status, archived: !!payment.deletedAt, requestedAt, approvedAt, requestEventId, approvalEventId, checkedAt: new Date().toISOString() }
  }, { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
