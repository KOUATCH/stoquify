import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import InvitationHistory from "@/components/Forms/users/InvitationHistory"
import { getInvitationHistory } from "@/actions/users/getInvitationHistory"
import type { InvitationHistory as HistoryData } from "@/services/users/user-invitation-history.service"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockLocale: "en" | "fr" = "en"
jest.mock("@/actions/users/getInvitationHistory", () => ({ getInvitationHistory: jest.fn() }))
jest.mock("lucide-react", () => ({ History: () => null, RefreshCw: () => null, X: () => null }))
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
  let text: unknown = (mockLocale === "en" ? en : fr).userInvitations.history
  for (const part of key.split(".")) text = (text as Record<string, unknown>)[part]
  if (typeof text !== "string") throw new Error("Missing history translation " + key)
  return text.replace(/\{(\w+)\}/g, (_: string, name: string) => String(values[name]))
} }))
const action = getInvitationHistory as jest.Mock
const data = (): HistoryData => ({ asOf: "2026-09-06T07:00:00Z", inviteId: "invite", status: "PENDING", transport: "disabled", reviewRequired: true, acceptedAt: null, nextCursor: "record-1", entries: [{ id: "record-1", kind: "issued", recordedAt: "2026-09-06T06:00:00Z", evidenceValid: true, actorName: "Reviewer", roleName: "Reader", reason: null, delivery: { status: "SENT", attempts: 1, checkedAt: "2026-09-06T06:01:00Z", recovery: "none" } }] })
beforeEach(() => { jest.resetAllMocks(); mockLocale = "en" })
function open() {
  render(<InvitationHistory inviteId="invite" email="colleague@example.invalid" />)
  fireEvent.click(screen.getByRole("button", { name: (mockLocale === "en" ? en : fr).userInvitations.history.open }))
  return (mockLocale === "en" ? en : fr).userInvitations.history
}
it.each(["en", "fr"] as const)("shows %s decision and provider receipt without claiming recipient delivery", async locale => {
  mockLocale = locale; action.mockResolvedValue({ status: 200, data: data() }); const copy = open()
  expect(await screen.findByText(copy.kind.issued)).toBeVisible()
  expect(screen.getByText(copy.delivery.SENT)).toBeVisible()
  expect(screen.getByText(copy.deliveryDisabled)).toBeVisible()
  expect(screen.getByText(copy.reviewRequired)).toBeVisible()
  expect(action).toHaveBeenCalledWith({ inviteId: "invite" })
})
it("retains earlier results when an older page fails and retries with the same cursor", async () => {
  action.mockResolvedValueOnce({ status: 200, data: data() }).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ status: 200, data: { ...data(), entries: [{ ...data().entries[0], id: "older" }], nextCursor: null } })
  const copy = open(); await screen.findByText(copy.kind.issued)
  fireEvent.click(screen.getByRole("button", { name: copy.more }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.retained)
  expect(screen.getByText("record-1")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: copy.more }))
  expect(await screen.findByText("older")).toBeInTheDocument()
  expect(action).toHaveBeenLastCalledWith({ inviteId: "invite", cursor: "record-1" })
})
it("shows a failed first read without an empty-history claim", async () => {
  action.mockResolvedValue({ status: 503, data: null }); const copy = open()
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.failed)
  expect(screen.queryByText(copy.empty)).not.toBeInTheDocument()
})
it("clears retained private history when refreshed authority is denied", async () => {
  action.mockResolvedValueOnce({ status: 200, data: data() }).mockResolvedValueOnce({ status: 403, data: null })
  const copy = open(); await screen.findByText(copy.kind.issued)
  fireEvent.click(screen.getByRole("button", { name: copy.refresh }))
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.denied)
  expect(screen.queryByText("record-1")).not.toBeInTheDocument()
  expect(screen.queryByText(copy.retained)).not.toBeInTheDocument()
})
it("does not present earlier pages as freshly rechecked when loading older decisions", async () => {
  action.mockResolvedValueOnce({ status: 200, data: data() }).mockResolvedValueOnce({ status: 200, data: { ...data(), asOf: "2026-09-07T09:00:00Z", entries: [], nextCursor: null } })
  const copy = open(); await screen.findByText(copy.kind.issued)
  const checked = screen.getByText(/History checked:/).textContent
  fireEvent.click(screen.getByRole("button", { name: copy.more }))
  await waitFor(() => expect(screen.queryByRole("button", { name: copy.more })).not.toBeInTheDocument())
  expect(screen.getByText(/History checked:/)).toHaveTextContent(checked!)
})
it("ignores a delayed response from a closed history view", async () => {
  let resolve!: (value: unknown) => void
  action.mockReturnValueOnce(new Promise(done => { resolve = done })).mockResolvedValueOnce({ status: 200, data: { ...data(), entries: [], nextCursor: null } })
  const copy = open(); fireEvent.click(screen.getByRole("button", { name: copy.close }))
  fireEvent.click(screen.getByRole("button", { name: copy.open }))
  expect(await screen.findByText(copy.empty)).toBeVisible()
  await act(async () => resolve({ status: 200, data: data() }))
  expect(screen.getByText(copy.empty)).toBeVisible(); expect(screen.queryByText(copy.kind.issued)).not.toBeInTheDocument()
})
