import { render, screen } from "@testing-library/react"

import type { ItemSupplierDTO } from "@/types/itemSuppliers"
import SuppliersList from "../SuppliersList"

jest.mock("lucide-react", () => {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />
  return {
    Clock: Icon,
    Coins: Icon,
    Package: Icon,
    Search: Icon,
    Star: Icon,
    X: Icon,
  }
})


const itemSupplier: ItemSupplierDTO = {
  id: "item-supplier-1",
  itemId: "item-1",
  supplierId: "supplier-1",
  isPreferred: true,
  supplierSku: "RICE-SUP-1",
  unitCost: 1234567,
  notes: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  supplier: {
    id: "supplier-1",
    name: "Regional Foods",
  },
}

describe("SuppliersList unit-cost display", () => {
  it.each([
    { currency: "XAF", locale: "en" },
    { currency: "XOF", locale: "fr" },
  ])("formats $currency unit cost in $locale", ({ currency, locale }) => {
    render(
      <SuppliersList
        itemSuppliers={[itemSupplier]}
        selectedSupplier={null}
        onSelectSupplier={jest.fn()}
        organizationId={"org-" + currency}
        currency={currency}
        locale={locale}
      />,
    )

    const formattedUnitCost = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(itemSupplier.unitCost as number)

    expect(
      screen.getAllByText((_, element) => element?.textContent === formattedUnitCost),
    ).not.toHaveLength(0)
    expect(screen.queryByText("$1234567")).not.toBeInTheDocument()
  })
})
