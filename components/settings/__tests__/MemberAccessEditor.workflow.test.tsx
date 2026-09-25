import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import MemberAccessEditor from "../MemberAccessEditor"
import { MemberAccessError, useMemberAccess } from "@/hooks/useMemberAccess"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
jest.mock("../MemberAccessHistory", () => ({ __esModule: true, default: () => null }))
jest.mock("@/hooks/useMemberAccess", () => ({ useMemberAccess: jest.fn(), MemberAccessError: class extends Error { constructor(public code: string) { super(code) } } }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("lucide-react", () => ({ X: () => null }))
let model: any, access: any
beforeEach(() => {
  jest.clearAllMocks(); window.sessionStorage.clear(); Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => "09ba28c2-5a3a-48ae-b8c5-46e7abff3991" })
  model = { organizationId: "org", revision: "a".repeat(64), checkedAt: "2026-09-06T09:00:00.000Z", member: { id: "member", name: "Synthetic Member", email: "member@example.invalid", isActive: true }, roleIds: ["reader"], catalogue: [{ id: "reader", nameEn: "Reader", nameFr: "Lecteur", permissionCount: 1, canAssign: true }, { id: "stock", nameEn: "Stock manager", nameFr: "Gestionnaire de stock", permissionCount: 2, canAssign: true }], canRemove: true, canReactivate: true, canReadHistory: true, history: [] }
  access = { query: { data: model, refetch: jest.fn(async () => ({ data: model })) }, mutation: { mutateAsync: jest.fn(async () => ({ id: "member", auditId: "record", sessionsRevoked: 1, operation: "roles" })) } }; (useMemberAccess as jest.Mock).mockReturnValue(access)
})
function open(locale: "en" | "fr" = "en") { render(<MemberAccessEditor organizationId="org" actorId="actor" memberId="member" locale={locale} />); fireEvent.click(screen.getByRole("checkbox", { name: locale === "en" ? "Stock manager" : "Gestionnaire de stock" })); fireEvent.change(screen.getByLabelText(locale === "en" ? "Reason for this change" : "Motif de cette modification"), { target: { value: "Changed responsibilities" } }); fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Review changes" : "Examiner les modifications" })); return within(screen.getByRole("dialog")) }
it("requires review then explicit confirmation, with a persistent receipt", async () => { const dialog = open(); expect(access.mutation.mutateAsync).not.toHaveBeenCalled(); fireEvent.click(dialog.getByRole("button", { name: "Confirm access change" })); await screen.findByRole("heading", { name: "Member access recorded" }); expect(access.mutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: model.revision, roleIds: ["reader", "stock"], reason: "Changed responsibilities" })) })
it("preserves and retries the identical request after a lost response", async () => { access.mutation.mutateAsync.mockRejectedValueOnce(new Error("disconnected")); const dialog = open(); fireEvent.click(dialog.getByRole("button", { name: "Confirm access change" })); fireEvent.click(await screen.findByRole("button", { name: "Retry same request" })); await screen.findByRole("heading", { name: "Member access recorded" }); expect(access.mutation.mutateAsync.mock.calls[0]).toEqual(access.mutation.mutateAsync.mock.calls[1]) })
it("requires another explicit submission after password confirmation", async () => { access.mutation.mutateAsync.mockRejectedValueOnce(new MemberAccessError("FRESH_AUTH_REQUIRED")); (stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true }); const dialog = open(); fireEvent.click(dialog.getByRole("button", { name: "Confirm access change" })); fireEvent.change(await screen.findByLabelText("Your current password"), { target: { value: "private-fixture" } }); fireEvent.click(dialog.getByRole("button", { name: "Confirm password" })); await waitFor(() => expect(dialog.getByRole("button", { name: "Confirm access change" })).toBeEnabled()); expect(access.mutation.mutateAsync).toHaveBeenCalledTimes(1) })
it("keeps the draft on stale reload and binds the next request to new evidence", async () => { access.mutation.mutateAsync.mockRejectedValueOnce(new MemberAccessError("CONFLICT")); access.query.refetch.mockResolvedValue({ data: { ...model, revision: "b".repeat(64) } }); const dialog = open(); fireEvent.click(dialog.getByRole("button", { name: "Confirm access change" })); fireEvent.click(await screen.findByRole("button", { name: "Reload and compare" })); await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument()); expect(screen.getByLabelText("Reason for this change")).toHaveValue("Changed responsibilities"); expect(screen.getByRole("checkbox", { name: "Stock manager" })).toBeChecked(); fireEvent.click(screen.getByRole("button", { name: "Review changes" })); fireEvent.click(screen.getByRole("button", { name: "Confirm access change" })); await waitFor(() => expect(access.mutation.mutateAsync).toHaveBeenLastCalledWith(expect.objectContaining({ expectedRevision: "b".repeat(64) }))) })
it("shows French review and an actionable denial without false success", async () => { access.mutation.mutateAsync.mockRejectedValue(new MemberAccessError("FORBIDDEN")); const dialog = open("fr"); fireEvent.click(dialog.getByRole("button", { name: "Confirmer la modification des accès" })); expect(await screen.findByRole("alert")).toHaveTextContent("Vos autorisations actuelles"); expect(screen.queryByRole("heading", { name: "Accès du membre enregistrés" })).not.toBeInTheDocument() })
it("makes read-only member roles visible but unavailable", () => { model.canRemove = false; model.catalogue.forEach((role: any) => role.canAssign = false); render(<MemberAccessEditor organizationId="org" actorId="actor" memberId="member" locale="en" />); expect(screen.getAllByRole("checkbox").every(input => (input as HTMLInputElement).disabled)).toBe(true); expect(screen.getByRole("button", { name: "Review changes" })).toBeDisabled() })
it("retains the receipt and disables closing while current details reload", async () => {
  let resolve: (value: unknown) => void = () => undefined
  access.query.refetch.mockImplementation(() => new Promise(done => { resolve = done }))
  const dialog = open(); fireEvent.click(dialog.getByRole("button", { name: "Confirm access change" })); await screen.findByRole("heading", { name: "Member access recorded" })
  fireEvent.click(dialog.getByRole("button", { name: "Close", exact: true }))
  await waitFor(() => expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeDisabled())
  expect(screen.getByRole("heading", { name: "Member access recorded" })).toBeVisible()
  resolve({ data: { ...model, roleIds: ["reader", "stock"] } })
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  expect(screen.getByRole("checkbox", { name: "Stock manager" })).toBeChecked()
  expect(screen.getByLabelText("Reason for this change")).toHaveValue("")
})
it("restores a draft after refresh without submitting it", async () => {
  const first = render(<MemberAccessEditor organizationId="org" actorId="actor" memberId="member" locale="en" />)
  fireEvent.click(screen.getByRole("checkbox", { name: "Stock manager" })); fireEvent.change(screen.getByLabelText("Reason for this change"), { target: { value: "Preserve this work" } })
  first.unmount(); render(<MemberAccessEditor organizationId="org" actorId="actor" memberId="member" locale="en" />)
  expect(screen.getByLabelText("Reason for this change")).toHaveValue("Preserve this work"); expect(screen.getByRole("checkbox", { name: "Stock manager" })).toBeChecked(); expect(access.mutation.mutateAsync).not.toHaveBeenCalled()
})
it("retries a restored uncertain request even when its desired roles are already current", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new Error("response lost"))
  const first = render(<MemberAccessEditor organizationId="org" actorId="actor" memberId="member" locale="en" />)
  fireEvent.click(screen.getByRole("checkbox", { name: "Stock manager" })); fireEvent.change(screen.getByLabelText("Reason for this change"), { target: { value: "Unconfirmed change" } }); fireEvent.click(screen.getByRole("button", { name: "Review changes" })); fireEvent.click(screen.getByRole("button", { name: "Confirm access change" })); await screen.findByRole("button", { name: "Retry same request" })
  const original = access.mutation.mutateAsync.mock.calls[0][0]; first.unmount(); model.roleIds = ["reader", "stock"]; model.revision = "b".repeat(64)
  render(<MemberAccessEditor organizationId="org" actorId="actor" memberId="member" locale="en" />); expect(access.mutation.mutateAsync).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Review changes" })); fireEvent.click(screen.getByRole("button", { name: "Retry same request" })); await screen.findByRole("heading", { name: "Member access recorded" })
  expect(access.mutation.mutateAsync).toHaveBeenLastCalledWith(original); expect(window.sessionStorage.length).toBe(0)
})
