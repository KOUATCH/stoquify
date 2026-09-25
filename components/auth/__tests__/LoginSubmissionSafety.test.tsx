import { fireEvent, render, waitFor } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { LoginV2Form } from "../v2/LoginV2Form"
import EnhancedLoginForm from "../EnhancedLoginForm"
import { authClient } from "@/lib/auth-client"
jest.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: jest.fn() } } }))
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), usePathname: () => "/en/login" }))
jest.mock("@/i18n/routing", () => ({ localizePath: (href: string, locale: string) => `/${locale}${href}`, getLocaleFromPathname: () => "en", DEFAULT_LOCALE: "en" }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a> }))
jest.mock("../AuthLayout", () => ({ AuthFormCard: ({ children }: any) => <div>{children}</div> }))
const mockError = jest.fn(), mockSuccess = jest.fn(), mockSystemSuccess = jest.fn()
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ formError: mockError, formSuccess: mockSuccess, success: mockSystemSuccess }) }))
jest.mock("lucide-react", () => new Proxy({}, { get: (_target, name) => name === "__esModule" ? false : (props: any) => <svg {...props} /> }))
const views = [{ name: "standard", render: () => <EnhancedLoginForm /> }, { name: "v2-en", render: () => <LoginV2Form locale="en" /> }, { name: "v2-fr", render: () => <LoginV2Form locale="fr" /> }]
beforeEach(() => { jest.clearAllMocks(); (authClient.signIn.email as jest.Mock).mockResolvedValue({ error: { message: "Invalid credentials" } }) })
it.each(views)("server-rendered $name has POST fallback and disabled credential controls", view => {
  const root = document.createElement("div"); root.innerHTML = renderToStaticMarkup(view.render())
  expect(root.querySelector("form")).toHaveAttribute("method", "post")
  expect(root.querySelector("fieldset")).toBeDisabled()
  expect(root.querySelector('input[name="email"]')).toBeDisabled()
  expect(root.querySelector('input[name="password"]')).toBeDisabled()
  expect(authClient.signIn.email).not.toHaveBeenCalled()
})
it.each(views)("initialized $name sends credentials only through the auth client and preserves failures", async view => {
  const { container } = render(view.render()), email = container.querySelector('input[name="email"]')!, password = container.querySelector('input[name="password"]')!
  expect(email).toBeEnabled(); expect(password).toHaveAttribute("autocomplete", "current-password")
  fireEvent.change(email, { target: { value: "reader@example.invalid" } }); fireEvent.change(password, { target: { value: "Synthetic-test-password" } })
  const event = new Event("submit", { bubbles: true, cancelable: true }); fireEvent(container.querySelector("form")!, event)
  expect(event.defaultPrevented).toBe(true)
  await waitFor(() => expect(authClient.signIn.email).toHaveBeenCalledTimes(1))
  expect(authClient.signIn.email).toHaveBeenCalledWith(expect.objectContaining({ email: "reader@example.invalid", password: "Synthetic-test-password" }))
  await waitFor(() => expect(mockError).toHaveBeenCalled())
  expect(email).toHaveValue("reader@example.invalid"); expect(password).toHaveValue("Synthetic-test-password"); expect(container.querySelector('button[type="submit"]')).toBeEnabled()
})
