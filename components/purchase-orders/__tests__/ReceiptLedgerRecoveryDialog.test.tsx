import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { ReceiptLedgerRecoveryDialog, receiptLedgerRecoveryStorageKey } from "../ReceiptLedgerRecoveryDialog"
import { reviewReceiptLedgerRecovery, submitReceiptLedgerRecovery } from "@/actions/purchaseOrderWorkflow/purchase-receiving.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockLocale: "en" | "fr" = "en"
const mockT = (key: string) => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], (mockLocale === "fr" ? fr : en).purchaseReceiving.accountingRecovery) as string
jest.mock("next-intl", () => ({ useTranslations: () => mockT, useLocale: () => mockLocale }))
jest.mock("@/actions/purchaseOrderWorkflow/purchase-receiving.actions", () => ({ reviewReceiptLedgerRecovery: jest.fn(), submitReceiptLedgerRecovery: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => ({ X: () => null, AlertTriangle: () => null, CheckCircle2: () => null, ShieldCheck: () => null }))
const preview = { organizationId: "org", actorId: "actor", orderId: "po", receiptId: "gr", receiptNumber: "GR-1", supplierName: "Supplier", value: "2500.00", currency: "XAF", effectiveAt: "2026-08-10T12:00:00.000Z", sourceEventId: "source", sourceHash: "b".repeat(64), periodName: "August", ruleCode: "GR", journalCode: "INV", blockers: [], requiresFreshAuth: false, revision: "a".repeat(64), checkedAt: "2026-09-30T09:00:00.000Z", returns: [] }
const decision = { organizationId: "org", actorId: "actor", orderId: "po", receiptId: "gr", receiptNumber: "GR-1", sourceEventId: "source", sourceHash: preview.sourceHash, effectiveAt: preview.effectiveAt, requestReference: "recovery-request", reviewedRevision: preview.revision, recordedAt: "2026-09-30T09:01:00.000Z", postingBatchId: "batch", ledgerStatus: "POSTED", journalEntryId: "journal", accountingSourceLinkId: "link", blockerCode: null, value: "2500.00", currency: "XAF", replayed: false, returnOutcomes: [] }
const key = receiptLedgerRecoveryStorageKey("org", "actor", "po", "gr"), changed = jest.fn()
const show = () => render(<ReceiptLedgerRecoveryDialog organizationId="org" actorId="actor" orderId="po" receiptId="gr" onChanged={changed}/>)
async function review() { fireEvent.click(screen.getByRole("button", { name: mockT("review") })); await screen.findByText("GR-1 · Supplier") }
function confirm() { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: mockT("confirm") })) }
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); mockLocale = "en"
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "recovery-request" })
  ;(reviewReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: preview })
  ;(submitReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: decision })
})
test.each(["en", "fr"] as const)("reviews and confirms with verified posting evidence in %s", async locale => {
  mockLocale = locale; show(); await review(); confirm()
  expect(await screen.findByText(mockT("posted"))).toBeVisible(); expect(changed).toHaveBeenCalledTimes(1); expect(sessionStorage.getItem(key)).toBeNull()
})
test.each(["en", "fr"] as const)("explains a verified zero-value return without a missing-journal warning in %s", async locale => {
  mockLocale = locale
  const returned = { returnId: "return-zero", effectiveAt: preview.effectiveAt, sourceHash: "c".repeat(64) }
  ;(reviewReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: { ...preview, returns: [{ ...returned, value: "0.00", currency: "XAF", accountingRequired: false, periodName: null, ruleCode: null, journalCode: null, blockers: [] }] } })
  ;(submitReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: { ...decision, returnOutcomes: [{ ...returned, ledgerStatus: "NOT_REQUIRED", postingBatchId: null, journalEntryId: null, accountingSourceLinkId: null }] } })
  show(); await review()
  expect(screen.getByText(mockT("noJournalRequired"))).toBeVisible()
  expect(screen.queryByText(new RegExp(mockT("returnJournal") + ":"))).toBeNull()
  confirm()
  expect(await screen.findByText(mockT("returnsRecorded"))).toBeVisible()
  expect(screen.getByText(mockT("noJournalRequired"))).toBeVisible()
  expect(changed).toHaveBeenCalledTimes(1)
})

test("a return with missing journal evidence cannot claim posting success", async () => {
  ;(submitReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: { ...decision, returnOutcomes: [{ returnId: "return-invalid", effectiveAt: preview.effectiveAt, sourceHash: "c".repeat(64), ledgerStatus: "POSTED", postingBatchId: null, journalEntryId: null, accountingSourceLinkId: null }] } })
  show(); await review(); confirm()
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown"))
  expect(changed).not.toHaveBeenCalled()
  expect(sessionStorage.getItem(key)).not.toBeNull()
})

