/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CustomerSettlementControls } from "../CustomerSettlementControls"
import { collectCustomerSettlementAction, getCustomerSettlementWorkbenchAction, reverseCustomerSettlementAction } from "@/actions/finance/customer-settlement.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

jest.mock("@/actions/finance/customer-settlement.actions", () => ({
  collectCustomerSettlementAction: jest.fn(), getCustomerSettlementWorkbenchAction: jest.fn(), reverseCustomerSettlementAction: jest.fn(),
}))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
// Payment controls must reuse the parent display scope. A fresh auth/permission
// observer on drawer mount restarts the parent's hide/remount cycle.
jest.mock("@/hooks/useClientAuth", () => ({ useClientAuth: jest.fn(() => { throw new Error("Duplicate auth observer") }) }))
jest.mock("@/hooks/usePermissions", () => ({ usePermissions: jest.fn(() => { throw new Error("Duplicate permission observer") }) }))

const mockRead = jest.mocked(getCustomerSettlementWorkbenchAction)
const mockCollect = jest.mocked(collectCustomerSettlementAction)
const mockReverse = jest.mocked(reverseCustomerSettlementAction)
const mockStepUp = jest.mocked(stepUpWithPasswordAction)
const mockAuth = { user: { id: "collector" }, organizationId: "org-one", isLoading: false }
const mockPermissions = { organizationId: "org-one", permissionState: "ready", permissions: ["finance.receivables.read", "finance.receivables.collect"] }
const onChanged = jest.fn()
const props = {
  customerId: "customer-one", referenceId: "invoice-one", locale: "en", onChanged,
  get scope() {
    return !mockAuth.isLoading && mockPermissions.permissionState === "ready" && mockAuth.organizationId === mockPermissions.organizationId
      ? { userId: mockAuth.user.id, organizationId: mockPermissions.organizationId, permissions: mockPermissions.permissions }
      : null
  },
}
const workbench = () => ({
  scope: { organizationId: mockPermissions.organizationId, actorUserId: mockAuth.user.id },
  document: { customerId: "customer-one", referenceId: "invoice-one", salesOrderId: "sale-one", documentNumber: "INV-1", currency: "XAF", openAmount: "4.00", status: "PARTIALLY_PAID" },
  canCollect: true,
  providerReceipts: [] as Array<{ id: string; method: "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER"; providerReference: string; accountLabel: string; amount: string; currency: string; occurredAt: string }>,
  settlements: [] as Array<{ id: string; settlementNumber: string; method: string; amount: string; allocatedAmount: string; currency: string; settlementDate: string; status: string; externalReference: string; canReverse: boolean }>,
})
const ok = (data: unknown) => ({ success: true, data, error: null, status: 200 }) as any
const failure = (code: string) => ({ success: false, data: null, error: "SQL secret error that must not reach the UI", code, status: 403 }) as any

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.user.id = "collector"
  mockAuth.organizationId = "org-one"
  mockPermissions.organizationId = "org-one"
  mockPermissions.permissionState = "ready"
  mockPermissions.permissions = ["finance.receivables.read", "finance.receivables.collect"]
  mockRead.mockImplementation(async () => ok(workbench()))
  mockCollect.mockResolvedValue(ok({ id: "settlement-one" }))
  mockReverse.mockResolvedValue(ok({ id: "settlement-one" }))
  Object.defineProperty(crypto, "subtle", { configurable: true, value: { digest: jest.fn(async () => new Uint8Array(32).buffer) } })
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: jest.fn(() => "synthetic-request-identity") })
})

async function openCollection(locale = "en") {
  render(<CustomerSettlementControls {...props} locale={locale} />)
  fireEvent.click(await screen.findByRole("button", { name: locale === "fr" ? "Enregistrer un paiement client" : "Record customer payment" }))
}

function evidence(locale = "en") {
  const file = new File(["synthetic source evidence"], "bank-proof.txt", { type: "text/plain" })
  Object.defineProperty(file, "arrayBuffer", { value: async () => new TextEncoder().encode("synthetic source evidence").buffer })
  fireEvent.change(screen.getByLabelText(locale === "fr" ? "Fichier justificatif" : "Supporting evidence file"), { target: { files: [file] } })
}

function fillCollection() {
  fireEvent.change(screen.getByLabelText("Payment / evidence reference"), { target: { value: "BANK-RECEIPT-1" } })
  evidence()
}

