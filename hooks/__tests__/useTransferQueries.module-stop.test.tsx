import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useCreateTransfer } from "../useTransferQueries"
import { createLocationTransfer } from "@/actions/inventory/inventoryMovementActions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

let mockLocale = "en"
const mockFormError = jest.fn()
const mockError = jest.fn()
jest.mock("next-intl", () => ({ useTranslations: () => (key: "deniedMessage" | "deniedTitle") => (mockLocale === "fr" ? fr : en).moduleComposition.stop[key] }))
jest.mock("@/actions/inventory/inventoryMovementActions", () => ({ createLocationTransfer: jest.fn(), approveTransfer: jest.fn(), getTransfers: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ formSuccess: jest.fn(), formError: mockFormError, error: mockError }) }))

beforeEach(() => { jest.clearAllMocks(); mockLocale = "en" })

it.each(["en", "fr"])("shows the %s stopped-work denial and preserves the failed transfer", async locale => {
  mockLocale = locale
  const copy = (locale === "fr" ? fr : en).moduleComposition.stop
  ;(createLocationTransfer as jest.Mock).mockResolvedValue({ success: false, error: { code: "FORBIDDEN", reason: "MODULE_NEW_WORK_STOPPED", userMessage: "English fallback" } })
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const { result } = renderHook(() => useCreateTransfer(), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
  await act(async () => { await result.current.mutateAsync({ fromLocationId: "one", toLocationId: "two", organizationId: "org", createdById: "actor", priority: "NORMAL", lines: [{ itemId: "item", requestedQuantity: 1 }] }).catch(() => undefined) })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(mockError).toHaveBeenCalledWith(copy.deniedTitle, copy.deniedMessage)
  expect(mockFormError).not.toHaveBeenCalled()
  expect(result.current.data).toBeUndefined()
  client.clear()
})

it("does not replace an unrelated permission failure", async () => {
  ;(createLocationTransfer as jest.Mock).mockResolvedValue({ success: false, error: { code: "FORBIDDEN", userMessage: "Existing permission message" } })
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const { result } = renderHook(() => useCreateTransfer(), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
  await act(async () => { await result.current.mutateAsync({ fromLocationId: "one", toLocationId: "two", organizationId: "org", createdById: "actor", priority: "NORMAL", lines: [{ itemId: "item", requestedQuantity: 1 }] }).catch(() => undefined) })
  expect(mockFormError).toHaveBeenCalledWith("Create Transfer", "Existing permission message")
  client.clear()
})
