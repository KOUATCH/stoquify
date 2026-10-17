import { render, screen } from "@testing-library/react"
import { PurchaseReceivingWorkbench } from "../PurchaseReceivingWorkbench"
import { loadPurchaseReceiving } from "@/actions/purchaseOrderWorkflow/purchase-receiving.actions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

let mockLocale: "en" | "fr" = "en"
const mockT = (key: string) => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], (mockLocale === "fr" ? fr : en).purchaseReceiving) as string
jest.mock("next-intl", () => ({ useTranslations: () => mockT, useLocale: () => mockLocale }))
jest.mock("@/actions/purchaseOrderWorkflow/purchase-receiving.actions", () => ({ loadPurchaseReceiving: jest.fn(), reviewPurchaseReceiving: jest.fn(), submitPurchaseReceiving: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("../ReceiptLedgerRecoveryDialog", () => ({ ReceiptLedgerRecoveryDialog: () => null }))
jest.mock("lucide-react", () => ({ X: () => null, AlertTriangle: () => null, CheckCircle2: () => null, Clock: () => null, RefreshCw: () => null }))

beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear() })

test.each(["en", "fr"] as const)("uses each receipt's frozen currency and leaves unknown currency unasserted in %s", async locale => {
  mockLocale = locale
  const row = { id: "receipt", number: "GR-USD", recordedAt: "2026-09-30T09:00:00.000Z", status: "RECEIVED", location: "Warehouse", receiver: "Receiver", quantity: "1", value: "10.00", currency: "USD", inspection: null, resolution: null, stockStatus: "recorded", accountingStatus: "posted", decision: null, canAccept: false, canReject: false }
  ;(loadPurchaseReceiving as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor", orderId: "order", orderNumber: "PO-1", orderStatus: "RECEIVED", supplier: "Supplier", currency: "EUR", checkedAt: row.recordedAt, revision: "a".repeat(64), locationId: "location", location: "Warehouse", canReceive: false, canReviewAccounting: false, lines: [], receipts: [row, { ...row, id: "legacy", number: "GR-LEGACY", value: "12.00", currency: null, stockStatus: "unverified", accountingStatus: "unverified" }], olderReceipts: false } })
  render(<PurchaseReceivingWorkbench organizationId="org" actorId="actor" orderId="order" open={false} onOpenChange={jest.fn()} onChanged={jest.fn()}/>)
  const receipt = (await screen.findByText("GR-USD")).closest("li")!
  const expected = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(10)
  expect(receipt).toHaveTextContent(expected.replace(/\s/g, " "))
  expect(receipt).not.toHaveTextContent("€")
  const legacy = screen.getByText("GR-LEGACY").closest("li")!
  expect(legacy).toHaveTextContent("12.00")
  expect(legacy).toHaveTextContent(mockT("accounting.unverified"))
  expect(legacy).not.toHaveTextContent("€")
  expect(legacy).not.toHaveTextContent("$")
})
