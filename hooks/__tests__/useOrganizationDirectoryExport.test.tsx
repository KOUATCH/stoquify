import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { useOrganizationDirectoryExport } from "../useOrganizationDirectoryExport"
import { getOrganizationDirectoryExportPreviewAction, exportOrganizationDirectoryAction } from "@/actions/organization/organization-directory-export.actions"
jest.mock("@/actions/organization/organization-directory-export.actions", () => ({ getOrganizationDirectoryExportPreviewAction: jest.fn(), exportOrganizationDirectoryAction: jest.fn() }))
const input = { locale: "en" as const, filters: { search: "", status: "all" as const } }
beforeEach(() => jest.resetAllMocks())
function subject() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return renderHook(() => useOrganizationDirectoryExport("org", "actor", input, true), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
}
it.each([{ organizationId: "foreign", actorId: "actor" }, { organizationId: "org", actorId: "foreign" }])("rejects a mismatched preview scope %j", async data => {
  ;(getOrganizationDirectoryExportPreviewAction as jest.Mock).mockResolvedValue({ success: true, data })
  const hook = subject(); await waitFor(() => expect(hook.result.current.query.isError).toBe(true))
  expect(hook.result.current.query.data).toBeUndefined(); expect(hook.result.current.query.error).toMatchObject({ code: "FORBIDDEN" })
})
it("does not automatically retry an uncertain export", async () => {
  ;(getOrganizationDirectoryExportPreviewAction as jest.Mock).mockResolvedValue({ success: true, data: { organizationId: "org", actorId: "actor" } })
  ;(exportOrganizationDirectoryAction as jest.Mock).mockResolvedValue({ success: false, code: "INTERNAL_ERROR" })
  const hook = subject(); await waitFor(() => expect(hook.result.current.query.isSuccess).toBe(true))
  await expect(hook.result.current.mutation.mutateAsync({ ...input, expectedHash: "a".repeat(64), requestId: "e1d8c7ce-79b0-4998-8590-866fc5c0727d" })).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
  expect(exportOrganizationDirectoryAction).toHaveBeenCalledTimes(1)
})
