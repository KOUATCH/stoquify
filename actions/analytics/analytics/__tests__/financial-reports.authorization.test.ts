import {
  getCashFlowReport,
  getCashierPerformanceReport,
  getFinancialSummaryReport,
  getItemPerformanceReport,
} from "@/actions/analytics/analytics/financial-reports"
import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import {
  getCashFlowReportReadModel,
  getCashierPerformanceReportReadModel,
  getFinancialSummaryReportReadModel,
  getItemPerformanceReportReadModel,
} from "@/services/analytics/financial-reports.service"

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/services/analytics/financial-reports.service", () => ({
  getCashFlowReportReadModel: jest.fn(),
  getCashierPerformanceReportReadModel: jest.fn(),
  getFinancialSummaryReportReadModel: jest.fn(),
  getItemPerformanceReportReadModel: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock

const actions = [
  ["financial summary", getFinancialSummaryReport, getFinancialSummaryReportReadModel as jest.Mock],
  ["cashier performance", getCashierPerformanceReport, getCashierPerformanceReportReadModel as jest.Mock],
  ["item performance", getItemPerformanceReport, getItemPerformanceReportReadModel as jest.Mock],
  ["cash flow", getCashFlowReport, getCashFlowReportReadModel as jest.Mock],
] as const

describe("analytics financial report authorization", () => {
  const startDate = new Date("2026-07-01T00:00:00.000Z")
  const endDate = new Date("2026-07-31T23:59:59.999Z")

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      userId: "operator-1",
      orgId: "org-1",
      permissions: ["reports.read"],
      isSuperUser: false,
    })
    mockAssertCanUseOrganization.mockResolvedValue(undefined)
  })

  it.each(actions)("allows a reports.read operator to load the %s report", async (name, action, readModel) => {
    readModel.mockResolvedValue({ kind: name })

    await expect(action("org-1", "location-1", startDate, endDate)).resolves.toEqual({ kind: name })

    expect(mockRequirePermission).toHaveBeenCalledWith("reports.read", { resource: "AnalyticsReport" })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "operator-1", orgId: "org-1" }),
      "org-1",
    )
    expect(readModel).toHaveBeenCalledWith({
      organizationId: "org-1",
      locationId: "location-1",
      startDate,
      endDate,
    })
  })

  it.each(actions)("denies an operator without reports.read before loading the %s report", async (_name, action, readModel) => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden: missing permission reports.read"))

    await expect(action("org-1", "location-1", startDate, endDate)).rejects.toThrow(
      "Forbidden: missing permission reports.read",
    )

    expect(mockAssertCanUseOrganization).not.toHaveBeenCalled()
    expect(readModel).not.toHaveBeenCalled()
  })
})
