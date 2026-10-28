import { render, screen } from "@testing-library/react"

import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import { getOrgLocations } from "@/actions/locations/getOrgLocations"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { getLocale } from "next-intl/server"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service"
import CreateItemPage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "inventory-test" })),
  withInventorySurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
}))

jest.mock("@/actions/item/items", () => ({ createItemAction: jest.fn() }))
jest.mock("lucide-react", () => ({
  ArrowLeft: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
  Package: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("next-intl/server", () => ({ getLocale: jest.fn() }))
jest.mock("@/i18n/routing", () => ({
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))
jest.mock("@/actions/brands/getOrgBrands", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/actions/categories/getOrgCategories", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/actions/locations/getOrgLocations", () => ({ getOrgLocations: jest.fn() }))
jest.mock("@/actions/taxRate/getOrgTaxRates", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/actions/units/getOrgUnits", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("@/services/organization/organization-settings.service", () => ({
  getOrganizationSettingsForOrg: jest.fn(),
}))
jest.mock("@/components/inventory/CreateItemWizard", () => ({
  CreateItemWizard: ({ currency, locale }: { currency: string; locale: string }) => (
    <div data-testid="create-item-wizard" data-currency={currency} data-locale={locale}>
      Create item wizard
    </div>
  ),
}))
jest.mock("@/i18n/server-routing", () => ({ localizedRedirect: jest.fn() }))

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetOrgBrands = getOrgBrands as jest.Mock
const mockGetOrgCategories = getOrgCategories as jest.Mock
const mockGetOrgLocations = getOrgLocations as jest.Mock
const mockGetOrgTaxRates = getOrgTaxRates as jest.Mock
const mockGetOrgUnits = getOrgUnits as jest.Mock
const mockGetLocale = getLocale as jest.Mock
const mockGetOrganizationSettingsForOrg = getOrganizationSettingsForOrg as jest.Mock

describe("inventory item create page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(undefined)
    mockGetAuthenticatedUser.mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      permissions: ["inventory.items.create"],
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, decision: "allow" })
    mockGetOrgBrands.mockResolvedValue({ success: true, data: [] })
    mockGetOrgCategories.mockResolvedValue({ success: true, data: [] })
    mockGetOrgLocations.mockResolvedValue({ success: true, data: [] })
    mockGetOrgTaxRates.mockResolvedValue({ success: true, data: [] })
    mockGetOrgUnits.mockResolvedValue({ success: true, data: [] })
    mockGetLocale.mockResolvedValue("fr")
    mockGetOrganizationSettingsForOrg.mockResolvedValue({ currency: "XOF" })
  })

  it("observes inventory access before loading reference data", async () => {
    render(await CreateItemPage())

    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["inventory.items.create"],
      moduleSlug: "inventory",
      surfaceType: "page",
      surface: "/dashboard/inventory/items/create",
      accessIntent: "write",
      mode: "observe",
    })
    expect(mockObserveModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetOrgCategories.mock.invocationCallOrder[0],
    )
    const wizard = screen.getByTestId("create-item-wizard")
    expect(wizard).toHaveAttribute("data-currency", "XOF")
    expect(wizard).toHaveAttribute("data-locale", "fr")
  })
})
