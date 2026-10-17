import { render, screen } from "@testing-library/react"
import Page from "@/app/[locale]/(dashboard)/dashboard/accounting/accountant-access/page"
import { getAccountantAccessRegisterAction } from "@/actions/accounting/accountant-access.actions"
import { checkPermission } from "@/config/useAuth"
import { withAccountingSurfaceAccess } from "@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access"

jest.mock("@/actions/accounting/accountant-access.actions", () => ({ getAccountantAccessRegisterAction: jest.fn() }))
jest.mock("@/config/useAuth", () => ({ checkPermission: jest.fn() }))
jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/accounting-route-access", () => ({ routeByKey: () => ({ key: "accounting-accountant-access" }), withAccountingSurfaceAccess: jest.fn() }))
jest.mock("@/components/accounting/AccountantAccessManager", () => ({ AccountantAccessManager: ({ locale }: { locale: string }) => <div data-testid="manager">{locale}</div> }))
jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/_components/accounting-ui", () => ({ AccountingPageShell: ({ title, children }: { title: string; children: React.ReactNode }) => <main><h1>{title}</h1>{children}</main> }))

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(withAccountingSurfaceAccess).mockImplementation(async ({ onAllowed }: any) => onAllowed())
  jest.mocked(getAccountantAccessRegisterAction).mockResolvedValue({ success: true, data: [], error: null, status: 200 } as any)
})

it.each(["en", "fr"])("passes %s to the access form after the existing permission check", async locale => {
  render(await Page({ params: Promise.resolve({ locale }) }))
  expect(screen.getByRole("heading", { name: locale === "fr" ? "Accès comptable" : "Accountant Access" })).toBeInTheDocument()
  expect(screen.getByTestId("manager")).toHaveTextContent(locale)
  expect(checkPermission).toHaveBeenCalledWith("accounting.close.accountant.invite")
})

it("does not read grants or render a form when the route guard denies access", async () => {
  jest.mocked(withAccountingSurfaceAccess).mockResolvedValue(<p>Accès refusé</p>)
  render(await Page({ params: Promise.resolve({ locale: "fr" }) }))
  expect(getAccountantAccessRegisterAction).not.toHaveBeenCalled()
  expect(screen.queryByTestId("manager")).not.toBeInTheDocument()
})

it("shows localized read failure without inventing an empty register", async () => {
  jest.mocked(getAccountantAccessRegisterAction).mockResolvedValue({ success: false, data: null, error: "Safe diagnostic", status: 500 } as any)
  render(await Page({ params: Promise.resolve({ locale: "fr" }) }))
  expect(screen.getByText("Impossible de charger les accès comptables.")).toBeInTheDocument()
  expect(screen.getByText("Safe diagnostic")).toBeInTheDocument()
  expect(screen.queryByTestId("manager")).not.toBeInTheDocument()
})
