import type { SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import BeautifulRegisterForm from "../../BeautifulRegisterForm"
import { authCopy } from "../../auth-copy"
jest.mock("@/i18n/routing", () => ({ localizePath: (href: string, locale: string) => `/${locale}${href}`, getLocaleFromPathname: (pathname: string) => pathname.startsWith("/fr/") ? "fr" : "en" }))

jest.mock("lucide-react", () => new Proxy({ __esModule: true }, { get(target, prop: string) { if (prop in target) return target[prop as keyof typeof target]; return (props: SVGProps<SVGSVGElement>) => <svg {...props} /> } }))
jest.mock("../../AuthLayout", () => ({ AuthFormCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
const mockPush = jest.fn(), mockMutate = jest.fn(), mockWarning = jest.fn()
let mockLocale: "en" | "fr" = "en"
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => `/${mockLocale}/register`, useSearchParams: () => new URLSearchParams("ref=referral_reference") }))
jest.mock("@/hooks/useRegisterWorkflow", () => ({ RegistrationWorkflowError: class extends Error {}, useRegisterWorkflow: () => ({ mutateAsync: mockMutate }) }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ warning: mockWarning }) }))
jest.mock("@/components/ui/select", () => {
  const React = jest.requireActual("react"), Context = React.createContext({ value: "", onValueChange: (_value: string) => {} })
  return { Select: ({ children, value, onValueChange }: any) => <Context.Provider value={{ value, onValueChange }}>{children}</Context.Provider>, SelectTrigger: (props: any) => <Context.Consumer>{({ value, onValueChange }: any) => <select {...props} value={value || ""} onChange={event => onValueChange(event.target.value)}><option value="">Choose</option><option value="1-10">1-10</option></select>}</Context.Consumer>, SelectContent: () => null, SelectItem: () => null, SelectValue: () => null }
})

beforeEach(() => { jest.clearAllMocks(); mockLocale = "en" })

it.each(["en", "fr"] as const)("%s labels personal fields and advances on Enter without creating an account", async locale => {
  mockLocale = locale; const copy = authCopy[locale].register
  const { container } = render(<BeautifulRegisterForm />)
  expect(container.querySelector("form")).toHaveAttribute("method", "post")
  expect(screen.getByRole("button", { name: copy.steps.security })).toBeDisabled()
  fireEvent.submit(container.querySelector("form")!)
  await waitFor(() => expect(screen.getByLabelText(copy.fields.firstName)).toHaveAttribute("aria-invalid", "true"))
  expect(screen.getByLabelText(copy.fields.firstName)).toHaveFocus()
  for (const [label, value] of [[copy.fields.firstName, "Synthetic"], [copy.fields.lastName, "Owner"], [copy.fields.email, "owner@example.invalid"], [copy.fields.phone, "+990123456789"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fireEvent.submit(container.querySelector("form")!)
  await screen.findByLabelText(copy.fields.companyName)
  expect(mockMutate).not.toHaveBeenCalled()
  expect(screen.getByLabelText(copy.fields.companySize)).toBeVisible()
  expect(container.querySelector('input[name="referralCode"]')).toHaveValue("referral_reference")
})

it("retains masked credentials and focuses recovery after a lost response, with one pending submission", async () => {
  let reject!: (value: Error) => void
  mockMutate.mockReturnValue(new Promise((_, failure) => { reject = failure }))
  const { container } = render(<BeautifulRegisterForm />), copy = authCopy.en.register
  for (const [label, value] of [[copy.fields.firstName, "Synthetic"], [copy.fields.lastName, "Owner"], [copy.fields.email, "owner@example.invalid"], [copy.fields.phone, "+990123456789"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fireEvent.click(screen.getByRole("button", { name: copy.continue })); await screen.findByLabelText(copy.fields.companyName)
  fireEvent.change(screen.getByLabelText(copy.fields.companyName), { target: { value: "Synthetic company" } })
  fireEvent.change(screen.getByLabelText(copy.fields.companySize), { target: { value: "1-10" } })
  fireEvent.click(screen.getByRole("button", { name: copy.continue })); await screen.findByLabelText(copy.fields.password, { exact: true })
  for (const label of [copy.fields.password, copy.fields.confirmPassword]) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value: "Local!Credential-79" } })
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.submit(container.querySelector("form")!); fireEvent.submit(container.querySelector("form")!)
  await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1)); expect(screen.getByLabelText(copy.fields.password, { exact: true })).toBeDisabled()
  await act(async () => reject(new Error("connection lost")))
  expect(screen.getByRole("alert")).toHaveTextContent("outcome could not be confirmed")
  expect(screen.getByRole("alert")).toHaveFocus(); expect(mockPush).not.toHaveBeenCalled()
  expect(screen.getByLabelText(copy.fields.password, { exact: true })).toHaveValue("Local!Credential-79")
  expect(screen.getByLabelText(copy.fields.password, { exact: true })).toHaveAttribute("type", "password")
})
