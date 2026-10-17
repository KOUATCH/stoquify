"use client"
// Synthetic, in-browser adapters only. Never import application actions or a database.
import { useState } from "react"

export const scope = { organizationId: "org", actorId: "actor" }
export const draft = { paymentRequestId: "p", executionReference: "BANK/TXN-1", executedAt: "2026-09-08T12:01:00Z", evidenceUri: "https://example.invalid/executed", evidenceSha256: "a".repeat(64) }
const revision = "b".repeat(64)
const ok = (data: unknown) => ({ success: true, data, error: null, status: 200 })
const scenario = () => typeof window === "undefined" ? "success" : new URLSearchParams(window.location.search).get("scenario") || "success"
const delay = () => new Promise(resolve => setTimeout(resolve, 150))
function record(kind: string, input: unknown) {
  const key = "fixture:calls", calls = JSON.parse(sessionStorage.getItem(key) || "[]")
  calls.push({ kind, input }); sessionStorage.setItem(key, JSON.stringify(calls))
}
const row = { id: "p", number: "PAY-1", paymentDate: "2026-09-08", supplierName: "Fixture supplier", status: "APPROVED", amount: "100.25", currency: "XAF", independentRecorderRequired: false }
export async function loadSupplierPaymentExecutions() {
  await delay()
  if (scenario() === "queue-failed") throw new Error("Synthetic read failure")
  return ok({ ...scope, checkedAt: "2026-09-08T12:00:00Z", rows: [row], next: null })
}
export async function reviewSupplierPaymentExecution(input: unknown) {
  await delay()
  if (scenario() === "denied") return { success: false, code: "FORBIDDEN" }
  return ok({ ...scope, draft: input, paymentRequestId: "p", paymentNumber: "PAY-1", approvedAt: "2026-09-08T12:00:00Z", approvedDate: "2026-09-08", approvedMethod: "BANK_TRANSFER", periodName: "September", warnings: ["POSTING_RULE_UNAVAILABLE"], revision, total: "100.25", currency: "XAF", supplierName: "Fixture supplier", bankLabel: "Bank ****0000", fresh: false, invoices: [{ id: "i", number: "INV-1", amount: "100.25", available: "200.00" }] })
}
export async function stepUpWithPasswordAction() { await delay(); return ok(null) }
export async function recordSupplierPaymentExecution(input: { idempotencyKey: string; expectedRevision: string }) {
  record("ap-confirm", input); await delay()
  if (scenario() === "stale") return { success: false, code: "CONFLICT" }
  if (scenario() === "lost" && !sessionStorage.getItem("fixture:lost")) {
    sessionStorage.setItem("fixture:lost", "yes"); throw new Error("Synthetic lost reply")
  }
  return ok({ ...scope, paymentRequestId: "p", paymentNumber: "PAY-1", status: "RELEASED", total: "100.25", currency: "XAF", recordedAt: "2026-09-08T12:02:00Z", executedAt: draft.executedAt, executionReference: draft.executionReference, requestReference: input.idempotencyKey, reviewedRevision: input.expectedRevision, executionEventId: "e", releaseEventId: "r", postingBatchId: "b", ledgerStatus: "FAILED", paymentTransactionId: "t", reconciliationState: "SUSPENSE", observedAt: "2026-09-08T12:03:00Z" })
}
export async function loadSupplierPaymentExecutionOutcome() { throw new Error("Outside fixture cohort") }

const query = (data: unknown) => ({ data: ok(data), isLoading: false, isFetching: false, isError: false, refetch: async () => ({ data: ok(data) }) })
const locations = [{ id: "location", name: "Fixture store", organization: { currency: "XAF" } }]
const terminals = [{ id: "terminal", name: "Fixture till", terminalNumber: "T1", currentSessionId: "shift" }]
const shift = { id: "shift", locationId: "location", terminalId: "terminal", sessionNumber: "SHIFT-1", openingBalance: 100, expectedBalance: 100, totalSales: 0, transactionCount: 0, cashDrawer: { isOpen: true, currentBalance: 100 } }
const cart = { id: "cart", revision, orderNumber: "CART-1", subtotal: 10, taxAmount: 0, discountAmount: 0, total: 10, lines: [{ id: "line", itemId: "item", quantity: 1, unitPrice: 10, lineTotal: 10, discount: 0, taxRate: 0, item: { id: "item", nameEn: "Fixture item", nameFr: "Article fictif", sku: "TEST-1" }, stock: { quantityOnHand: 5 } }] }
export const usePermissions = () => ({ user: { id: "actor" }, organizationId: "org", hasPermission: () => true })
export const usePOSLocations = () => query(locations)
export const usePOSTerminals = () => query(terminals)
export const useCurrentUserPOSShift = () => query(shift)
export const useActivePOSShift = () => query(shift)
export const usePOSCustomers = () => query({ customers: [], total: 0 })
export const usePOSCatalog = () => query({ items: [], categories: [] })
export const useActivePOSCart = () => query(cart)
export const usePublicReceiptTokenManagementCapability = () => query({ canManageReceiptTokens: false })
export const usePublicReceiptAccessTokens = () => query([])
export const usePublicReceiptSalesSearch = () => query([])
export const usePOSCheckoutLifecycle = () => ({ ready: true, busy: false, error: null, leaseId: "00000000-0000-4000-8000-000000000001", acceptedCartId: "cart", snapshot: null, acceptCart() {}, refresh: async () => {}, command: async () => true })
export const retainLegacyPOSCheckoutAction = async () => ok(null)
function useMutation(run: (input: any) => Promise<any>) {
  const [isPending, setPending] = useState(false)
  return { isPending, variables: undefined, mutateAsync: async (input: unknown) => { setPending(true); try { return await run(input) } finally { setPending(false) } } }
}
const unsupported = async () => { throw new Error("Outside fixture cohort") }
export const useOpenPOSShift = () => useMutation(unsupported)
export const useClosePOSShift = () => useMutation(unsupported)
export const useAddPOSCartLine = () => useMutation(unsupported)
export const useRemovePOSCartLine = () => useMutation(unsupported)
export const useUpdatePOSCartLine = () => useMutation(unsupported)
export const useRevokePublicReceiptAccessToken = () => useMutation(unsupported)
export const useCommitPOSSale = () => useMutation(async input => {
  record("pos-commit", input); await delay()
  if (scenario() === "pos-denied") return { success: false, code: "FORBIDDEN", error: "Denied by fixture authority" }
  sessionStorage.setItem("fixture:pos-recorded", "yes")
  throw new Error("Synthetic lost commit reply")
})
export const usePOSSaleCommitStatus = () => useMutation(async input => {
  record("pos-status", input); await delay()
  return ok(sessionStorage.getItem("fixture:pos-recorded")
    ? { kind: "RECORDED", orderNumber: "SALE-1", total: 10, currentStatus: "COMPLETED", receiptStatus: "RETRY_REQUIRED" }
    : { kind: scenario() === "pos-stale" ? "CART_CHANGED" : "NOT_FOUND" })
})
const notify = (kind: string) => (title: string, message: string) => { record("notification", { kind, title, message }); return "notice" }
const notifications = { info: notify("info"), warning: notify("warning"), error: notify("error"), success: notify("success"), removeNotification() {} }
export const useNotifications = () => notifications
// These separately governed surfaces are outside checkout/recovery verification.
export const OfflineSyncStatusStrip = () => null
export const ReceiptTokenHistoryPanel = () => null
export const ReceiptTokenControlStrip = () => null
