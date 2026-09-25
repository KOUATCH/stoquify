import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { hashNormalizedHistoryFilters } from "@/services/history/transaction-history-cursor"
import { evaluateSensitiveAction } from "@/services/controls/sensitive-action.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { auditExportSafetyDecision, buildExportWatermark, evaluateExportSafety } from "@/services/security/export-safety.service"
import { apHistoryFiltersSchema } from "./ap-history.schemas"
import { readAPHistory, type APHistoryResult } from "./ap-history.service"

export const apHistoryExportSchema = z.object({
  filters: apHistoryFiltersSchema.omit({ cursor: true, pageSize: true }).optional(),
  locale: z.enum(["en", "fr"]).default("en"),
}).strict()
export type APHistoryExportInput = z.input<typeof apHistoryExportSchema>
export const AP_HISTORY_EXPORT_READ_PERMISSIONS = ["purchasing.ap.invoice.view", "finance.payables.read", "purchases.suppliers.read"]
type Scope = { organizationId: string; actorId: string; actorPermissions: string[]; lastAuthAt: number }
type Cell = string | number | boolean | null | { amount: string | null }
function csvRow(values: Cell[]) {
  return values.map(value => {
    const numeric = value !== null && typeof value === "object"
    let text = numeric ? value.amount ?? "UNAVAILABLE" : String(value ?? "")
    if (numeric && text !== "UNAVAILABLE" && !/^-?\d+(\.\d+)?$/.test(text)) throw new BusinessRuleError("Invalid monetary export value.")
    // Quoting alone does not stop spreadsheet formulas, including whitespace-prefixed formulas.
    if (!numeric && /^[\s\u0000-\u001f]*[=+@-]/u.test(text)) text = "'" + text
    return '"' + text.replaceAll('"', '""') + '"'
  }).join(",")
}
export function buildAPHistoryCsv(history: APHistoryResult, manifest: { watermarkId: string; filtersHash: string; organizationId: string; locale: "en" | "fr" }) {
  const fr = manifest.locale === "fr"
  const rows: Cell[][] = [
    ["manifest", "stoquify_supplier_ap_history.v2"], ["organization_id", manifest.organizationId],
    ["watermark_id", manifest.watermarkId], ["filters_hash", manifest.filtersHash],
    ["filters", JSON.stringify(history.appliedFilters)], ["recorded_through", history.snapshot.recordedThrough],
    ["generated_at", history.snapshot.generatedAt], ["timezone", history.snapshot.timezone],
    ["row_count", history.rows.length], ["financial_basis", history.summary.financialBasis],
    ["scope", fr ? "Vue opérationnelle actuelle des factures filtrées ; ni solde fournisseur global ni balance historique certifiée." : "Current operational view of filtered invoices; not a complete supplier balance or certified historical trial balance."],
    ["unavailable", fr ? "UNAVAILABLE signifie preuve insuffisante, jamais zéro." : "UNAVAILABLE means insufficient evidence, never zero."],
    ["currency_summary", "currency", "document_total", "verified_allocations", "verified_credits", "current_invoice_remainder", "recorded_released_payments", "unverified_count"],
    ...history.summary.currencyTotals.map(g => ["currency_summary", g.currency, { amount: g.invoiceTotal }, { amount: g.paidTotal }, { amount: g.creditTotal }, { amount: g.openPayable }, { amount: g.releasedPaymentTotal }, g.unverifiedCount]),
    [],
    fr ? ["Type", "ID source", "Référence", "ID fournisseur", "Fournisseur", "Date effective", "Enregistré le", "Devise", "Montant du document", "Mouvement reconnu", "État de preuve", "État opérationnel", "Archivé", "ID événement", "ID lot comptable", "Empreinte document", "Empreinte preuve"]
       : ["Type", "Source ID", "Reference", "Supplier ID", "Supplier", "Effective date", "Recorded at", "Currency", "Document amount", "Recognized movement", "Evidence state", "Operational state", "Archived", "Event ID", "Accounting batch ID", "Document hash", "Evidence hash"],
    ...history.rows.map(row => [row.sourceType, row.sourceId, row.reference.invoiceNumber ?? row.reference.paymentNumber, row.supplier.id, row.supplier.name, row.effectiveAt, row.recordedAt, row.currency, { amount: row.amount }, { amount: row.movementState === "unverified" ? null : row.signedPayableMovement }, row.movementState, row.businessState, row.retained, row.accounting.postedBusinessEventId, row.accounting.ledgerPostingBatchId, row.accounting.documentHash, row.accounting.evidenceHash]),
  ]
  return "\uFEFF" + rows.map(csvRow).join("\r\n") + "\r\n"
}

