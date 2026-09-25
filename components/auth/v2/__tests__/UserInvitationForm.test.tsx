import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import UserInvitationForm from "@/components/Forms/users/userInvitationForm"
import InviteTableWithSearch from "@/components/dashboard/Tables/Invites"
import { sendInvite } from "@/actions/users/sendInvite"
import { cancelInvite } from "@/actions/users/cancelInvite"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockLocale: "en" | "fr" = "en"
const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
jest.mock("@/actions/users/sendInvite", () => ({ sendInvite: jest.fn() }))
jest.mock("@/actions/users/cancelInvite", () => ({ cancelInvite: jest.fn() }))
jest.mock("@/actions/users/getInvitationHistory", () => ({ getInvitationHistory: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => ({ Loader2: () => null, UserPlus: () => null, X: () => null, Ban: () => null, RotateCcw: () => null, History: () => null, RefreshCw: () => null }))
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: (namespace: string) => (key: string, values: Record<string, unknown> = {}) => {
  let value: unknown = (mockLocale === "en" ? en : fr).userInvitations
  if (namespace === "userInvitations.history") value = (value as typeof en.userInvitations).history
  for (const part of key.split(".")) value = (value as Record<string, unknown>)[part]
  if (typeof value !== "string") throw new Error("Missing " + key)
  return value.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
const action = sendInvite as jest.Mock
const props = { organizationId: "org-1", organizationName: "Scoped organization", email: "owner@example.invalid", roles: [{ value: "reader", label: "Reader / Lecteur" }] }
beforeEach(() => { jest.clearAllMocks(); action.mockReset(); (cancelInvite as jest.Mock).mockReset(); mockLocale = "en"; Object.defineProperty(crypto, "randomUUID", { configurable: true, value: jest.fn(() => "90db6fd9-fcce-45a7-870f-dd0276163b2b") }) })
it("uses the existing step-up action, clears its password and requires an explicit resubmission", async () => {
  action.mockResolvedValue({ status: 401, data: null, code: "FRESH_AUTH_REQUIRED" })
  const verification = stepUpWithPasswordAction as jest.Mock
  verification.mockResolvedValueOnce({ success: false, code: "INVALID_CREDENTIALS" }).mockResolvedValueOnce({ success: true })
  const copy = open(); fireEvent.change(screen.getByLabelText(copy.email), { target: { value: "colleague@example.invalid" } })
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  await screen.findByLabelText(copy.password)
  expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled()
  fireEvent.change(screen.getByLabelText(copy.password), { target: { value: "WrongPassword123!" } })
  fireEvent.click(screen.getByRole("button", { name: copy.confirmIdentity }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.verification)
  expect(screen.getByLabelText(copy.password)).toHaveValue("")
  fireEvent.change(screen.getByLabelText(copy.password), { target: { value: "Local!CurrentPassword9" } })
  fireEvent.keyDown(screen.getByLabelText(copy.password), { key: "Enter" })
  expect(await screen.findByRole("status")).toHaveTextContent(copy.verified)
  expect(screen.getByRole("status")).toHaveFocus()
  expect(screen.queryByLabelText(copy.password)).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: copy.submit })).toBeEnabled()
  expect(action).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText(copy.email)).toHaveValue("colleague@example.invalid")
})
function open(roles = props.roles) {
  const copy = (mockLocale === "en" ? en : fr).userInvitations
  render(<UserInvitationForm {...props} roles={roles} />)
  fireEvent.click(screen.getByRole("button", { name: copy.invite }))
  return copy
}
it.each(["en", "fr"] as const)("retains %s draft after response loss and closes back to the trigger", async locale => {
  mockLocale = locale; action.mockRejectedValueOnce(new Error("connection lost"))
  const copy = open()
  expect(screen.getByRole("dialog", { name: copy.title })).toBeVisible()
  fireEvent.change(screen.getByLabelText(copy.email), { target: { value: "colleague@example.invalid" } })
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.unknown)
  expect(screen.getByRole("alert")).toHaveFocus()
  expect(screen.getByLabelText(copy.email)).toHaveValue("colleague@example.invalid")
  fireEvent.click(screen.getByRole("button", { name: copy.close }))
  await waitFor(() => expect(screen.getByRole("button", { name: copy.invite })).toHaveFocus())
  fireEvent.click(screen.getByRole("button", { name: copy.invite }))
  expect(screen.getByLabelText(copy.email)).toHaveValue("colleague@example.invalid")
})
it("explains missing roles without crashing or allowing a request", () => {
  const copy = open([])
  expect(screen.getByRole("status")).toHaveTextContent(copy.noRoles)
  expect(screen.getByLabelText(copy.role)).toBeDisabled()
  expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled()
  expect(action).not.toHaveBeenCalled()
})
it.each(["forbidden", "roles_read_required", "organization_unavailable", "empty", "load_failed"] as const)("distinguishes %s before collecting an invitation draft", availability => {
  const copy = en.userInvitations
  render(<UserInvitationForm {...props} availability={availability} roles={[]} />)
  expect(screen.getByText(copy.availability[availability])).toBeVisible()
  expect(screen.queryByRole("button", { name: copy.invite })).not.toBeInTheDocument()
  expect(screen.queryByLabelText(copy.email)).not.toBeInTheDocument()
  if (availability === "load_failed") expect(screen.getByRole("alert")).toHaveTextContent(copy.availability.load_failed)
  if (availability !== "forbidden") { fireEvent.click(screen.getByRole("button", { name: copy.reloadRoles })); expect(mockRefresh).toHaveBeenCalledTimes(1) }
  expect(action).not.toHaveBeenCalled()
})
it("rejects invalid email locally", () => {
  const copy = open(); fireEvent.change(screen.getByLabelText(copy.email), { target: { value: "invalid" } })
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(screen.getByRole("alert")).toHaveTextContent(copy.errors.input)
  expect(action).not.toHaveBeenCalled()
})
it("prevents duplicate pending submission and distinguishes recorded from sent", async () => {
  let resolve!: (value: unknown) => void
  action.mockReturnValue(new Promise(value => { resolve = value }))
  const copy = open(); fireEvent.change(screen.getByLabelText(copy.email), { target: { value: "colleague@example.invalid" } })
  const form = screen.getByRole("button", { name: copy.submit }).closest("form")!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(action).toHaveBeenCalledTimes(1)
  expect(action).toHaveBeenCalledWith({ email: "colleague@example.invalid", roleId: "reader", locale: "en", requestId: expect.any(String) })
  await act(async () => resolve({ status: 200, data: { issueId: "issue-1", delivery: "PENDING" } }))
  expect(screen.getByRole("status")).toHaveTextContent(copy.created)
  expect(screen.getByRole("status")).toHaveTextContent("Email delivery is disabled")
  expect(screen.getByRole("status")).toHaveFocus()
  expect(mockRefresh).toHaveBeenCalledTimes(1)
})
it.each(["INVITATION_PENDING", "INVITATION_ACCOUNT_EXISTS", "FRESH_AUTH_REQUIRED"])("explains %s and preserves the draft", async code => {
  action.mockResolvedValue({ status: 409, data: null, code })
  const copy = open(); fireEvent.change(screen.getByLabelText(copy.email), { target: { value: "colleague@example.invalid" } })
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("alert")).not.toHaveTextContent(copy.errors.unknown)
  expect(screen.getByLabelText(copy.email)).toHaveValue("colleague@example.invalid")
  expect(mockRefresh).not.toHaveBeenCalled()
})
it.each(["en", "fr"] as const)("renders %s expiry, role and checked time with searchable records", locale => {
  mockLocale = locale; const copy = (locale === "en" ? en : fr).userInvitations
  render(<InviteTableWithSearch asOf="2026-09-06T12:00:00Z" data={[{ id: "invite", email: "colleague@example.invalid", status: "EXPIRED", createdAt: new Date("2026-09-01"), expiresAt: new Date("2026-09-05"), role: { nameEn: "Reader", nameFr: "Lecteur", code: "reader" } }]} />)
  expect(screen.getByText(copy.status.EXPIRED)).toBeVisible()
  expect(screen.getByText(locale === "en" ? "Reader" : "Lecteur")).toBeVisible()
  expect(screen.getAllByText(/UTC/).length).toBe(3)
  fireEvent.change(screen.getByLabelText(copy.search), { target: { value: "missing" } })
  expect(screen.getByRole("status")).toHaveTextContent(copy.noMatches)
})
it("binds cancellation to the reviewed revision even when refreshed props change", async () => {
  const cancel = cancelInvite as jest.Mock, copy = en.userInvitations
  cancel.mockResolvedValue({ status: 409, data: null, code: "INVITATION_CHANGED" })
  const invitation = { id: "invite", email: "colleague@example.invalid", roleId: "reader", revision: "a".repeat(64), status: "PENDING" }
  const view = render(<UserInvitationForm {...props} management={{ mode: "cancel", invite: invitation }} />)
  fireEvent.click(screen.getByRole("button", { name: copy.management.cancel.submit }))
  fireEvent.change(screen.getByLabelText(copy.management.reason), { target: { value: "Wrong colleague" } })
  view.rerender(<UserInvitationForm {...props} management={{ mode: "cancel", invite: { ...invitation, revision: "b".repeat(64) } }} />)
  fireEvent.submit(screen.getByLabelText(copy.management.reason).closest("form")!)
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.changed)
  expect(cancel).toHaveBeenCalledWith({ inviteId: "invite", revision: "a".repeat(64), reason: "Wrong colleague", requestId: expect.any(String) })
  expect(action).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: copy.management.reload }))
  expect(mockRefresh).toHaveBeenCalled()
})
it("requires a reason for reissue and submits the selected role with the original review", async () => {
  const copy = en.userInvitations, invitation = { id: "invite", email: "colleague@example.invalid", roleId: "reader", revision: "a".repeat(64), status: "EXPIRED" }
  action.mockResolvedValue({ status: 200, data: { delivery: "PENDING" } })
  render(<UserInvitationForm {...props} management={{ mode: "reissue", invite: invitation }} />)
  fireEvent.click(screen.getByRole("button", { name: copy.management.reissue.submit }))
  const form = screen.getByLabelText(copy.management.reason).closest("form")!
  fireEvent.submit(form); expect(action).not.toHaveBeenCalled()
  expect(screen.getByRole("alert")).toHaveTextContent(copy.management.reasonRequired)
  fireEvent.change(screen.getByLabelText(copy.management.reason), { target: { value: "Link expired" } }); fireEvent.submit(form)
  await screen.findByRole("status")
  expect(action).toHaveBeenCalledWith(expect.objectContaining({ email: invitation.email, replace: { inviteId: "invite", revision: invitation.revision, reason: "Link expired" } }))
  expect(screen.getByRole("status")).toHaveTextContent("no replacement email has been sent")
})
it("makes every close control unavailable while the saved revision is refreshing", async () => {
  const copy = en.userInvitations
  let finish!: () => void
  const onRecorded = () => new Promise<void>(resolve => { finish = resolve })
  action.mockResolvedValue({ status: 200, data: { delivery: "PENDING" } })
  render(<UserInvitationForm {...props} onRecorded={onRecorded} management={{ mode: "reissue", invite: { id: "invite", email: "colleague@example.invalid", roleId: "reader", revision: "a".repeat(64), status: "PENDING" } }} />)
  fireEvent.click(screen.getByRole("button", { name: copy.management.reissue.submit }))
  fireEvent.change(screen.getByLabelText(copy.management.reason), { target: { value: "Replace the old link" } })
  fireEvent.submit(screen.getByLabelText(copy.management.reason).closest("form")!)
  expect(await screen.findByRole("status")).toHaveTextContent(copy.management.updating)
  for (const close of screen.getAllByRole("button", { name: copy.close })) expect(close).toBeDisabled()
  await act(async () => finish())
  for (const close of screen.getAllByRole("button", { name: copy.close })) expect(close).toBeEnabled()
})
