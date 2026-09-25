import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import SelfProfile from "../SelfProfile"
import { authClient, useSession } from "@/lib/auth-client"
import { SelfProfileError, useSelfProfile } from "@/hooks/useSelfProfile"
jest.mock("@/lib/auth-client", () => ({ useSession: jest.fn(), authClient: { getSession: jest.fn(), $store: { notify: jest.fn() } } }))
jest.mock("@/hooks/useSelfProfile", () => ({ useSelfProfile: jest.fn(), SelfProfileError: class extends Error { constructor(public code: string) { super(code) } } }))
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
const props = { actorId: "actor", organizationId: "org", locale: "en" as const }
let model: any, access: any
beforeEach(() => {
  jest.resetAllMocks(); sessionStorage.clear()
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "6e80a55c-a67c-490c-b9e7-47390223ba73" })
  ;(useSession as jest.Mock).mockReturnValue({ isPending: false, data: { user: { id: "actor" } } })
  ;(authClient.getSession as jest.Mock).mockResolvedValue({ data: { user: { id: "actor" } } })
  model = { ...props, fields: { firstName: "Alex", lastName: "Old", jobTitle: "" }, canUpdate: true, snapshotHash: "a".repeat(64), checkedAt: "2026-09-06T12:00:00Z", email: "synthetic@example.invalid", emailVerified: true, history: [] }
  access = { query: { data: model, isError: false, isFetching: false, refetch: jest.fn().mockImplementation(async () => ({ data: model, isError: false })) }, mutation: { mutateAsync: jest.fn().mockResolvedValue({ id: "selfprofile_" + "a".repeat(64), ...props, requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", savedAt: "2026-09-06T12:00:00Z", fields: { firstName: "Camille", lastName: "Old", jobTitle: "" }, changedFields: ["firstName", "name"], replayed: false }) } }
  ;(useSelfProfile as jest.Mock).mockReturnValue(access)
})
const edit = () => fireEvent.change(screen.getByLabelText("Given or display name"), { target: { value: "Camille" } })
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save profile" }))
it("saves only a reviewed command and refreshes the account display after a receipt", async () => {
  render(<SelfProfile {...props} />); edit(); save()
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Profile saved"))
  expect(access.mutation.mutateAsync).toHaveBeenCalledWith({ requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: "a".repeat(64), fields: { firstName: "Camille", lastName: "Old", jobTitle: "" } })
  expect(authClient.getSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } }); expect(sessionStorage.length).toBe(0)
})
it("shows field-level validation without submitting invalid names", async () => {
  render(<SelfProfile {...props} />); fireEvent.change(screen.getByLabelText("Given or display name"), { target: { value: "" } }); save()
  expect(screen.getByLabelText("Given or display name")).toHaveAttribute("aria-invalid", "true")
  expect(screen.getByText("Enter a given or display name.")).toBeVisible(); expect(access.mutation.mutateAsync).not.toHaveBeenCalled()
})
it("preserves the original command across uncertain response, unmount and recovery", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new Error("lost acknowledgement"))
  const view = render(<SelfProfile {...props} />); edit(); save()
  await screen.findByRole("button", { name: "Recover the same profile save" })
  const command = access.mutation.mutateAsync.mock.calls[0][0]; view.unmount(); model.snapshotHash = "b".repeat(64)
  render(<SelfProfile {...props} />); fireEvent.click(await screen.findByRole("button", { name: "Recover the same profile save" }))
  await waitFor(() => expect(access.mutation.mutateAsync).toHaveBeenCalledTimes(2)); expect(access.mutation.mutateAsync).toHaveBeenLastCalledWith(command)
})
it("requires explicit review of stale values while preserving edits", async () => {
  const view = render(<SelfProfile {...props} />); edit(); model = { ...model, snapshotHash: "b".repeat(64), fields: { ...model.fields, firstName: "Other save" } }; access.query.data = model; view.rerender(<SelfProfile {...props} />)
  expect(screen.getByLabelText("Given or display name")).toHaveValue("Camille"); expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Use my edits with this reviewed version" })); save()
  await waitFor(() => expect(access.mutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expectedHash: "b".repeat(64), fields: expect.objectContaining({ firstName: "Camille" }) })))
})
it("retains drafts through read failure and offers reload with an uncertain pending request", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new Error("lost")); const view = render(<SelfProfile {...props} />); edit(); save()
  await screen.findByRole("button", { name: "Recover the same profile save" }); access.query.isError = true; view.rerender(<SelfProfile {...props} />)
  expect(screen.getByText(/Saved details have not been replaced with empty values/)).toBeVisible()
  expect(screen.getByRole("button", { name: "Reload current account record" })).toBeEnabled()
  access.query.isError = false; view.rerender(<SelfProfile {...props} />); expect(screen.getByLabelText("Given or display name")).toHaveValue("Camille")
})
it("recovers the original request after current edit permission is restored", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new SelfProfileError("FORBIDDEN")); render(<SelfProfile {...props} />); edit(); save()
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("current session or permissions"))
  fireEvent.click(screen.getByRole("button", { name: "Reload current account record" }))
  await waitFor(() => expect(screen.getByRole("button", { name: "Recover the same profile save" })).toBeEnabled())
})
it("shows French read-only fields and hides the edit submission", () => {
  model.canUpdate = false; render(<SelfProfile {...props} locale="fr" />)
  expect(screen.getByLabelText("Prénom ou nom d’affichage")).toHaveAttribute("readonly")
  expect(screen.queryByRole("button", { name: "Enregistrer le profil" })).not.toBeInTheDocument()
})
it("hides profile data when the signed-in identity changes", () => {
  ;(useSession as jest.Mock).mockReturnValue({ isPending: false, data: { user: { id: "foreign" } } }); render(<SelfProfile {...props} />)
  expect(screen.getByRole("alert")).toHaveTextContent("signed-in account changed"); expect(useSelfProfile).not.toHaveBeenCalled()
})
it("keeps a confirmed save distinct from failed account-display refresh", async () => {
  ;(authClient.getSession as jest.Mock).mockResolvedValue({ error: { message: "unavailable" } }); render(<SelfProfile {...props} />); edit(); save()
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("profile is saved")); expect(screen.getByRole("status")).toHaveTextContent("Profile saved")
})
