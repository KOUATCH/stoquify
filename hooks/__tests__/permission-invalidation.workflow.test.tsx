import React from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useSaveRole } from "@/hooks/useRoleEditor"
import { useMemberAccess } from "@/hooks/useMemberAccess"
import { updateRole } from "@/actions/roles/updateRole"
import { changeMemberAccessAction } from "@/actions/users/memberAccess"

jest.mock("@/actions/roles/getRoleEditor", () => ({ getRoleEditor: jest.fn() }))
jest.mock("@/actions/roles/createRole", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/actions/roles/updateRole", () => ({ updateRole: jest.fn() }))
jest.mock("@/actions/users/memberAccess", () => ({ getMemberAccessAction: jest.fn(async () => ({ success: true, data: { organizationId: "org-1" } })), changeMemberAccessAction: jest.fn() }))

beforeEach(() => jest.clearAllMocks())
it.each(["role", "member"])("invalidates cached display permissions after a successful %s change", async kind => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(["permissions", "actor-1"], { permissions: ["payments.reconciliation.match"] })
  ;(updateRole as jest.Mock).mockResolvedValue({ success: true, data: { id: "role-1" } })
  ;(changeMemberAccessAction as jest.Mock).mockResolvedValue({ success: true, data: { id: "receipt-1" } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result } = renderHook(() => ({ role: useSaveRole("role-1"), member: useMemberAccess("org-1", "actor-1", "member-1") }), { wrapper })
  await act(async () => {
    if (kind === "role") await result.current.role.mutateAsync({ data: { name: "Operator", organizationId: "org-1", permissions: [] }, command: { requestId: "request-1", expectedUpdatedAt: "2026-09-06T00:00:00Z" } })
    else await result.current.member.mutation.mutateAsync({ requestId: "e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1", operation: "roles", roleIds: [], reason: "Review", expectedRevision: "a".repeat(64) })
  })
  expect(client.getQueryState(["permissions", "actor-1"])?.isInvalidated).toBe(true)
  client.clear()
})
