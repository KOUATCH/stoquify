"use server"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError, ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { confirmInvoiceCorrection, previewInvoiceCorrection, loadInvoiceCorrectionSources, loadInvoiceCorrectionHistory as history } from "@/services/purchasing/invoice-correction.service"
import { invoiceCorrectionCommandSchema, invoiceCorrectionDraftSchema, invoiceCorrectionHistorySchema, invoiceCorrectionQuerySchema, type InvoiceCorrectionCommand, type InvoiceCorrectionDraft, type InvoiceCorrectionHistory, type InvoiceCorrectionQuery } from "@/services/purchasing/invoice-correction-contracts"
import { loadInvoiceCorrectionSource } from "@/services/purchasing/invoice-correction.service"
import { invoiceCorrectionSourceSchema, type InvoiceCorrectionSourceQuery } from "@/services/purchasing/invoice-correction-contracts"

async function scope() {
  const actor = await requirePermission("purchasing.ap.invoice.post", { resource: "SupplierInvoice", auditAllowed: false })
  const { claims } = await requireSession()
  if (claims.userId !== actor.userId || claims.tenantId !== actor.orgId) throw new ForbiddenError("Current invoice correction identity is required.")
  return { organizationId: actor.orgId, actorId: actor.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}
function failure(error: unknown) {
  const safe = toSafeActionError(error)
  return { success: false as const, data: null, error: safe.error, code: error instanceof BusinessRuleError && error.code === "INVOICE_EVIDENCE_REQUIRED" ? error.code : safe.code }
}
export async function loadInvoiceCorrection(query: InvoiceCorrectionQuery = {}) {
  try { return { success: true as const, data: await loadInvoiceCorrectionSources(invoiceCorrectionQuerySchema.parse(query), await scope()) } } catch (error) { return failure(error) }
}
export async function reviewInvoiceCorrection(draft: InvoiceCorrectionDraft) {
  try { return { success: true as const, data: await previewInvoiceCorrection(invoiceCorrectionDraftSchema.parse(draft), await scope()) } } catch (error) { return failure(error) }
}
export async function loadInvoiceCorrectionDetail(query: InvoiceCorrectionSourceQuery) {
  try { return { success: true as const, data: await loadInvoiceCorrectionSource(invoiceCorrectionSourceSchema.parse(query), await scope()) } } catch (error) { return failure(error) }
}
export async function loadInvoiceCorrectionHistory(query: InvoiceCorrectionHistory) {
  try { return { success: true as const, data: await history(invoiceCorrectionHistorySchema.parse(query), await scope()) } } catch (error) { return failure(error) }
}
export async function submitInvoiceCorrection(command: InvoiceCorrectionCommand) {
  try {
    const data = await confirmInvoiceCorrection(invoiceCorrectionCommandSchema.parse(command), await scope())
    try { revalidatePath('/[locale]/dashboard/purchases/payables', 'page'); revalidatePath('/[locale]/dashboard/purchases/payables/approve', 'page') } catch { /* Retained correction remains authoritative after cache failure. */ }
    return { success: true as const, data }
  } catch (error) { return failure(error) }
}
