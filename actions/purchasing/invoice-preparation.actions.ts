"use server"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError, ForbiddenError, toSafeActionError } from "@/services/_shared/action-errors"
import { loadInvoicePreparationSources, previewInvoicePreparation, confirmInvoicePreparation } from "@/services/purchasing/invoice-preparation.service"
import type { InvoicePreparationCommand, InvoicePreparationDraft, InvoicePreparationQuery } from "@/services/purchasing/invoice-preparation-contracts"

async function scope() {
  const actor = await requirePermission("purchasing.ap.invoice.post", { resource: "SupplierInvoice", auditAllowed: false })
  const { claims } = await requireSession()
  if (claims.userId !== actor.userId || claims.tenantId !== actor.orgId) throw new ForbiddenError("Current invoice preparation identity is required.")
  return { organizationId: actor.orgId, actorId: actor.userId, sessionId: claims.sessionId, sessionToken: claims.sessionToken }
}
function failure(error: unknown) {
  const safe = toSafeActionError(error)
  return { success: false as const, data: null, error: safe.error, code: error instanceof BusinessRuleError && error.code === "INVOICE_EVIDENCE_REQUIRED" ? error.code : safe.code }
}
export async function loadInvoicePreparation(query: InvoicePreparationQuery = {}) {
  try { return { success: true as const, data: await loadInvoicePreparationSources(query, await scope()) } } catch (error) { return failure(error) }
}
export async function reviewInvoicePreparation(draft: InvoicePreparationDraft) {
  try { return { success: true as const, data: await previewInvoicePreparation(draft, await scope()) } } catch (error) { return failure(error) }
}
export async function submitInvoicePreparation(command: InvoicePreparationCommand) {
  try {
    const data = await confirmInvoicePreparation(command, await scope())
    try { revalidatePath('/[locale]/dashboard/purchases/payables', 'page'); revalidatePath('/[locale]/dashboard/purchases/payables/history', 'page') } catch { /* A retained preparation decision remains authoritative after a cache failure. */ }
    return { success: true as const, data }
  } catch (error) { return failure(error) }
}
