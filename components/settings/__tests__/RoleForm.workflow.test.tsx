import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import RoleForm from "@/components/Forms/RoleForm"
import { RoleWorkflowError } from "@/hooks/useRoleEditor"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"

let mockLocale = "en"
let mockQuery: any
const mockSave = jest.fn()
jest.mock("next-intl", () => ({ useLocale: () => mockLocale }))
jest.mock("lucide-react", () => ({ AlertTriangle: () => null, CheckCircle2: () => null, Loader2: () => null, Shield: () => null }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/hooks/useRoleEditor", () => ({
  RoleWorkflowError: class extends Error { constructor(public code: string) { super(code) } },
  useRoleEditor: () => mockQuery,
  useSaveRole: () => ({ mutateAsync: mockSave, isPending: false }),
}))
const role = { id: "target", nameEn: "Cashier", nameFr: "Caissier", description: "Existing", permissions: ["dashboard.read"], organizationId: "org-1", updatedAt: new Date("2026-09-06T09:00:00.000Z") }
const props = { organizationId: "org-1", actorId: "actor", editingId: "target" }
beforeEach(() => {
  mockLocale = "en"; mockSave.mockReset()
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: jest.fn(() => "09ba28c2-5a3a-48ae-b8c5-46e7abff3991") })
  global.structuredClone = value => JSON.parse(JSON.stringify(value))
  mockQuery = { data: { organizationId: "org-1", role, checkedAt: role.updatedAt.toISOString(), canRemove: true, catalogue: [{ category: "Dashboard & Overview", permissions: [{ permission: "dashboard.read", risk: "low", canAdd: true }] }] }, isPending: false, isError: false, refetch: jest.fn().mockResolvedValue({}) }
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
})
async function changeAndReview() {
  await screen.findByDisplayValue("Cashier")
  fireEvent.change(screen.getByLabelText("Role name (English)"), { target: { value: "Reviewer" } })
  fireEvent.click(screen.getByRole("button", { name: "Review changes", exact: true }))
  await screen.findByRole("button", { name: "Save reviewed role", exact: true })
}
it("retains the draft and the same request after a lost save response", async () => {
  mockSave.mockRejectedValueOnce(new Error("Transport lost")).mockResolvedValueOnce({ ...role, nameEn: "Reviewer", updatedAt: new Date("2026-09-06T09:01:00.000Z") })
  render(<RoleForm {...props} />); await changeAndReview()
  fireEvent.click(screen.getByRole("button", { name: "Save reviewed role", exact: true }))
  await screen.findByRole("button", { name: "Retry the same save" })
  expect(screen.getByLabelText("Role name (English)")).toHaveValue("Reviewer")
  expect(screen.getByLabelText("Role name (English)")).toBeDisabled()
  fireEvent.click(screen.getByRole("button", { name: "Retry the same save" }))
  await screen.findByText("Role saved. The change and its audit record were committed together.")
  expect(mockSave).toHaveBeenCalledTimes(2)
  expect(mockSave.mock.calls[1][0]).toEqual(mockSave.mock.calls[0][0])
  expect(mockSave.mock.calls[0][0].command.expectedUpdatedAt).toBe(role.updatedAt.toISOString())
})
it("requires actual password confirmation and a separate save after step-up", async () => {
  mockSave.mockRejectedValueOnce(new RoleWorkflowError("FRESH_AUTH_REQUIRED")).mockResolvedValueOnce({ ...role, nameEn: "Reviewer", updatedAt: new Date() })
  render(<RoleForm {...props} />); await changeAndReview()
  fireEvent.click(screen.getByRole("button", { name: "Save reviewed role", exact: true }))
  const password = await screen.findByLabelText("Current password")
  fireEvent.change(password, { target: { value: "Synthetic password" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm identity", exact: true }))
  await screen.findByText("Identity confirmed. Review and save again.")
  expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument()
  expect(mockSave).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole("button", { name: "Save reviewed role", exact: true }))
  await screen.findByText("Role saved. The change and its audit record were committed together.")
})
it("merges only edited fields into the refreshed record", async () => {
  const view = render(<RoleForm {...props} />); await changeAndReview()
  mockQuery = { ...mockQuery, data: { ...mockQuery.data, role: { ...role, description: "Saved by colleague", updatedAt: new Date("2026-09-06T09:01:00.000Z") } } }
  view.rerender(<RoleForm {...props} />)
  expect(screen.getByLabelText("Role name (English)")).toHaveValue("Reviewer")
  fireEvent.click(screen.getByRole("button", { name: "Keep my edits over the latest record" }))
  await waitFor(() => expect(screen.getByLabelText("Purpose and responsibilities")).toHaveValue("Saved by colleague"))
  expect(screen.getByLabelText("Role name (English)")).toHaveValue("Reviewer")
  expect(mockSave).not.toHaveBeenCalled()
})
it("shows a failed read without presenting an empty editable form", () => {
  mockQuery = { data: undefined, isPending: false, isError: true, error: new RoleWorkflowError("INTERNAL_ERROR"), refetch: jest.fn() }
  render(<RoleForm {...props} />)
  expect(screen.getByRole("alert")).toHaveTextContent("The editor could not be loaded")
  expect(screen.queryByLabelText("Role name (English)")).not.toBeInTheDocument()
})
it("renders French labels and explains an unavailable permission removal", async () => {
  mockLocale = "fr"; mockQuery.data.canRemove = false
  render(<RoleForm {...props} />)
  await screen.findByDisplayValue("Cashier")
  expect(screen.getByRole("heading", { name: "Modifier le rôle" })).toBeVisible()
  fireEvent.change(screen.getByLabelText("Rechercher une autorisation"), { target: { value: "dashboard.read" } })
  expect(screen.getByRole("checkbox", { name: /dashboard.read/ })).toBeDisabled()
  expect(screen.getByText("Vos droits actuels ne permettent pas cette modification.")).toBeVisible()
})
