import { getCashPaymentHistoryAction, prepareCashPaymentHistoryExportAction } from "../cash-payment-history.actions"
import { readCashPaymentHistory } from "@/services/pos/cash-payment-history.service"
import { requireAnyPermission } from "@/lib/security/rbac"
import { requireFreshAuth } from "@/lib/security/auth-session"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

jest.mock("@/lib/security/rbac", () => ({
  requireAnyPermission: jest.fn(),
}))

jest.mock("@/lib/security/auth-session", () => ({
  requireFreshAuth: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/pos/cash-payment-history.service", () => ({
  readCashPaymentHistory: jest.fn(),
}))

const mockRequireAnyPermission = requireAnyPermission as jest.MockedFunction<typeof requireAnyPermission>
const mockRequireFreshAuth = requireFreshAuth as jest.MockedFunction<typeof requireFreshAuth>
const mockObserveModuleAccess = observeModuleAccess as jest.MockedFunction<typeof observeModuleAccess>
const mockReadCashPaymentHistory = readCashPaymentHistory as jest.MockedFunction<typeof readCashPaymentHistory>

function allowModules() {
  mockObserveModuleAccess.mockResolvedValue({
    organizationId: "org-1",
    userId: "user-1",
    moduleSlug: "cash_drawer",
    surfaceType: "action",
    surface: "test",
    accessIntent: "read",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "available",
    entitlement: null,
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: false,
    evaluatedAt: "2026-07-17T10:00:00.000Z",
  } as any)
}

describe("cash payment history actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    allowModules()
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "cashier-1",
      permissions: ["pos.read"],
    } as any)
    mockReadCashPaymentHistory.mockResolvedValue({
      rows: [],
      pageInfo: { nextCursor: null, hasMore: false },
      appliedFilters: {
        lane: "all",
        locationId: null,
        cashierId: null,
        paymentMethod: null,
        paymentStatus: null,
        cashType: null,
        dateFrom: null,
        dateTo: null,
        effectiveAsOf: null,
        timezone: "Africa/Douala",
        accessMode: "own",
        pageSize: 50,
      },
      summary: {
        transactionCount: 0,
        cashEventCount: 0,
        paymentEventCount: 0,
        openingFloat: "0.00",
        cashInflows: "0.00",
        cashOutflows: "0.00",
        countedCash: "0.00",
        expectedPhysicalCash: "0.00",
        cashVariance: "0.00",
        electronicTenderTotal: "0.00",
        paymentCapturedTotal: "0.00",
        unresolvedPaymentCount: 0,
        currency: "XAF",
      },
      snapshot: {
        recordedThrough: "2026-07-17T10:00:00.000Z",
        generatedAt: "2026-07-17T10:00:00.000Z",
        timezone: "Africa/Douala",
      },
      completeness: { state: "complete", sources: [] },
    })
  })

  it("uses own access for cashier-level readers and enforces both modules", async () => {
    const result = await getCashPaymentHistoryAction({ filters: { lane: "cash" } })

    expect(result.success).toBe(true)
    expect(mockReadCashPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "cashier-1",
        accessMode: "own",
        actorPermissions: ["pos.read"],
      }),
    )
    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(2)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "cash_drawer", mode: "enforce" }))
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "payment_reconciliation", mode: "enforce" }))
  })

  it("uses manager access for finance/payment readers", async () => {
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "manager-1",
      permissions: ["finance.cash-drawer.read", "payments.reconciliation.read"],
    } as any)

    await getCashPaymentHistoryAction({ filters: { lane: "all" } })

    expect(mockReadCashPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "manager-1",
        accessMode: "manager",
      }),
    )
  })

  it("requires fresh auth and controlled export permission for export preparation", async () => {
    mockRequireAnyPermission.mockResolvedValue({
      orgId: "org-1",
      userId: "finance-1",
      permissions: ["payments.export", "reports.export"],
    } as any)
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: new Date().toISOString() } } as any)

    const result = await prepareCashPaymentHistoryExportAction({ rowCount: 10 })

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalledWith(300)
    expect(result.data?.decision.allowed).toBe(true)
    expect(result.data?.decision.action).toBe("payment.export")
  })
})
