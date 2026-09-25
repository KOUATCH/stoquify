"use server"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError, ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { loadInvoiceApprovalSources, loadInvoiceApprovalHistory as history, previewInvoiceApproval, confirmInvoiceApproval } from "@/services/purchasing/invoice-approval.service"
import type { InvoiceApprovalCommand, InvoiceApprovalDraft, InvoiceApprovalHistoryQuery, InvoiceApprovalQuery } from "@/services/purchasing/invoice-approval-contracts"

async function scope() {
  const actor = await requirePermission("purchasing.ap.invoice.post", { resource: "SupplierInvoice", auditAllowed: false })
  const { claims } = await requireSession()
  if (claims.userId !== actor.userId || claims.tenantId !== actor.orgId) throw new ForbiddenError("Current invoice approval identity is required.")
  return { organizationId: actor.orgId, actorId: actor.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}
function failure(error: unknown) {
  const safe = toSafeActionError(error)
  return { success: false as const, data: null, error: safe.error, code: error instanceof BusinessRuleError && error.code === "INVOICE_EVIDENCE_REQUIRED" ? error.code : safe.code }
}
export async function loadInvoiceApproval(query: InvoiceApprovalQuery = {}) {
  try { return { success: true as const, data: await loadInvoiceApprovalSources(query, await scope()) } } catch (error) { return failure(error) }
}
export async function reviewInvoiceApproval(draft: InvoiceApprovalDraft) {
  try { return { success: true as const, data: await previewInvoiceApproval(draft, await scope()) } } catch (error) { return failure(error) }
}
export async function loadInvoiceApprovalHistory(query: InvoiceApprovalHistoryQuery) {
  try { return { success: true as const, data: await history(query, await scope()) } } catch (error) { return failure(error) }
}
export async function submitInvoiceApproval(command: InvoiceApprovalCommand) {
  try {
    const data = await confirmInvoiceApproval(command, await scope())
    try { revalidatePath('/[locale]/dashboard/purchases/payables', 'page'); revalidatePath('/[locale]/dashboard/purchases/payables/history', 'page') } catch { /* Committed approval remains authoritative after cache failure. */ }
    return { success: true as const, data }
  } catch (error) { return failure(error) }
}