function submitCollection() {
  fireEvent.submit(screen.getByRole("form", { name: "Record customer payment" }))
}

function providerReceipt() {
  return { id: "native-provider-receipt", method: "BANK_TRANSFER" as const, providerReference: "CONFIRMED-BANK-1", accountLabel: "Operating bank", amount: "4.00", currency: "XAF", occurredAt: "2026-10-15T14:12:00.000Z" }
}

function withProviderReceipt() {
  mockRead.mockResolvedValueOnce(ok({ ...workbench(), providerReceipts: [providerReceipt()] }))
}

it("does not show amounts or commands when the current read is denied or crosses scope", async () => {
  mockRead.mockResolvedValueOnce(failure("FORBIDDEN"))
  const view = render(<CustomerSettlementControls {...props} />)
  expect(await screen.findByText(/Current payments could not be loaded/)).toBeInTheDocument()
  expect(screen.queryByText(/Current amount due/)).not.toBeInTheDocument()
  expect(screen.queryByText(/SQL secret/)).not.toBeInTheDocument()
  mockRead.mockResolvedValueOnce(ok({ ...workbench(), scope: { organizationId: "another-tenant", actorUserId: "collector" } }))
  fireEvent.click(screen.getByRole("button", { name: "Refresh payments" }))
  await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(2))
  expect(await screen.findByText(/Current payments could not be loaded/)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Record customer payment" })).not.toBeInTheDocument()
  view.unmount()
})

it("uses the parent's scope without mounting another permission observer and hides it during refresh", async () => {
  const view = render(<CustomerSettlementControls {...props} />)
  expect(await screen.findByRole("button", { name: "Record customer payment" })).toBeInTheDocument()
  expect(jest.requireMock("@/hooks/usePermissions").usePermissions).not.toHaveBeenCalled()
  expect(jest.requireMock("@/hooks/useClientAuth").useClientAuth).not.toHaveBeenCalled()
  expect(mockRead).toHaveBeenCalledTimes(1)
  mockPermissions.permissionState = "loading"
  view.rerender(<CustomerSettlementControls {...props} />)
  expect(screen.queryByText(/Current amount due/)).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Record customer payment" })).not.toBeInTheDocument()
  expect(mockRead).toHaveBeenCalledTimes(1)
  mockPermissions.permissionState = "ready"
  view.rerender(<CustomerSettlementControls {...props} />)
  expect(await screen.findByRole("button", { name: "Record customer payment" })).toBeInTheDocument()
  expect(mockRead).toHaveBeenCalledTimes(2)
})

it("uses current server capabilities without offering collection or self-reversal", async () => {
  mockRead.mockResolvedValueOnce(ok({ ...workbench(), canCollect: false, settlements: [{ id: "settlement-one", settlementNumber: "PAY-1", method: "BANK_TRANSFER", amount: "4.00", allocatedAmount: "4.00", currency: "XAF", settlementDate: "2026-11-08T00:00:00.000Z", status: "POSTED", externalReference: "BANK-1", canReverse: false }] }))
  render(<CustomerSettlementControls {...props} />)
  expect(await screen.findByText(/PAY-1/)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Review reversal" })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Record customer payment" })).not.toBeInTheDocument()
})

it("requires a real evidence file before sending a payment command", async () => {
  await openCollection()
  submitCollection()
  expect(await screen.findByRole("alert")).toHaveTextContent(/Choose a readable, non-empty/)
  expect(mockCollect).not.toHaveBeenCalled()
  expect(screen.getByRole("alert")).toHaveFocus()
})

it("rejects zero locally and unlocks edits after an authoritative declined request", async () => {
  mockCollect.mockResolvedValueOnce(failure("BUSINESS_RULE_VIOLATION"))
  await openCollection()
  fillCollection()
  fireEvent.change(screen.getByLabelText("Amount (XAF)"), { target: { value: "0" } })
  submitCollection()
  expect(await screen.findByRole("alert")).toHaveTextContent(/Enter a positive amount/)
  expect(mockCollect).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText("Amount (XAF)"), { target: { value: "8.00" } })
  submitCollection()
  expect(await screen.findByRole("alert")).toHaveTextContent(/request was declined/)
  expect(screen.getByLabelText("Amount (XAF)")).toBeEnabled()
  fireEvent.change(screen.getByLabelText("Amount (XAF)"), { target: { value: "4.00" } })
  submitCollection()
  expect(await screen.findByText(/Customer payment recorded/)).toBeInTheDocument()
  expect(mockCollect.mock.calls[1][0]).toMatchObject({ amount: "4.00" })
})

