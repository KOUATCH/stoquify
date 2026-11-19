/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { FirmEngagementWorkspace } from "../FirmEngagementWorkspace"
import { getFirmEngagementWorkspaceAction, executeFirmEngagementCommandAction } from "@/actions/accounting/firm-engagement.actions"
jest.mock("@/actions/accounting/firm-engagement.actions", () => ({
  getFirmEngagementWorkspaceAction: jest.fn(), executeFirmEngagementCommandAction: jest.fn(), getFirmHandoverSummaryAction: jest.fn(),
}))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }))
const list = getFirmEngagementWorkspaceAction as jest.Mock, execute = executeFirmEngagementCommandAction as jest.Mock
const fixture = () => ({ asOf: new Date().toISOString(), actorId: "manager", partial: false, next: null,
  engagements: [{ id: "e1", clientName: "Synthetic Client", status: "DRAFT" }], clients: [{ id: "client", name: "Synthetic Client" }],
  members: [{ id: "manager", name: "Manager", email: "m@example.invalid", usable: true, state: "CLIENT_ACTION_REQUIRED", assignment: null, grant: null, lastAssignmentVersion: 0 }],
  selected: null })
beforeEach(() => {
  list.mockReset(); execute.mockReset(); list.mockResolvedValue({ success: true, data: fixture() })
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "synthetic-command-key" })
})
afterEach(cleanup)
it.each(["en", "fr"] as const)("renders localized setup and safe consent distinction in %s", async locale => {
  render(<FirmEngagementWorkspace locale={locale} />)
  await screen.findByText(locale === "en" ? "Prepare an engagement" : "Préparer une mission")
  expect(screen.getByText(/Assignment is not client consent|Une affectation ne vaut pas consentement/)).toBeInTheDocument()
  expect(screen.getByRole("heading", { level: 2 })).toHaveFocus()
})
it.each(["FORBIDDEN", "AUTH_REQUIRED", "MODULE_ACCESS_DENIED", "INTERNAL_ERROR"])("clears private data on %s", async code => {
  render(<FirmEngagementWorkspace />); await screen.findByText("Prepare an engagement")
  list.mockResolvedValueOnce({ success: false, code, error: "private internals" })
  fireEvent.click(screen.getByRole("button", { name: "Refresh authority and status" }))
  await screen.findByRole("alert")
  expect(screen.queryByText("Synthetic Client — Draft")).not.toBeInTheDocument()
  expect(screen.queryByText("private internals")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  await screen.findByText("Prepare an engagement")
})
it("requires confirmation and retries an uncertain command with the identical payload/key", async () => {
  render(<FirmEngagementWorkspace />)
  const form = (await screen.findByText("Prepare an engagement")).closest("form")!
  fireEvent.change(within(form).getByLabelText("Client with your named mandate"), { target: { value: "client" } })
  fireEvent.change(within(form).getByLabelText("Effective from (Prepare an engagement)"), { target: { value: "2026-01-01T10:00" } })
  fireEvent.change(within(form).getByLabelText("Expires at (Prepare an engagement)"), { target: { value: "2027-01-01T10:00" } })
  fireEvent.submit(form)
  expect(execute).not.toHaveBeenCalled()
  execute.mockRejectedValueOnce(Error("transport lost")).mockResolvedValueOnce({ success: true, data: { engagementId: "e1", status: "DRAFT", version: 0 } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }))
  await screen.findByText(/outcome is uncertain/)
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }))
  await waitFor(() => expect(execute).toHaveBeenCalledTimes(2))
  expect(execute.mock.calls[0][0]).toEqual(execute.mock.calls[1][0])
  expect(execute.mock.calls[0][0]).not.toHaveProperty("actorId")
})
it("labels partial coverage and traverses engagement continuation", async () => {
  list.mockResolvedValueOnce({ success: true, data: { ...fixture(), partial: true, next: "e20" } })
  render(<FirmEngagementWorkspace />)
  await screen.findByText(/Partial page/)
  fireEvent.click(screen.getByRole("button", { name: "More engagements" }))
  await waitFor(() => expect(list).toHaveBeenLastCalledWith({ after: "e20" }))
})

async function prepareSyntheticDraft() {
  const form = (await screen.findByText("Prepare an engagement")).closest("form")!
  fireEvent.change(within(form).getByLabelText("Client with your named mandate"), { target: { value: "client" } })
  fireEvent.change(within(form).getByLabelText("Effective from (Prepare an engagement)"), { target: { value: "2026-01-01T10:00" } })
  fireEvent.change(within(form).getByLabelText("Expires at (Prepare an engagement)"), { target: { value: "2027-01-01T10:00" } })
  fireEvent.submit(form)
}
it.each(["visibilitychange", "pageshow"])("retains an uncertain command across %s and retries the same key", async event => {
  render(<FirmEngagementWorkspace />); await prepareSyntheticDraft()
  execute.mockRejectedValueOnce(Error("response lost")).mockResolvedValueOnce({ success: true, data: { engagementId: "e1" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }))
  await screen.findByText(/outcome is uncertain/)
  const attempted = execute.mock.calls[0][0]
  fireEvent(event === "pageshow" ? window : document, new Event(event))
  expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  expect(screen.getByText(/outcome is uncertain/)).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm change" })).toBeEnabled())
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }))
  await waitFor(() => expect(execute).toHaveBeenCalledTimes(2))
  expect(execute.mock.calls[1][0]).toEqual(attempted)
})
it("retains an in-flight command if page visibility changes before transport failure", async () => {
  let reject!: (error: Error) => void
  execute.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
  render(<FirmEngagementWorkspace />); await prepareSyntheticDraft()
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }))
  const attempted = execute.mock.calls[0][0]
  fireEvent(document, new Event("visibilitychange"))
  await act(async () => reject(Error("response lost after backgrounding")))
  expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  expect(screen.getByText(/outcome is uncertain/)).toBeInTheDocument()
  execute.mockResolvedValueOnce({ success: true, data: { engagementId: "e1" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }))
  await waitFor(() => expect(execute).toHaveBeenCalledTimes(2))
  expect(execute.mock.calls[1][0]).toEqual(attempted)
})
it("does not refresh workspace metadata or steal focus while confirmation is open", async () => {
  jest.useFakeTimers()
  try {
    render(<FirmEngagementWorkspace />); await prepareSyntheticDraft()
    const dialog = screen.getByRole("alertdialog")
    await act(async () => { jest.advanceTimersByTime(60000) })
    expect(list).toHaveBeenCalledTimes(1)
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  } finally { jest.useRealTimers() }
})
