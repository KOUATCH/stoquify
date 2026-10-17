import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { PurchaseAuthoringContent } from "@/services/purchase-order/purchase-order-authoring-contracts"

const mockWarning = jest.fn(), mockSuccess = jest.fn(), mockError = jest.fn(), mockCreate = jest.fn()
let mockRead: () => PurchaseAuthoringContent
let mockRestore: (content: PurchaseAuthoringContent) => void
jest.mock("next/navigation", () => ({ useRouter: () => ({ back: jest.fn() }) }))
jest.mock("lucide-react", () => new Proxy({}, { get: () => () => null }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ warning: mockWarning, success: mockSuccess, error: mockError }) }))
jest.mock("../use-purchase-authoring", () => ({ usePurchaseAuthoring: (read: () => PurchaseAuthoringContent, restore: (content: PurchaseAuthoringContent) => void) => {
  mockRead = read; mockRestore = restore
  return { busy: false, locked: false, canSave: true, uncertain: false, current: null, create: mockCreate }
} }))
jest.mock("../PurchaseAuthoringPanel", () => ({ PurchaseAuthoringPanel: () => null, purchaseAuthoringCopy: {
  en: { order: "Order number", pending: "Assigned after creation" }, fr: { order: "Numéro de commande", pending: "Attribué après la création" },
} }))
import { DurableCreatePurchaseOrderForm } from "../DurableCreatePurchaseOrderForm"

const props = { organizationId: "org", actorId: "actor", canReadOrders: true,
  suppliers: [{ id: "supplier", name: "Supplier fixture" }], locations: [{ id: "location", name: "Location fixture" }],
  items: [{ id: "item", name: "Test article", sku: "SKU-1", costPrice: 2500 }] }
const content: PurchaseAuthoringContent = { supplierId: "supplier", locationId: "location", date: "2026-10-04", expectedDeliveryDate: "2026-10-05", paymentTerms: "Existing negotiated terms", notes: "Saved note", shippingCost: "50.25",
  orderLines: [{ itemId: "item", quantity: "2.5", unitPrice: "2500", taxRate: "0", discount: "0", notes: "" }] }

beforeEach(() => jest.clearAllMocks())
async function next(label = "Suivant") {
  fireEvent.click(screen.getByRole("button", { name: label, exact: true }))
  await waitFor(() => expect(mockSuccess).toHaveBeenCalled())
}
it("localizes the French entry, step state and missing-date guidance", async () => {
  render(<DurableCreatePurchaseOrderForm {...props} locale="fr" />)
  expect(screen.getByRole("heading", { name: "Créer une commande fournisseur" })).toBeInTheDocument()
  expect(screen.getByRole("progressbar", { name: "Progression globale" })).toBeInTheDocument()
  expect(screen.getByRole("progressbar", { name: "Progression globale" })).toHaveAttribute("aria-valuenow", "0")
  expect(screen.getByRole("button", { name: "Commande Numéro et dates" })).toHaveAttribute("aria-current", "step")
  fireEvent.click(screen.getByRole("button", { name: "Suivant", exact: true }))
  await waitFor(() => expect(mockWarning).toHaveBeenCalledWith("Date de livraison manquante", "Sélectionnez une date de livraison prévue"))
  expect(screen.getByText("Informations de commande")).toBeInTheDocument()
  expect(mockCreate).not.toHaveBeenCalled()
})
it("restores unchanged business text and preserves numeric text through the French wizard", async () => {
  render(<DurableCreatePurchaseOrderForm {...props} locale="fr" />)
  act(() => mockRestore(content))
  expect(screen.getByRole("button", { name: "Date de commande" })).toHaveTextContent("4 octobre 2026")
  await next()
  expect(await screen.findByText("Sélectionnez le fournisseur et le lieu de livraison")).toBeInTheDocument()
  expect(screen.getByRole("region", { name: "Intervenants" })).toHaveFocus()
  expect(screen.getByRole("progressbar", { name: "Progression globale" })).toHaveAttribute("aria-valuenow", "25")
  await next()
  const quantity = await screen.findByRole("textbox", { name: "Quantité — Test article" })
  fireEvent.change(quantity, { target: { value: "12." } })
  expect(mockRead().orderLines[0].quantity).toBe("12.")
  expect(screen.getByRole("textbox", { name: "Prix unitaire — Test article" })).toHaveValue("2500")
  expect(screen.getByRole("button", { name: "Retirer l’article — Test article" })).toBeInTheDocument()
  await next()
  expect(await screen.findByRole("textbox", { name: "Conditions de paiement" })).toHaveValue("Existing negotiated terms")
  expect(screen.getByRole("textbox", { name: "Notes complémentaires" })).toHaveValue("Saved note")
  fireEvent.click(screen.getByRole("button", { name: "Créer la commande", exact: true }))
  const dialog = await screen.findByRole("dialog", { name: "Créer une commande fournisseur" })
  expect(within(dialog).getByText("5 octobre 2026")).toBeInTheDocument()
  expect(within(dialog).getByRole("button", { name: "Fermer" })).toBeInTheDocument()
  expect(mockCreate).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmer et créer" }))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
})
it("names the item search and removal controls and localizes search results", async () => {
  render(<DurableCreatePurchaseOrderForm {...props} locale="fr" />)
  act(() => mockRestore(content))
  await next(); await next()
  fireEvent.click(await screen.findByRole("button", { name: "Retirer l’article — Test article" }))
  fireEvent.click(screen.getByRole("button", { name: "Ajouter le premier article" }))
  const dialog = await screen.findByRole("dialog", { name: "Ajouter des articles" })
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Rechercher des articles" }), { target: { value: "missing" } })
  expect(within(dialog).getByText("Aucun article ne correspond à la recherche")).toBeInTheDocument()
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Rechercher des articles" }), { target: { value: "SKU-1" } })
  fireEvent.click(within(dialog).getByRole("button", { name: "Ajouter — Test article" }))
  expect(await screen.findByRole("textbox", { name: "Quantité — Test article" })).toHaveValue("1")
  expect(mockSuccess).toHaveBeenCalledWith("Article ajouté", "Test article")
})
it("preserves English copy and formats the restored date in English", () => {
  render(<DurableCreatePurchaseOrderForm {...props} locale="en" />)
  act(() => mockRestore(content))
  expect(screen.getByRole("heading", { name: "Create Purchase Order" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Order Date" })).toHaveTextContent("October 4th, 2026")
  expect(mockRead().paymentTerms).toBe(content.paymentTerms)
})
it("localizes the actual calendar navigation and accessible day labels", async () => {
  render(<DurableCreatePurchaseOrderForm {...props} locale="fr" />)
  act(() => mockRestore(content))
  fireEvent.click(screen.getByRole("button", { name: "Date de commande" }))
  expect(await screen.findByRole("button", { name: "Mois précédent" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Mois suivant" })).toBeInTheDocument()
  expect(screen.getAllByRole("gridcell", { name: /^dimanche / }).length).toBeGreaterThan(0)
})
