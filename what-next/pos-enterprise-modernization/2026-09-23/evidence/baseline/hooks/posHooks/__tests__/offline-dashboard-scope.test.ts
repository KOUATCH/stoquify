import { renderHook } from "@testing-library/react"
import { useQuery } from "@tanstack/react-query"
import { getOfflineSyncDashboardAction } from "@/actions/pos/sync.actions"
import { useOfflineSyncDashboard } from "../useOfflineSync"

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }))
jest.mock("@/actions/pos/sync.actions", () => ({ getOfflineSyncDashboardAction: jest.fn() }))
jest.mock("@/components/notifications/NotificationProvider", () => ({ useNotifications: jest.fn() }))

const query = useQuery as jest.Mock
let access: { organizationId?: string; userId?: string; canRead: boolean; canReview: boolean }
function scope(organizationId: string | null = "org-a", userId: string | null = "user-a", allowed = true) {
  access = { organizationId: organizationId ?? undefined, userId: userId ?? undefined, canRead: allowed, canReview: allowed }
}
function options() { return query.mock.calls.at(-1)![0] }

describe("offline dashboard evidence scope", () => {
  beforeEach(() => { jest.clearAllMocks(); scope() })
  it("isolates cached evidence when organization or reviewer changes", () => {
    const { rerender } = renderHook(() => useOfflineSyncDashboard({ terminalId: "terminal" }, { access }))
    const original = options().queryKey
    scope("org-b"); rerender(); expect(options().queryKey).not.toEqual(original)
    const nextOrg = options().queryKey
    scope("org-b", "user-b"); rerender(); expect(options().queryKey).not.toEqual(nextOrg)
  })
  it.each([[null, "user-a", true], ["org-a", null, true], ["org-a", "user-a", false]] as const)("does not fetch without current identity and permission (%s/%s/%s)", (org, user, allowed) => {
    scope(org, user, allowed); renderHook(() => useOfflineSyncDashboard({}, { access })); expect(options().enabled).toBe(false)
  })
  it("preserves the caller's disabled state", () => {
    renderHook(() => useOfflineSyncDashboard({}, { enabled: false, access })); expect(options().enabled).toBe(false)
  })
  it("rejects a failed read rather than returning empty successful evidence", async () => {
    ;(getOfflineSyncDashboardAction as jest.Mock).mockResolvedValue({ success: false, error: "Evidence unavailable" })
    renderHook(() => useOfflineSyncDashboard({}, { access })); await expect(options().queryFn()).rejects.toThrow("Evidence unavailable")
  })
})
