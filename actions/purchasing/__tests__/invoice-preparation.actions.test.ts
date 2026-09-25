import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { loadInvoicePreparationSources, previewInvoicePreparation, confirmInvoicePreparation } from "@/services/purchasing/invoice-preparation.service"
import { loadInvoicePreparation, reviewInvoicePreparation, submitInvoicePreparation } from "../invoice-preparation.actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchasing/invoice-preparation.service", () => ({ loadInvoicePreparationSources: jest.fn(), previewInvoicePreparation: jest.fn(), confirmInvoicePreparation: jest.fn() }))
const draft = { supplierId: "supplier", invoiceNumber: "INV-1", invoiceDate: "2026-09-08", currency: "XAF", documentReference: "https://records.example.invalid/invoice", documentSha256: "a".repeat(64), lines: [{ goodsReceiptLineId: "receipt", description: "Stock", quantity: "1", unitCost: "10.00", taxRate: "0" }] }
const command = { draft, expectedRevision: "b".repeat(64), idempotencyKey: "request-1" }
const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "private-test-token" }
describe("reviewed invoice preparation actions", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: scope.organizationId, userId: scope.actorId })
    ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: scope.organizationId, userId: scope.actorId, sessionId: scope.sessionId, sessionToken: scope.sessionToken } })
  })
  it("derives the current session and organization for source reads and review", async () => {
    await loadInvoicePreparation({ supplierId: "supplier" }); await reviewInvoicePreparation(draft)
    expect(loadInvoicePreparationSources).toHaveBeenCalledWith({ supplierId: "supplier" }, scope)
    expect(previewInvoicePreparation).toHaveBeenCalledWith(draft, scope)
  })
  it("rejects mismatched current identity before reading private sources", async () => {
    ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: "other", userId: "actor" } })
    expect((await loadInvoicePreparation()).success).toBe(false)
    expect(loadInvoicePreparationSources).not.toHaveBeenCalled()
  })
  it("does not call the writer after permission denial", async () => {
    ;(requirePermission as jest.Mock).mockRejectedValue(new Error("denied"))
    expect((await submitInvoicePreparation(command)).success).toBe(false)
    expect(confirmInvoicePreparation).not.toHaveBeenCalled()
  })
  it("preserves the committed result when cache invalidation fails", async () => {
    ;(confirmInvoicePreparation as jest.Mock).mockResolvedValue({ invoiceId: "invoice", replayed: false })
    ;(revalidatePath as jest.Mock).mockImplementation(() => { throw new Error("cache failure") })
    expect(await submitInvoicePreparation(command)).toEqual({ success: true, data: { invoiceId: "invoice", replayed: false } })
    expect(confirmInvoicePreparation).toHaveBeenCalledWith(command, scope)
  })
  it("preserves the uncertain-evidence code for safe recovery", async () => {
    ;(confirmInvoicePreparation as jest.Mock).mockRejectedValue(new BusinessRuleError("Evidence needs review", "INVOICE_EVIDENCE_REQUIRED"))
    expect(await submitInvoicePreparation(command)).toMatchObject({ success: false, code: "INVOICE_EVIDENCE_REQUIRED" })
  })
})
