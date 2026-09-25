import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import AccountSessions from "../AccountSessions"
import { useSession } from "@/lib/auth-client"
import { AccountSessionsError, useAccountSessions } from "@/hooks/useAccountSessions"
jest.mock("lucide-react", () => ({ X: () => null }))
jest.mock("@/lib/auth-client", () => ({ useSession: jest.fn() }))
jest.mock("@/hooks/useAccountSessions", () => ({ useAccountSessions: jest.fn(), AccountSessionsError: class extends Error { constructor(public code: string) { super(code) } } }))
const props = { actorId: "actor", organizationId: "org", sessionId: "current", locale: "en" as const }
let model: any, access: any
beforeEach(() => {
  jest.resetAllMocks(); sessionStorage.clear()
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "6e80a55c-a67c-490c-b9e7-47390223ba73" })
  ;(useSession as jest.Mock).mockReturnValue({ isPending: false, data: { user: { id: "actor" }, session: { id: "current" } } })
  model = { ...props, snapshotHash: "a".repeat(64), checkedAt: "2026-09-06T12:00:00Z", others: [{ id: "other", device: "Synthetic device", createdAt: "2026-09-06T12:00:00Z", expiresAt: "2099-01-01T00:00:00Z" }], history: [] }
  access = { query: { data: model, isError: false, isFetching: false, refetch: jest.fn() }, mutation: { mutateAsync: jest.fn().mockResolvedValue({ id: "sessionrevoke_" + "a".repeat(64), ...props, requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", completedAt: "2026-09-06T12:00:00Z", revokedCount: 1, reviewedCount: 1, replayed: false }) } }
  ;(useAccountSessions as jest.Mock).mockReturnValue(access)
})
function open(locale: "en" | "fr" = "en") { const view = render(<AccountSessions {...props} locale={locale} />); fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Review other sessions" : "Vérifier les autres sessions" })); return view }
it("requires an explicit reviewed submission and displays only its server result", async () => {
  open(); expect(access.mutation.mutateAsync).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Sign out reviewed sessions" }))
  await screen.findByRole("status"); expect(screen.getByRole("status")).toHaveTextContent("Other sessions signed out: 1")
  expect(access.query.refetch).toHaveBeenCalled(); expect(sessionStorage.length).toBe(0)
})
it("keeps the original command through lost acknowledgement and refresh", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new Error("response lost"))
  const view = open(); fireEvent.click(screen.getByRole("button", { name: "Sign out reviewed sessions" }))
  await screen.findByRole("button", { name: "Recover the same sign-out request" })
  expect(screen.getByText(/A recovered result belongs to the original request/)).toBeVisible()
  const command = access.mutation.mutateAsync.mock.calls[0][0]; view.unmount(); model.snapshotHash = "b".repeat(64); model.others = []; open()
  fireEvent.click(await screen.findByRole("button", { name: "Recover the same sign-out request" }))
  await waitFor(() => expect(access.mutation.mutateAsync).toHaveBeenCalledTimes(2))
  expect(access.mutation.mutateAsync).toHaveBeenLastCalledWith(command)
  await screen.findByRole("status")
})
it("does not show a failed read as zero sessions or permit a new command", () => {
  access.query.isError = true; open()
  expect(screen.getByRole("button", { name: "Sign out reviewed sessions" })).toBeDisabled()
  expect(screen.queryByText("No other active sessions.")).not.toBeInTheDocument()
})
it("explains stale French review and requires a reload", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new AccountSessionsError("CONFLICT")); open("fr")
  fireEvent.click(screen.getByRole("button", { name: "Déconnecter les sessions vérifiées" }))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Vos sessions ont changé"))
  expect(screen.getByRole("button", { name: "Déconnecter les sessions vérifiées" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Recharger les sessions actuelles" })).toBeEnabled()
})
it("does not present another account's session evidence", () => {
  ;(useSession as jest.Mock).mockReturnValue({ isPending: false, data: { user: { id: "foreign" }, session: { id: "different" } } })
  render(<AccountSessions {...props} />)
  expect(screen.getByRole("alert")).toHaveTextContent("Your account changed")
  expect(useAccountSessions).not.toHaveBeenCalled()
})
it("blocks submission when retry metadata cannot be retained", async () => {
  const save = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable") })
  try { open(); fireEvent.click(screen.getByRole("button", { name: "Sign out reviewed sessions" })); await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Recovery storage is unavailable")); expect(access.mutation.mutateAsync).not.toHaveBeenCalled() }
  finally { save.mockRestore() }
})
