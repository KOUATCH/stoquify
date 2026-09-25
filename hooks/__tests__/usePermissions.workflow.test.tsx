import React from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { usePermissions } from "@/lib/auth-client"

let mockSession: { data: { user: { id: string } } | null; isPending: boolean }
jest.mock("better-auth/react", () => ({ createAuthClient: () => ({ useSession: () => mockSession }) }))
jest.mock("@/i18n/routing", () => ({ getLocaleFromPathname: () => "en", localizePath: (path: string) => path }))

const originalFetch = global.fetch
const fetchMock = jest.fn()
const snapshot = (userId = "actor-a", permissions = ["payments.reconciliation.match"]) => ({ userId, organizationId: "org-" + userId, permissions, roles: [], fetchedAt: 1000 })
const response = (body: unknown, status = 200) => ({ ok: status === 200, status, json: async () => body })

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => usePermissions(), { wrapper }), client }
}

beforeEach(() => { mockSession = { data: { user: { id: "actor-a" } }, isPending: false }; fetchMock.mockReset(); global.fetch = fetchMock })
afterAll(() => { global.fetch = originalFetch })

it("exposes a failed lookup separately from an empty permission result", async () => {
  fetchMock.mockResolvedValue(response({ error: "AUTHORIZATION_CHECK_FAILED" }, 500))
  const { result } = mount()
  await waitFor(() => expect(result.current.permissionState).toBe("error"))
  expect(result.current.hasPermission("payments.reconciliation.match")).toBe(false)
  expect(result.current.permissionError).toBe("AUTHORIZATION_CHECK_FAILED")
})

it("reads an actor-bound snapshot without browser caching", async () => {
  fetchMock.mockResolvedValue(response(snapshot()))
  const { result } = mount()
  await waitFor(() => expect(result.current.hasPermission("payments.reconciliation.match")).toBe(true))
  expect(result.current.permissionState).toBe("ready")
  expect(fetchMock).toHaveBeenCalledWith("/api/me/permissions", expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }))
})

it("does not retain previously allowed actions after a refresh fails and can retry", async () => {
  fetchMock.mockResolvedValueOnce(response(snapshot())).mockResolvedValueOnce(response({ error: "AUTHORIZATION_CHECK_FAILED" }, 500)).mockResolvedValue(response(snapshot()))
  const { result } = mount()
  await waitFor(() => expect(result.current.hasPermission("payments.reconciliation.match")).toBe(true))
  await act(async () => { await result.current.refreshPermissions() })
  await waitFor(() => expect(result.current.permissionState).toBe("error"))
  expect(result.current.hasPermission("payments.reconciliation.match")).toBe(false)
  await act(async () => { await result.current.refreshPermissions() })
  await waitFor(() => expect(result.current.permissionState).toBe("ready"))
  expect(result.current.hasPermission("payments.reconciliation.match")).toBe(true)
})

it("rejects a response for another actor", async () => {
  fetchMock.mockResolvedValue(response(snapshot("actor-b")))
  const { result } = mount()
  await waitFor(() => expect(result.current.permissionState).toBe("error"))
  expect(result.current.permissionError).toBe("IDENTITY_CHANGED")
  expect(result.current.hasPermission("payments.reconciliation.match")).toBe(false)
})

it("clears the old actor snapshot while a new account is loading", async () => {
  fetchMock.mockResolvedValueOnce(response(snapshot())).mockImplementation(() => new Promise(() => {}))
  const { result, rerender } = mount()
  await waitFor(() => expect(result.current.hasPermission("payments.reconciliation.match")).toBe(true))
  mockSession = { data: { user: { id: "actor-b" } }, isPending: false }; rerender()
  expect(result.current.permissionState).toBe("loading")
  expect(result.current.hasPermission("payments.reconciliation.match")).toBe(false)
})

it("distinguishes a successful empty grant set from failure", async () => {
  fetchMock.mockResolvedValue(response(snapshot("actor-a", [])))
  const { result } = mount()
  await waitFor(() => expect(result.current.permissionState).toBe("ready"))
  expect(result.current.permissions).toEqual([])
  expect(result.current.permissionError).toBeNull()
})

it("does not retain grants or query when signed out", async () => {
  fetchMock.mockResolvedValue(response(snapshot()))
  const { result, rerender } = mount()
  await waitFor(() => expect(result.current.hasPermission("payments.reconciliation.match")).toBe(true))
  mockSession = { data: null, isPending: false }; rerender()
  expect(result.current.permissionState).toBe("signed_out")
  expect(result.current.hasPermission("payments.reconciliation.match")).toBe(false)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
