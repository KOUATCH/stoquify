import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { deleteCustomerAction } from "@/actions/customers/customerActions"
import { useDeleteCustomer } from "../useCustomerQueries"

jest.mock("@/actions/customers/customerAction2", () => ({ getCustomers: jest.fn() }))
jest.mock("@/actions/customers/customerActions", () => ({ deleteCustomerAction: jest.fn() }))
const mockSuccess = jest.fn()
const mockWarning = jest.fn()
const mockError = jest.fn()
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ success: mockSuccess, warning: mockWarning, error: mockError }) }))
const mockDelete = deleteCustomerAction as jest.Mock

function setup(locale: "en" | "fr") {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = jest.spyOn(client, "invalidateQueries").mockResolvedValue(undefined)
  const hook = renderHook(() => useDeleteCustomer(locale), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
  return { client, invalidate, ...hook }
}

beforeEach(() => jest.resetAllMocks())

it.each(["en", "fr"] as const)("explains retained deactivation in %s", async locale => {
  const receipt = { id: "customer-1", mode: "deactivated", cacheStatus: "invalidated" }
  mockDelete.mockResolvedValue({ success: true, data: receipt })
  const { result, client, invalidate, unmount } = setup(locale)
  await act(async () => { await expect(result.current.mutateAsync("customer-1")).resolves.toEqual(receipt) })
  expect(mockWarning).toHaveBeenCalledWith(locale === "fr" ? "Client désactivé" : "Customer deactivated", expect.stringContaining(locale === "fr" ? "historique" : "history"))
  expect(mockSuccess).not.toHaveBeenCalled()
  expect(mockError).not.toHaveBeenCalled()
  expect(mockDelete).toHaveBeenCalledTimes(1)
  expect(invalidate).toHaveBeenCalled()
  unmount(); client.clear()
})

it.each(["en", "fr"] as const)("explains unused-customer archive in %s", async locale => {
  mockDelete.mockResolvedValue({ success: true, data: { id: "customer-1", mode: "archived", cacheStatus: "invalidated" } })
  const { result, client, unmount } = setup(locale)
  await act(async () => { await result.current.mutateAsync("customer-1") })
  expect(mockSuccess).toHaveBeenCalledWith(locale === "fr" ? "Client archivé" : "Customer archived", expect.any(String))
  expect(mockWarning).not.toHaveBeenCalled()
  expect(mockError).not.toHaveBeenCalled()
  unmount(); client.clear()
})

it("rejects the resolved failure envelope instead of emitting success or clearing cached records", async () => {
  mockDelete.mockResolvedValue({ success: false, error: { userMessage: "Missing customer permission" } })
  const { result, client, invalidate, unmount } = setup("en")
  client.setQueryData(["customers"], [{ id: "customer-1" }])
  await act(async () => { await expect(result.current.mutateAsync("customer-1")).rejects.toThrow("Missing customer permission") })
  expect(invalidate).not.toHaveBeenCalled()
  expect(client.getQueryData(["customers"])).toEqual([{ id: "customer-1" }])
  expect(mockError).toHaveBeenCalledWith(expect.any(String), "Missing customer permission")
  expect(mockSuccess).not.toHaveBeenCalled()
  expect(mockWarning).not.toHaveBeenCalled()
  unmount(); client.clear()
})

it.each(["server", "client"])("keeps a known completed deactivation when %s cache refresh fails", async source => {
  const receipt = { id: "customer-1", mode: "deactivated", cacheStatus: source === "server" ? "deferred" : "invalidated" }
  mockDelete.mockResolvedValue({ success: true, data: receipt })
  const { result, client, invalidate, unmount } = setup("fr")
  if (source === "client") invalidate.mockRejectedValue(new Error("Private cache details"))
  await act(async () => { await expect(result.current.mutateAsync("customer-1")).resolves.toEqual(receipt) })
  expect(mockWarning).toHaveBeenCalledWith("Client désactivé", expect.stringContaining("Actualisez"))
  expect(mockError).not.toHaveBeenCalled()
  expect(mockDelete).toHaveBeenCalledTimes(1)
  unmount(); client.clear()
})
