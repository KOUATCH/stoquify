import { render, screen } from "@testing-library/react"
import { redirect } from "next/navigation"

import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"

import CustomerOrdersClientPage from "../CustomerOrdersClientPage"
import CustomerOrdersPage from "../page"

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

jest.mock("../CustomerOrdersClientPage", () =>
  jest.fn(() => (
    <section>
      <h1>Customer orders client</h1>
    </section>
  )),
)

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockRedirect = redirect as unknown as jest.Mock
const mockCustomerOrdersClientPage = CustomerOrdersClientPage as jest.Mock

const pageProps = {
  params: Promise.resolve({ locale: "en", id: "cust-1" }),
}

describe("CustomerOrdersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAuthenticatedUser.mockResolvedValue({ organizationId: "org-customer" })
  })

  it("requires customer order read permission before rendering the customer orders client", async () => {
    render(await CustomerOrdersPage(pageProps))

    expect(mockCheckPermission).toHaveBeenCalledWith("customers.orders.read")
    expect(mockGetAuthenticatedUser).toHaveBeenCalledTimes(1)
    expect(mockCustomerOrdersClientPage).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("heading", { name: "Customer orders client" })).toBeInTheDocument()
  })

  it("stops before tenant lookup and client rendering when order read permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(CustomerOrdersPage(pageProps)).rejects.toThrow("Forbidden")

    expect(mockCheckPermission).toHaveBeenCalledWith("customers.orders.read")
    expect(mockGetAuthenticatedUser).not.toHaveBeenCalled()
    expect(mockCustomerOrdersClientPage).not.toHaveBeenCalled()
  })

  it("redirects before client rendering when tenant scope is unavailable", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ organizationId: null })

    await expect(CustomerOrdersPage(pageProps)).rejects.toThrow("NEXT_REDIRECT:/en/unauthorized")

    expect(mockCheckPermission).toHaveBeenCalledWith("customers.orders.read")
    expect(mockRedirect).toHaveBeenCalledWith("/en/unauthorized")
    expect(mockCustomerOrdersClientPage).not.toHaveBeenCalled()
  })
})