import { render, screen } from "@testing-library/react"
import { ItemOverview } from "../ItemOverview"
import type { ItemOverview as ItemOverviewData } from "@/services/item/item-overview.service"

jest.mock("lucide-react", () => ({
  ArrowLeft: () => null, ArrowLeftRight: () => null, ArrowRight: () => null,
  Clock3: () => null, Info: () => null, LockKeyhole: () => null,
  MapPin: () => null, Package: () => null, Pencil: () => null, Truck: () => null,
}))
jest.mock("@/i18n/navigation", () => ({ Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))

const item: ItemOverviewData = {
  id: "item-a", nameEn: "Flour", nameFr: "Farine", sku: "FLOUR", unit: "kg", status: "active", updatedAt: "2026-10-04T09:00:00Z",
  stock: { state: "available", hasMore: false, locations: [{ id: "loc-a", name: "Store", onHand: "0", available: "0", reserved: null, updatedAt: null }] },
}
const props = { item, locale: "en" as const, canEdit: false, canViewSuppliers: false, canViewMovements: false }

it("shows a reader identity and distinguishes unknown quantities from zero", () => {
  render(<ItemOverview {...props} />)
  expect(screen.getByRole("heading", { name: "Flour" })).toBeInTheDocument()
  expect(screen.getAllByText("0")).toHaveLength(2)
  expect(screen.getByText("Unknown")).toBeInTheDocument()
  expect(screen.queryByRole("link", { name: "Edit item" })).not.toBeInTheDocument()
  expect(screen.queryByRole("link", { name: "Suppliers" })).not.toBeInTheDocument()
})

it("localizes status, quantities and actions in French", () => {
  render(<ItemOverview {...props} locale="fr" canViewMovements />)
  expect(screen.getByRole("heading", { name: "Farine" })).toBeInTheDocument()
  expect(screen.getByText("Actif")).toBeInTheDocument()
  expect(screen.getByText("Inconnu")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Mouvements de stock" })).toHaveAttribute("href", "/dashboard/inventory/movements?itemId=item-a")
})

it("explains restricted stock without presenting a false zero", () => {
  render(<ItemOverview {...props} item={{ ...item, stock: { state: "restricted", hasMore: false, locations: [] } }} />)
  expect(screen.getByText(/do not have access to its stock/)).toBeInTheDocument()
  expect(screen.queryByText("0")).not.toBeInTheDocument()
})

it("offers location pagination and suppresses editing archived records", () => {
  render(<ItemOverview {...props} canEdit canViewSuppliers item={{ ...item, status: "archived", stock: { ...item.stock, hasMore: true, after: "loc-prev", nextCursor: "loc-next" } }} />)
  expect(screen.getByRole("status")).toHaveTextContent("More locations are available")
  expect(screen.getByRole("link", { name: "Next locations" })).toHaveAttribute("href", "/dashboard/inventory/items/item-a?after=loc-next")
  expect(screen.getByRole("link", { name: "First locations" })).toHaveAttribute("href", "/dashboard/inventory/items/item-a")
  expect(screen.queryByRole("link", { name: "Edit item" })).not.toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Suppliers" })).toHaveAttribute("href", "/dashboard/inventory/items/item-a/suppliers")
})