it("confirms identity without automatically executing payment and retries the exact reviewed command", async () => {
  mockCollect.mockResolvedValueOnce(failure("FRESH_AUTH_REQUIRED")).mockResolvedValueOnce(ok({ id: "settlement-one" }))
  mockStepUp.mockResolvedValueOnce({ success: true, data: { verifiedAt: "2026-11-08T12:00:00.000Z", method: "password", assuranceLevel: 1 }, error: null, code: null, retryAfterSeconds: null })
  await openCollection()
  fillCollection()
  submitCollection()
  const password = await screen.findByLabelText("Current password")
  expect(password).toHaveFocus()
  expect(screen.getByLabelText("Amount (XAF)")).toBeDisabled()
  fireEvent.change(password, { target: { value: "Synthetic password" } })
  fireEvent.submit(screen.getByRole("form", { name: "Confirm your identity" }))
  expect(password).toHaveValue("")
  expect(await screen.findByText(/Identity verified/)).toBeInTheDocument()
  expect(mockCollect).toHaveBeenCalledTimes(1)
  expect(mockStepUp).toHaveBeenCalledWith({ password: "Synthetic password" })
  expect(screen.getByRole("button", { name: "Retry the same payment" })).toHaveFocus()
  submitCollection()
  expect(await screen.findByText(/Customer payment recorded/)).toBeInTheDocument()
  expect(mockCollect).toHaveBeenCalledTimes(2)
  expect(mockCollect.mock.calls[0][0]).toEqual(mockCollect.mock.calls[1][0])
  expect(mockCollect.mock.calls[0][0]).toMatchObject({ customerId: "customer-one", amount: "4.00", method: "BANK_TRANSFER", externalReference: "BANK-RECEIPT-1", allocations: [{ salesOrderId: "sale-one", amount: "4.00" }], documentHash: "0".repeat(64), evidenceHash: "0".repeat(64) })
  expect(onChanged).toHaveBeenCalledTimes(1)
  expect(mockRead).toHaveBeenCalledTimes(2)
})

it("keeps the exact command after an uncertain response and prevents repeated in-flight submission", async () => {
  let reject!: (reason: Error) => void
  mockCollect.mockReturnValueOnce(new Promise((_, failure) => { reject = failure }))
  await openCollection()
  fillCollection()
  submitCollection()
  await waitFor(() => expect(mockCollect).toHaveBeenCalledTimes(1))
  submitCollection()
  expect(mockCollect).toHaveBeenCalledTimes(1)
  await act(async () => reject(new Error("Connection lost")))
  expect(screen.getByRole("alert")).toHaveTextContent(/could not be confirmed/)
  expect(screen.getByLabelText("Payment / evidence reference")).toBeDisabled()
  submitCollection()
  expect(await screen.findByText(/Customer payment recorded/)).toBeInTheDocument()
  expect(mockCollect.mock.calls[0][0]).toEqual(mockCollect.mock.calls[1][0])
})

it("submits a reviewed independent reversal without reconstructing the sale", async () => {
  mockRead.mockResolvedValueOnce(ok({ ...workbench(), canCollect: false, settlements: [{ id: "settlement-one", settlementNumber: "PAY-1", method: "BANK_TRANSFER", amount: "4.00", allocatedAmount: "4.00", currency: "XAF", settlementDate: "2026-11-08T00:00:00.000Z", status: "POSTED", externalReference: "BANK-1", canReverse: true }] }))
  render(<CustomerSettlementControls {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "Review reversal" }))
  fireEvent.change(screen.getByLabelText("Reason for reversal"), { target: { value: "Incorrect bank receipt" } })
  evidence()
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm this payment/ }))
  fireEvent.submit(screen.getByRole("form", { name: "Reverse customer payment" }))
  expect(await screen.findByText(/Customer payment reversed/)).toBeInTheDocument()
  expect(mockReverse).toHaveBeenCalledWith(expect.objectContaining({ customerSettlementId: "settlement-one", reason: "Incorrect bank receipt" }))
  expect(mockCollect).not.toHaveBeenCalled()
})

