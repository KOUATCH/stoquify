import { render, screen } from "@testing-library/react"
import { redirect } from "next/navigation"

import CustomerManagementDashboard from "@/components/customers/CustomerManagementDashboard"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"

import CustomerAnalyticsPage from "../[id]/page"
import EditCustomerPage from "../[id]/edit/page"
import CustomersPage from "../page"
import CreateCustomerPage from "../new/page"

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/components/customers/CustomerManagementDashboard", () =>
  jest.fn(({ organizationId, locale, basePath, initialAction, initialAnalyticsId, initialEditId }) => (
    <section>
      <h1>Customer dashboard</h1>
      <p>organization:{organizationId}</p>
      <p>locale:{locale}</p>
      <p>basePath:{basePath}</p>
      {initialAction ? <p>action:{initialAction}</p> : null}
      {initialAnalyticsId ? <p>analytics:{initialAnalyticsId}</p> : null}
      {initialEditId ? <p>edit:{initialEditId}</p> : null}
    </section>
  )),
)

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockRedirect = redirect as unknown as jest.Mock
const mockCustomerManagementDashboard = CustomerManagementDashboard as jest.Mock

type CustomerRouteCase = {
  name: string
  permission: string
  renderPage: () => Promise<React.ReactElement>
  expectedProps: Record<string, unknown>
}

const routeCases: CustomerRouteCase[] = [
  {
    name: "customers list",
    permission: "customers.read",
    renderPage: () => CustomersPage({ params: Promise.resolve({ locale: "en" }) }),
    expectedProps: {
      organizationId: "org-customer",
      locale: "en",
      basePath: "/en/dashboard/customers",
    },
  },
  {
    name: "customer create",
    permission: "customers.create",
    renderPage: () => CreateCustomerPage({ params: Promise.resolve({ locale: "en" }) }),
    expectedProps: {
      organizationId: "org-customer",
      locale: "en",
      basePath: "/en/dashboard/customers",
      initialAction: "create",
    },
  },
  {
    name: "customer detail analytics",
    permission: "customers.read",
    renderPage: () => CustomerAnalyticsPage({ params: Promise.resolve({ locale: "en", id: "cust-1" }) }),
    expectedProps: {
      organizationId: "org-customer",
      locale: "en",
      basePath: "/en/dashboard/customers",
      initialAnalyticsId: "cust-1",
    },
  },
  {
    name: "customer edit",
    permission: "customers.update",
    renderPage: () => EditCustomerPage({ params: Promise.resolve({ locale: "en", id: "cust-1" }) }),
    expectedProps: {
      organizationId: "org-customer",
      locale: "en",
      basePath: "/en/dashboard/customers",
      initialEditId: "cust-1",
    },
  },
]

describe("customer dashboard server pages", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAuthenticatedUser.mockResolvedValue({ organizationId: "org-customer" })
  })

  it.each(routeCases)("requires $permission before rendering the tenant-scoped $name page", async ({ permission, renderPage, expectedProps }) => {
    render(await renderPage())

    expect(mockCheckPermission).toHaveBeenCalledWith(permission)
    expect(mockGetAuthenticatedUser).toHaveBeenCalledTimes(1)
    expect(mockCustomerManagementDashboard).toHaveBeenCalledWith(
      expect.objectContaining(expectedProps),
      undefined,
    )
    expect(screen.getByRole("heading", { name: "Customer dashboard" })).toBeInTheDocument()
    expect(screen.getByText("organization:org-customer")).toBeInTheDocument()
  })

  it.each(routeCases)("stops before tenant lookup and rendering when $name permission is denied", async ({ permission, renderPage }) => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(renderPage()).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith(permission)
    expect(mockGetAuthenticatedUser).not.toHaveBeenCalled()
    expect(mockCustomerManagementDashboard).not.toHaveBeenCalled()
  })

  it.each(routeCases)("redirects the $name page before rendering when tenant scope is unavailable", async ({ permission, renderPage }) => {
    mockGetAuthenticatedUser.mockResolvedValue({ organizationId: null })

    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/en/unauthorized")

    expect(mockCheckPermission).toHaveBeenCalledWith(permission)
    expect(mockRedirect).toHaveBeenCalledWith("/en/unauthorized")
    expect(mockCustomerManagementDashboard).not.toHaveBeenCalled()
  })
})