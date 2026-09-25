import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTransferCommand } from "../useTransferLifecycle"
import { executeTransferCommand } from "@/actions/inventory/transferLifecycleActions"
import type { ReactNode } from "react"
jest.mock("@/actions/inventory/transferLifecycleActions", () => ({ executeTransferCommand: jest.fn(), getTransferDetail: jest.fn() }))
jest.mock("../useTransferQueries", () => ({ TransferKeys: { all: ["transfers"], detail: (id: string, org: string) => ["transfers", "detail", id, org] } }))
it("reuses the receipt request key after a failed response and refreshes transfer and stock queries on success", async () => {
  let sequence = 0
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: () => "request-" + (++sequence) })
  const client = new QueryClient()
  const invalidate = jest.spyOn(client, "invalidateQueries")
  const { result } = renderHook(() => useTransferCommand(), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
  const input = { transferId: "transfer", organizationId: "org", operation: "RECEIVE" as const, locationId: "destination", expectedUpdatedAt: "2026-09-12T10:00:00.000Z", lines: [{ lineId: "line", quantity: 2 }] }
  const action = executeTransferCommand as jest.Mock
  action.mockResolvedValueOnce({ success: false, error: { userMessage: "Connection lost" } }).mockResolvedValue({ success: true, data: {} })
  await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow("Connection lost") })
  await act(async () => { await result.current.mutateAsync(input) })
  expect(action.mock.calls[0][0].requestId).toBe(action.mock.calls[1][0].requestId)
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["transfers"] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["inventory"] })
  await act(async () => { await result.current.mutateAsync({ ...input, expectedUpdatedAt: "2026-09-12T10:01:00.000Z" }) })
  expect(action.mock.calls[2][0].requestId).not.toBe(action.mock.calls[0][0].requestId)
  client.clear()
})
