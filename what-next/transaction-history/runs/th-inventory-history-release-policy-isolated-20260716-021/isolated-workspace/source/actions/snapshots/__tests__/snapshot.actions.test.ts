jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & { __snapshotProtectOptions?: Array<Record<string, unknown>> }
    store.__snapshotProtectOptions = store.__snapshotProtectOptions ?? []
    store.__snapshotProtectOptions.push(options)
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["dashboard.read", "payments.reconciliation.read", "inventory.read", "accounting.close.read"],
        isSuperUser: false,
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/branch-operating-snapshot.service", () => ({
  getBranchOperatingSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/payment-truth-snapshot.service", () => ({
  getPaymentTruthSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/inventory-cash-snapshot.service", () => ({
  getInventoryCashSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/close-readiness-snapshot.service", () => ({
  getCloseReadinessSnapshot: jest.fn(),
}))

jest.mock("@/services/snapshots/snapshot-rebuild.service", () => ({
  rebuildSnapshotBundle: jest.fn(),
}))

import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { rebuildSnapshotBundle } from "@/services/snapshots/snapshot-rebuild.service"

import { getPaymentTruthSnapshotAction, rebuildSnapshotBundleAction } from "../snapshot.actions"

const mockGetPaymentTruthSnapshot = getPaymentTruthSnapshot as jest.Mock
const mockRebuildSnapshotBundle = rebuildSnapshotBundle as jest.Mock

describe("snapshot actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPaymentTruthSnapshot.mockResolvedValue({ kind: "payment.truth" })
    mockRebuildSnapshotBundle.mockResolvedValue({ status: "fresh" })
  })

  it("derives tenant from RBAC context instead of caller input", async () => {
    const result = await getPaymentTruthSnapshotAction({
      organizationId: "attacker-org",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    })

    expect(result.success).toBe(true)
    expect(mockGetPaymentTruthSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        periodStart: new Date("2026-06-01T00:00:00.000Z"),
        periodEnd: new Date("2026-06-30T00:00:00.000Z"),
      }),
    )
  })

  it("registers server-side permissions for each snapshot surface", async () => {
    await rebuildSnapshotBundleAction({ includeBranch: true })

    const store = globalThis as typeof globalThis & { __snapshotProtectOptions?: Array<Record<string, unknown>> }
    expect(mockRebuildSnapshotBundle).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-session", includeBranch: true }),
    )
    expect(store.__snapshotProtectOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: "dashboard.read" }),
        expect.objectContaining({ permission: "payments.reconciliation.read" }),
        expect.objectContaining({ permission: "inventory.read" }),
        expect.objectContaining({ permission: "accounting.close.read" }),
      ]),
    )
  })
})

