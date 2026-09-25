import { renderHook } from "@testing-library/react"
import { useQuery } from "@tanstack/react-query"
import { authClient, usePermissions } from "@/lib/auth-client"

jest.mock("better-auth/react", () => ({ createAuthClient: () => ({ useSession: jest.fn() }) }))
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }))
jest.mock("@/i18n/routing", () => ({ getLocaleFromPathname: () => "en", localizePath: (value: string) => value }))
beforeEach(() => {
  jest.mocked(authClient.useSession).mockReturnValue({ data: { user: { id: "actor-1" } }, isPending: false } as ReturnType<typeof authClient.useSession>)
  jest.mocked(useQuery).mockReturnValue({ data: { userId: "actor-1", organizationId: "org-1", permissions: ["payments.reconciliation.read"] }, isFetching: true, isPending: false, isError: false } as unknown as ReturnType<typeof useQuery>)
})
it("preserves the verified same-actor scope while refetching without retaining write authority", () => {
  const { result } = renderHook(() => usePermissions())
  expect(result.current.organizationId).toBe("org-1")
  expect(result.current.permissionState).toBe("loading")
  expect(result.current.permissions).toEqual([])
  expect(result.current.hasPermission("payments.reconciliation.read")).toBe(false)
})
it("does not reuse a previous actor's cached organization", () => {
  jest.mocked(authClient.useSession).mockReturnValue({ data: { user: { id: "actor-2" } }, isPending: false } as ReturnType<typeof authClient.useSession>)
  const { result } = renderHook(() => usePermissions())
  expect(result.current.organizationId).toBeUndefined()
  expect(result.current.permissions).toEqual([])
})
it("does not expose cache scope after a failed authority refresh", () => {
  jest.mocked(useQuery).mockReturnValue({ data: { userId: "actor-1", organizationId: "org-1", permissions: ["*"] }, isFetching: false, isPending: false, isError: true } as unknown as ReturnType<typeof useQuery>)
  const { result } = renderHook(() => usePermissions())
  expect(result.current.organizationId).toBeUndefined()
  expect(result.current.permissions).toEqual([])
})
