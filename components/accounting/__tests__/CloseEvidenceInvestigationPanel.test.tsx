import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { getCloseEvidenceInvestigationAction } from "@/actions/accounting/close-evidence-workflow.actions"
import { CloseEvidenceInvestigationPanel, investigationCopy } from "../CloseEvidenceInvestigationPanel"
jest.mock("@/actions/accounting/close-evidence-workflow.actions", () => ({ getCloseEvidenceInvestigationAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const snapshot = { requestId: "request", findingId: "finding", title: "Retained discrepancy", periodId: "period", observedAt: "2026-10-04T00:00:00Z", revision: "hash", truncated: false, counts: { requests: 2, responses: 0, acceptances: 0 }, issues: ["MULTIPLE_REQUESTS"], records: [{ id: "request", kind: "request", periodId: "period", closeRunId: "run", createdAt: "2026-10-04T00:00:00Z", body: "<script>Retained source text</script>", requestId: null, responseId: null, issues: [] }], assignmentChanges: [] }
beforeEach(() => jest.resetAllMocks())
test.each(["en", "fr"] as const)("%s investigation focuses results and renders source text without approving or executing it", async locale => {
  ;(getCloseEvidenceInvestigationAction as jest.Mock).mockResolvedValue({ success: true, data: snapshot })
  const copy = investigationCopy[locale]
  render(<CloseEvidenceInvestigationPanel periodId="period" locale={locale} />)
  fireEvent.change(screen.getByLabelText(copy.reference), { target: { value: " request " } }); fireEvent.click(screen.getByRole("button", { name: copy.inspect }))
  expect(await screen.findByText(copy.issues.MULTIPLE_REQUESTS)).toBeInTheDocument()
  expect(screen.getByText(copy.boundary)).toBeInTheDocument(); expect(screen.getByText(copy.limits)).toBeInTheDocument()
  expect(screen.getByText(snapshot.records[0].body).tagName).toBe("P")
  expect(screen.getByRole("heading", { name: snapshot.title })).toHaveFocus()
  expect(getCloseEvidenceInvestigationAction).toHaveBeenCalledWith({ periodId: "period", requestId: "request" })
  expect(screen.getAllByRole("button")).toHaveLength(1)
})
test("a failed or revoked read clears prior sensitive results and keeps the reference for retry", async () => {
  ;(getCloseEvidenceInvestigationAction as jest.Mock).mockResolvedValueOnce({ success: true, data: snapshot }).mockResolvedValueOnce({ success: false, code: "FORBIDDEN" })
  render(<CloseEvidenceInvestigationPanel periodId="period" locale="en" />)
  fireEvent.change(screen.getByLabelText(investigationCopy.en.reference), { target: { value: "request" } }); fireEvent.click(screen.getByRole("button"))
  await screen.findByText(snapshot.title); fireEvent.click(screen.getByRole("button"))
  expect(await screen.findByRole("alert")).toHaveFocus(); expect(screen.queryByText(snapshot.title)).not.toBeInTheDocument()
  expect(screen.getByLabelText(investigationCopy.en.reference)).toHaveValue("request")
})
test("a late read from a previous accounting period cannot replace the current screen", async () => {
  let resolve!: (value: unknown) => void
  ;(getCloseEvidenceInvestigationAction as jest.Mock).mockReturnValue(new Promise(done => { resolve = done }))
  const view = render(<CloseEvidenceInvestigationPanel periodId="period" locale="en" />)
  fireEvent.change(screen.getByLabelText(investigationCopy.en.reference), { target: { value: "request" } }); fireEvent.click(screen.getByRole("button"))
  view.rerender(<CloseEvidenceInvestigationPanel periodId="new-period" locale="en" />)
  await act(async () => resolve({ success: true, data: snapshot }))
  expect(screen.queryByText(snapshot.title)).not.toBeInTheDocument(); expect(screen.queryByRole("status")).not.toBeInTheDocument()
})
test("bounded evidence remains visibly incomplete", async () => {
  ;(getCloseEvidenceInvestigationAction as jest.Mock).mockResolvedValue({ success: true, data: { ...snapshot, truncated: true } })
  render(<CloseEvidenceInvestigationPanel periodId="period" locale="en" />)
  fireEvent.change(screen.getByLabelText(investigationCopy.en.reference), { target: { value: "request" } }); fireEvent.click(screen.getByRole("button"))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(investigationCopy.en.truncated))
})