test("lost response survives remount and recovers the exact request", async () => {
  ;(submitReceiptLedgerRecovery as jest.Mock).mockRejectedValueOnce(new Error("lost response"))
  const view = show(); await review(); confirm()
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown")); const request = JSON.parse(sessionStorage.getItem(key)!)
  view.unmount(); show(); fireEvent.click(screen.getByRole("button", { name: mockT("retry") })); fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: mockT("retry") }))
  expect(await screen.findByText(mockT("posted"))).toBeVisible(); expect(submitReceiptLedgerRecovery).toHaveBeenLastCalledWith(request)
})
test("an unrelated response is never displayed as a posted recovery", async () => {
  ;(submitReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: { ...decision, requestReference: "another-request" } })
  show(); await review(); confirm()
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("unknown")); expect(sessionStorage.getItem(key)).not.toBeNull(); expect(screen.queryByText(mockT("posted"))).toBeNull()
})
test.each(["LEGACY_SOURCE", "PERIOD_UNAVAILABLE"])("explains %s without offering confirmation", async blocker => {
  ;(reviewReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: { ...preview, blockers: [blocker] } })
  show(); await review(); expect(screen.getByText(mockT(`blockers.${blocker}`))).toBeVisible(); expect(screen.queryByRole("button", { name: mockT("confirm") })).toBeNull()
})
test("stale preview rejection requires a new review", async () => {
  ;(submitReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: false, code: "CONFLICT" })
  show(); await review(); confirm()
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("stale")); expect(sessionStorage.getItem(key)).toBeNull()
  expect(within(screen.getByRole("dialog")).getByRole("button", { name: mockT("review") })).toBeEnabled()
})
test("query failure is shown as failure with no confirmation", async () => {
  ;(reviewReceiptLedgerRecovery as jest.Mock).mockRejectedValue(new Error("query failed"))
  show(); fireEvent.click(screen.getByRole("button", { name: mockT("review") }))
  expect(await screen.findByRole("alert")).toHaveTextContent(mockT("loadFailed")); expect(screen.queryByRole("button", { name: mockT("confirm") })).toBeNull()
})
test("explains closed original return conditions without offering confirmation", async () => {
  ;(reviewReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: { ...preview, blockers: ["RETURN_UNAVAILABLE"], returns: [{ returnId: "return", effectiveAt: preview.effectiveAt, value: "500.00", currency: "XAF", periodName: "August", ruleCode: "RET", journalCode: "PUR", blockers: ["PERIOD_UNAVAILABLE"] }] } })
  show(); await review(); expect(screen.getByText(mockT("returnsHelp"))).toBeVisible(); expect(screen.getByText(mockT("returnBlockers.PERIOD_UNAVAILABLE"))).toBeVisible(); expect(screen.queryByRole("button", { name: mockT("confirm") })).toBeNull()
})
test("actual password step-up precedes submission and is never retained", async () => {
  ;(reviewReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ success: true, data: { ...preview, requiresFreshAuth: true } })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  ;(submitReceiptLedgerRecovery as jest.Mock).mockImplementation(async () => { expect(sessionStorage.getItem(key)).not.toContain("PRIVATE_PASSWORD"); expect(stepUpWithPasswordAction).toHaveBeenCalledWith({ password: "PRIVATE_PASSWORD" }); return { success: true, data: decision } })
  show(); await review(); expect(screen.getByRole("button", { name: mockT("confirm") })).toBeDisabled()
  fireEvent.change(screen.getByLabelText(mockT("password")), { target: { value: "PRIVATE_PASSWORD" } }); confirm()
  expect(await screen.findByText(mockT("posted"))).toBeVisible()
})
test("late response from previous tenant is ignored", async () => {
  let resolve!: (value: unknown) => void
  ;(reviewReceiptLedgerRecovery as jest.Mock).mockImplementation(() => new Promise(r => { resolve = r }))
  const view = show(); fireEvent.click(screen.getByRole("button", { name: mockT("review") }))
  view.rerender(<ReceiptLedgerRecoveryDialog organizationId="other" actorId="actor" orderId="po" receiptId="gr" onChanged={changed}/>)
  resolve({ success: true, data: preview }); await waitFor(() => expect(screen.queryByText("GR-1 · Supplier")).toBeNull())
  expect(screen.queryByRole("dialog")).toBeNull(); expect(submitReceiptLedgerRecovery).not.toHaveBeenCalled()
})
