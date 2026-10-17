import { render, screen } from "@testing-library/react"
import Page from "../page"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getItemOverview } from "@/services/item/item-overview.service"

jest.mock("lucide-react", () => ({
  AlertTriangle: () => null, Building2: () => null, Clock3: () => null,
  LockKeyhole: () => null, PackageX: () => null, SearchX: () => null,
  ArrowLeft: () => null, ArrowLeftRight: () => null, ArrowRight: () => null,
  Info: () => null, MapPin: () => null, Package: () => null, Pencil: () => null, Truck: () => null,
}))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
  canUsePermission: (ctx: { permissions: string[] }, p: string) => ctx.permissions.includes(p),
  RbacError: class extends Error { constructor(message: string, public code: string, public status: number) { super(message) } },
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/item/item-overview.service", () => ({ getItemOverview: jest.fn() }))
jest.mock("@/i18n/navigation", () => ({ Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))

beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-a", userId: "reader", permissions: ["inventory.items.read"] })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  ;(getItemOverview as jest.Mock).mockResolvedValue({ id: "item-a", nameEn: "Flour", nameFr: null, sku: "FLOUR", unit: null, status: "active", updatedAt: "2026-10-04T09:00:00Z", stock: { state: "restricted", locations: [], hasMore: false } })
})
const params = () => Promise.resolve({ id: "item-a", locale: "en" })

it("uses read authority and enforced inventory entitlement before querying", async () => {
  render(await Page({ params: params() }))
  expect(requirePermission).toHaveBeenCalledWith("inventory.items.read", expect.objectContaining({ resourceId: "item-a" }))
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "inventory", mode: "enforce", accessIntent: "read" }))
  expect(screen.getByRole("heading", { name: "Flour" })).toBeInTheDocument()
  expect(screen.queryByRole("link", { name: "Edit item" })).not.toBeInTheDocument()
})

it("does not query item data after permission denial", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new RbacError("Denied", "FORBIDDEN", 403))
  render(await Page({ params: params() }))
  expect(getItemOverview).not.toHaveBeenCalled()
  expect(observeModuleAccess).not.toHaveBeenCalled()
})

it("does not query item data when the inventory module denies reads", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  render(await Page({ params: params() }))
  expect(getItemOverview).not.toHaveBeenCalled()
})

it("renders a safe retry state without exposing database errors", async () => {
  ;(getItemOverview as jest.Mock).mockRejectedValue(new Error("secret connection string"))
  render(await Page({ params: Promise.resolve({ id: "item-a", locale: "fr" }) }))
  expect(screen.getByRole("heading", { name: "Article indisponible" })).toBeInTheDocument()
  expect(screen.queryByText(/secret connection/)).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Réessayer" })).toHaveAttribute("href", "/fr/dashboard/inventory/items/item-a")
})

it("renders the same not-found response for missing and inaccessible tenant records", async () => {
  ;(getItemOverview as jest.Mock).mockResolvedValue(null)
  render(await Page({ params: params() }))
  expect(screen.getByRole("heading", { name: "Item not found" })).toBeInTheDocument()
})
