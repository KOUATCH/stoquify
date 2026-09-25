import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { UserDeactivation } from "../UserDeactivation"
import { deleteUser } from "@/actions/users/deleteUser"
import getOrgUsers from "@/actions/users/getOrgUsers"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

jest.mock("@/actions/users/deleteUser", () => ({ deleteUser: jest.fn() }))
jest.mock("@/actions/users/getOrgUsers", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => ({ X: () => null }))
const member = { id: "member", name: "Synthetic Member", email: "member@example.invalid", updatedAt: "2026-09-06T09:00:00.000Z", isActive: true }
const saved = { id: "member", auditId: "audit-test", sessionsRevoked: 2, pendingInvitesCancelled: 1, replayed: false, updatedAt: "2026-09-06T10:00:00.000Z" }
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => "09ba28c2-5a3a-48ae-b8c5-46e7abff3991" }) })
function open(locale: "en" | "fr" = "en") {
  const recorded = jest.fn()
  render(<UserDeactivation user={member} locale={locale} onRecorded={recorded} />)
  fireEvent.click(screen.getByRole("button", { name: /^(Deactivate|Désactiver) Synthetic/ }))
  fireEvent.change(screen.getByLabelText(locale === "en" ? "Reason for deactivation" : "Motif de désactivation"), { target: { value: "Member departure" } })
  return recorded
}
it("shows denial and preserves the reason without announcing success", async () => {
  ;(deleteUser as jest.Mock).mockResolvedValue({ data: null, code: "FORBIDDEN" })
  const recorded = open(); fireEvent.click(screen.getByRole("button", { name: "Confirm deactivation" }))
  await screen.findByRole("alert")
  expect(screen.getByLabelText("Reason for deactivation")).toHaveValue("Member departure")
  expect(screen.queryByText("Account deactivated")).not.toBeInTheDocument(); expect(recorded).not.toHaveBeenCalled()
})
it("binds a filtered row to its own identity and clears another member's draft", async () => {
  ;(deleteUser as jest.Mock).mockResolvedValue({ data: saved })
  const { rerender } = render(<UserDeactivation user={{ ...member, id: "previous", name: "Previous Member" }} locale="en" onRecorded={jest.fn()} />)
  fireEvent.click(screen.getByRole("button", { name: "Deactivate Previous Member" }))
  fireEvent.change(screen.getByLabelText("Reason for deactivation"), { target: { value: "Previous member reason" } })
  fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }))
  rerender(<UserDeactivation user={member} locale="en" onRecorded={jest.fn()} />)
  fireEvent.click(screen.getByRole("button", { name: "Deactivate Synthetic Member" }))
  expect(screen.getByLabelText("Reason for deactivation")).toHaveValue("")
  fireEvent.change(screen.getByLabelText("Reason for deactivation"), { target: { value: "Current member reason" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm deactivation" }))
  await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("member", expect.objectContaining({ reason: "Current member reason" })))
})
it("retries the identical request after a lost acknowledgement", async () => {
  ;(deleteUser as jest.Mock).mockRejectedValueOnce(new Error("disconnected")).mockResolvedValueOnce({ data: saved })
  const recorded = open(); fireEvent.click(screen.getByRole("button", { name: "Confirm deactivation" }))
  fireEvent.click(await screen.findByRole("button", { name: "Retry the same request" }))
  await screen.findByText("Sessions revoked: 2")
  expect((deleteUser as jest.Mock).mock.calls[0]).toEqual((deleteUser as jest.Mock).mock.calls[1])
  fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }))
  expect(recorded).toHaveBeenCalledTimes(1)
})
it("requires explicit resubmission after password confirmation", async () => {
  ;(deleteUser as jest.Mock).mockResolvedValueOnce({ data: null, code: "FRESH_AUTH_REQUIRED" }).mockResolvedValueOnce({ data: saved })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  open(); fireEvent.click(screen.getByRole("button", { name: "Confirm deactivation" }))
  fireEvent.change(await screen.findByLabelText("Your current password"), { target: { value: "private-test-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm password" }))
  await screen.findByText("Password confirmed. Review the details and confirm deactivation.")
  expect(deleteUser).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Confirm deactivation" }))
  await waitFor(() => expect(deleteUser).toHaveBeenCalledTimes(2))
})
it("reloads a stale account while retaining the French draft", async () => {
  ;(deleteUser as jest.Mock).mockResolvedValue({ data: null, code: "CONFLICT" })
  ;(getOrgUsers as jest.Mock).mockResolvedValue({ success: true, data: [{ ...member, firstName: "Synthetic", lastName: "Member", updatedAt: "2026-09-06T10:00:00.000Z" }] })
  open("fr"); fireEvent.click(screen.getByRole("button", { name: "Confirmer la désactivation" }))
  fireEvent.click(await screen.findByRole("button", { name: "Recharger le compte à vérifier" }))
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
  expect(screen.getByLabelText("Motif de désactivation")).toHaveValue("Member departure")
  fireEvent.click(screen.getByRole("button", { name: "Confirmer la désactivation" }))
  await waitFor(() => expect((deleteUser as jest.Mock).mock.calls[1][1].expectedUpdatedAt).toBe("2026-09-06T10:00:00.000Z"))
})
