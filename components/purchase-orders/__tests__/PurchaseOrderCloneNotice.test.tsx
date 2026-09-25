import { render, screen } from "@testing-library/react"
import { PurchaseOrderCloneNotice } from "../PurchaseOrderCloneNotice"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockLocale: "en" | "fr" = "en"
jest.mock("next-intl", () => ({ useTranslations: () => (key: keyof typeof en.purchaseOrderClone) => (mockLocale === "fr" ? fr : en).purchaseOrderClone[key] }))
describe("clone persistent feedback", () => {
  it.each(["en", "fr"] as const)("announces pending and focuses persistent unknown recovery in %s", locale => {
    mockLocale = locale
    const copy = (locale === "fr" ? fr : en).purchaseOrderClone
    const { rerender } = render(<PurchaseOrderCloneNotice pending failure={null} ordersHref={`/${locale}/dashboard/purchase-orders`} />)
    expect(screen.getByRole("status")).toHaveTextContent(copy.pending)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    rerender(<PurchaseOrderCloneNotice pending={false} failure="unknown" ordersHref={`/${locale}/dashboard/purchase-orders`} />)
    expect(screen.getByRole("alert")).toHaveFocus()
    expect(screen.getByRole("alert")).toHaveTextContent(copy.unknown)
    expect(screen.getByRole("link", { name: copy.openOrders })).toHaveAttribute("target", "_blank")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
  it.each(["denied", "unavailable", "stopped"] as const)("explains %s using localized text and no automatic retry", failure => {
    mockLocale = "fr"
    render(<PurchaseOrderCloneNotice pending={false} failure={failure} ordersHref="/fr/dashboard/purchase-orders" />)
    expect(screen.getByRole("alert")).toHaveTextContent(fr.purchaseOrderClone[failure])
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
