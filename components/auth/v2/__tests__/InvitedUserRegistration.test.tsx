import { act, fireEvent, render, screen } from "@testing-library/react"
import InvitedUserRegistration from "@/components/Forms/InvitedUserRegistration"
import { createInvitedUser } from "@/actions/users/createInvitedUser"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

let mockLocale: "en" | "fr" = "en"
jest.mock("@/actions/users/createInvitedUser", () => ({ createInvitedUser: jest.fn() }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("lucide-react", () => ({ AlertCircle: () => null, CheckCircle2: () => null, Eye: () => null, EyeOff: () => null, Loader2: () => null }))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  let text: unknown = (mockLocale === "en" ? en : fr).invitationRegistration
  for (const part of key.split(".")) text = (text as Record<string, unknown>)?.[part]
  if (typeof text !== "string") throw new Error("Missing translation " + key)
  return text.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
const action = createInvitedUser as jest.Mock
const props = { locale: "en" as const, email: "invited@example.invalid", organizationName: "Invited organization", roleName: "Reader", token: "a".repeat(64), isValidInvite: true, reloadHref: "/en/user-invite/invitation?token=test" }
beforeEach(() => { jest.clearAllMocks(); action.mockReset(); mockLocale = "en" })
function mount(extra: Partial<Parameters<typeof InvitedUserRegistration>[0]> = {}) {
  return render(<InvitedUserRegistration {...props} locale={mockLocale} {...extra} />)
}
function enter() {
  const copy = (mockLocale === "en" ? en : fr).invitationRegistration
  fireEvent.change(screen.getByLabelText(copy.firstName), { target: { value: "Ada" } })
  fireEvent.change(screen.getByLabelText(copy.password), { target: { value: "Local!Account7539" } })
  return copy
}
it.each(["en", "fr"] as const)("preserves %s entries on uncertain response and permits a safe retry", async locale => {
  mockLocale = locale
  action.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce({ status: 200, error: null, data: { id: "created-user" } })
  mount(); const copy = enter()
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.unknown)
  expect(screen.getByRole("alert")).toHaveFocus()
  expect(screen.getByLabelText(copy.firstName)).toHaveValue("Ada")
  expect(screen.getByLabelText(copy.password)).toHaveValue("Local!Account7539")
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("status")).toHaveTextContent(copy.successTitle)
  expect(screen.queryByLabelText(copy.password)).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: copy.login })).toHaveAttribute("href", "/" + locale + "/login-v2")
  expect(action).toHaveBeenLastCalledWith({ token: props.token, firstName: "Ada", lastName: "", phone: "", password: "Local!Account7539" })
})
it("ignores a repeated submission while the first request is pending", async () => {
  let resolve!: (value: unknown) => void
  action.mockReturnValue(new Promise(value => { resolve = value }))
  mount(); const copy = enter(), form = screen.getByRole("button", { name: copy.submit }).closest("form")!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(action).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText(copy.password)).toBeDisabled()
  await act(async () => resolve({ status: 200, data: { id: "created-user" } }))
  expect(screen.getByRole("status")).toHaveFocus()
})
it.each(["WEAK", "BREACHED", "INVITATION_EXPIRED", "INVITATION_UNAVAILABLE", "INVITATION_REISSUE_REQUIRED", "INVITATION_CHANGED", "INVITATION_ACCOUNT_EXISTS", "RATE_LIMITED"])("explains %s without claiming account creation", async code => {
  action.mockResolvedValue({ status: 400, data: null, code })
  mount(); const copy = enter()
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("alert")).not.toHaveTextContent(copy.errors.unknown)
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
  expect(screen.getByLabelText(copy.firstName)).toHaveValue("Ada")
})
it("distinguishes failed invitation lookup from an invalid invitation", () => {
  const copy = en.invitationRegistration
  mount({ loadFailed: true, isValidInvite: false })
  expect(screen.getByRole("alert")).toHaveTextContent(copy.loadBody)
  expect(screen.getByRole("link", { name: copy.reload })).toHaveAttribute("href", props.reloadHref)
  expect(screen.queryByLabelText(copy.password)).not.toBeInTheDocument()
  expect(action).not.toHaveBeenCalled()
})
it("does not collect credentials for an unavailable invitation", () => {
  mount({ isValidInvite: false })
  expect(screen.getByRole("alert")).toHaveTextContent(en.invitationRegistration.invalidBody)
  expect(screen.queryByRole("button", { name: en.invitationRegistration.submit })).not.toBeInTheDocument()
  expect(action).not.toHaveBeenCalled()
})
it("uses POST as the native fallback rather than putting credentials in the URL", () => {
  mount()
  expect(screen.getByRole("button", { name: en.invitationRegistration.submit }).closest("form")).toHaveAttribute("method", "post")
})
it("keeps confirmed account creation visible when the server refresh marks the link used", async () => {
  action.mockResolvedValue({ status: 200, data: { id: "created-user" } })
  const view = mount(), copy = enter()
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("status")).toHaveTextContent(copy.successTitle)
  view.rerender(<InvitedUserRegistration {...props} isValidInvite={false} email="" roleName="" />)
  expect(screen.getByRole("status")).toHaveTextContent(copy.successTitle)
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})
it.each(["en", "fr"] as const)("retains the %s authority error and reviewed draft when the action refresh invalidates the link", async locale => {
  mockLocale = locale
  action.mockResolvedValue({ status: 403, data: null, code: "INVITATION_REISSUE_REQUIRED" })
  const view = mount(), copy = enter()
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.reissue)
  view.rerender(<InvitedUserRegistration {...props} locale={locale} isValidInvite={false} email="" roleName="" organizationName="" />)
  expect(screen.getByRole("alert")).toHaveTextContent(copy.errors.reissue)
  expect(screen.getByLabelText(copy.firstName)).toHaveValue("Ada")
  expect(screen.getByLabelText(copy.password)).toHaveValue("Local!Account7539")
  expect(screen.getByText(props.email)).toBeVisible()
  expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled()
})
