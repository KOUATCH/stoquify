/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { FirmPracticeDesk } from "../FirmPracticeDesk"
import * as actions from "@/actions/accounting/firm-practice.actions"
import { listAdvisoryEngagementsAction } from "@/actions/accounting/advisory-outcomes.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
jest.mock("@/actions/accounting/firm-practice.actions", () => ({ getFirmPracticeDeskAction: jest.fn(), executeFirmPracticeCommandAction: jest.fn(), exportFirmPracticeSnapshotAction: jest.fn() }))
jest.mock("@/actions/accounting/advisory-outcomes.actions", () => ({ listAdvisoryEngagementsAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const desk = () => ({ observedAt: "2026-10-25T00:00:00Z", actorId: "alice", mode: "own", economicsIncluded: false, cohorts: [{
  engagementId: "engagement", periodName: "September", staff: [{ id: "alice", name: "Alice" }], records: [], history: [], canManage: true, canReadEconomics: true,
  advisoryReferences: [], reviewReferences: [], referencesPartial: false,
  summary: { allocation: [{ assigneeId: "alice", plannedMinutes: null, recordedMinutes: null, effortVarianceMinutes: null }], corrections: 0, economics: [] },
}] })
beforeEach(() => {
  jest.resetAllMocks()
  Object.defineProperty(document, "hidden", { value: false, configurable: true })
  Object.defineProperty(crypto, "randomUUID", { value: jest.fn(() => "synthetic-command"), configurable: true })
  ;(listAdvisoryEngagementsAction as jest.Mock).mockResolvedValue({ success: true, data: { firmView: true, engagements: [{ id: "engagement", label: "Firm" }] } })
  ;(actions.getFirmPracticeDeskAction as jest.Mock).mockResolvedValue({ success: true, data: desk() })
})
async function load(locale: "en" | "fr" = "en") {
  render(<FirmPracticeDesk clientOrganizationId="client" periodId="period" locale={locale} />)
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Load firm engagements" : "Charger les missions du cabinet" }))
  fireEvent.change(await screen.findByLabelText(locale === "en" ? "Choose a firm engagement" : "Choisir une mission du cabinet"), { target: { value: "engagement" } })
  await screen.findByText("Alice")
}
function fill() {
  fireEvent.change(screen.getByLabelText("Minutes"), { target: { value: "120" } })
  fireEvent.change(screen.getByLabelText("Work date (UTC)"), { target: { value: "2026-09-15" } })
  fireEvent.change(screen.getByLabelText(/Reason \(at least/), { target: { value: "Explicit manual work declaration" } })
}
it.each(["en", "fr"] as const)("labels missing inputs and manual partial coverage in %s", async locale => {
  await load(locale)
  expect(screen.getAllByText(new RegExp(locale === "en" ? ": Unknown$" : ": Inconnu$"))).toHaveLength(3)
  expect(screen.getByText(locale === "en" ? /Manual declarations are partial/ : /Les déclarations sont partielles/)).toBeInTheDocument()
  expect(screen.getByLabelText("Minutes")).toHaveValue(null)
})
it("does not mount the firm desk for a client-local portal", () => {
  const { container } = render(<FirmPracticeDesk periodId="period" />)
  expect(container).toBeEmptyDOMElement()
})
it("retries the exact retained manual command after an uncertain response", async () => {
  ;(actions.executeFirmPracticeCommandAction as jest.Mock).mockRejectedValueOnce(Error("lost response")).mockResolvedValue({ success: true, data: { version: 1 } })
  await load(); fill(); fireEvent.click(screen.getByRole("button", { name: "Save record" }))
  fireEvent.click(await screen.findByRole("button", { name: "Retry submission" }))
  await waitFor(() => expect(actions.executeFirmPracticeCommandAction).toHaveBeenCalledTimes(2))
  const calls = (actions.executeFirmPracticeCommandAction as jest.Mock).mock.calls
  expect(calls[1]).toEqual(calls[0]); expect(calls[0][0]).toMatchObject({ payload: { kind: "EFFORT", minutes: 120 }, clientOrganizationId: "client", periodId: "period" })
})
it("requires explicit retry after password confirmation and clears stale read data", async () => {
  ;(actions.executeFirmPracticeCommandAction as jest.Mock).mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" }).mockResolvedValue({ success: true, data: {} })
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
  await load(); fill(); fireEvent.click(screen.getByRole("button", { name: "Save record" }))
  fireEvent.change(await screen.findByLabelText("Password"), { target: { value: "synthetic-password" } })
  expect(screen.queryByText("Alice")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Verify identity" }))
  await screen.findByText("Identity verified. Retry when ready.")
  expect(actions.executeFirmPracticeCommandAction).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Retry submission" }))
  await waitFor(() => expect(actions.executeFirmPracticeCommandAction).toHaveBeenCalledTimes(2))
})
it("clears confidential data on denied refresh and hidden-page invalidation", async () => {
  const confidential = desk(); confidential.cohorts[0].summary.economics = [{ currency: "XAF", feeBudget: "999.99", feePerPlannedHour: null }] as never
  await load()
  ;(actions.getFirmPracticeDeskAction as jest.Mock).mockResolvedValueOnce({ success: true, data: confidential })
  fireEvent.click(screen.getByRole("button", { name: "Load confidential fee budgets" }))
  await screen.findByText(/XAF 999.99/)
  ;(actions.getFirmPracticeDeskAction as jest.Mock).mockResolvedValueOnce({ success: false, code: "FORBIDDEN" })
  fireEvent.click(screen.getByRole("button", { name: "Engagement workload" }))
  await screen.findByText(/Current access does not permit/)
  expect(screen.queryByText(/999.99/)).not.toBeInTheDocument()
  act(() => { Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange")) })
  expect(screen.queryByLabelText("Choose a firm engagement")).not.toBeInTheDocument()
})
