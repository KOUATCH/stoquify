"use server"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError, ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { loadInvoiceLedgerRecoverySources, loadInvoiceLedgerRecoveryHistory as history, previewInvoiceLedgerRecovery, confirmInvoiceLedgerRecovery } from "@/services/purchasing/invoice-ledger-recovery.service"
import type { InvoiceLedgerRecoveryCommand, InvoiceLedgerRecoveryDraft, InvoiceLedgerRecoveryQuery, InvoiceLedgerRecoveryHistoryQuery } from "@/services/purchasing/invoice-ledger-recovery-contracts"

async function scope() {
  const actor = await requirePermission("purchasing.ap.invoice.post", { resource: "SupplierInvoice", auditAllowed: false })
  const { claims } = await requireSession()
  if (claims.userId !== actor.userId || claims.tenantId !== actor.orgId) throw new ForbiddenError("Current invoice recovery identity is required.")
  return { organizationId: actor.orgId, actorId: actor.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}
function failure(error: unknown) {
  const safe = toSafeActionError(error)
  return { success: false as const, data: null, error: safe.error, code: error instanceof BusinessRuleError && error.code === "INVOICE_EVIDENCE_REQUIRED" ? error.code : safe.code }
}
export async function loadInvoiceLedgerRecovery(query: InvoiceLedgerRecoveryQuery = {}) {
  try { return { success: true as const, data: await loadInvoiceLedgerRecoverySources(query, await scope()) } } catch (error) { return failure(error) }
}
export async function reviewInvoiceLedgerRecovery(draft: InvoiceLedgerRecoveryDraft) {
  try { return { success: true as const, data: await previewInvoiceLedgerRecovery(draft, await scope()) } } catch (error) { return failure(error) }
}
export async function loadInvoiceLedgerRecoveryHistory(query: InvoiceLedgerRecoveryHistoryQuery) {
  try { return { success: true as const, data: await history(query, await scope()) } } catch (error) { return failure(error) }
}
export async function submitInvoiceLedgerRecovery(command: InvoiceLedgerRecoveryCommand) {
  try {
    const data = await confirmInvoiceLedgerRecovery(command, await scope())
    try { revalidatePath('/[locale]/dashboard/purchases/payables', 'page'); revalidatePath('/[locale]/dashboard/purchases/payables/history', 'page') } catch { /* The retained decision remains authoritative after cache failure. */ }
    return { success: true as const, data }
  } catch (error) { return failure(error) }
}
