jest.mock("@/lib/security/rbac", () => ({
  requireAnyPermission: jest.fn(),
}))

jest.mock("@/services/finance/finance-dashboard.service", () => ({
  getFinanceDashboard: jest.fn(),
}))

import { requireAnyPermission } from "@/lib/security/rbac"
import { getFinanceDashboard } from "@/services/finance/finance-dashboard.service"

import { getFinanceDashboardAction } from "../finance-dashboard.actions"

const mockRequireAnyPermission = requireAnyPermission as jest.Mock
const mockGetFinanceDashboard = getFinanceDashboard as jest.Mock

const dashboardData = {
  generatedAt: "2026-06-24T00:00:00.000Z",
  organization: { id: "org-1", name: "Acme", currency: "XAF" },
  filters: {
    view: "receivables",
    locationId: null,
    period: "mtd",
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-06-24T23:59:59.999Z",
  },
  locations: [],
  summary: {},
  aging: { receivables: {}, payables: {} },
  paymentMethods: [],
  trend: [],
  topReceivables: [],
  topPayables: [],
  recentPayments: [],
  alerts: [],
}

describe("finance dashboard action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAnyPermission.mockResolvedValue({ orgId: "org-1", userId: "user-1", permissions: ["finance.receivables.read"] })
    mockGetFinanceDashboard.mockResolvedValue(dashboardData)
  })

  it("guards the requested dashboard view before reading finance data", async () => {
    const result = await getFinanceDashboardAction({ view: "receivables" })

    expect(result.success).toBe(true)
    expect(mockRequireAnyPermission).toHaveBeenCalledWith(
      expect.arrayContaining(["finance.receivables.read", "finance.read"]),
      { resource: "FinanceDashboard", resourceId: "receivables" },
    )
    expect(mockGetFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1", view: "receivables", period: "mtd" }),
    )
  })

  it("returns a safe action error without reading data when the view guard denies access", async () => {
    mockRequireAnyPermission.mockRejectedValue(new Error("Forbidden: missing finance permission"))

    const result = await getFinanceDashboardAction({ view: "payables" })

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(mockGetFinanceDashboard).not.toHaveBeenCalled()
  })
})
