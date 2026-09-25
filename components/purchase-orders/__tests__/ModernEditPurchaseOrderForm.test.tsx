jest.mock("@/i18n/routing", () => ({ getLocaleFromPathname: () => mockLocale, localizePath: (path: string, locale: string) => `/${locale}${path}` }))
jest.mock("@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction", () => ({ getCurrentPurchaseOrderDraft: jest.fn() }))
jest.mock("lucide-react", () => ({ ArrowLeft: () => null, Plus: () => null, Save: () => null, Trash2: () => null, X: () => null, Check: () => null, ChevronDown: () => null, ChevronUp: () => null }))
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { ModernEditPurchaseOrderForm } from "../ModernEditPurchaseOrderForm"
import type { PurchaseOrderWithRelations } from "@/types/purchase-orders-system-types"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
import { getCurrentPurchaseOrderDraft } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { purchaseOrderDraftKey } from "../purchase-order-edit-draft"

const mockSave = jest.fn()
const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockNotify = jest.fn()
let mockLocale: "en" | "fr" = "en"
jest.mock("next/navigation", () => ({
  usePathname: () => `/${mockLocale}/dashboard/purchase-orders/po-1/edit`,
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    let value = (mockLocale === "fr" ? fr : en).purchaseOrderEdit[key as keyof typeof en.purchaseOrderEdit] as string
    for (const [name, item] of Object.entries(values ?? {})) value = value.replace(`{${name}}`, String(item))
    return value
  },
}))
jest.mock("@/hooks/useRecentPurchaseOrderQueries", () => ({ useUpdatePurchaseOrder: () => ({ mutateAsync: mockSave }) }))
jest.mock("@/lib/notifications/notify", () => ({ notify: { success: (...args: unknown[]) => mockNotify(...args) } }))

export const order: PurchaseOrderWithRelations = {
  editRevision: "a".repeat(64),
  id: "po-1", orderNumber: "PO-2026-001", status: "DRAFT", orderDate: "2026-09-01T00:00:00.000Z",
  expectedDeliveryDate: "2026-09-07T00:00:00.000Z", supplier: { id: "supplier-1", name: "Supplier One" },
  locationId: "location-1", location: { id: "location-1", name: "Store" },
  paymentTerms: "Net 30", notes: "Order note", shippingCost: 15, subtotal: 200, taxAmount: 38.5, discount: 10, total: 243.5,
  lines: [{ id: "line-1", itemId: "item-1", orderedQuantity: 2, receivedQuantity: 0, unitCost: 100, taxRate: 19.25, taxAmount: 38.5, discount: 10, lineTotal: 228.5, notes: "Fragile original note", item: { name: "Widget" } }],
}
function show(currency = "USD", value = order) {
  return render(<ModernEditPurchaseOrderForm purchaseOrder={value} suppliers={[{ id: "supplier-1", name: "Supplier One" }]}
    locations={[{ id: "location-1", name: "Store" }]} items={[{ id: "item-1", name: "Widget", sku: "W1", costPrice: 400 }]}
    organizationId="org-1" actorId="editor-1" currency={currency} />)
}