it("drops results and input after a workspace change, even if an old mutation resolves later", async () => {
  let finish!: (value: any) => void
  mockCollect.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const view = render(<CustomerSettlementControls {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "Record customer payment" }))
  fillCollection()
  submitCollection()
  await waitFor(() => expect(mockCollect).toHaveBeenCalledTimes(1))
  mockAuth.user.id = "another-actor"
  mockAuth.organizationId = "another-org"
  mockPermissions.organizationId = "another-org"
  view.rerender(<CustomerSettlementControls {...props} />)
  await screen.findByRole("button", { name: "Record customer payment" })
  await act(async () => finish(ok({ id: "settlement-one" })))
  expect(screen.queryByText(/Customer payment recorded/)).not.toBeInTheDocument()
  expect(onChanged).not.toHaveBeenCalled()
  expect(screen.queryByLabelText("Payment / evidence reference")).not.toBeInTheDocument()
})

it("clears cached amounts when permission lookup fails and renders French payment labels", async () => {
  const view = render(<CustomerSettlementControls {...props} locale="fr" />)
  fireEvent.click(await screen.findByRole("button", { name: "Enregistrer un paiement client" }))
  expect(screen.getByLabelText("Montant (XAF)")).toHaveValue("4.00")
  expect(screen.getByText(/Seule l’empreinte du fichier/)).toBeInTheDocument()
  mockPermissions.permissionState = "error"
  view.rerender(<CustomerSettlementControls {...props} locale="fr" />)
  expect(screen.getByText(/contrôles de paiement sont indisponibles/)).toBeInTheDocument()
  expect(screen.queryByLabelText("Montant (XAF)")).not.toBeInTheDocument()
})

it.each(["en", "fr"])("uses explicit native receipt selection with exact reviewed amount/reference/date in %s", async locale => {
  withProviderReceipt()
  await openCollection(locale)
  const selector = screen.getByLabelText(locale === "fr" ? "Confirmation du prestataire (facultatif)" : "Confirmed provider receipt (optional)")
  expect(selector).toHaveValue("")
  expect(screen.queryByText("native-provider-receipt")).not.toBeInTheDocument()
  expect(screen.getByText(locale === "fr" ? /La saisie manuelle ne lie aucune confirmation/ : /Manual recording does not link a provider confirmation/)).toBeInTheDocument()
  fireEvent.change(selector, { target: { value: "native-provider-receipt" } })
  const summary = screen.getByText(locale === "fr" ? "Confirmation sélectionnée:" : "Selected confirmation:", { exact: true }).closest("p")
  expect(summary).toHaveTextContent("Operating bank")
  expect(summary).toHaveTextContent("CONFIRMED-BANK-1")
  expect(summary).not.toHaveTextContent("native-provider-receipt")
  expect(screen.getByLabelText(locale === "fr" ? "Montant (XAF)" : "Amount (XAF)")).toHaveValue("4.00")
  expect(screen.getByLabelText(locale === "fr" ? "Référence du paiement / justificatif" : "Payment / evidence reference")).toHaveValue("CONFIRMED-BANK-1")
  expect(screen.getByLabelText(locale === "fr" ? "Date du paiement" : "Payment date")).toHaveValue("2026-10-15")
  evidence(locale)
  fireEvent.submit(screen.getByRole("form", { name: locale === "fr" ? "Enregistrer un paiement client" : "Record customer payment" }))
  await waitFor(() => expect(mockCollect).toHaveBeenCalledTimes(1))
  expect(mockCollect.mock.calls[0][0]).toMatchObject({ paymentTransactionId: "native-provider-receipt", amount: "4.00", externalReference: "CONFIRMED-BANK-1", settlementDate: "2026-10-15T00:00:00.000Z" })
})

it.each([
  ["amount", "Amount (XAF)", "3.00"],
  ["method", "Payment method", "CASH"],
  ["reference", "Payment / evidence reference", "MANUAL-RECEIPT"],
  ["date", "Payment date", "2026-10-16"],
])("clears the native link when the operator edits %s", async (_field, label, value) => {
  withProviderReceipt(); await openCollection()
  fireEvent.change(screen.getByLabelText("Confirmed provider receipt (optional)"), { target: { value: "native-provider-receipt" } })
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
  evidence(); submitCollection()
  await waitFor(() => expect(mockCollect).toHaveBeenCalledTimes(1))
  expect(mockCollect.mock.calls[0][0]).not.toHaveProperty("paymentTransactionId")
})

