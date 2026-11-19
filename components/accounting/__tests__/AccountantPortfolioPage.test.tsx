/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { cleanup, render, screen } from "@testing-library/react"
import Page from "@/app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { requirePermission, RbacError } from "@/lib/security/rbac"

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error { constructor(message: string, public code: string) { super(message) } },
  requirePermission: jest.fn(), requireAllPermissions: jest.fn(), requireAnyPermission: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/config/useAuth", () => ({ checkPermission: jest.fn() }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("@/components/accounting/AccountantPortfolioWorkspace", () => ({ AccountantPortfolioWorkspace: ({ locale, initialInput }: any) => <div data-testid="workspace">{locale}:{JSON.stringify(initialInput)}</div> }))
jest.mock("@/app/[locale]/(dashboard)/dashboard/accounting/_components/accounting-ui", () => ({ AccountingPageShell: ({ children }: any) => <main>{children}</main> }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a> }))

beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "synthetic-firm", userId: "synthetic-actor", permissions: ["accounting.audit.read"] })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
})
afterEach(cleanup)

it.each(["en", "fr"])("uses the existing module gate and localized recovery in %s", async locale => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  render(await Page({ params: Promise.resolve({ locale }) }))
  expect(screen.queryByTestId("workspace")).not.toBeInTheDocument()
  expect(screen.getByRole("heading", { name: locale === "fr" ? "Module comptable indisponible" : "Accounting module unavailable" })).toBeInTheDocument()
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "synthetic-firm", userId: "synthetic-actor", moduleSlug: "accounting", mode: "enforce", accessIntent: "read" }))
})
it("does not mount the private workspace when the route role is denied", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new RbacError("Denied", "FORBIDDEN", 403))
  render(await Page({ params: Promise.resolve({ locale: "fr" }) }))
  expect(screen.queryByTestId("workspace")).not.toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Accès à la comptabilité refusé" })).toBeInTheDocument()
  expect(observeModuleAccess).not.toHaveBeenCalled()
})
it("passes the navigation context only after the server gate allows it", async () => {
  render(await Page({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ search: "Synthetic", cursor: "position", pageSize: "20" }) }))
  expect(screen.getByTestId("workspace")).toHaveTextContent('en:{"search":"Synthetic","cursor":"position","pageSize":20}')
})
