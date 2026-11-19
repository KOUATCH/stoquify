import { fireEvent, render, screen } from "@testing-library/react"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPOSReceiptPrintPreview, type SalesReceiptPayload } from "@/services/pos/receipt.service"
import POSReceiptPage from "../page"

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(message: string, public code: string, public status: number) {
      super(message)
      this.name = "RbacError"
    }
  }
  return {
    requirePermission: jest.fn(), RbacError: MockRbacError,
    isRbacError: (error: unknown) => error instanceof MockRbacError,
  }
})

jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {} }))
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn(), error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/pos/receipt.service", () => ({ getPOSReceiptPrintPreview: jest.fn() }))

const requirePOSPermission = jest.mocked(requirePermission)
const moduleAccess = jest.mocked(observeModuleAccess)
const getPreview = jest.mocked(getPOSReceiptPrintPreview)

function receipt(blocked = false) {
  return {
    receipt: {
      locale: "EN", orderNumber: "SYNTH-0001", createdAt: "2026-01-15T10:00:00.000Z",
      customerName: "Fixture customer", customerPhone: "private-customer-phone", total: 2500,
      subtotal: 2500, discount: 0, tax: 0, paymentStatus: "PAID", items: [], payments: [],
    },
    business: { name: "Test Shop", currency: "XAF" },
    location: { name: "Test Counter" },
    certification: { legalDeliveryBlocked: blocked, legalNumber: "private-legal-number" },
    digitalReceiptUrl: "https://example.invalid/receipt?token=private-bearer",
  } as SalesReceiptPayload
}

function page(query: Record<string, string | string[]> = { saleId: "sale-1", locationId: "loc-1" }, locale = "en") {
  return POSReceiptPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve(query) })
}

beforeEach(() => {
  jest.resetAllMocks()
  requirePOSPermission.mockResolvedValue({ orgId: "org-1", userId: "cashier-1", permissions: ["pos.receipts.print", "pos.receipts.reprint"] } as Awaited<ReturnType<typeof requirePermission>>)
  moduleAccess.mockResolvedValue({ allowed: true } as Awaited<ReturnType<typeof observeModuleAccess>>)
  getPreview.mockResolvedValue(receipt())
})

it("renders an owned purchase summary and opens print without another receipt or provider call", async () => {
  const print = jest.spyOn(window, "print").mockImplementation(() => {})
  const { container } = render(await page())
  expect(requirePOSPermission).toHaveBeenCalledWith("pos.receipts.print", { resource: "POSReceipt", auditAllowed: false })
  expect(getPreview).toHaveBeenCalledWith({ organizationId: "org-1", locationId: "loc-1", locale: "EN", selection: { salesOrderId: "sale-1", actorId: "cashier-1" } })
  expect(screen.getByRole("heading", { name: "Purchase summary" })).toBeVisible()
  expect(screen.getByText("SYNTH-0001")).toBeVisible()
  expect(container.innerHTML).not.toContain("private-")
  fireEvent.click(screen.getByRole("button", { name: "Print receipt" }))
  expect(print).toHaveBeenCalledTimes(1)
  expect(getPreview).toHaveBeenCalledTimes(1)
  print.mockRestore()
})

it("requires reprint authorization for a historical exact sale number", async () => {
  render(await page({ orderNumber: " SYNTH-0001 ", locationId: "loc-1" }, "fr"))
  expect(requirePOSPermission).toHaveBeenCalledWith("pos.receipts.reprint", { resource: "POSReceipt", auditAllowed: false })
  expect(getPreview).toHaveBeenCalledWith({ organizationId: "org-1", locationId: "loc-1", locale: "FR", selection: { orderNumber: "SYNTH-0001" } })
})

it("denies missing permission or POS entitlement before reading receipt data", async () => {
  requirePOSPermission.mockRejectedValueOnce(new RbacError("denied", "FORBIDDEN", 403))
  const { unmount } = render(await page())
  expect(screen.getByRole("heading", { name: "Receipt unavailable" })).toBeVisible()
  unmount()
  moduleAccess.mockResolvedValueOnce({ allowed: false } as Awaited<ReturnType<typeof observeModuleAccess>>)
  render(await page())
  expect(screen.getByRole("heading", { name: "Receipt unavailable" })).toBeVisible()
  expect(getPreview).not.toHaveBeenCalled()
})

it("does not disclose a receipt when the request has two references or fiscal delivery is blocked", async () => {
  const { unmount } = render(await page({ orderNumber: "SYNTH-0001", saleId: "sale-1", locationId: "loc-1" }))
  expect(screen.getByRole("heading", { name: "Receipt unavailable" })).toBeVisible()
  expect(requirePOSPermission).not.toHaveBeenCalled()
  unmount()
  getPreview.mockResolvedValueOnce(receipt(true))
  render(await page())
  expect(screen.getByRole("heading", { name: "Printing is blocked by fiscal controls" })).toBeVisible()
  expect(screen.queryByText("SYNTH-0001")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Print receipt" })).not.toBeInTheDocument()
})
