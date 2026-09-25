import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PurchaseOrderLifecycleDialog, purchaseLifecycleStorageKey } from "../PurchaseOrderLifecycleDialog"
import { executePurchaseOrderLifecycle, previewPurchaseOrderLifecycle } from "@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import type { PurchaseLifecycleKind, PurchaseLifecycleRequest } from "@/services/purchase-order/purchase-order-lifecycle-contracts"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

let mockLocale: "en" | "fr" = "en"
const mockT = (key: string): string => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], (mockLocale === "fr" ? fr : en).purchaseOrderLifecycle) as string
jest.mock("next-intl", () => ({ useTranslations: () => mockT, useLocale: () => mockLocale }))
jest.mock("@/actions/purchaseOrderWorkflow/purchaseOrderSystemAction", () => ({ executePurchaseOrderLifecycle: jest.fn(), previewPurchaseOrderLifecycle: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => ({ X: () => null }))
const key = purchaseLifecycleStorageKey("org", "actor"), confirmed = jest.fn(), closed = jest.fn()
const preview = { organizationId: "org", actorId: "actor", orderId: "po", orderNumber: "PO-1", revision: "a".repeat(64), status: "DRAFT", supplier: "Supplier", location: "Warehouse", currency: "XAF", total: "25000", notes: "Original notes", linkedRecords: 0, heldReceipts: 0, requiresFreshAuth: false, lines: [] }
const receipt = (request: PurchaseLifecycleRequest) => ({ requestReference: request.idempotencyKey, orderId: "po", kind: request.kind, reviewedRevision: request.expectedRevision, actorId: "actor", recordedAt: "2026-09-07T15:00:00.000Z", fromStatus: "DRAFT", toStatus: request.kind === "submit" ? "SUBMITTED" : request.kind === "complete" ? "COMPLETED" : "CANCELLED", archived: request.kind === "archive", replayed: false })
const show = (kind: PurchaseLifecycleKind = "submit", orderId: string | null = "po", actorId = "actor") => render(<PurchaseOrderLifecycleDialog orderId={orderId} kind={kind} organizationId="org" actorId={actorId} onClose={closed} onConfirmed={confirmed} />)
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); mockLocale = "en"
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => "lifecycle-request-001" })
  ;(previewPurchaseOrderLifecycle as jest.Mock).mockImplementation(async (_id, _org, kind) => ({ success: true, data: { ...preview, kind } }))
  ;(executePurchaseOrderLifecycle as jest.Mock).mockImplementation(async (_id, _org, request) => ({ success: true, data: { id: "po", lifecycleReceipt: receipt(request) } }))
})
it.each(["en", "fr"] as const)("reviews all four decisions and confirms only matching receipts in %s", async locale => {
  mockLocale = locale
  for (const kind of ["submit", "cancel", "complete", "archive"] as const) {
    const view = show(kind), button = await screen.findByRole("button", { name: mockT("confirm." + kind) })
    if (kind === "cancel") { expect(button).toBeDisabled(); fireEvent.change(screen.getByLabelText(mockT("reason")), { target: { value: "Duplicate order" } }) }
    fireEvent.click(button); expect(await screen.findByText(mockT("recorded"))).toBeVisible(); expect(sessionStorage.getItem(key)).toBeNull()
    fireEvent.click(screen.getAllByRole("button", { name: mockT("close") })[0]); view.unmount()
  }
  expect(confirmed).toHaveBeenCalledTimes(4)
})
it("retains cancellation and its reason through an interrupted response and reload", async () => {
  ;(executePurchaseOrderLifecycle as jest.Mock).mockRejectedValueOnce(new Error("Dropped response"))
  const view = show("cancel"); await screen.findByRole("button", { name: mockT("confirm.cancel") }); fireEvent.change(screen.getByLabelText(mockT("reason")), { target: { value: "Duplicate order" } }); fireEvent.click(screen.getByRole("button", { name: mockT("confirm.cancel") }))
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown")); const request = JSON.parse(sessionStorage.getItem(key)!).request
  view.unmount(); show("submit", null); fireEvent.click(await screen.findByRole("button", { name: mockT("recover") })); expect(await screen.findByText(mockT("recorded"))).toBeVisible(); expect(executePurchaseOrderLifecycle).toHaveBeenLastCalledWith("po", "org", request); expect(request.reason).toBe("Duplicate order")
})
it("requires new review after stale evidence and preserves the cancellation reason", async () => {
  ;(executePurchaseOrderLifecycle as jest.Mock).mockResolvedValueOnce({ success: false, code: "CONFLICT" })
  show("cancel"); await screen.findByLabelText(mockT("reason")); fireEvent.change(screen.getByLabelText(mockT("reason")), { target: { value: "Duplicate order" } }); fireEvent.click(screen.getByRole("button", { name: mockT("confirm.cancel") }))
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("stale")); expect(sessionStorage.getItem(key)).toBeNull(); fireEvent.click(screen.getByRole("button", { name: mockT("reviewCurrent") })); expect(await screen.findByLabelText(mockT("reason"))).toHaveValue("Duplicate order")
})
it("requires current-password verification for a consequential decision and never stores the password", async () => {
  ;(previewPurchaseOrderLifecycle as jest.Mock).mockResolvedValue({ success: true, data: { ...preview, kind: "archive", requiresFreshAuth: true } })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  ;(executePurchaseOrderLifecycle as jest.Mock).mockRejectedValue(new Error("Dropped response"))
  show("archive"); fireEvent.change(await screen.findByLabelText(mockT("password")), { target: { value: "private-password" } }); fireEvent.click(screen.getByRole("button", { name: mockT("confirm.archive") })); await waitFor(() => expect(executePurchaseOrderLifecycle).toHaveBeenCalled()); expect(sessionStorage.getItem(key)).not.toContain("private-password"); expect(stepUpWithPasswordAction).toHaveBeenCalledWith({ password: "private-password" })
})
it("does not use another actor's pending decision or display a late previous-actor receipt", async () => {
  let resolve!: (value: unknown) => void
  ;(executePurchaseOrderLifecycle as jest.Mock).mockImplementation(() => new Promise(r => { resolve = r }))
  const view = show(); fireEvent.click(await screen.findByRole("button", { name: mockT("confirm.submit") })); await waitFor(() => expect(executePurchaseOrderLifecycle).toHaveBeenCalled())
  const request = JSON.parse(sessionStorage.getItem(key)!).request
  view.rerender(<PurchaseOrderLifecycleDialog orderId={null} kind="submit" organizationId="org" actorId="other" onClose={closed} onConfirmed={confirmed} />)
  await act(async () => resolve({ success: true, data: { id: "po", lifecycleReceipt: receipt(request) } })); expect(screen.queryByText(mockT("recorded"))).toBeNull(); expect(sessionStorage.getItem(key)).not.toBeNull(); expect(confirmed).not.toHaveBeenCalled()
})
it("does not claim success for the wrong decision receipt", async () => {
  ;(executePurchaseOrderLifecycle as jest.Mock).mockImplementation(async (_id, _org, request) => ({ success: true, data: { lifecycleReceipt: { ...receipt(request), kind: "archive" } } }))
  show(); fireEvent.click(await screen.findByRole("button", { name: mockT("confirm.submit") })); expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown")); expect(confirmed).not.toHaveBeenCalled()
})
it("explains a stopped new-work policy through the existing forbidden/reason contract", async () => {
  ;(executePurchaseOrderLifecycle as jest.Mock).mockResolvedValueOnce({ success: false, code: "FORBIDDEN", reason: "MODULE_NEW_WORK_STOPPED" })
  show(); fireEvent.click(await screen.findByRole("button", { name: mockT("confirm.submit") })); expect(await screen.findByRole("alert")).toHaveTextContent(mockT("MODULE_NEW_WORK_STOPPED")); expect(sessionStorage.getItem(key)).toBeNull(); expect(confirmed).not.toHaveBeenCalled()
})
