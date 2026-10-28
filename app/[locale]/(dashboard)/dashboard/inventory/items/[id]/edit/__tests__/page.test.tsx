import { render, screen } from "@testing-library/react"

import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { getItemEditDTO } from "@/services/item/item.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { redirect } from "next/navigation"

import ItemsEditPage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "inventory-test" })),
  withInventorySurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
}))

const mockEditItemClient = jest.fn(() => <div data-testid="edit-item-client">Edit item form</div>)

jest.mock("../EditItemClient", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockEditItemClient(props),
}))
jest.mock("@/actions/brands/getOrgBrands", () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock("@/actions/categories/getOrgCategories", () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock("@/actions/taxRate/getOrgTaxRates", () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock("@/actions/units/getOrgUnits", () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}))
jest.mock("@/services/item/item.service", () => ({
  getItemEditDTO: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}))

const mockCheckPermission = checkPermission as jest.Mock
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock
const mockGetItemEditDTO = getItemEditDTO as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockRedirect = redirect as jest.Mock
const mockGetOrgBrands = getOrgBrands as jest.Mock
const mockGetOrgCategories = getOrgCategories as jest.Mock
const mockGetOrgTaxRates = getOrgTaxRates as jest.Mock
const mockGetOrgUnits = getOrgUnits as jest.Mock

describe("inventory item edit page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(undefined)
    mockGetAuthenticatedUser.mockResolvedValue({
      id: "user-1",
      organizationId: "org-1",
      permissions: ["inventory.items.update"],
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockGetItemEditDTO.mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      nameEn: "Rice",
    })

    for (const mockReferenceAction of [
      mockGetOrgBrands,
      mockGetOrgCategories,
      mockGetOrgTaxRates,
      mockGetOrgUnits,
    ]) {
      mockReferenceAction.mockResolvedValue({ success: true, data: [] })
    }
  })

  it("opens the tenant-scoped lowercase route after permission and entitlement checks", async () => {
    render(await ItemsEditPage({
      params: Promise.resolve({ id: "item-1", locale: "en" }),
    }))

    expect(mockCheckPermission).toHaveBeenCalledWith("inventory.items.update")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions: ["inventory.items.update"],
      moduleSlug: "inventory",
      surfaceType: "page",
      surface: "/dashboard/inventory/items/[id]/edit",
      accessIntent: "write",
      mode: "enforce",
    })
    expect(mockGetItemEditDTO).toHaveBeenCalledWith("org-1", "item-1")
    expect(mockEditItemClient).toHaveBeenCalledWith(expect.objectContaining({
      itemData: expect.objectContaining({ id: "item-1", organizationId: "org-1" }),
      initialBrandData: [],
      initialCategoryData: [],
      initialTaxRateData: [],
      initialUnitData: [],
    }))
    expect(screen.getByTestId("edit-item-client")).toBeInTheDocument()
  })

  it("redirects before loading item data when the inventory module is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(ItemsEditPage({
      params: Promise.resolve({ id: "item-1", locale: "en" }),
    })).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/en/unauthorized")
    expect(mockGetItemEditDTO).not.toHaveBeenCalled()
  })

  it("does not render an edit form for an item outside the organization scope", async () => {
    mockGetItemEditDTO.mockResolvedValue(null)

    render(await ItemsEditPage({
      params: Promise.resolve({ id: "item-other-org", locale: "fr" }),
    }))

    expect(screen.getByRole("heading", { name: "Item not found" })).toBeInTheDocument()
    expect(mockEditItemClient).not.toHaveBeenCalled()
  })
})
