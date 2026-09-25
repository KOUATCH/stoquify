import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { loadInvoiceApprovalSources, loadInvoiceApprovalHistory as history, previewInvoiceApproval, confirmInvoiceApproval } from "@/services/purchasing/invoice-approval.service"
import { loadInvoiceApproval, loadInvoiceApprovalHistory, reviewInvoiceApproval, submitInvoiceApproval } from "../invoice-approval.actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchasing/invoice-approval.service", () => ({ loadInvoiceApprovalSources: jest.fn(), loadInvoiceApprovalHistory: jest.fn(), previewInvoiceApproval: jest.fn(), confirmInvoiceApproval: jest.fn() }))
const command = { invoiceId: "invoice", expectedRevision: "b".repeat(64), idempotencyKey: "request-1" }
const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "private-test-token" }
beforeEach(() => {
  jest.resetAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: scope.organizationId, userId: scope.actorId })
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: scope.organizationId, userId: scope.actorId, sessionId: scope.sessionId, sessionToken: scope.sessionToken } })
})
test("source reads and review use server-derived session scope", async () => {
  await loadInvoiceApproval({ search: "INV" }); await reviewInvoiceApproval({ invoiceId: "invoice" })
  expect(loadInvoiceApprovalSources).toHaveBeenCalledWith({ search: "INV" }, scope)
  expect(previewInvoiceApproval).toHaveBeenCalledWith({ invoiceId: "invoice" }, scope)
})
test("mismatched session scope cannot read private sources", async () => {
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: "other", userId: "actor" } })
  expect((await loadInvoiceApproval()).success).toBe(false)
  expect(loadInvoiceApprovalSources).not.toHaveBeenCalled()
})
test("history reads use the current scoped authority", async () => {
  await loadInvoiceApprovalHistory({ invoiceId: "invoice" })
  expect(history).toHaveBeenCalledWith({ invoiceId: "invoice" }, scope)
})
test("permission denial prevents posting", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new Error("denied"))
  expect((await submitInvoiceApproval(command)).success).toBe(false)
  expect(confirmInvoiceApproval).not.toHaveBeenCalled()
})
test("cache failure preserves the committed approval decision", async () => {
  ;(confirmInvoiceApproval as jest.Mock).mockResolvedValue({ invoiceId: "invoice", replayed: false })
  ;(revalidatePath as jest.Mock).mockImplementation(() => { throw new Error("cache failure") })
  expect(await submitInvoiceApproval(command)).toEqual({ success: true, data: { invoiceId: "invoice", replayed: false } })
  expect(confirmInvoiceApproval).toHaveBeenCalledWith(command, scope)
})
test.each(["INVOICE_EVIDENCE_REQUIRED", "FRESH_AUTH_REQUIRED"] as const)("retains actionable %s failures", async code => {
  ;(confirmInvoiceApproval as jest.Mock).mockRejectedValue(new BusinessRuleError("Review required", code))
  expect(await submitInvoiceApproval(command)).toMatchObject({ success: false, code })
})
