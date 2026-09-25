import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { InvoiceApprovalWorkbench, invoiceApprovalStorageKey } from "../InvoiceApprovalWorkbench"
import { loadInvoiceApproval, loadInvoiceApprovalHistory, reviewInvoiceApproval, submitInvoiceApproval } from "@/actions/purchasing/invoice-approval.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

let mockLocale: "en" | "fr" = "en"
const mockT = (key: string) => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], (mockLocale === "fr" ? fr : en).invoiceApproval) as string
jest.mock("next-intl", () => ({ useTranslations: () => mockT, useLocale: () => mockLocale }))
jest.mock("@/actions/purchasing/invoice-approval.actions", () => ({ loadInvoiceApproval: jest.fn(), loadInvoiceApprovalHistory: jest.fn(), reviewInvoiceApproval: jest.fn(), submitInvoiceApproval: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => ({ X: () => null, AlertTriangle: () => null, CheckCircle2: () => null, Clock: () => null, History: () => null, ShieldCheck: () => null }))
const preview = { subtotal: "2500.00", tax: "0.00", variance: "0.00", makerId: "maker", dueDate: null, documentReference: "https://example.invalid/invoice", preparationEventId: "preparation", matchExceptionId: null, postingWarnings: [], lines: [{ id: "line", description: "Received goods", receiptLineId: "receipt", quantity: "1", unitCost: "2500.00", tax: "0.00", total: "2500.00" }], organizationId: "org", actorId: "actor", invoiceId: "invoice", invoiceNumber: "INV-1", supplierName: "Supplier", total: "2500.00", currency: "XAF", invoiceDate: "2026-08-10T00:00:00.000Z", approvalAt: "2026-09-08T09:00:00.000Z", approvalEventId: "approval", supplierLiabilityId: "liability", periodName: "August", ruleCode: "RULE-1", journalCode: "AP", countryPackVersion: "CM-TEST", blockers: [], requiresFreshAuth: false, revision: "a".repeat(64), checkedAt: "2026-09-08T09:10:00.000Z" }
const decision = { organizationId: "org", actorId: "actor", invoiceId: "invoice", invoiceNumber: "INV-1", requestReference: "approval-request-1", reviewedRevision: preview.revision, recordedAt: "2026-09-08T09:11:00.000Z", approvalEventId: "approval", supplierLiabilityId: "liability", postingBatchId: "batch", ledgerStatus: "POSTED", journalEntryId: "journal", accountingSourceLinkId: "link", blockerCode: null, total: "2500.00", currency: "XAF" }
const key = invoiceApprovalStorageKey("org", "actor")
const show = () => render(<InvoiceApprovalWorkbench organizationId="org" actorId="actor" />)
async function review() { fireEvent.click(await screen.findByRole("radio")); fireEvent.click(screen.getByRole("button", { name: mockT("review") })); await screen.findByRole("dialog") }
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); mockLocale = "en"
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "approval-request-1" })
  ;(loadInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor", checkedAt: preview.checkedAt, next: null, invoices: [{ id: "invoice", invoiceNumber: "INV-1", supplierName: "Supplier", total: "2500.00", currency: "XAF", status: "MATCHED", independentApproverRequired: false }] } })
  ;(loadInvoiceApprovalHistory as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor", invoiceId: "invoice", checkedAt: preview.checkedAt, next: null, records: [] } })
  ;(reviewInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: preview })
  ;(submitInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: decision })
})
test.each(["en", "fr"] as const)("records a reviewed approval in %s", async locale => {
  mockLocale = locale; show(); await review(); fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: mockT("confirm") }))
  expect(await screen.findByText(mockT("posted"))).toBeVisible(); expect(sessionStorage.getItem(key)).toBeNull()
})
test("unknown response retains an exact request across remount", async () => {
  ;(submitInvoiceApproval as jest.Mock).mockRejectedValueOnce(new Error("lost response"))
  const view = show(); await review(); fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: mockT("confirm") }))
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown")); const request = JSON.parse(sessionStorage.getItem(key)!)
  view.unmount(); show(); fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: mockT("retry") }))
  expect(await screen.findByText(mockT("posted"))).toBeVisible(); expect(submitInvoiceApproval).toHaveBeenLastCalledWith(request)
})
test("a response for a different request is not a posting confirmation", async () => {
  ;(submitInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: { ...decision, requestReference: "other-request" } })
  show(); await review(); fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: mockT("confirm") }))
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown")); expect(sessionStorage.getItem(key)).not.toBeNull(); expect(screen.queryByText(mockT("posted"))).toBeNull()
})
test("stale rejection preserves selection and requires another review", async () => {
  ;(submitInvoiceApproval as jest.Mock).mockResolvedValue({ success: false, code: "CONFLICT" })
  show(); await review(); fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: mockT("confirm") }))
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("stale")); expect(screen.getByRole("radio")).toBeChecked(); expect(sessionStorage.getItem(key)).toBeNull()
})
test("missing setup does not offer a confirm action", async () => {
  ;(reviewInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: { ...preview, blockers: ["PREPARATION_REVIEW"] } })
  show(); await review(); expect(screen.getByText(mockT("blockers.PREPARATION_REVIEW"))).toBeVisible(); expect(screen.queryByRole("button", { name: mockT("confirm") })).toBeNull()
})
test("failed reads are not represented as successful empty results", async () => {
  ;(loadInvoiceApproval as jest.Mock).mockRejectedValue(new Error("query failed"))
  show(); expect(await screen.findByRole("alert")).toHaveTextContent(mockT("loadFailed")); expect(screen.queryByText(mockT("empty"))).toBeNull()
})

