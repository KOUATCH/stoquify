/** @jest-environment node */
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../ap-history.service", () => ({ readAPHistory: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
import { createHash } from "node:crypto"
import { db } from "@/prisma/db"
import { readAPHistory, type APHistoryResult } from "../ap-history.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { apHistoryExportSchema, buildAPHistoryCsv, prepareAPHistoryExport } from "../ap-history-export.service"

const scope = { organizationId: "org-1", actorId: "user-1", actorPermissions: ["finance.payables.read", "reports.export"], lastAuthAt: Date.now() }
const tx = { auditLog: { create: jest.fn() } }
function history(): APHistoryResult {
  return { rows: [{ sourceType: "SUPPLIER_INVOICE", sourceId: "i1", supplier: { id: "s1", name: '\t =HYPERLINK("unsafe")' }, amount: "100.25", signedPayableMovement: null, movementState: "unverified", retained: true, currency: "XAF", effectiveAt: "2026-08-10", recordedAt: "2026-08-11", businessState: "POSTED", reference: { invoiceNumber: 'INV,"one"\nnext', paymentNumber: null }, accounting: { postedBusinessEventId: null, ledgerPostingBatchId: null, documentHash: "hash", evidenceHash: null } }], pageInfo: { hasMore: false, nextCursor: null }, appliedFilters: { lane: "all", pageSize: 100, timezone: "Africa/Douala" }, snapshot: { generatedAt: new Date().toISOString(), recordedThrough: new Date().toISOString(), timezone: "Africa/Douala" }, summary: { transactionCount: 1, financialBasis: "current_remainder_of_filtered_recognized_invoices", currencyTotals: [{ currency: "XAF", invoiceTotal: "100.25", paidTotal: null, creditTotal: null, openPayable: null, releasedPaymentTotal: "0.00", unverifiedCount: 1 }] }, completeness: { state: "partial", sources: [] } } as APHistoryResult
}
beforeEach(() => { jest.clearAllMocks(); (observeModuleAccess as jest.Mock).mockResolvedValue({allowed:true}); (db.$transaction as jest.Mock).mockImplementation(fn => fn(tx)); (readAPHistory as jest.Mock).mockResolvedValue(history()); tx.auditLog.create.mockResolvedValue({ id: "audit-1" }) })
it("enforces module access at the service boundary", async () => { (observeModuleAccess as jest.Mock).mockResolvedValue({allowed:false}); await expect(prepareAPHistoryExport({},scope)).rejects.toThrow(/module/); expect(readAPHistory).not.toHaveBeenCalled() })
it("generates real scoped bytes and audits their exact hash/count without private bank or note fields", async () => {
  const result = await prepareAPHistoryExport({ filters: { supplierId: "s1" }, locale: "fr" }, scope)
  expect(result.rowCount).toBe(1); expect(result.contentHash).toBe("sha256:" + createHash("sha256").update(result.content).digest("hex")); expect(result.content.charCodeAt(0)).toBe(0xfeff)
  expect(result.content).toContain('"Référence"'); expect(result.content).toContain('"UNAVAILABLE"'); expect(result.content).toContain('"\'\t =HYPERLINK(""unsafe"")"'); expect(result.content).toContain('"INV,""one""\nnext"')
  expect(readAPHistory).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", actorUserId: "user-1", filters: { supplierId: "s1", pageSize: 100 } }), { client: tx, exportRowLimit: 5000 })
  expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ organizationId: "org-1", userId: "user-1", changes: expect.objectContaining({ exportContext: expect.objectContaining({ rowCount: 1, watermarkId: result.watermarkId }), metadata: expect.objectContaining({ contentHash: result.contentHash, outcome: "artifact_generated_not_download_confirmed" }) }) }) })
})
it.each([[], ["reports.export"], ["finance.payables.read"]])("rejects missing read/export authority before reading records (%j)", async (...permissions) => {
  await expect(prepareAPHistoryExport({}, { ...scope, actorPermissions: permissions.flat() as string[] })).rejects.toThrow(); expect(readAPHistory).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("rejects stale assurance before querying or auditing", async () => { await expect(prepareAPHistoryExport({}, { ...scope, lastAuthAt: Date.now() - 301000 })).rejects.toThrow(); expect(readAPHistory).not.toHaveBeenCalled() })
it("does not return partial or truncated exports", async () => { (readAPHistory as jest.Mock).mockResolvedValue({ ...history(), pageInfo: { hasMore: true } }); await expect(prepareAPHistoryExport({}, scope)).rejects.toThrow(/incomplete/); expect(tx.auditLog.create).not.toHaveBeenCalled() })
it("fails closed if mandatory audit or underlying query fails", async () => {
  tx.auditLog.create.mockRejectedValueOnce(new Error("audit unavailable")); await expect(prepareAPHistoryExport({}, scope)).rejects.toThrow("audit unavailable")
  ;(readAPHistory as jest.Mock).mockRejectedValueOnce(new Error("query unavailable")); await expect(prepareAPHistoryExport({}, scope)).rejects.toThrow("query unavailable")
})
it("rejects client scope/count/cursor/page overrides", () => { for (const input of [{ rowCount: 0 }, { organizationId: "other" }, { filters: { cursor: "old" } }, { filters: { pageSize: 100 } }]) expect(apHistoryExportSchema.safeParse(input).success).toBe(false) })
it("preserves negative numeric movements while neutralizing text formulas", () => {
  const h = history(); h.rows[0].movementState = "recorded"; h.rows[0].signedPayableMovement = "-10.25"
  const csv = buildAPHistoryCsv(h, { locale: "en", organizationId: "org-1", watermarkId: "wm-test", filtersHash: "hash" }); expect(csv).toContain('"-10.25"'); expect(csv).not.toContain("'-10.25")
})
