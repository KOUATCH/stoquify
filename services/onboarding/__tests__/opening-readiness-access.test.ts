jest.mock("server-only", () => ({}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/services/customer/customer.service", () => ({ createCustomer: jest.fn() }))
jest.mock("@/services/supplier/supplier.service", () => ({ createSupplier: jest.fn() }))
jest.mock("@/services/item/item.service", () => ({ createItem: jest.fn() }))
jest.mock("@/prisma/db", () => ({ db: {
  onboardingReadinessMilestone: { findMany: jest.fn() },
  onboardingImportBatch: { findMany: jest.fn(), findFirst: jest.fn() },
} }))
jest.mock("@/lib/security/rbac", () => ({
  requireAnyPermission: jest.fn(), requirePermission: jest.fn(),
  hasRbacPermission: (permissions: string[], permission: string) => permissions.includes(permission),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
import { getMasterDataOnboardingDashboardAction, approveMasterDataImportAction } from "@/actions/onboarding/master-data-onboarding.actions"
import { db } from "@/prisma/db"
import { requireAnyPermission, requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

describe("opening guidance server scope", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(requireAnyPermission).mockResolvedValue({ orgId: "session-org", userId: "actor", permissions: ["customers.read"] } as never)
    jest.mocked(requirePermission).mockResolvedValue({ orgId: "session-org", userId: "actor", permissions: ["customers.create"] } as never)
    jest.mocked(observeModuleAccess).mockResolvedValue({ allowed: true } as never)
    jest.mocked(db.onboardingReadinessMilestone.findMany).mockResolvedValue([])
    jest.mocked(db.onboardingImportBatch.findMany).mockResolvedValue([])
  })
  it("queries only the fresh actor's tenant and readable targets, including the new guidance", async () => {
    const data = await getMasterDataOnboardingDashboardAction()
    expect(db.onboardingReadinessMilestone.findMany).toHaveBeenCalledWith({ where: { organizationId: "session-org", target: { in: ["CUSTOMER"] } } })
    expect(db.onboardingImportBatch.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "session-org", target: { in: ["CUSTOMER"] } } }))
    expect(data.openingReadiness.masters.map(row => row.target)).toEqual(["CUSTOMER"])
    expect(data.openingReadiness.state).toBe("REVIEW_REQUIRED")
  })
  it("denies unauthorized actors before reading evidence", async () => {
    jest.mocked(requireAnyPermission).mockRejectedValue(new Error("permission denied"))
    await expect(getMasterDataOnboardingDashboardAction()).rejects.toThrow("permission denied")
    expect(db.onboardingImportBatch.findMany).not.toHaveBeenCalled()
  })
  it("denies a locked settings module before reading evidence", async () => {
    jest.mocked(observeModuleAccess).mockResolvedValue({ allowed: false } as never)
    await expect(getMasterDataOnboardingDashboardAction()).rejects.toThrow("not enabled")
    expect(db.onboardingImportBatch.findMany).not.toHaveBeenCalled()
  })
  it("ignores a spoofed tenant and denies a foreign batch", async () => {
    jest.mocked(db.onboardingImportBatch.findFirst).mockResolvedValue(null)
    await expect(approveMasterDataImportAction({ target: "CUSTOMER", batchId: "foreign-batch", organizationId: "foreign-org", expectedApprovalDigest: `sha256:${"a".repeat(64)}` })).rejects.toThrow()
    expect(db.onboardingImportBatch.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign-batch", organizationId: "session-org" } }))
  })
})