test("a returned query error describes unavailable records, not an unknown submission", async () => {
  ;(loadInvoiceApproval as jest.Mock).mockResolvedValue({ success: false, code: "DATABASE_UNAVAILABLE" })
  show(); expect(await screen.findByRole("alert")).toHaveTextContent(mockT("loadFailed"))
  expect(screen.queryByText(mockT("empty"))).toBeNull()
  expect(screen.queryByText(mockT("unknown"))).toBeNull()
})

test("posting warnings allow an explicit payable approval and show recovery after a blocked journal", async () => {
  ;(reviewInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: { ...preview, postingWarnings: ["RULE_UNAVAILABLE"] } })
  ;(submitInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: { ...decision, ledgerStatus: "BLOCKED_PENDING_RULES", journalEntryId: null, accountingSourceLinkId: null, blockerCode: "AP_POSTING_RULE_REVIEW" } })
  show(); await review()
  expect(screen.getByText(mockT("warnings.RULE_UNAVAILABLE"))).toBeVisible()
  expect(screen.getByRole("link", { name: mockT("document") })).toHaveAttribute("href", "https://example.invalid/invoice")
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: mockT("confirm") }))
  expect(await screen.findByText(mockT("stillBlocked"))).toBeVisible()
  expect(screen.getByRole("link", { name: mockT("openRecovery") })).toHaveAttribute("href", "/en/dashboard/purchases/payables/recovery")
  expect(screen.queryByText(mockT("posted"))).toBeNull()
})

test("the maker sees why an independent review is required", async () => {
  ;(loadInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor", checkedAt: preview.checkedAt, next: null, invoices: [{ id: "invoice", invoiceNumber: "INV-1", supplierName: "Supplier", total: "2500.00", currency: "XAF", status: "MATCHED", independentApproverRequired: true }] } })
  show(); fireEvent.click(await screen.findByRole("radio"))
  expect(screen.getByRole("button", { name: mockT("review") })).toBeDisabled()
  expect(screen.getByText(mockT("independent"))).toBeVisible()
  expect(reviewInvoiceApproval).not.toHaveBeenCalled()
  expect(await screen.findByText(mockT("historyEmpty"))).toBeVisible()
})
test("password assurance is never persisted with the pending request", async () => {
  ;(reviewInvoiceApproval as jest.Mock).mockResolvedValue({ success: true, data: { ...preview, requiresFreshAuth: true } })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  ;(submitInvoiceApproval as jest.Mock).mockImplementation(async () => { expect(sessionStorage.getItem(key)).not.toContain("PRIVATE_PASSWORD"); return { success: true, data: decision } })
  show(); await review(); fireEvent.change(screen.getByLabelText(mockT("password")), { target: { value: "PRIVATE_PASSWORD" } }); fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: mockT("confirm") }))
  await waitFor(() => expect(stepUpWithPasswordAction).toHaveBeenCalledWith({ password: "PRIVATE_PASSWORD" })); expect(await screen.findByText(mockT("posted"))).toBeVisible()
})