it("holds the same selected receipt after an uncertain response and a refreshed preview", async () => {
  withProviderReceipt()
  mockCollect.mockRejectedValueOnce(new Error("Unknown transport outcome"))
  await openCollection()
  fireEvent.change(screen.getByLabelText("Confirmed provider receipt (optional)"), { target: { value: "native-provider-receipt" } })
  evidence(); submitCollection()
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not be confirmed/)
  expect(screen.getByLabelText("Confirmed provider receipt (optional)")).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Refresh payments" }))
  await screen.findByRole("option", { name: /Previously selected confirmation: CONFIRMED-BANK-1/ })
  expect(screen.getByLabelText("Confirmed provider receipt (optional)")).toHaveValue("native-provider-receipt")
  submitCollection()
  expect(await screen.findByText(/Customer payment recorded/)).toBeInTheDocument()
  expect(mockCollect.mock.calls[0][0]).toEqual(mockCollect.mock.calls[1][0])
})

it.each(["AUTH_REQUIRED", "FORBIDDEN", "TENANT_SCOPE_VIOLATION"])("hides the native receipt and cached workbench immediately after %s", async code => {
  withProviderReceipt(); mockCollect.mockResolvedValueOnce(failure(code)); await openCollection()
  fireEvent.change(screen.getByLabelText("Confirmed provider receipt (optional)"), { target: { value: "native-provider-receipt" } })
  evidence(); submitCollection()
  expect(await screen.findByText(/not available with your current permissions/)).toBeInTheDocument()
  expect(screen.queryByText(/Current amount due/)).not.toBeInTheDocument()
  expect(screen.queryByLabelText("Confirmed provider receipt (optional)")).not.toBeInTheDocument()
  expect(screen.queryByDisplayValue("CONFIRMED-BANK-1")).not.toBeInTheDocument()
})

it("drops selected and pending native evidence when a new read revokes collection capability", async () => {
  withProviderReceipt(); mockCollect.mockResolvedValueOnce(failure("FRESH_AUTH_REQUIRED")); await openCollection()
  fireEvent.change(screen.getByLabelText("Confirmed provider receipt (optional)"), { target: { value: "native-provider-receipt" } })
  evidence(); submitCollection()
  const password = await screen.findByLabelText("Current password")
  mockStepUp.mockResolvedValueOnce({ success: true, data: { verifiedAt: "2026-11-10T12:00:00.000Z", method: "password", assuranceLevel: 1 }, error: null, code: null, retryAfterSeconds: null })
  fireEvent.change(password, { target: { value: "Synthetic password" } })
  fireEvent.submit(screen.getByRole("form", { name: "Confirm your identity" }))
  await screen.findByText(/Identity verified/)
  mockRead.mockResolvedValueOnce(ok({ ...workbench(), canCollect: false, providerReceipts: [] }))
  fireEvent.click(screen.getByRole("button", { name: "Refresh payments" }))
  await screen.findByText(/read-only for your current permissions/)
  expect(screen.queryByLabelText("Confirmed provider receipt (optional)")).not.toBeInTheDocument()
  expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument()
  expect(screen.queryByDisplayValue("CONFIRMED-BANK-1")).not.toBeInTheDocument()
  expect(screen.queryByText(/Identity verified/)).not.toBeInTheDocument()
})

it("ignores a late selected-receipt command after actor and workspace change", async () => {
  withProviderReceipt(); let finish!: (value: any) => void
  mockCollect.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const view = render(<CustomerSettlementControls {...props} />)
  fireEvent.click(await screen.findByRole("button", { name: "Record customer payment" }))
  fireEvent.change(screen.getByLabelText("Confirmed provider receipt (optional)"), { target: { value: "native-provider-receipt" } })
  evidence(); submitCollection()
  await waitFor(() => expect(mockCollect).toHaveBeenCalledTimes(1))
  mockAuth.user.id = "new-actor"; mockAuth.organizationId = "new-organization"; mockPermissions.organizationId = "new-organization"
  view.rerender(<CustomerSettlementControls {...props} />)
  await screen.findByRole("button", { name: "Record customer payment" })
  await act(async () => finish(ok({ id: "settlement-one" })))
  expect(screen.queryByText(/Customer payment recorded/)).not.toBeInTheDocument()
  expect(screen.queryByDisplayValue("CONFIRMED-BANK-1")).not.toBeInTheDocument()
  expect(onChanged).not.toHaveBeenCalled()
})
