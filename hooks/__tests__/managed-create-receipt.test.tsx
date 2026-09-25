import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { createManagedCustomer } from "@/actions/customers/customer-management-actions"
import { createManagedSupplier } from "@/actions/suppliers/supplier-management-actions"
import { customerManagementKeys, useCreateManagedCustomer } from "../useCustomerManagement"
import { supplierManagementKeys, useCreateManagedSupplier } from "../useSupplierManagement"

jest.mock("@/actions/customers/customer-management-actions", () => ({ createManagedCustomer: jest.fn() }))
jest.mock("@/actions/suppliers/supplier-management-actions", () => ({ createManagedSupplier: jest.fn() }))
const mockSuccess = jest.fn()
const mockWarning = jest.fn()
const mockError = jest.fn()
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ success: mockSuccess, warning: mockWarning, error: mockError }) }))

const cases = [
  { entity: "customer", useCreate: useCreateManagedCustomer, action: createManagedCustomer as jest.Mock, dashboardKey: customerManagementKeys.dashboard("org-1") },
  { entity: "supplier", useCreate: useCreateManagedSupplier, action: createManagedSupplier as jest.Mock, dashboardKey: supplierManagementKeys.dashboard("org-1") },
]
const input = { name: "Committed record", code: "TEST-1", isActive: true, preferredLocale: "EN" as const }
const saved = { id: "saved-id", organizationId: "org-1", name: input.name, code: input.code, cacheStatus: "invalidated" as const }

beforeEach(() => jest.resetAllMocks())

describe.each(cases)("$entity creation outcome", ({ useCreate, action, dashboardKey }) => {
  function setup(locale: "en" | "fr") {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
    client.setQueryData(dashboardKey, { existing: true })
    const invalidate = jest.spyOn(client, "invalidateQueries").mockResolvedValue(undefined)
    const hook = renderHook(() => useCreate("org-1", locale), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
    return { client, invalidate, ...hook }
  }

  it.each(["en", "fr"] as const)("keeps the saved %s result when client refresh fails", async locale => {
    action.mockResolvedValue({ success: true, data: saved })
    const { result, client, invalidate, unmount } = setup(locale)
    invalidate.mockRejectedValue(new Error("Private query failure"))

    await act(async () => { await expect(result.current.mutateAsync(input)).resolves.toEqual(saved) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(action).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dashboardKey }, { throwOnError: true })
    expect(client.getQueryData(dashboardKey)).toEqual({ existing: true })
    expect(mockWarning).toHaveBeenCalledWith(expect.any(String), expect.stringContaining(locale === "fr" ? "Actualisez" : "Refresh"))
    expect(mockWarning.mock.calls[0][1]).not.toContain("Private query failure")
    expect(mockError).not.toHaveBeenCalled()
    expect(mockSuccess).not.toHaveBeenCalled()
    unmount(); client.clear()
  })

  it.each(["en", "fr"] as const)("explains deferred server invalidation in %s without rejecting creation", async locale => {
    action.mockResolvedValue({ success: true, data: { ...saved, cacheStatus: "deferred" } })
    const { result, client, unmount } = setup(locale)
    await act(async () => { await result.current.mutateAsync(input) })
    expect(mockWarning).toHaveBeenCalledWith(expect.any(String), expect.stringContaining(locale === "fr" ? "Actualisez" : "Refresh"))
    expect(mockError).not.toHaveBeenCalled()
    expect(action).toHaveBeenCalledTimes(1)
    unmount(); client.clear()
  })

  it("reports success when both invalidation stages succeed", async () => {
    action.mockResolvedValue({ success: true, data: saved })
    const { result, client, unmount } = setup("en")
    await act(async () => { await result.current.mutateAsync(input) })
    expect(mockSuccess).toHaveBeenCalledTimes(1)
    expect(mockWarning).not.toHaveBeenCalled()
    expect(mockError).not.toHaveBeenCalled()
    unmount(); client.clear()
  })

  it("rejects a genuine creation failure and leaves the caller's draft unchanged", async () => {
    action.mockResolvedValue({ success: false, error: "Existing permission denied" })
    const draft = { ...input }
    const { result, client, invalidate, unmount } = setup("fr")
    await act(async () => { await expect(result.current.mutateAsync(draft)).rejects.toThrow("Existing permission denied") })
    expect(draft).toEqual(input)
    expect(invalidate).not.toHaveBeenCalled()
    expect(mockError).toHaveBeenCalledWith(expect.any(String), "Existing permission denied")
    expect(mockWarning).not.toHaveBeenCalled()
    expect(mockSuccess).not.toHaveBeenCalled()
    expect(action).toHaveBeenCalledTimes(1)
    unmount(); client.clear()
  })
})
