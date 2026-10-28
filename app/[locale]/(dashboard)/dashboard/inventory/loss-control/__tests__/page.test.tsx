import { render, screen } from "@testing-library/react"

import { checkPermission } from "@/config/useAuth"

import InventoryLossControlPage from "../page"

jest.mock("@/app/[locale]/(dashboard)/dashboard/inventory/inventory-route-access", () => ({
  routeByKey: jest.fn(() => ({ key: "inventory-test" })),
  withInventorySurfaceAccess: jest.fn(({ onAllowed }) => onAllowed({ orgId: "org-1" }, "en")),
}))

jest.mock("@/config/useAuth", () => ({
  checkPermission: jest.fn(),
}))

jest.mock(
  "@/components/inventory/loss/InventoryLossWorkbench",
  () => ({
    InventoryLossWorkbench: () => (
      <section>Inventory loss workbench</section>
    ),
  }),
)

const mockCheckPermission = checkPermission as jest.Mock

describe("InventoryLossControlPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckPermission.mockResolvedValue(true)
  })

  it("requires inventory levels read before rendering the workbench", async () => {
    render(await InventoryLossControlPage())

    expect(mockCheckPermission).toHaveBeenCalledWith(
      "inventory.levels.read",
    )
    expect(
      screen.getByText("Inventory loss workbench"),
    ).toBeInTheDocument()
  })

  it("stops before rendering when route permission is denied", async () => {
    mockCheckPermission.mockRejectedValue(new Error("Forbidden"))

    await expect(InventoryLossControlPage()).rejects.toThrow(
      "Forbidden",
    )

    expect(mockCheckPermission).toHaveBeenCalledWith(
      "inventory.levels.read",
    )
  })
})
