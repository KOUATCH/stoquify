import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { reserveInventory } from "@/actions/inventory/inventoryMovementActions"
import { notify } from "@/lib/notifications/notify"
import { InventoryMovementKeys, useInventoryReservation } from "../useInventoryMovementQueries"

const copy = {
  en: { success: "Inventory reserved.", denied: "This role or workspace cannot reserve inventory. Ask your administrator to review access.", auth: "Sign in again before requesting an inventory reservation.", unknown: "The reservation result could not be confirmed. Review current reservations before trying again." },
  fr: { success: "Stock réservé.", denied: "Ce rôle ou cet espace ne permet pas de réserver du stock. Demandez à votre administrateur de vérifier les accès.", auth: "Reconnectez-vous avant de demander une réservation de stock.", unknown: "Le résultat de la réservation n’a pas pu être confirmé. Vérifiez les réservations actuelles avant de réessayer." },
}
let mockLocale: keyof typeof copy = "en"
jest.mock("next-intl", () => ({ useTranslations: () => (key: keyof typeof copy.en) => copy[mockLocale][key] }))
jest.mock("@/actions/inventory/inventoryMovementActions", () => ({ reserveInventory: jest.fn(), getInventoryTransactions: jest.fn(), getStockMovementSummary: jest.fn() }))
jest.mock("@/lib/notifications/notify", () => ({ notify: { success: jest.fn(), error: jest.fn() } }))
const request = { organizationId: "org-1", itemId: "item-1", locationId: "loc-1", quantity: 2, reason: "Customer order" }

function mount() {
  // The hook must override a provider's generic retry policy for this non-idempotent mutation.
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 1, retryDelay: 0 } } })
  const invalidate = jest.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => useInventoryReservation(), { wrapper }), invalidate, client }
}

beforeEach(() => { jest.clearAllMocks(); (reserveInventory as jest.Mock).mockReset() })

describe.each(["en", "fr"] as const)("%s reservation feedback", locale => {
  beforeEach(() => { mockLocale = locale })

  it.each([["FORBIDDEN", "denied"], ["AUTH_REQUIRED", "auth"], ["INTERNAL", "unknown"]] as const)("rejects a resolved %s without success feedback or cache invalidation", async (code, key) => {
    ;(reserveInventory as jest.Mock).mockResolvedValue({ success: false, error: { code, userMessage: "Raw server message" } })
    const { result, invalidate, client } = mount()
    let error: unknown
    await act(async () => { try { await result.current.mutateAsync(request) } catch (caught) { error = caught } })
    expect(error).toEqual(new Error(copy[locale][key]))
    expect(reserveInventory).toHaveBeenCalledTimes(1)
    expect(notify.error).toHaveBeenCalledWith(copy[locale][key])
    expect(notify.success).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    client.clear()
  })

  it("does not retry an unknown network result or expose technical error text", async () => {
    ;(reserveInventory as jest.Mock).mockRejectedValue(new Error("Internal transport details"))
    const { result, invalidate, client } = mount()
    await act(async () => { await result.current.mutateAsync(request).catch(() => undefined) })
    expect(reserveInventory).toHaveBeenCalledTimes(1)
    expect(notify.error).toHaveBeenCalledWith(copy[locale].unknown)
    expect(notify.success).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    client.clear()
  })

  it("announces real success and refreshes affected stock queries once", async () => {
    ;(reserveInventory as jest.Mock).mockResolvedValue({ success: true, data: { message: "Raw server success" } })
    const { result, invalidate, client } = mount()
    await act(async () => { await result.current.mutateAsync(request) })
    expect(reserveInventory).toHaveBeenCalledTimes(1)
    expect(notify.success).toHaveBeenCalledWith(copy[locale].success)
    expect(notify.error).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: InventoryMovementKeys.all })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["inventory"] })
    client.clear()
  })
})
