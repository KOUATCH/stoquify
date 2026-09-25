import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { approveManualMatchAction, proposeManualMatchAction } from "@/actions/payments/reconciliation.actions"
import { useManualMatchWorkflow } from "../payments/usePaymentReconciliationDashboard"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"

let mockLocale: "en" | "fr" = "en"
jest.mock("next-intl", () => ({ useTranslations: () => (key: keyof typeof en.paymentReconciliationWorkbench.manualMatch.recovery) => (mockLocale === "en" ? en : fr).paymentReconciliationWorkbench.manualMatch.recovery[key] }))
jest.mock("@/actions/payments/reconciliation.actions", () => ({ approveManualMatchAction: jest.fn(), proposeManualMatchAction: jest.fn() }))
const input = { providerAccountId: "pa1", paymentTransactionId: "p1", providerEventId: "e1", amountMatched: "60.00", currencyCode: "XAF" }
const approveInput = { proposedMatchId: "proposal-1", expectedEvidenceRevision: `sha256:${"a".repeat(64)}` }
function mount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 1, retryDelay: 0 } } })
  const invalidate = jest.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => useManualMatchWorkflow(), { wrapper }), client, invalidate }
}
beforeEach(() => {
  jest.resetAllMocks()
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: jest.fn().mockReturnValue("7b837bf8-0613-484c-8bbc-408eaa3ea05a") })
})
describe.each(["en", "fr"] as const)("%s manual match recovery", locale => {
  beforeEach(() => { mockLocale = locale })
  it.each([["FORBIDDEN", "denied"], ["FRESH_AUTH_REQUIRED", "auth"], ["SOD_VIOLATION", "independent"], ["CONFLICT", "evidence"], ["CONCURRENCY_CONFLICT", "concurrent"]] as const)("keeps %s as a localized failure without automatic retry", async (code, key) => {
    ;(approveManualMatchAction as jest.Mock).mockResolvedValue({ success: false, code, error: "Private server detail" })
    const { result, client, invalidate } = mount()
    await act(async () => { await expect(result.current.approve.mutateAsync(approveInput)).rejects.toMatchObject({ code, message: (locale === "en" ? en : fr).paymentReconciliationWorkbench.manualMatch.recovery[key] }) })
    expect(approveManualMatchAction).toHaveBeenCalledTimes(1)
    expect(approveManualMatchAction).toHaveBeenCalledWith(approveInput)
    expect(invalidate).not.toHaveBeenCalled(); client.clear()
  })
  it("retries an uncertain result with the same key after rerender and accepts the recorded receipt", async () => {
    ;(proposeManualMatchAction as jest.Mock).mockRejectedValueOnce(new Error("Transport internals")).mockResolvedValueOnce({ success: true, data: { matchId: "saved-1", status: "PROPOSED", alreadyApplied: true } })
    const { result, rerender, client, invalidate } = mount()
    await act(async () => { await expect(result.current.propose.mutateAsync(input)).rejects.toThrow((locale === "en" ? en : fr).paymentReconciliationWorkbench.manualMatch.recovery.unknown) })
    expect(proposeManualMatchAction).toHaveBeenCalledTimes(1); expect(invalidate).not.toHaveBeenCalled()
    rerender()
    await act(async () => { await expect(result.current.propose.mutateAsync(input)).resolves.toMatchObject({ matchId: "saved-1", alreadyApplied: true }) })
    const calls = (proposeManualMatchAction as jest.Mock).mock.calls
    expect(calls[0][0]).toEqual(calls[1][0]); expect(calls[0][0].idempotencyKey).toHaveLength(36)
    expect(invalidate).toHaveBeenCalled(); client.clear()
  })
})
