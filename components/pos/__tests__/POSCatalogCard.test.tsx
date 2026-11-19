import type { ComponentProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { POSCatalogCard, type POSCatalogCardItem } from "../POSCatalogCard"

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number }) => {
    const messages: Record<string, string> = {
      "catalog.add": "Add",
      "catalog.details": "Details",
      "catalog.addFavorite": "Add favorite",
      "catalog.removeFavorite": "Remove favorite",
      "catalog.noCategory": "Uncategorized",
      "catalog.sku": "SKU",
      "stock.out": "Out of stock",
      "stock.available": `${values?.count} available`,
      "stock.inCartCount": `${values?.count} in cart`,
    }
    return messages[key] ?? key
  },
}))

const item: POSCatalogCardItem = {
  id: "item-1", sku: "PAPER-001", barcode: "1234567890",
  nameEn: "Printer paper", nameFr: "Papier pour imprimante", thumbnail: null,
  sellingPrice: 4500, trackInventory: true,
  category: { id: "office", titleEn: "Office supplies", titleFr: "Fournitures de bureau" },
  stock: { quantityOnHand: 10, quantityAvailable: 9, reorderPoint: 2, status: "available" },
}

function cardProps(overrides: Partial<ComponentProps<typeof POSCatalogCard>> = {}): ComponentProps<typeof POSCatalogCard> {
  return {
    item, locale: "en", formattedPrice: "FCFA 4,500", inCartQuantity: 0,
    isFavorite: false, disabled: false, view: "grid", touchMode: false,
    onAdd: jest.fn(), onDetails: jest.fn(), onToggleFavorite: jest.fn(),
    ...overrides,
  }
}

it("adds once through the single add action while details and favorites remain independent", () => {
  const props = cardProps()
  render(<POSCatalogCard {...props} />)

  expect(screen.getAllByRole("button", { name: "Add Printer paper" })).toHaveLength(1)
  const details = screen.getByRole("button", { name: "Details — Printer paper" })
  fireEvent.click(details)
  fireEvent.click(screen.getByRole("button", { name: "Add favorite — Printer paper" }))
  expect(props.onDetails).toHaveBeenCalledTimes(1)
  expect(props.onDetails).toHaveBeenCalledWith(details)
  expect(props.onToggleFavorite).toHaveBeenCalledTimes(1)
  expect(props.onAdd).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole("button", { name: "Add Printer paper" }))
  expect(props.onAdd).toHaveBeenCalledTimes(1)
})

it("prevents adding unavailable stock without preventing stock inspection", () => {
  const props = cardProps({ item: { ...item, stock: { ...item.stock, status: "out", quantityAvailable: 0 } } })
  render(<POSCatalogCard {...props} />)

  const add = screen.getByRole("button", { name: "Add Printer paper" })
  expect(add).toBeDisabled()
  fireEvent.click(add)
  expect(props.onAdd).not.toHaveBeenCalled()
  expect(screen.getByRole("button", { name: "Details — Printer paper" })).toBeEnabled()
})

it("honors parent write eligibility and exposes current selection and favorite state", () => {
  render(<POSCatalogCard {...cardProps({ disabled: true, inCartQuantity: 3, isFavorite: true })} />)

  expect(screen.getByRole("button", { name: "Add Printer paper" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Remove favorite — Printer paper", pressed: true })).toBeEnabled()
  expect(screen.getByText("3 in cart")).toBeVisible()
  expect(screen.getByText("9 available")).toBeVisible()
})

it("updates and clears the visible cart quantity and its accessible description when the cart changes", () => {
  const props = cardProps({ inCartQuantity: 3 })
  const { rerender } = render(<POSCatalogCard {...props} />)
  const card = screen.getByRole("article", { name: "Printer paper" })

  expect(screen.getByText("3 in cart")).toBeVisible()
  expect(card).toHaveAccessibleDescription("3 in cart")

  rerender(<POSCatalogCard {...props} inCartQuantity={125} />)
  expect(screen.queryByText("3 in cart")).not.toBeInTheDocument()
  expect(screen.getByText("125 in cart")).toBeVisible()
  expect(card).toHaveAccessibleDescription("125 in cart")

  rerender(<POSCatalogCard {...props} inCartQuantity={0} />)
  expect(screen.queryByText(/in cart$/)).not.toBeInTheDocument()
  expect(card).not.toHaveAttribute("aria-describedby")
  expect(card).not.toHaveAccessibleDescription()
  expect(screen.getByText("9 available")).toBeVisible()
  expect(screen.getByRole("button", { name: "Add Printer paper" })).toBeEnabled()
  expect(props.onAdd).not.toHaveBeenCalled()
  expect(props.onDetails).not.toHaveBeenCalled()
  expect(props.onToggleFavorite).not.toHaveBeenCalled()
})

it("uses the localized item identity for visible text and accessible actions", () => {
  render(<POSCatalogCard {...cardProps({ locale: "fr", view: "list" })} />)

  expect(screen.getByText("Papier pour imprimante")).toBeVisible()
  expect(screen.getByText("Fournitures de bureau")).toBeVisible()
  expect(screen.getByRole("button", { name: "Add Papier pour imprimante" })).toBeVisible()
  expect(screen.getByText("PAPER-001")).toBeVisible()
})

it.each(["grid", "list"] as const)("retains long French product identity, distinguishing SKU and a large price in %s view", view => {
  const longName = "Cartouches d’encre professionnelles pour imprimantes multifonctions grand format"
  const longSku = "CARTOUCHE-IMPRIMANTE-PROFESSIONNELLE-XL-0000123456789"
  const price = "9 999 999 999,99 FCFA"
  const props = cardProps({
    item: { ...item, nameFr: longName, sku: longSku },
    locale: "fr", view, touchMode: true, formattedPrice: price, inCartQuantity: 125,
  })
  render(<POSCatalogCard {...props} />)

  expect(screen.getByRole("article", { name: longName })).toHaveAccessibleDescription("125 in cart")
  expect(screen.getByText(longName)).toHaveAttribute("title", longName)
  expect(screen.getByText(longSku)).toBeVisible()
  expect(screen.getByText(price)).toBeVisible()
  expect(screen.getByText("Fournitures de bureau")).toHaveAttribute("title", "Fournitures de bureau")
  expect(screen.getByTestId("pos-product-image-fallback")).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: `Add ${longName}` }))
  expect(props.onAdd).toHaveBeenCalledTimes(1)
})

it("keeps the identifying SKU available when a product thumbnail fails, and loads a replacement thumbnail", () => {
  const props = cardProps({ item: { ...item, thumbnail: "/paper.jpg" } })
  const { container, rerender } = render(<POSCatalogCard {...props} />)
  const image = container.querySelector("img")!
  expect(image).toHaveAttribute("src", "/paper.jpg")
  fireEvent.error(image)
  expect(screen.getByTestId("pos-product-image-fallback")).toBeVisible()
  expect(screen.getByText("PAPER-001")).toBeVisible()
  expect(screen.getByRole("button", { name: "Add Printer paper" })).toBeEnabled()

  rerender(<POSCatalogCard {...props} item={{ ...props.item, thumbnail: "/paper-replacement.jpg" }} />)
  expect(container.querySelector("img")).toHaveAttribute("src", "/paper-replacement.jpg")
  expect(screen.queryByTestId("pos-product-image-fallback")).not.toBeInTheDocument()
})
