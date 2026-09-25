"use server"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError, ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { loadInvoiceMatchExceptionSources, loadInvoiceMatchExceptionHistory as history, previewInvoiceMatchException, confirmInvoiceMatchException } from "@/services/purchasing/invoice-match-exception.service"
import { invoiceMatchExceptionCommandSchema, invoiceMatchExceptionDraftSchema, invoiceMatchExceptionHistoryQuerySchema, invoiceMatchExceptionQuerySchema, type InvoiceMatchExceptionCommand, type InvoiceMatchExceptionDraft, type InvoiceMatchExceptionHistoryQuery, type InvoiceMatchExceptionQuery } from "@/services/purchasing/invoice-match-exception-contracts"

async function scope(kind: "request" | "review") {
  const actor = await requirePermission(kind === "request" ? "purchasing.ap.invoice.post" : "purchasing.ap.match.review", { resource: "SupplierInvoiceMatchException", auditAllowed: false })
  const { claims } = await requireSession()
  if (claims.userId !== actor.userId || claims.tenantId !== actor.orgId) throw new ForbiddenError("Current exception identity is required.")
  return { organizationId: actor.orgId, actorId: actor.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}
function failure(error: unknown) {
  const safe = toSafeActionError(error)
  return { success: false as const, data: null, error: safe.error, code: error instanceof BusinessRuleError && error.code === "INVOICE_EVIDENCE_REQUIRED" ? error.code : safe.code }
}
export async function loadInvoiceMatchException(query: InvoiceMatchExceptionQuery) {
  try { const parsed = invoiceMatchExceptionQuerySchema.parse(query); return { success: true as const, data: await loadInvoiceMatchExceptionSources(parsed, await scope(parsed.kind)) } } catch (error) { return failure(error) }
}
export async function reviewInvoiceMatchException(draft: InvoiceMatchExceptionDraft) {
  try { const parsed = invoiceMatchExceptionDraftSchema.parse(draft); return { success: true as const, data: await previewInvoiceMatchException(parsed, await scope(parsed.kind)) } } catch (error) { return failure(error) }
}
export async function loadInvoiceMatchExceptionHistory(query: InvoiceMatchExceptionHistoryQuery) {
  try { const parsed = invoiceMatchExceptionHistoryQuerySchema.parse(query); return { success: true as const, data: await history(parsed, await scope(parsed.kind)) } } catch (error) { return failure(error) }
}
export async function submitInvoiceMatchException(command: InvoiceMatchExceptionCommand) {
  try {
    const parsed = invoiceMatchExceptionCommandSchema.parse(command), data = await confirmInvoiceMatchException(parsed, await scope(parsed.draft.kind))
    try { revalidatePath('/[locale]/dashboard/purchases/payables', 'page'); revalidatePath('/[locale]/dashboard/purchases/payables/approve', 'page') } catch { /* Committed decision remains authoritative after cache failure. */ }
    return { success: true as const, data }
  } catch (error) { return failure(error) }
}
