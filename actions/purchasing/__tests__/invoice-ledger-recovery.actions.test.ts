import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { loadInvoiceLedgerRecoverySources, loadInvoiceLedgerRecoveryHistory as history, previewInvoiceLedgerRecovery, confirmInvoiceLedgerRecovery } from "@/services/purchasing/invoice-ledger-recovery.service"
import { loadInvoiceLedgerRecovery, loadInvoiceLedgerRecoveryHistory, reviewInvoiceLedgerRecovery, submitInvoiceLedgerRecovery } from "../invoice-ledger-recovery.actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchasing/invoice-ledger-recovery.service", () => ({ loadInvoiceLedgerRecoverySources: jest.fn(), loadInvoiceLedgerRecoveryHistory: jest.fn(), previewInvoiceLedgerRecovery: jest.fn(), confirmInvoiceLedgerRecovery: jest.fn() }))
const command = { invoiceId: "invoice", expectedRevision: "b".repeat(64), idempotencyKey: "request-1" }
const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "private-test-token" }
beforeEach(() => {
  jest.resetAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: scope.organizationId, userId: scope.actorId })
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: scope.organizationId, userId: scope.actorId, sessionId: scope.sessionId, sessionToken: scope.sessionToken } })
})
test("source reads and review use server-derived session scope", async () => {
  await loadInvoiceLedgerRecovery({ search: "INV" }); await reviewInvoiceLedgerRecovery({ invoiceId: "invoice" })
  expect(loadInvoiceLedgerRecoverySources).toHaveBeenCalledWith({ search: "INV" }, scope)
  expect(previewInvoiceLedgerRecovery).toHaveBeenCalledWith({ invoiceId: "invoice" }, scope)
})
test("mismatched session scope cannot read private sources", async () => {
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: "other", userId: "actor" } })
  expect((await loadInvoiceLedgerRecovery()).success).toBe(false)
  expect(loadInvoiceLedgerRecoverySources).not.toHaveBeenCalled()
})
test("history reads use the current scoped authority", async () => {
  await loadInvoiceLedgerRecoveryHistory({ invoiceId: "invoice" })
  expect(history).toHaveBeenCalledWith({ invoiceId: "invoice" }, scope)
})
test("permission denial prevents posting", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new Error("denied"))
  expect((await submitInvoiceLedgerRecovery(command)).success).toBe(false)
  expect(confirmInvoiceLedgerRecovery).not.toHaveBeenCalled()
})
test("cache failure preserves the committed recovery decision", async () => {
  ;(confirmInvoiceLedgerRecovery as jest.Mock).mockResolvedValue({ invoiceId: "invoice", replayed: false })
  ;(revalidatePath as jest.Mock).mockImplementation(() => { throw new Error("cache failure") })
  expect(await submitInvoiceLedgerRecovery(command)).toEqual({ success: true, data: { invoiceId: "invoice", replayed: false } })
  expect(confirmInvoiceLedgerRecovery).toHaveBeenCalledWith(command, scope)
})
test.each(["INVOICE_EVIDENCE_REQUIRED", "FRESH_AUTH_REQUIRED"] as const)("retains actionable %s failures", async code => {
  ;(confirmInvoiceLedgerRecovery as jest.Mock).mockRejectedValue(new BusinessRuleError("Review required", code))
  expect(await submitInvoiceLedgerRecovery(command)).toMatchObject({ success: false, code })
})
