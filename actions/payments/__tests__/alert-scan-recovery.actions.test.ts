jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn(), isRbacError: (error: unknown) => error instanceof Error && error.name === "RbacError" }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/reconciliation/alert-scan-recovery.service", () => ({ readAlertScanRecovery: jest.fn(), recoverAlertScanPage: jest.fn() }))
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ConflictError, ForbiddenError } from "@/services/_shared/action-errors"
import { readAlertScanRecovery, recoverAlertScanPage } from "@/services/reconciliation/alert-scan-recovery.service"
import { readAlertScanRecoveryAction, recoverAlertScanPageAction } from "../alert-scan-recovery.actions"
beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org", userId: "operator", permissions: ["payments.reconciliation.read", "payments.reconciliation.run"] })
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: "org", userId: "operator", sessionId: "session", sessionToken: "private-token" } })
  ;(readAlertScanRecovery as jest.Mock).mockResolvedValue({ scanId: "scan" })
  ;(recoverAlertScanPage as jest.Mock).mockResolvedValue({ receipt: { commandId: "command" } })
})
it("derives actor, organization, session and permissions on the server", async () => {
  expect(await readAlertScanRecoveryAction({ scanId: "scan" })).toEqual({ ok: true, data: { scanId: "scan" } })
  expect(readAlertScanRecovery).toHaveBeenCalledWith({ orgId: "org", userId: "operator", permissions: ["payments.reconciliation.read", "payments.reconciliation.run"], sessionId: "session", sessionToken: "private-token" }, { scanId: "scan" })
})
it.each([{ tenantId: "other", userId: "operator" }, { tenantId: "org", userId: "other" }])("blocks mismatched session %o before calling recovery", async claims => {
  ;(requireSession as jest.Mock).mockResolvedValue({ claims })
  expect(await recoverAlertScanPageAction({})).toEqual({ ok: false, code: "RESTRICTED" })
  expect(recoverAlertScanPage).not.toHaveBeenCalled()
})
it.each([[new ConflictError("private hash"), "STALE"], [new ForbiddenError("private role"), "RESTRICTED"], [new Error("raw payload and credential"), "UNAVAILABLE"]])("returns only fixed errors", async (error, code) => {
  ;(recoverAlertScanPage as jest.Mock).mockRejectedValueOnce(error)
  expect(await recoverAlertScanPageAction({})).toEqual({ ok: false, code })
})
it("keeps committed receipt success after cache invalidation fails", async () => {
  ;(revalidatePath as jest.Mock).mockImplementationOnce(() => { throw new Error("cache failed") })
  expect(await recoverAlertScanPageAction({})).toEqual({ ok: true, data: { receipt: { commandId: "command" } } })
})
