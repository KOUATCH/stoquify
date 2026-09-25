import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import OrganizationDirectoryExport from "../OrganizationDirectoryExport"
import { useOrganizationDirectoryExport, OrganizationDirectoryExportError } from "@/hooks/useOrganizationDirectoryExport"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { useSession } from "@/lib/auth-client"
jest.mock("lucide-react", () => ({ Download: () => null, X: () => null }))
jest.mock("@/hooks/useOrganizationDirectoryExport", () => ({ useOrganizationDirectoryExport: jest.fn(), OrganizationDirectoryExportError: class extends Error { constructor(public code: string) { super(code) } } }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
jest.mock("@/lib/auth-client", () => ({ useSession: jest.fn() }))
let model: any, access: any, click: jest.SpyInstance
const props = { organizationId: "org", locale: "en" as const, filters: { search: "", status: "all" as const }, canExport: true, available: true }
beforeEach(() => {
  jest.resetAllMocks(); sessionStorage.clear()
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "e1d8c7ce-79b0-4998-8590-866fc5c0727d" })
  URL.createObjectURL = jest.fn(() => "blob:test"); URL.revokeObjectURL = jest.fn()
  click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  model = { organizationId: "org", actorId: "actor", snapshotHash: "a".repeat(64), rows: [["Current company"]], headings: ["Name"], rowCount: 1, checkedAt: "2026-09-06T12:00:00Z" }
  access = { query: { data: model, isError: false, isFetching: false, isPending: false, refetch: jest.fn() }, mutation: { mutateAsync: jest.fn().mockResolvedValue({ contentBase64: Buffer.from("Company CSV").toString("base64"), fileName: "company.csv", mimeType: "text/csv;charset=utf-8", auditId: "recorded-export", replayed: false }) } }
  ;(useSession as jest.Mock).mockReturnValue({ data: { user: { id: "actor" } }, isPending: false })
  ;(useOrganizationDirectoryExport as jest.Mock).mockReturnValue(access)
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({ success: true })
})
afterEach(() => click.mockRestore())
function open(locale: "en" | "fr" = "en") { const view = render(<OrganizationDirectoryExport {...props} locale={locale} />); fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Export" : "Exporter", exact: true })); return view }
it("explains unavailable export authority", () => {
  render(<OrganizationDirectoryExport {...props} canExport={false} />)
  expect(screen.getByRole("button", { name: "Export", exact: true })).toBeDisabled()
  expect(screen.getByText("Report-export permission is required.")).toBeVisible(); expect(access.mutation.mutateAsync).not.toHaveBeenCalled()
})
it("never exports from a failed preview", () => {
  access.query.isError = true; access.query.data = undefined; open()
  expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded")
  expect(screen.queryByRole("button", { name: "Prepare reviewed CSV" })).not.toBeInTheDocument()
})
it("requires explicit preparation after confirming the password", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new OrganizationDirectoryExportError("FRESH_AUTH_REQUIRED")); open()
  fireEvent.click(screen.getByRole("button", { name: "Prepare reviewed CSV" }))
  fireEvent.change(await screen.findByLabelText("Your password"), { target: { value: "test-only-password" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm identity" }))
  await waitFor(() => expect(screen.getByRole("button", { name: "Prepare reviewed CSV" })).toBeEnabled())
  expect(access.mutation.mutateAsync).toHaveBeenCalledTimes(1); expect(screen.queryByLabelText("Your password")).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Prepare reviewed CSV" }))
  await screen.findByRole("button", { name: "Download prepared file again" }); expect(access.mutation.mutateAsync.mock.calls[1][0]).toEqual(access.mutation.mutateAsync.mock.calls[0][0])
})
it("recovers an interrupted request across refresh with the exact original identity", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new Error("response lost")); const view = open()
  fireEvent.click(screen.getByRole("button", { name: "Prepare reviewed CSV" })); await screen.findByRole("button", { name: "Retry same export request" })
  const original = access.mutation.mutateAsync.mock.calls[0][0]; view.unmount(); model.snapshotHash = "b".repeat(64); open()
  expect(access.mutation.mutateAsync).toHaveBeenCalledTimes(1)
  fireEvent.click(await screen.findByRole("button", { name: "Retry same export request" }))
  await screen.findByRole("button", { name: "Download prepared file again" })
  expect(access.mutation.mutateAsync).toHaveBeenLastCalledWith(original); expect(sessionStorage.length).toBe(0)
})
it("keeps the prepared file for a failed browser download without creating another audit request", async () => {
  click.mockImplementationOnce(() => { throw new Error("download blocked") }); open()
  fireEvent.click(screen.getByRole("button", { name: "Prepare reviewed CSV" }))
  const again = await screen.findByRole("button", { name: "Download prepared file again" })
  expect(screen.getByRole("status")).toHaveTextContent("browser download failed")
  fireEvent.click(again); expect(click).toHaveBeenCalledTimes(2); expect(access.mutation.mutateAsync).toHaveBeenCalledTimes(1)
})
it("explains French stale evidence without preparing a replacement automatically", async () => {
  access.mutation.mutateAsync.mockRejectedValueOnce(new OrganizationDirectoryExportError("CONFLICT")); open("fr")
  fireEvent.click(screen.getByRole("button", { name: "Préparer le CSV vérifié" }))
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("ont changé"))
  expect(screen.getByRole("button", { name: "Préparer le CSV vérifié" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Recharger et vérifier les données actuelles" })).toBeEnabled()
})
it("removes another actor's prepared file when identity changes", async () => {
  const view = open(); fireEvent.click(screen.getByRole("button", { name: "Prepare reviewed CSV" })); await screen.findByRole("button", { name: "Download prepared file again" })
  ;(useSession as jest.Mock).mockReturnValue({ data: { user: { id: "another-actor" } }, isPending: false })
  view.rerender(<OrganizationDirectoryExport {...props} />)
  expect(screen.queryByRole("button", { name: "Download prepared file again" })).not.toBeInTheDocument()
})
