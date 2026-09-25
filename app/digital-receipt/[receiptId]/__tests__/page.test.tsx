import { fireEvent, render, screen } from "@testing-library/react"
import { ZodError } from "zod"
import DigitalReceiptPage, { dynamic, metadata } from "../page"
import ReceiptNotFound from "../not-found"
import { getPublicSalesReceipt, type SalesReceiptPayload } from "@/services/pos/receipt.service"
import { NotFoundError } from "@/services/_shared/action-errors"

jest.mock("@/services/pos/receipt.service", () => ({ getPublicSalesReceipt: jest.fn() }))
jest.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND") } }))

const getReceipt = jest.mocked(getPublicSalesReceipt)

function fixture(locale: "EN" | "FR" = "EN"): SalesReceiptPayload {
  return {
    receipt: {
      id: "sale-private-id", orderNumber: "SO-TEST-1", customerName: "Test Customer",
      customerEmail: "private-contact@example.invalid", customerPhone: "private-customer-phone",
      total: 1080, subtotal: 1000, tax: 100, taxRate: 10, discount: 20,
      paymentMethod: "CASH", paymentStatus: "PAID", cashier: "private-cashier", terminal: "private-terminal",
      sessionNumber: "private-shift", locale, createdAt: "2026-09-24T10:00:00.000Z",
      items: [{ id: "line-1", name: "<script>alert('unsafe')</script>", sku: "private-sku", quantity: 2, unitPrice: 500, totalPrice: 1000, taxRate: 10 }],
      payments: [{ id: "payment-private-id", paymentNumber: "private-payment-number", method: "CASH", amount: 1080, status: "COMPLETED", cashTendered: 1100, changeGiven: 20, createdAt: "2026-09-24T10:00:00.000Z" }],
    },
    certification: {
      fiscalDocumentId: "private-fiscal-id", documentType: "POS_RECEIPT", fiscalDocumentStatus: "NOT_CREATED",
      submissionId: "private-submission", submissionStatus: null, authorityChannel: "private-provider", authorityReference: null,
      legalNumber: null, provisionalNumber: null, certifiedAt: null, rejectedAt: null,
      rejectionReason: "private-provider-error", certificationArtifactHash: "private-artifact-hash", countryCode: "CM",
      countryPackVersion: "private-pack", countryPackVerificationStatus: null,
      legalDeliveryStatus: "NOT_CREATED", legalDeliveryBlocked: false, legalDeliveryBlockReason: "private-block-details",
    },
    business: { name: "Test Store", address: "Store address", city: "City", phone: "private-business-phone", email: "private-business-email", website: "https://external.invalid", taxId: "", currency: "XAF" },
    location: { name: "Test Branch", address: "123 Example Road", city: "City", phone: "private-location-phone" },
    generatedAt: "2026-09-24T10:00:00.000Z", digitalReceiptUrl: "https://example.invalid/digital-receipt/sale?token=private-bearer-token",
  }
}

function page(token: string | string[] | undefined = "signed-token") {
  return DigitalReceiptPage({ params: Promise.resolve({ receiptId: "sale-1" }), searchParams: Promise.resolve({ token }) })
}

beforeEach(() => { jest.resetAllMocks(); getReceipt.mockResolvedValue(fixture()) })

it.each([undefined, "", "  ", ["one", "two"]])("rejects missing or ambiguous tokens before receipt lookup (%s)", async token => {
  await expect(DigitalReceiptPage({ params: Promise.resolve({ receiptId: "sale-1" }), searchParams: Promise.resolve({ token }) })).rejects.toThrow("NEXT_NOT_FOUND")
  expect(getReceipt).not.toHaveBeenCalled()
})

it.each([new NotFoundError(), new ZodError([])])("returns the same unavailable route for invalid or revoked access", async error => {
  getReceipt.mockRejectedValue(error)
  await expect(page()).rejects.toThrow("NEXT_NOT_FOUND")
})

it("renders only the receipt allowlist, escapes item names, and delegates printing without another server action", async () => {
  const print = jest.spyOn(window, "print").mockImplementation(() => {})
  const { container } = render(await page("  signed-token  "))
  expect(getReceipt).toHaveBeenCalledWith({ salesOrderId: "sale-1", receiptAccessToken: "signed-token" })
  expect(screen.getByRole("main")).toHaveAttribute("lang", "en")
  expect(screen.getByRole("heading", { name: "Your receipt" })).toBeVisible()
  expect(screen.getByText("SO-TEST-1")).toBeVisible()
  expect(screen.getByText("<script>alert('unsafe')</script>")).toBeVisible()
  expect(container.querySelector("script, a, iframe, img")).toBeNull()
  expect(container.innerHTML).not.toContain("private-")
  expect(container.innerHTML).not.toContain("signed-token")
  expect(screen.getByText(/does not establish fiscal certification/)).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Print receipt" }))
  expect(print).toHaveBeenCalledTimes(1)
  expect(getReceipt).toHaveBeenCalledTimes(1)
  print.mockRestore()
})

it("uses French receipt language and localized payment and fiscal status", async () => {
  const data = fixture("FR")
  data.certification.legalDeliveryStatus = "PENDING_REGULATORY_PROCESSING"
  getReceipt.mockResolvedValue(data)
  render(await page())
  expect(screen.getByRole("main")).toHaveAttribute("lang", "fr")
  expect(screen.getByRole("heading", { name: "Votre reçu" })).toBeVisible()
  expect(screen.getByRole("button", { name: "Imprimer le reçu" })).toBeVisible()
  expect(screen.getByText("Espèces · Terminé")).toBeVisible()
  expect(screen.getByText(/Le traitement fiscal est en cours/)).toBeVisible()
})

it("does not display a blocked document's legal number or internal rejection details", async () => {
  const data = fixture()
  data.certification.fiscalDocumentStatus = "CERTIFIED"
  data.certification.legalDeliveryBlocked = true
  data.certification.legalNumber = "blocked-legal-number"
  getReceipt.mockResolvedValue(data)
  const { container } = render(await page())
  expect(screen.getByText(/not available for delivery/)).toBeVisible()
  expect(container.innerHTML).not.toContain("blocked-legal-number")
  expect(container.innerHTML).not.toContain("private-")
})

it("shows a legal number only when certification is recorded and delivery is allowed", async () => {
  const data = fixture()
  data.certification.fiscalDocumentStatus = "CERTIFIED"
  data.certification.legalNumber = "LEGAL-123"
  getReceipt.mockResolvedValue(data)
  render(await page())
  expect(screen.getByText(/Fiscal number: LEGAL-123/)).toBeVisible()
})

it("shows generic bilingual recovery without leaking server errors", async () => {
  getReceipt.mockRejectedValue(new Error("private-database-secret signed-token"))
  const { container } = render(await page())
  expect(screen.getByRole("heading", { name: "Receipt temporarily unavailable" })).toBeVisible()
  expect(screen.getByRole("heading", { name: "Reçu temporairement indisponible" })).toBeVisible()
  expect(container.innerHTML).not.toContain("private-database-secret")
  expect(container.innerHTML).not.toContain("signed-token")
})

it("provides a generic bilingual unavailable view and private metadata", () => {
  render(<ReceiptNotFound />)
  expect(screen.getByRole("heading", { name: "Receipt unavailable" })).toBeVisible()
  expect(screen.getByRole("heading", { name: "Reçu indisponible" })).toBeVisible()
  expect(dynamic).toBe("force-dynamic")
  expect(metadata.robots).toEqual({ index: false, follow: false, nocache: true })
  expect(metadata.referrer).toBe("no-referrer")
})
