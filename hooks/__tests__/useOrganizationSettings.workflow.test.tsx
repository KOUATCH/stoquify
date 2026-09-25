import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { organizationQueryKeys, useUpdateOrganizationSettings, useUpdateCurrency, useUpdateTimezone } from "../useOrganizationSettings"
import { updateOrganizationSettings, updateOrganizationCurrency, updateOrganizationTimezone } from "@/actions/organization/organization-settings-actions"
const mockSuccess = jest.fn(), mockError = jest.fn()
jest.mock("@/actions/organization/organization-settings-actions", () => ({ updateOrganizationSettings: jest.fn(), updateOrganizationCurrency: jest.fn(), updateOrganizationTimezone: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: () => ({ success: mockSuccess, error: mockError }) }))
const input = { organizationId: "org-1", data: { name: "Changed" }, expectedUpdatedAt: "2026-09-01T00:00:00.000Z" }
function mount(locale: "en" | "fr") {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 3, retryDelay: 0 } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { ...renderHook(() => ({ general: useUpdateOrganizationSettings(locale), currency: useUpdateCurrency(locale), timezone: useUpdateTimezone(locale) }), { wrapper }), client }
}
beforeEach(() => jest.clearAllMocks())
it.each(["en", "fr"] as const)("preserves %s conflict and fresh-auth codes with local messages and no automatic retry", async locale => {
  const { result, client } = mount(locale)
  for (const code of ["CONFLICT", "FRESH_AUTH_REQUIRED", "FORBIDDEN", "BUSINESS_RULE_VIOLATION"]) {
    ;(updateOrganizationSettings as jest.Mock).mockResolvedValue({ success: false, code, error: "private raw detail" })
    await act(async () => { await expect(result.current.general.mutateAsync(input)).rejects.toMatchObject({ code }) })
  }
  expect(updateOrganizationSettings).toHaveBeenCalledTimes(4); expect(mockSuccess).not.toHaveBeenCalled(); expect(JSON.stringify(mockError.mock.calls)).not.toContain("private raw detail"); client.clear()
})
it("does not report success for incomplete, foreign or lost save responses", async () => {
  const { result, client } = mount("fr")
  for (const data of [undefined, { id: "org-other", updatedAt: input.expectedUpdatedAt }, { id: "org-1", updatedAt: "invalid" }]) {
    ;(updateOrganizationSettings as jest.Mock).mockResolvedValue({ success: true, data })
    await act(async () => { await expect(result.current.general.mutateAsync(input)).rejects.toMatchObject({ code: "UNCERTAIN" }) })
  }
  ;(updateOrganizationSettings as jest.Mock).mockRejectedValue(new Error("private transport detail"))
  await act(async () => { await expect(result.current.general.mutateAsync(input)).rejects.toMatchObject({ code: "UNCERTAIN" }) })
  expect(updateOrganizationSettings).toHaveBeenCalledTimes(4); expect(mockSuccess).not.toHaveBeenCalled(); client.clear()
})
it("updates only the matching tenant cache from the returned saved record and preserves server capability", async () => {
  const { result, client } = mount("en"), saved = { id: "org-1", name: "Canonical saved name", updatedAt: "2026-09-02T00:00:00.000Z" }
  client.setQueryData(organizationQueryKeys.settings("org-1"), { canUpdate: true })
  client.setQueryData(organizationQueryKeys.settings("org-other"), { name: "Other" })
  ;(updateOrganizationSettings as jest.Mock).mockResolvedValue({ success: true, data: saved })
  await act(async () => { await result.current.general.mutateAsync(input) })
  expect(updateOrganizationSettings).toHaveBeenCalledWith("org-1", input.data, input.expectedUpdatedAt)
  expect(client.getQueryData(organizationQueryKeys.settings("org-1"))).toEqual({ ...saved, canUpdate: true })
  expect(client.getQueryData(organizationQueryKeys.settings("org-other"))).toEqual({ name: "Other" })
  expect(mockSuccess).not.toHaveBeenCalled(); expect(mockError).not.toHaveBeenCalled(); client.clear()
})
it("carries the reviewed revision through both retained shortcut hooks", async () => {
  const { result, client } = mount("en")
  for (const action of [updateOrganizationCurrency, updateOrganizationTimezone]) (action as jest.Mock).mockResolvedValue({ success: false, code: "CONFLICT" })
  await act(async () => {
    await result.current.currency.mutateAsync({ organizationId: "org-1", currency: "EUR", expectedUpdatedAt: input.expectedUpdatedAt }).catch(() => undefined)
    await result.current.timezone.mutateAsync({ organizationId: "org-1", timezone: "UTC", expectedUpdatedAt: input.expectedUpdatedAt }).catch(() => undefined)
  })
  expect(updateOrganizationCurrency).toHaveBeenCalledWith("org-1", "EUR", input.expectedUpdatedAt)
  expect(updateOrganizationTimezone).toHaveBeenCalledWith("org-1", "UTC", input.expectedUpdatedAt); client.clear()
})