it.each(["en", "fr"] as const)("retains the %s unsaved draft across a same-order cancelled server replay without saving again", async (locale) => {
  mockLocale = locale
  const copy = (locale === "fr" ? fr : en).purchaseOrderEdit
  mockSave.mockResolvedValue({ success: false, data: null, code: "BUSINESS_RULE_VIOLATION", error: "Cannot edit status CANCELLED" })
  const mounted = show()
  await review()
  fireEvent.change(screen.getByLabelText(copy.notes), { target: { value: "Keep this unsaved correction" } })
  fireEvent.click(screen.getByRole("button", { name: copy.save }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.failedTitle)
  mounted.rerender(<ModernEditPurchaseOrderForm purchaseOrder={{ ...order, status: "CANCELLED", notes: "Server saved note" }}
    suppliers={[{ id: "supplier-1", name: "Supplier One" }]} locations={[{ id: "location-1", name: "Store" }]}
    items={[{ id: "item-1", name: "Widget", sku: "W1", costPrice: 400 }]} organizationId="org-1" actorId="editor-1" currency="USD" />)
  const note = screen.getByLabelText(copy.notes)
  expect(note).toHaveValue("Keep this unsaved correction")
  expect(note).toHaveAttribute("readonly")
  expect(note).not.toBeDisabled()
  expect(screen.getByRole("alert")).toHaveTextContent(copy.invalidOrder)
  expect(screen.getByRole("button", { name: copy.save })).toBeDisabled()
  await act(async () => { fireEvent.submit(screen.getByRole("form", { name: copy.title })) })
  expect(mockSave).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: copy.previous }))
  expect(screen.getByLabelText(copy.lineNotes)).toHaveAttribute("readonly")
  expect(screen.getByRole("button", { name: copy.addLine })).toBeDisabled()
  await next()
  expect(screen.getByLabelText(copy.notes)).toHaveValue("Keep this unsaved correction")
  expect(mockPush).not.toHaveBeenCalled()
  expect(mockRefresh).not.toHaveBeenCalled()
  expect(mockNotify).not.toHaveBeenCalled()
})
async function next() {
  const label = (mockLocale === "fr" ? fr : en).purchaseOrderEdit.next
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: label })) })
}
async function review() { await next(); await next(); await next() }

beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "00000000-0000-4000-a000-000000000001" })
  mockLocale = "en"
  mockSave.mockImplementation(async request => ({ success: true, data: { ...order, editReceipt: { orderId: order.id, requestReference: request.idempotencyKey, revision: "b".repeat(64), savedAt: "2026-09-07T10:00:00.000Z", replayed: false } } }))
})

