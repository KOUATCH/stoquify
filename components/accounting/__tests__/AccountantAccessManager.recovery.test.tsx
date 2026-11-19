import { Suspense, startTransition, useState } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AccountantAccessManager } from "../AccountantAccessManager"
import { inviteAccountantAccessAction } from "@/actions/accounting/accountant-access.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

const mockRefresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
jest.mock("@/components/accounting/AccountingDataTable", () => ({ AccountingDataTable: () => null }))
jest.mock("@/actions/accounting/accountant-access.actions", () => ({ inviteAccountantAccessAction: jest.fn(), revokeAccountantAccessAction: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const invite = inviteAccountantAccessAction as jest.Mock
const stepUp = stepUpWithPasswordAction as jest.Mock
const success = { success: true, data: { outcome: "GRANTED" } }
let sequence = 0
const priorUuid = Object.getOwnPropertyDescriptor(globalThis.crypto, "randomUUID")
beforeAll(() => Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => "00000000-0000-4000-8000-" + String(++sequence).padStart(12, "0") }))
afterAll(() => {
  if (priorUuid) Object.defineProperty(globalThis.crypto, "randomUUID", priorUuid)
  else Reflect.deleteProperty(globalThis.crypto, "randomUUID")
})
beforeEach(() => { jest.clearAllMocks(); mockRefresh.mockReset(); invite.mockResolvedValue(success); stepUp.mockResolvedValue({ success: true }) })
function fill(email = "preparer@example.invalid") {
  fireEvent.change(screen.getByLabelText("Accountant email"), { target: { value: email } })
  fireEvent.change(screen.getByLabelText("Firm name"), { target: { value: "Synthetic firm" } })
  fireEvent.change(screen.getByLabelText("Effective from"), { target: { value: "2020-01-01T00:00" } })
  fireEvent.change(screen.getByLabelText("Expires at"), { target: { value: "2099-01-01T00:00" } })
  fireEvent.change(screen.getByLabelText("Signed consent evidence hash"), { target: { value: "sha256:" + "a".repeat(64) } })
}
function submit() { fireEvent.click(screen.getByRole("button", { name: "Invite or grant access", exact: true })) }
it("keeps the original command through password confirmation and explicit retry", async () => {
  invite.mockResolvedValueOnce({ success: false, code: "FRESH_AUTH_REQUIRED" })
  render(<AccountantAccessManager initialGrants={[]} />)
  fill(); submit()
  const password = await screen.findByLabelText("Password", { exact: true })
  const original = invite.mock.calls[0][0]
  expect(screen.getByRole("button", { name: "Retry", exact: true })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Invite or grant access", exact: true })).toBeDisabled()
  fireEvent.change(screen.getByLabelText("Accountant email"), { target: { value: "different@example.invalid" } })
  fireEvent.change(password, { target: { value: "synthetic-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm identity", exact: true }))
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry", exact: true })).toBeEnabled())
  expect(invite).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Retry", exact: true }))
  await screen.findByText("Accountant access granted.", { exact: true })
  expect(invite).toHaveBeenNthCalledWith(2, original)
  expect(invite.mock.calls[1][0].accountantEmail).toBe("preparer@example.invalid")
  expect(stepUp).toHaveBeenCalledWith({ password: "synthetic-password" })
  await waitFor(() => expect(screen.getByRole("button", { name: "Invite or grant access", exact: true })).toBeEnabled())
})
it("retains the command after response loss and does not silently resubmit", async () => {
  invite.mockRejectedValueOnce(new Error("synthetic lost response"))
  render(<AccountantAccessManager initialGrants={[]} />)
  fill(); submit()
  await screen.findByText("The outcome is uncertain. Retry this same command before starting another change.")
  const original = invite.mock.calls[0][0]
  fireEvent.submit(screen.getByLabelText("Accountant email").closest("form")!)
  expect(invite).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Invite or grant access", exact: true })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Retry", exact: true }))
  await screen.findByText("Accountant access granted.", { exact: true })
  expect(invite).toHaveBeenNthCalledWith(2, original)
})
it("blocks a second click while pending, then admits a new grant with a new key", async () => {
  let settle!: (result: typeof success) => void
  invite.mockImplementationOnce(() => new Promise(resolve => { settle = resolve }))
  render(<AccountantAccessManager initialGrants={[]} />)
  fill(); submit()
  const pending = screen.getByRole("button", { name: "Saving…", exact: true })
  expect(pending).toBeDisabled(); fireEvent.click(pending)
  expect(invite).toHaveBeenCalledTimes(1)
  await act(async () => settle(success))
  await waitFor(() => expect(screen.getByRole("button", { name: "Invite or grant access", exact: true })).toBeEnabled())
  fill("reviewer@example.invalid"); submit()
  await waitFor(() => expect(invite).toHaveBeenCalledTimes(2))
  expect(invite.mock.calls[1][0].accountantEmail).toBe("reviewer@example.invalid")
  expect(invite.mock.calls[1][0].idempotencyKey).not.toBe(invite.mock.calls[0][0].idempotencyKey)
})
it("makes a rejected grant actionable without claiming success", async () => {
  invite.mockResolvedValueOnce({ success: false, code: "FORBIDDEN", retryable: false })
  render(<AccountantAccessManager initialGrants={[]} />)
  fill(); submit()
  await screen.findByText("The change was not accepted. Refresh current state and check the mandate, dates, scope and versions.")
  expect(screen.queryByText("Accountant access granted.")).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole("button", { name: "Invite or grant access", exact: true })).toBeEnabled())
  expect(mockRefresh).not.toHaveBeenCalled()
})

