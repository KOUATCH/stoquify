import { render, screen } from "@testing-library/react"

import getItemWithSuppliersById from "@/actions/item-suppliers/getItemWithSuppliers"
import getBriefItemById from "@/actions/itemsShow/getBriefItemById"
import getOrgSuppliers from "@/actions/suppliers/getOrgSuppliers"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service"
import ItemSuppliersPage from "../page"

jest.mock("@/actions/item-suppliers/getItemWithSuppliers", () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock("@/actions/itemsShow/getBriefItemById", () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock("@/actions/suppliers/getOrgSuppliers", () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}))
jest.mock("@/services/organization/organization-settings.service", () => ({
  getOrganizationSettingsForOrg: jest.fn(),
}))
jest.mock("@/i18n/routing", () => ({
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))
jest.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))
jest.mock("lucide-react", () => ({
  ArrowLeft: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
}))
jest.mock("../AddSuppliersToItemModal", () => ({
  __esModule: true,
  default: () => <div>Add suppliers</div>,
}))
jest.mock("../LayoutItemSuppliers", () => ({
  __esModule: true,
  default: ({
    organizationId,
    currency,
    locale,
  }: {
    organizationId: string
    currency: string
    locale: string
  }) => (
    <div
      data-testid="item-suppliers-layout"
      data-organization-id={organizationId}
      data-currency={currency}
      data-locale={locale}
    />
  ),
}))

const mockGetItemWithSuppliersById = getItemWithSuppliersById as jest.Mock
const mockGetBriefItemById = getBriefItemById as jest.Mock
const mockGetOrgSuppliers = getOrgSuppliers as jest.Mock
const mockCheckPermission = checkPermission as jest.Mock
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockGetOrganizationSettingsForOrg = getOrganizationSettingsForOrg as jest.Mock

describe("item suppliers page display context", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
    mockGetAuthenticatedUser.mockResolvedValue({
      id: "user-1",
      organizationId: "org-xaf",
      permissions: ["inventory.items.read"],
    })
    mockGetOrganizationSettingsForOrg.mockResolvedValue({ currency: "XAF" })
    mockGetBriefItemById.mockResolvedValue({
      success: true,
      data: {
        id: "item-1",
        name: "Rice",
        sku: "RICE-1",
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    })
    mockGetItemWithSuppliersById.mockResolvedValue({ success: true, data: [] })
    mockGetOrgSuppliers.mockResolvedValue({ success: true, data: { data: [] } })
  })

  it("passes the authenticated organization currency and route locale to the unit-cost display", async () => {
    render(await ItemSuppliersPage({
      params: Promise.resolve({ id: "item-1", locale: "fr" }),
    }))

    expect(mockGetOrganizationSettingsForOrg).toHaveBeenCalledWith("org-xaf")
    const layout = screen.getByTestId("item-suppliers-layout")
    expect(layout).toHaveAttribute("data-organization-id", "org-xaf")
    expect(layout).toHaveAttribute("data-currency", "XAF")
    expect(layout).toHaveAttribute("data-locale", "fr")
  })
})