describe("purchase order draft editing", () => {
  it.each(["en", "fr"] as const)("compares the %s stale draft and preserves an independent saved change", async locale => {
    mockLocale = locale
    const copy = (locale === "fr" ? fr : en).purchaseOrderEdit
    mockSave.mockResolvedValueOnce({ success: false, code: "CONFLICT", data: null })
    ;(getCurrentPurchaseOrderDraft as jest.Mock).mockResolvedValueOnce({ success: true, data: { ...order, editRevision: "c".repeat(64), shippingCost: 40 } })
    show(); await review()
    fireEvent.change(screen.getByLabelText(copy.notes), { target: { value: "My unsaved note" } })
    fireEvent.click(screen.getByRole("button", { name: copy.save }))
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.staleTitle)
    fireEvent.click(screen.getByRole("button", { name: copy.compareCurrent }))
    const comparison = await screen.findByRole("region", { name: copy.compareTitle })
    expect(within(comparison).getByRole("heading")).toHaveFocus()
    fireEvent.click(within(comparison).getByRole("button", { name: copy.applyComparison }))
    expect(screen.getByLabelText(copy.notes)).toHaveValue("My unsaved note")
    expect(screen.getByLabelText(copy.shipping)).toHaveValue(40)
    fireEvent.click(screen.getByRole("button", { name: copy.save }))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2))
    expect(mockSave.mock.calls[1][0]).toMatchObject({ expectedRevision: "c".repeat(64), shippingCost: 40, notes: "My unsaved note" })
  })

  it("requires an explicit choice when the saved record and draft changed the same field", async () => {
    mockSave.mockResolvedValueOnce({ success: false, code: "CONFLICT", data: null })
    ;(getCurrentPurchaseOrderDraft as jest.Mock).mockResolvedValueOnce({ success: true, data: { ...order, editRevision: "c".repeat(64), notes: "Colleague’s note" } })
    show(); await review()
    fireEvent.change(screen.getByLabelText(en.purchaseOrderEdit.notes), { target: { value: "My note" } })
    fireEvent.click(screen.getByRole("button", { name: en.purchaseOrderEdit.save }))
    await screen.findByRole("alert")
    fireEvent.click(screen.getByRole("button", { name: en.purchaseOrderEdit.compareCurrent }))
    const comparison = await screen.findByRole("region", { name: en.purchaseOrderEdit.compareTitle })
    expect(within(comparison).getByRole("button", { name: en.purchaseOrderEdit.applyComparison })).toBeDisabled()
    expect(within(comparison).getByRole("combobox")).toHaveAccessibleName(`${en.purchaseOrderEdit.notes}: ${en.purchaseOrderEdit.chooseResolution}`)
    fireEvent.click(within(comparison).getByRole("button", { name: en.purchaseOrderEdit.useCurrent }))
    expect(screen.getByLabelText(en.purchaseOrderEdit.notes)).toHaveValue("Colleague’s note")
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it("recovers the exact unknown request across remount without taking its authority from storage", async () => {
    mockSave.mockRejectedValueOnce(new Error("Response lost after commit"))
    const mounted = show(); await review()
    fireEvent.change(screen.getByLabelText(en.purchaseOrderEdit.notes), { target: { value: "Keep exact command" } })
    fireEvent.click(screen.getByRole("button", { name: en.purchaseOrderEdit.save }))
    expect(await screen.findByRole("alert")).toHaveTextContent(en.purchaseOrderEdit.retryHelp)
    const original = mockSave.mock.calls[0][0]
    const stored = JSON.parse(sessionStorage.getItem(purchaseOrderDraftKey("org-1", "editor-1", "po-1"))!)
    expect(stored.pending).toEqual(original)
    expect(stored.pending).not.toHaveProperty("sessionToken")
    mounted.unmount()
    show("USD", { ...order, editRevision: "b".repeat(64), notes: "Current record after commit" })
    expect(await screen.findByRole("button", { name: en.purchaseOrderEdit.retrySave })).toBeEnabled()
    expect(screen.getByLabelText(en.purchaseOrderEdit.notes)).toHaveValue("Keep exact command")
    fireEvent.click(screen.getByRole("button", { name: en.purchaseOrderEdit.retrySave }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1))
    expect(mockSave.mock.calls[1][0]).toEqual(original)
    expect(sessionStorage.getItem(purchaseOrderDraftKey("org-1", "editor-1", "po-1"))).toBeNull()
  })

  it("does not navigate when a reported success has a mismatched request receipt", async () => {
    mockSave.mockResolvedValueOnce({ success: true, data: { ...order, editReceipt: { orderId: "other-order", requestReference: "other-request" } } })
    show(); await review(); fireEvent.click(screen.getByRole("button", { name: en.purchaseOrderEdit.save }))
    expect(await screen.findByRole("alert")).toHaveTextContent(en.purchaseOrderEdit.retryHelp)
    expect(mockPush).not.toHaveBeenCalled(); expect(mockNotify).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: en.purchaseOrderEdit.retrySave })).toBeEnabled()
  })

  it("retains draft input when current authority denies comparison", async () => {
    mockSave.mockResolvedValueOnce({ success: false, code: "CONFLICT", data: null })
    ;(getCurrentPurchaseOrderDraft as jest.Mock).mockResolvedValueOnce({ success: false, code: "FORBIDDEN", data: null })
    show(); await review(); fireEvent.change(screen.getByLabelText(en.purchaseOrderEdit.notes), { target: { value: "Still available to copy" } })
    fireEvent.click(screen.getByRole("button", { name: en.purchaseOrderEdit.save })); await screen.findByRole("alert")
    fireEvent.click(screen.getByRole("button", { name: en.purchaseOrderEdit.compareCurrent }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(en.purchaseOrderEdit.deniedTitle))
    expect(screen.getByLabelText(en.purchaseOrderEdit.notes)).toHaveValue("Still available to copy")
    expect(screen.queryByRole("region", { name: en.purchaseOrderEdit.compareTitle })).not.toBeInTheDocument()
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it("round-trips percentage tax, single discounts, quote cost and line notes on a no-op save", async () => {
    show()
    expect(screen.queryByRole("textbox", { name: /Order number/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Reference")).not.toBeInTheDocument()
    await next(); await next()
    expect(screen.getByRole("spinbutton", { name: "Tax rate (%)" })).toHaveValue(19.25)
    expect(screen.getByRole("spinbutton", { name: "Unit cost" })).toHaveValue(100)
    expect(screen.getByLabelText("Line notes")).toHaveValue("Fragile original note")
    expect(screen.getByText("$243.50")).toBeInTheDocument()
    expect(screen.queryByText("$233.50")).not.toBeInTheDocument()
    await next()
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/en/dashboard/purchase-orders/po-1"))
    expect(mockSave).toHaveBeenCalledWith({
      expectedRevision: order.editRevision, idempotencyKey: "00000000-0000-4000-a000-000000000001",
      id: "po-1", organizationId: "org-1", supplierId: "supplier-1", locationId: "location-1",
      expectedDeliveryDate: "2026-09-07", paymentTerms: "Net 30", notes: "Order note", shippingCost: 15,
      orderLines: [{ itemId: "item-1", quantity: 2, unitPrice: 100, taxRate: 19.25, discount: 10, notes: "Fragile original note" }],
    })
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(mockNotify).toHaveBeenCalledWith(en.purchaseOrderEdit.saved)
  })

  it.each(["en", "fr"] as const)("keeps the %s draft and focuses a persistent alert when the server refuses the update", async (locale) => {
    mockLocale = locale
    mockSave.mockResolvedValue({ success: false, data: null, code: "BUSINESS_RULE_VIOLATION", error: "Business rule denied in raw server text" })
    const copy = (locale === "fr" ? fr : en).purchaseOrderEdit
    show()
    await review()
    fireEvent.change(screen.getByLabelText(copy.notes), { target: { value: "Keep my corrected note" } })
    fireEvent.click(screen.getByRole("button", { name: copy.save }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(copy.failed)
    expect(alert).toHaveFocus()
    expect(screen.getByLabelText(copy.notes)).toHaveValue("Keep my corrected note")
    expect(screen.getByRole("spinbutton", { name: copy.shipping })).toHaveValue(15)
    expect(screen.getByRole("link", { name: copy.openSaved })).toHaveAttribute("target", "_blank")
    expect(screen.queryByText("Permission denied in raw server text")).not.toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it("does not treat redirect-like or network exceptions as success or automatically retry", async () => {
    mockSave.mockRejectedValue(new Error("NEXT_REDIRECT: ambiguous transport"))
    show()
    await review()
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(en.purchaseOrderEdit.retryHelp)
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it("blocks duplicate submissions and field edits while a save is pending", async () => {
    let resolve: (value: unknown) => void = () => {}
    mockSave.mockImplementation(() => new Promise((done) => { resolve = done }))
    show()
    await review()
    const form = screen.getByRole("form", { name: "Edit purchase order" })
    await act(async () => { fireEvent.submit(form); fireEvent.submit(form) })
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Saving changes…" })).toBeDisabled()
    expect(screen.getByLabelText("Order notes")).toBeDisabled()
    await act(async () => { resolve({ success: false, data: null, code: "BUSINESS_RULE_VIOLATION" }) })
    expect(await screen.findByRole("alert")).toHaveTextContent(en.purchaseOrderEdit.failedTitle)
    expect(screen.getByLabelText("Order notes")).not.toBeDisabled()
  })

  it("retains zero prices and zero taxes and uses the actual currency fraction precision", async () => {
    const zeroOrder = { ...order, shippingCost: 0, lines: [{ ...order.lines[0], unitCost: 0, taxRate: 0, taxAmount: 0, discount: 0, lineTotal: 0 }] }
    show("KWD", zeroOrder)
    await next(); await next()
    expect(screen.getByRole("spinbutton", { name: "Unit cost" })).toHaveValue(0)
    const preview = screen.getByRole("region", { name: en.purchaseOrderEdit.preview })
    expect(preview).toHaveTextContent(new Intl.NumberFormat("en", { style: "currency", currency: "KWD" }).format(0).replace(/\s/g, " "))
    await next()
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(mockSave.mock.calls[0][0].orderLines[0]).toMatchObject({ unitPrice: 0, taxRate: 0, discount: 0 })
  })

  it("rejects excess quantity precision and rate limits on the visible item step", async () => {
    show()
    await next(); await next()
    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity" }), { target: { value: "0.5125" } })
    fireEvent.change(screen.getByRole("spinbutton", { name: "Tax rate (%)" }), { target: { value: "101" } })
    await next()
    expect(screen.getByText(en.purchaseOrderEdit.positiveQuantity)).toBeInTheDocument()
    expect(screen.getByText(en.purchaseOrderEdit.taxRange)).toBeInTheDocument()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("offers a keyboard-accessible discard dialog that retains the draft when dismissed", async () => {
    show()
    await review()
    fireEvent.change(screen.getByLabelText("Order notes"), { target: { value: "Unsaved" } })
    fireEvent.click(screen.getByRole("button", { name: "Back to purchase order" }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAccessibleName(en.purchaseOrderEdit.leaveTitle)
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue editing" }))
    expect(screen.getByLabelText("Order notes")).toHaveValue("Unsaved")
    expect(mockPush).not.toHaveBeenCalled()
  })
})

it("does not save on implicit Enter submission before the review step", async () => {
  show()
  await act(async () => { fireEvent.submit(screen.getByRole("form", { name: "Edit purchase order" })) })
  expect(mockSave).not.toHaveBeenCalled()
  expect(screen.getByRole("heading", { name: "Supplier and delivery" })).toBeInTheDocument()
})
it.each(["en", "fr"] as const)("keeps native Continue activation separate from Save in %s", async locale => {
  mockLocale = locale
  const copy = (locale === "fr" ? fr : en).purchaseOrderEdit
  show()
  await next(); await next()
  const continuation = screen.getByRole("button", { name: copy.next })
  const nativeClick = new MouseEvent("click", { bubbles: true, cancelable: true })
  await act(async () => { continuation.dispatchEvent(nativeClick) })
  const saveButton = screen.getByRole("button", { name: copy.save })
  expect(nativeClick.defaultPrevented).toBe(true)
  expect(continuation.isConnected).toBe(false)
  expect(saveButton).not.toBe(continuation)
  expect(mockSave).not.toHaveBeenCalled()
  await act(async () => { saveButton.click() })
  expect(mockSave).toHaveBeenCalledTimes(1)
})

it("provides the established local dashboard token scope without another application shell", () => {
  show()
  expect(screen.getByRole("heading", { name: en.purchaseOrderEdit.title }).closest(".dashboard-landing-theme")).not.toBeNull()
  expect(screen.queryByRole("main")).not.toBeInTheDocument()
})

it.each(["en", "fr"] as const)("reveals fractional XAF quote amounts in %s without changing the values", async locale => {
  mockLocale = locale
  const copy = (locale === "fr" ? fr : en).purchaseOrderEdit
  show("XAF")
  await next(); await next()
  const preview = screen.getByRole("region", { name: copy.preview })
  const format = new Intl.NumberFormat(locale, { style: "currency", currency: "XAF", minimumFractionDigits: 2, maximumFractionDigits: 2 })
  expect(preview).toHaveTextContent(format.format(38.5).replace(/\s/g, " "))
  expect(preview).toHaveTextContent(format.format(243.5).replace(/\s/g, " "))
  expect(screen.getByRole("spinbutton", { name: copy.taxRate })).toHaveValue(19.25)
  expect(mockSave).not.toHaveBeenCalled()
})
