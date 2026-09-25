import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import ResetPasswordForm from "@/components/Forms/ResetPasswordForm"
import ForgotPasswordForm from "@/components/Forms/ForgotPasswordForm"
import { sendResetLink } from "@/actions/users/sendResetLink"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import { resetUserPassword } from "@/actions/users/updateUserPassword"
import { notify } from "@/lib/notifications/notify"
const mockPush = jest.fn()
let mockLocale: "en" | "fr" = "en"
let mockParams = new URLSearchParams({ email: "synthetic@example.invalid", token: "a".repeat(32) })
jest.mock("@/actions/users/sendResetLink", () => ({ sendResetLink: jest.fn() }))
jest.mock("@/actions/users/updateUserPassword", () => ({ resetUserPassword: jest.fn() }))
jest.mock("@/lib/notifications/notify", () => ({ notify: { success: jest.fn(), error: jest.fn() } }))
jest.mock("next/navigation", () => ({ usePathname: () => "/" + mockLocale + "/reset-password", useRouter: () => ({ push: mockPush }), useSearchParams: () => mockParams }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("@/components/frontend/custom-carousel", () => () => null)
jest.mock("@/components/global/Logo", () => () => null)
jest.mock("lucide-react", () => ({ Key: () => null, Lock: () => null, Eye: () => null, EyeOff: () => null, Loader2: () => null, AlertCircle: () => null, CheckCircle2: () => null, LockKeyhole: () => null, Info: () => null, Mail: () => null }))
jest.mock("next-intl", () => ({ useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  let text: unknown = (mockLocale === "en" ? en : fr).passwordRecovery
  for (const part of key.split(".")) text = (text as Record<string, unknown>)?.[part]
  if (typeof text !== "string") throw new Error("Missing translation " + key)
  return text.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
beforeEach(() => { jest.clearAllMocks(); mockLocale = "en"; mockParams = new URLSearchParams({ email: "synthetic@example.invalid", token: "a".repeat(32) }) })
it.each([400, 429, 503])("does not claim reset success after server status %s", async status => {
  ;(resetUserPassword as jest.Mock).mockResolvedValue({ status, error: "rejected", data: null })
  const { container } = render(<ResetPasswordForm />)
  fireEvent.change(container.querySelector('input[name="password"]')!, { target: { value: "Local!Credential-87" } })
  fireEvent.change(container.querySelector('input[name="cPassword"]')!, { target: { value: "Local!Credential-87" } })
  fireEvent.submit(container.querySelector("form")!)
  await waitFor(() => expect(resetUserPassword).toHaveBeenCalledTimes(1))
  expect(notify.success).not.toHaveBeenCalled()
  expect(mockPush).not.toHaveBeenCalled()
  expect(await screen.findByRole("alert")).toBeVisible()
})
it.each(["en", "fr"] as const)("preserves %s reset draft after uncertain response and shows only real completion", async locale => {
  mockLocale = locale; const copy = (locale === "en" ? en : fr).passwordRecovery
  ;(resetUserPassword as jest.Mock).mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce({ status: 200 })
  const { container } = render(<ResetPasswordForm />)
  for (const name of ["password", "cPassword"]) fireEvent.change(container.querySelector('input[name="' + name + '"]')!, { target: { value: "Local!Credential-87" } })
  expect(container.querySelector("form")).toHaveAttribute("method", "post")
  fireEvent.submit(container.querySelector("form")!)
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.unknown)
  expect(screen.getByRole("alert")).toHaveFocus()
  expect(screen.getByLabelText(copy.password)).toHaveValue("Local!Credential-87")
  fireEvent.click(screen.getByRole("button", { name: copy.resetSubmit }))
  expect(await screen.findByText(copy.completeTitle)).toBeVisible()
  expect(screen.queryByLabelText(copy.password)).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: copy.signIn })).toHaveAttribute("href", "/" + locale + "/login-v2")
})
it.each(["en", "fr"] as const)("acknowledges %s requests without claiming delivery; allows explicit editing", async locale => {
  mockLocale = locale; const copy = (locale === "en" ? en : fr).passwordRecovery
  ;(sendResetLink as jest.Mock).mockResolvedValue({ status: 200, data: null })
  render(<ForgotPasswordForm />)
  fireEvent.change(screen.getByLabelText(copy.email), { target: { value: "synthetic@example.invalid" } })
  fireEvent.click(screen.getByRole("button", { name: copy.requestSubmit }))
  expect(await screen.findByText(copy.requestedBody)).toBeVisible()
  expect(screen.getByRole("status")).toHaveFocus()
  expect(notify.success).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: copy.anotherRequest }))
  expect(screen.getByLabelText(copy.email)).toHaveValue("synthetic@example.invalid")
  expect(sendResetLink).toHaveBeenCalledTimes(1)
})
it("keeps request failure actionable and does not send duplicate pending requests", async () => {
  let reject!: (value: Error) => void
  ;(sendResetLink as jest.Mock).mockReturnValue(new Promise((_, failure) => { reject = failure }))
  const { container } = render(<ForgotPasswordForm />)
  fireEvent.change(screen.getByLabelText(en.passwordRecovery.email), { target: { value: "synthetic@example.invalid" } })
  fireEvent.submit(container.querySelector("form")!); fireEvent.submit(container.querySelector("form")!)
  expect(sendResetLink).toHaveBeenCalledTimes(1)
  await act(async () => reject(new Error("network unavailable")))
  expect(screen.getByRole("alert")).toHaveTextContent(en.passwordRecovery.errors.requestUnknown)
  expect(screen.getByLabelText(en.passwordRecovery.email)).toHaveValue("synthetic@example.invalid")
})
it("does not collect a password for a malformed link", () => {
  mockParams = new URLSearchParams({ token: "123456" }); render(<ResetPasswordForm />)
  expect(screen.getByRole("alert")).toHaveTextContent(en.passwordRecovery.errors.invalidLink)
  expect(screen.queryByLabelText(en.passwordRecovery.password)).not.toBeInTheDocument()
})
it("clears the old draft when navigation changes the reset link", () => {
  const { rerender } = render(<ResetPasswordForm />)
  fireEvent.change(screen.getByLabelText(en.passwordRecovery.password), { target: { value: "OldDraft!Local-57" } })
  mockParams = new URLSearchParams({ email: "synthetic@example.invalid", token: "b".repeat(32) }); rerender(<ResetPasswordForm />)
  expect(screen.getByLabelText(en.passwordRecovery.password)).toHaveValue("")
})
it("requires matching passwords and blocks duplicate reset submission while pending", async () => {
  let resolve!: (value: unknown) => void
  ;(resetUserPassword as jest.Mock).mockReturnValue(new Promise(value => { resolve = value }))
  const { container } = render(<ResetPasswordForm />)
  fireEvent.change(screen.getByLabelText(en.passwordRecovery.password), { target: { value: "Local!Credential-87" } })
  fireEvent.change(screen.getByLabelText(en.passwordRecovery.confirm), { target: { value: "Different!Credential-87" } })
  fireEvent.submit(container.querySelector("form")!)
  expect(screen.getByRole("alert")).toHaveTextContent(en.passwordRecovery.errors.mismatch)
  expect(resetUserPassword).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(en.passwordRecovery.confirm), { target: { value: "Local!Credential-87" } })
  fireEvent.submit(container.querySelector("form")!); fireEvent.submit(container.querySelector("form")!)
  expect(resetUserPassword).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText(en.passwordRecovery.password)).toBeDisabled()
  await act(async () => resolve({ status: 400, code: "BREACHED" }))
  expect(screen.getByRole("alert")).toHaveTextContent(en.passwordRecovery.errors.breached)
  expect(screen.getByLabelText(en.passwordRecovery.password)).toBeEnabled()
})
