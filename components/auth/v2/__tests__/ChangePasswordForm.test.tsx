import { act, fireEvent, render, screen } from "@testing-library/react"
import ChangePasswordForm from "@/components/Forms/ChangePasswordForm"
import { updateUserPassword } from "@/actions/users/updateUserPassword"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockLocale: "en" | "fr" = "en"
jest.mock("@/actions/users/updateUserPassword", () => ({ updateUserPassword: jest.fn() }))
jest.mock("next/navigation", () => ({ usePathname: () => "/" + mockLocale + "/dashboard/change-password" }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("lucide-react", () => ({ AlertCircle: () => null, CheckCircle2: () => null, Eye: () => null, EyeOff: () => null, Loader2: () => null, LockKeyhole: () => null }))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  let text: unknown = (mockLocale === "en" ? en : fr).passwordChange
  for (const part of key.split(".")) text = (text as Record<string, unknown>)?.[part]
  if (typeof text !== "string") throw new Error("Missing translation " + key)
  return text.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
const action = updateUserPassword as jest.Mock, fields = { oldPassword: "Old!LocalCredential-57", newPassword: "New!LocalCredential-86" }
beforeEach(() => { jest.clearAllMocks(); action.mockReset(); mockLocale = "en" })
function enter() {
  const copy = (mockLocale === "en" ? en : fr).passwordChange
  fireEvent.change(screen.getByLabelText(copy.oldPassword), { target: { value: fields.oldPassword } })
  fireEvent.change(screen.getByLabelText(copy.newPassword), { target: { value: fields.newPassword } })
  return copy
}
it.each(["en", "fr"] as const)("preserves %s credentials and feedback after uncertain response, then confirms a real success", async locale => {
  mockLocale = locale; action.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce({ status: 200, data: { selfService: true, sessionsRevoked: true } })
  render(<ChangePasswordForm editingId="actor" />); const copy = enter()
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.unknown)
  expect(screen.getByRole("alert")).toHaveFocus()
  expect(screen.getByLabelText(copy.newPassword)).toHaveValue(fields.newPassword)
  expect(screen.getByRole("button", { name: copy.submit })).toBeEnabled()
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByText(copy.successSelf)).toBeVisible()
  expect(screen.getByRole("status")).toHaveTextContent(copy.successSelf)
  expect(screen.queryByLabelText(copy.newPassword)).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: copy.signIn })).toHaveAttribute("href", "/" + locale + "/login-v2")
  expect(action).toHaveBeenLastCalledWith("actor", fields)
})
it("masks both credentials with safe native POST and explicit show controls", () => {
  render(<ChangePasswordForm editingId="actor" />); const copy = enter()
  expect(screen.getByLabelText(copy.oldPassword)).toHaveAttribute("type", "password")
  expect(screen.getByLabelText(copy.newPassword)).toHaveAttribute("type", "password")
  expect(screen.getByLabelText(copy.oldPassword)).toHaveAttribute("autocomplete", "current-password")
  expect(screen.getByRole("button", { name: copy.submit }).closest("form")).toHaveAttribute("method", "post")
  fireEvent.click(screen.getByRole("button", { name: "Show " + copy.oldPassword }))
  expect(screen.getByLabelText(copy.oldPassword)).toHaveAttribute("type", "text")
  expect(screen.getByRole("button", { name: "Hide " + copy.oldPassword })).toHaveAttribute("aria-pressed", "true")
})
it.each(["WEAK", "BREACHED", "RECENTLY_USED", "CONTAINS_EMAIL", "VALIDATION_ERROR", "INVALID_CREDENTIALS", "RATE_LIMITED", "AUTH_REQUIRED", "FORBIDDEN", "FRESH_AUTH_REQUIRED", "CREDENTIAL_CHANGED", "CREDENTIAL_REVIEW_REQUIRED", "USER_UNAVAILABLE"])("handles %s without leaving the form pending", async code => {
  action.mockResolvedValue({ status: 400, code, data: null })
  render(<ChangePasswordForm editingId="actor" />); const copy = enter()
  fireEvent.click(screen.getByRole("button", { name: copy.submit }))
  expect(await screen.findByRole("alert")).not.toHaveTextContent(copy.errors.unknown)
  expect(screen.getByLabelText(copy.newPassword)).toHaveValue(fields.newPassword)
  expect(screen.getByRole("button", { name: copy.submit })).toBeEnabled()
})
it("prevents repeated pending submission and keeps success separate from an administrator session", async () => {
  let resolve!: (value: unknown) => void
  action.mockReturnValue(new Promise(value => { resolve = value }))
  render(<ChangePasswordForm editingId="target" />); const copy = enter(), form = screen.getByRole("button", { name: copy.submit }).closest("form")!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(action).toHaveBeenCalledTimes(1); expect(screen.getByLabelText(copy.oldPassword)).toBeDisabled()
  await act(async () => resolve({ status: 200, data: { selfService: false } }))
  expect(screen.getByRole("status")).toHaveTextContent(copy.successAdmin)
  expect(screen.getByRole("link", { name: copy.backToUsers })).toHaveAttribute("href", "/en/dashboard/settings/users")
  expect(screen.queryByRole("link", { name: copy.signIn })).not.toBeInTheDocument()
})
it("does not collect passwords when the server supplied no account", () => {
  render(<ChangePasswordForm />)
  expect(screen.getByRole("alert")).toHaveTextContent(en.passwordChange.errors.unavailable)
  expect(screen.queryByLabelText(en.passwordChange.oldPassword)).not.toBeInTheDocument()
})
