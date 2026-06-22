jest.mock("../tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshot: jest.fn(),
}))

jest.mock("../payment-truth-snapshot.service", () => ({
  getPaymentTruthSnapshot: jest.fn(),
}))

jest.mock("../inventory-cash-snapshot.service", () => ({
  getInventoryCashSnapshot: jest.fn(),
}))

jest.mock("../close-readiness-snapshot.service", () => ({
  getCloseReadinessSnapshot: jest.fn(),
}))

jest.mock("../branch-operating-snapshot.service", () => ({
  getBranchOperatingSnapshot: jest.fn(),
}))

import { getBranchOperatingSnapshot } from "../branch-operating-snapshot.service"
import { getCloseReadinessSnapshot } from "../close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "../inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "../payment-truth-snapshot.service"
import { rebuildSnapshotBundle } from "../snapshot-rebuild.service"
import { getTenantOperatingSnapshot } from "../tenant-operating-snapshot.service"

const mockTenant = getTenantOperatingSnapshot as jest.Mock
const mockPayment = getPaymentTruthSnapshot as jest.Mock
const mockInventory = getInventoryCashSnapshot as jest.Mock
const mockClose = getCloseReadinessSnapshot as jest.Mock
const mockBranch = getBranchOperatingSnapshot as jest.Mock

function snapshot(overrides: Record<string, unknown>) {
  return {
    kind: "tenant.operating",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-30T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "posted",
    freshness: {
      generatedAt: "2026-06-20T12:00:00.000Z",
      sourceMaxUpdatedAt: "2026-06-19T12:00:00.000Z",
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    },
    sourceHash: "sha256:base",
    generatedAt: "2026-06-20T12:00:00.000Z",
    sourceModules: ["dashboard"],
    metrics: {},
    blockers: [],
    redactions: [],
    ...overrides,
  }
}

describe("snapshot rebuild service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTenant.mockResolvedValue(snapshot({ kind: "tenant.operating", sourceHash: "sha256:tenant" }))
    mockPayment.mockResolvedValue(
      snapshot({
        kind: "payment.truth",
        status: "blocked",
        evidenceGrade: "blocked",
        sourceHash: "sha256:payment",
        blockers: [{ id: "payment-blocker", severity: "high", gate: "payment", title: "Blocked", detail: "Blocked", sourceTables: ["payment_exceptions"] }],
      }),
    )
    mockInventory.mockResolvedValue(snapshot({ kind: "inventory.cash", status: "partial", sourceHash: "sha256:inventory" }))
    mockClose.mockResolvedValue(snapshot({ kind: "close.readiness", sourceHash: "sha256:close" }))
    mockBranch.mockResolvedValue(snapshot({ kind: "branch.operating", sourceHash: "sha256:branch" }))
  })

  it("aggregates snapshot statuses and keeps rebuild source hashes idempotent", async () => {
    const input = {
      organizationId: "org-1",
      locationId: "loc-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T12:00:00.000Z",
    }

    const first = await rebuildSnapshotBundle(input)
    const second = await rebuildSnapshotBundle(input)

    expect(mockBranch).toHaveBeenCalled()
    expect(first.status).toBe("blocked")
    expect(first.evidenceGrade).toBe("blocked")
    expect(first.metrics.requestedSnapshotCount).toBe(5)
    expect(first.metrics.blockedSnapshotCount).toBe(1)
    expect(first.metrics.partialSnapshotCount).toBe(1)
    expect(first.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ id: "payment-blocker" })]))
    expect(first.sourceHash).toBe(second.sourceHash)
    expect(first.buildId).not.toBe(second.buildId)
  })

  it("returns a failed snapshot contract instead of failing the whole rebuild bundle", async () => {
    mockTenant.mockRejectedValueOnce(new Error("database unavailable"))

    const result = await rebuildSnapshotBundle({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-20T12:00:00.000Z",
    })

    expect(result.status).toBe("failed")
    expect(result.evidenceGrade).toBe("blocked")
    expect(result.metrics.requestedSnapshotCount).toBe(4)
    expect(result.metrics.failedSnapshotCount).toBe(1)
    expect(result.snapshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "tenant.operating",
          status: "failed",
          uiState: "safe_error",
          blockers: expect.arrayContaining([
            expect.objectContaining({ id: "tenant-operating-rebuild-failed" }),
          ]),
        }),
        expect.objectContaining({ kind: "payment.truth" }),
      ]),
    )
  })
})
