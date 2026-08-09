import { checkPermission } from "@/config/useAuth"
import { redirect } from "next/navigation"
import ItemsNewPage from "../page"

jest.mock("@/config/useAuth", () => ({ checkPermission: jest.fn() }))
jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => locale,
}))
jest.mock("next/navigation", () => ({ redirect: jest.fn() }))

const mockCheckPermission = checkPermission as jest.Mock
const mockRedirect = redirect as unknown as jest.Mock

describe("legacy inventory item create route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(undefined)
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })
  })

  it("checks create permission and redirects to the canonical wizard", async () => {
    await expect(ItemsNewPage({
      params: Promise.resolve({ locale: "en" }),
    })).rejects.toThrow("NEXT_REDIRECT")

    expect(mockCheckPermission).toHaveBeenCalledWith("inventory.items.create")
    expect(mockRedirect).toHaveBeenCalledWith("/en/dashboard/inventory/items/create")
  })
})