/** Called only with server-derived scope; all exported rows and the mandatory artifact audit share a read transaction. */
export async function prepareAPHistoryExport(raw: APHistoryExportInput, scope: Scope) {
  const input = apHistoryExportSchema.parse(raw)
  if (!AP_HISTORY_EXPORT_READ_PERMISSIONS.some(p => hasRbacPermission(scope.actorPermissions, p))) throw new ForbiddenError("AP history read access is required.")
  const preflight = evaluateSensitiveAction({ action: "report.export", ...scope, resourceType: "APHistoryExport", resourceId: "supplier-ap-history" })
  if (!preflight.allowed) throw new BusinessRuleError(preflight.safeMessage, preflight.reasonCode === "FRESH_AUTH_REQUIRED" ? "FRESH_AUTH_REQUIRED" : "FORBIDDEN")
  const access = await observeModuleAccess({ organizationId: scope.organizationId, userId: scope.actorId, actorPermissions: scope.actorPermissions, moduleSlug: "purchasing", surfaceType: "action", surface: "actions/purchasing/ap-history.actions.ts:prepareAPHistoryExportAction", accessIntent: "read", mode: "enforce", audit: true })
  if (!access.allowed) throw new ForbiddenError("Purchasing module is unavailable.")
  return db.$transaction(async tx => {
    const history = await readAPHistory({ organizationId: scope.organizationId, actorUserId: scope.actorId, actorPermissions: scope.actorPermissions, filters: { ...input.filters, pageSize: 100 } }, { client: tx, exportRowLimit: 5000 })
    if (history.pageInfo.hasMore || history.rows.length !== history.summary.transactionCount) throw new BusinessRuleError("Export source changed or is incomplete. Refresh and retry.")
    const filtersHash = hashNormalizedHistoryFilters({ ...history.appliedFilters, pageSize: undefined, recordedThrough: history.snapshot.recordedThrough })
    const rowCount = history.rows.length
    const watermarkId = buildExportWatermark({ ...scope, scope: "supplier-ap-history", filtersHash, rowCount, fileType: "csv", sensitivity: "financial", issuedAt: history.snapshot.generatedAt })
    const content = buildAPHistoryCsv(history, { watermarkId, filtersHash, organizationId: scope.organizationId, locale: input.locale })
    if (Buffer.byteLength(content, "utf8") > 8 * 1024 * 1024) throw new BusinessRuleError("Export exceeds 8 MiB. Narrow the date or supplier filters.")
    const contentHash = "sha256:" + createHash("sha256").update(content, "utf8").digest("hex")
    const decision = evaluateExportSafety({ action: "report.export", ...scope, resourceType: "APHistoryExport", resourceId: watermarkId, exportContext: { scope: "supplier-ap-history", filtersHash, rowCount, fileType: "csv", sensitivity: "financial", watermarkId }, metadata: { contentHash, locale: input.locale, recordedThrough: history.snapshot.recordedThrough, financialBasis: history.summary.financialBasis, outcome: "artifact_generated_not_download_confirmed" } })
    if (!decision.allowed) throw new BusinessRuleError(decision.safeMessage, decision.reasonCode === "FRESH_AUTH_REQUIRED" ? "FRESH_AUTH_REQUIRED" : "FORBIDDEN")
    const audit = await auditExportSafetyDecision(tx, decision)
    return { organizationId: scope.organizationId, actorId: scope.actorId, fileName: `supplier-ap-history-${watermarkId}.csv`, mimeType: "text/csv;charset=utf-8", content, contentHash, filtersHash, watermarkId, auditRecordId: audit.id, rowCount, generatedAt: history.snapshot.generatedAt }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 })
}
