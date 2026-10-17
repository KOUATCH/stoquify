import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import AuditExplorer from "../AuditExplorer"
import { readAuditExplorerAction } from "@/actions/audit/audit-explorer.actions"
import type { AuditExplorerResult } from "@/services/audit/audit-explorer-contracts"
jest.mock("@/actions/audit/audit-explorer.actions", () => ({ readAuditExplorerAction: jest.fn() }))
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
const action = readAuditExplorerAction as jest.Mock
const data: AuditExplorerResult = { checkedAt: "2026-10-04T12:00:00Z", recordedThrough: "2026-10-04T11:00:00Z", throughId: "upper", nextCursor: "older", canFilterActor: true, accessAvailable: true, itemDecisionsAvailable: true, stockChangesAvailable: true,
  entries: [{ id: "audit-a", recordedAt: "2026-10-04T10:00:00Z", family: "access", entityType: "User", entityId: "member", reference: "member", action: "MEMBER_ACCESS_CHANGED", actorId: "actor-a", details: { operation: "roles", addedRoles: 1 }, detailState: "limited", sourceHref: "/dashboard/settings/users/update/member" }] }
beforeEach(() => { jest.resetAllMocks(); action.mockResolvedValue({ success: true, data }) })
it("shows coverage limits, safe details and a scoped source handoff", async () => {
  render(<AuditExplorer locale="en" />)
  await screen.findByRole("heading", { name: "Member access changed" })
  expect(screen.getByText(/Item permission approval does not prove an edit was saved/)).toBeInTheDocument()
  expect(screen.getByText(/Only reviewed fields are shown/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Open source workflow/ })).toHaveAttribute("href", "/en/dashboard/settings/users/update/member")
  expect(screen.queryByRole("button", { name: /export|edit|approve/i })).not.toBeInTheDocument()
})
it("keeps the snapshot on older pages and starts a fresh one for changed filters", async () => {
  render(<AuditExplorer locale="en" />)
  await screen.findByRole("heading", { name: "Member access changed" })
  fireEvent.click(screen.getByRole("button", { name: "Older events" }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith({ family: "all", throughId: "upper", beforeId: "older" }))
  await screen.findByRole("heading", { name: "Member access changed" })
  fireEvent.change(screen.getByLabelText("Entity reference"), { target: { value: "member" } })
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }))
  await waitFor(() => expect(action).toHaveBeenLastCalledWith({ family: "all", entityId: "member" }))
})
it("offers new-snapshot recovery when the authorized snapshot disappears", async () => {
  action.mockResolvedValue({ success: false, reason: "snapshot" })
  render(<AuditExplorer locale="en" />)
  expect(await screen.findByRole("alert")).toHaveTextContent(/snapshot or cursor is no longer available/)
  action.mockResolvedValue({ success: true, data })
  fireEvent.click(screen.getByRole("button", { name: "New snapshot" }))
  await screen.findByRole("heading", { name: "Member access changed" })
})
it("ignores an earlier response after filters change", async () => {
  let resolveOld!: (value: unknown) => void
  action.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
  render(<AuditExplorer locale="en" />)
  fireEvent.change(screen.getByLabelText("Event family"), { target: { value: "items" } })
  action.mockResolvedValue({ success: true, data: { ...data, entries: [], nextCursor: null } })
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }))
  await screen.findByText(/No authorized events match/)
  await act(async () => resolveOld({ success: true, data }))
  expect(screen.queryByRole("heading", { name: "Member access changed" })).not.toBeInTheDocument()
})
it("distinguishes no reviewed details, hidden actors and a source outside the current scope", async () => {
  action.mockResolvedValue({ success: true, data: { ...data, stockChangesAvailable: false, entries: [{ ...data.entries[0], actorId: null, details: {}, detailState: "unavailable" }] } })
  render(<AuditExplorer locale="en" />)
  await screen.findByRole("heading", { name: "Member access changed" })
  expect(screen.getByText(/Actor hidden or unavailable/)).toBeInTheDocument()
  expect(screen.getByText(/No reviewed detail fields are available/)).toBeInTheDocument()
  expect(screen.getByText(/Stock adjustment changes: Outside current scope or access/)).toBeInTheDocument()
})
it("renders French labels, actions and source links", async () => {
  render(<AuditExplorer locale="fr" />)
  await screen.findByRole("heading", { name: "Accès du membre modifié" })
  expect(screen.getByLabelText("Référence de l’acteur")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Ouvrir le parcours source/ })).toHaveAttribute("href", "/fr/dashboard/settings/users/update/member")
})
it("clears previously rendered data when authority is revoked", async () => {
  render(<AuditExplorer locale="en" />)
  await screen.findByRole("heading", { name: "Member access changed" })
  action.mockResolvedValue({ success: false, reason: "restricted" })
  fireEvent.click(screen.getByRole("button", { name: "New snapshot" }))
  await screen.findByRole("alert")
  expect(screen.queryByRole("heading", { name: "Member access changed" })).not.toBeInTheDocument()
})
