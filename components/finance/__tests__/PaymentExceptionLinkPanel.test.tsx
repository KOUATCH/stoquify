import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PaymentExceptionLinkPanel } from "../PaymentExceptionLinkPanel"
import * as actions from "@/actions/payments/exception-link.actions"
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
jest.mock("@/actions/payments/exception-link.actions", () => ({ readReconciliationExceptionLinkAction: jest.fn(), repairReconciliationExceptionLinkAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor" }, props = { scope, itemId: "item", canRepair: true, onChanged: jest.fn(async () => {}), onClose: jest.fn() }, key = "stoquify:exception-link:v1:org:actor:item"
const data = { scope, state: "REPAIRABLE", suspenseItemId: "item", exceptionId: "exception", runId: "run", revision: "sha256:" + "a".repeat(64), asOf: "2026-09-09T12:00:00Z", hasCurrentSignOff: true }
beforeEach(() => { jest.resetAllMocks(); sessionStorage.clear(); jest.spyOn(crypto, "randomUUID").mockReturnValue("aabbccdd-1234-4123-8123-123456789abc"); (actions.readReconciliationExceptionLinkAction as jest.Mock).mockResolvedValue({ success: true, data }) })
afterEach(() => jest.restoreAllMocks())
async function fill() { await screen.findByText("repairable"); fireEvent.change(screen.getByLabelText("reason"), { target: { value: "Restore original source relation" } }) }
it("preserves uncertain requests across remount and retries the exact command", async () => {
  ;(actions.repairReconciliationExceptionLinkAction as jest.Mock).mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true, data: { scope, receiptId: "receipt" } })
  const view = render(<PaymentExceptionLinkPanel {...props} />); await fill(); fireEvent.click(screen.getByRole("button", { name: "confirm" })); await screen.findByText("failed")
  const command = (actions.repairReconciliationExceptionLinkAction as jest.Mock).mock.calls[0][0]; view.unmount(); render(<PaymentExceptionLinkPanel {...props} />); await screen.findByText("repairable"); await waitFor(() => expect(screen.getByRole("button", { name: "retry" })).toBeEnabled()); fireEvent.click(screen.getByRole("button", { name: "retry" })); await screen.findByText("saved")
  expect((actions.repairReconciliationExceptionLinkAction as jest.Mock).mock.calls[1][0]).toEqual(command)
})
it("refuses to display another actor's source", async () => { (actions.readReconciliationExceptionLinkAction as jest.Mock).mockResolvedValue({ success: true, data: { ...data, scope: { ...scope, actorId: "foreign" } } }); render(<PaymentExceptionLinkPanel {...props} />); await screen.findByText("failed"); expect(screen.queryByText("repairable")).not.toBeInTheDocument() })
it("retains unreadable storage when authoritative reset fails", async () => {
  sessionStorage.setItem(key, "{unreadable"); render(<PaymentExceptionLinkPanel {...props} />); await screen.findByText("repairable"); expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled()
  ;(actions.readReconciliationExceptionLinkAction as jest.Mock).mockResolvedValue({ success: false }); fireEvent.click(screen.getByRole("button", { name: "reset" })); await screen.findByText("failed"); expect(sessionStorage.getItem(key)).toBe("{unreadable")
})
it("refuses submission if the exact request cannot be persisted", async () => {
  render(<PaymentExceptionLinkPanel {...props} />); await fill(); jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Unavailable") }); fireEvent.click(screen.getByRole("button", { name: "confirm" })); await screen.findByText("storage"); expect(actions.repairReconciliationExceptionLinkAction).not.toHaveBeenCalled()
})
it("reports a committed repair separately from a failed refresh", async () => {
  ;(actions.repairReconciliationExceptionLinkAction as jest.Mock).mockResolvedValue({ success: true, data: { scope, receiptId: "receipt" } }); render(<PaymentExceptionLinkPanel {...props} onChanged={async () => { throw new Error("Refresh failed") }} />); await fill(); fireEvent.click(screen.getByRole("button", { name: "confirm" })); await screen.findByText("savedRefreshFailed"); expect(screen.queryByText("failed")).not.toBeInTheDocument(); expect(JSON.parse(sessionStorage.getItem(key)!).pending).toBeNull()
})
it("keeps the repair unavailable for read-only users", async () => { render(<PaymentExceptionLinkPanel {...props} canRepair={false} />); await screen.findByText("repairable"); expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled(); expect(screen.getByLabelText("reason")).toBeDisabled(); expect(screen.getByText("permission")).toBeVisible() })
it("describes fresh authentication as repair and retains the exact command", async () => {
  ;(actions.repairReconciliationExceptionLinkAction as jest.Mock).mockResolvedValue({ success: false, code: "FRESH_AUTH_REQUIRED" })
  render(<PaymentExceptionLinkPanel {...props} />); await fill(); fireEvent.click(screen.getByRole("button", { name: "confirm" })); await screen.findByText("authRequired")
  expect(screen.getByLabelText("manualMatch.passwordLabel")).toBeVisible(); expect(screen.getByRole("button", { name: "retry" })).toBeDisabled()
  expect(JSON.parse(sessionStorage.getItem(key)!).pending).toEqual((actions.repairReconciliationExceptionLinkAction as jest.Mock).mock.calls[0][0])
})