it("settles a confirmed command while a read-model refresh remains suspended", async () => {
  let finishRefresh!: () => void
  let refreshed = false
  const refreshGate = new Promise<void>(resolve => { finishRefresh = resolve })
  function DelayedReadModel({ active }: { active: boolean }) {
    if (active && !refreshed) throw refreshGate
    return null
  }
  function Harness() {
    const [refreshing, setRefreshing] = useState(false)
    mockRefresh.mockImplementation(() => startTransition(() => setRefreshing(true)))
    return <Suspense fallback={<p>Refreshing test read model</p>}>
      <AccountantAccessManager initialGrants={[]} />
      <DelayedReadModel active={refreshing} />
    </Suspense>
  }
  render(<Harness />)
  fill(); submit()
  try {
    await screen.findByText("Accountant access granted.", { exact: true })
    await waitFor(() => expect(screen.getByRole("button", { name: "Invite or grant access", exact: true })).toBeEnabled())
    expect(invite).toHaveBeenCalledTimes(1)
  } finally {
    refreshed = true
    await act(async () => finishRefresh())
  }
})

it("blocks two immediate form submissions before React rerenders", async () => {
  let settle!: (result: typeof success) => void
  invite.mockImplementationOnce(() => new Promise(resolve => { settle = resolve }))
  render(<AccountantAccessManager initialGrants={[]} />)
  fill()
  const form = screen.getByLabelText("Accountant email").closest("form")!
  act(() => { fireEvent.submit(form); fireEvent.submit(form) })
  expect(invite).toHaveBeenCalledTimes(1)
  await act(async () => settle(success))
  await waitFor(() => expect(screen.getByRole("button", { name: "Invite or grant access", exact: true })).toBeEnabled())
})
it("preserves confirmed success and offers reload when refresh throws", async () => {
  mockRefresh.mockImplementation(() => { throw new Error("synthetic read-model refresh failure") })
  render(<AccountantAccessManager initialGrants={[]} />)
  fill(); submit()
  await screen.findByText("Accountant access granted.", { exact: true })
  expect(screen.queryByText("The outcome is uncertain. Retry this same command before starting another change.")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Refresh current list", exact: true })).toBeEnabled()
  expect(screen.queryByRole("button", { name: "Retry", exact: true })).not.toBeInTheDocument()
  expect(invite).toHaveBeenCalledTimes(1)
  expect(screen.getByRole("button", { name: "Invite or grant access", exact: true })).toBeEnabled()
})
it("provides the saved-list recovery in French", async () => {
  const view = render(<AccountantAccessManager initialGrants={[]} />)
  fill()
  view.rerender(<AccountantAccessManager initialGrants={[]} locale="fr" />)
  fireEvent.submit(screen.getByLabelText("Adresse e-mail du comptable").closest("form")!)
  await screen.findByText("Accès comptable accordé.", { exact: true })
  expect(screen.getByRole("button", { name: "Actualiser la liste", exact: true })).toBeEnabled()
  expect(screen.getByText("La modification a été enregistrée. Si elle ne figure pas dans la liste, actualisez-la avant une autre modification.")).toBeInTheDocument()
})
