jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: { organization: { findFirst: jest.fn() } },
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
jest.mock("@/services/snapshots/tenant-operating-snapshot.service", () => ({
  getTenantOperatingSnapshotFromRelated: jest.fn(),
}))

import { db } from "@/prisma/db"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotKind,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import { composeDailyHabitDigestData, getDailyHabitDigestData } from "../daily-habit-digest.service"

const generatedAt = "2026-07-11T08:00:00.000Z"

const paymentMetrics: PaymentTruthMetrics = {
  providerAccountCount: 0,
  activeProviderAccountCount: 0,
  recentRunCount: 0,
  readyForSignoffCount: 0,
  signedRunCount: 0,
  openExceptionCount: 0,
  criticalExceptionCount: 0,
  openSuspenseCount: 0,
  openSuspenseAmount: 0,
  pendingTransactionCount: 0,
}

const inventoryMetrics: InventoryCashMetrics = {
  trackedItemCount: 0,
  inventoryLevelCount: 0,
  quantityOnHand: 0,
  quantityAvailable: 0,
  quantityReserved: 0,
  quantityInTransit: 0,
  quantityOnOrder: 0,
  inventoryValue: 0,
  zeroStockLevelCount: 0,
  negativeStockLevelCount: 0,
  periodTransactionCount: 0,
  periodAdjustmentCount: 0,
  periodTransferCount: 0,
}

const closeMetrics: CloseReadinessMetrics = {
  accountingPeriodCount: 0,
  openPeriodCount: 0,
  recentCloseRunCount: 0,
  certifiedCloseRunCount: 0,
  blockedCloseRunCount: 0,
  averageReadinessScore: null,
  openFindingCount: 0,
  criticalOpenFindingCount: 0,
  unavailableEvidenceCount: 0,
}

const tenantMetrics: TenantOperatingMetrics = {
  activeLocationCount: 0,
  completedSalesCount: 0,
  completedSalesRevenue: 0,
  cashCollected: 0,
  pendingPurchaseOrderCount: 0,
  approvedOrPaidPayrollRunCount: 0,
  activeEmployeeBalanceCaseCount: 0,
  openEmployeeBalanceCaseCount: 0,
  partiallySettledEmployeeBalanceCaseCount: 0,
  employeeBalanceOutstandingAmount: 0,
  periodEmployeeBalanceSettlementCount: 0,
  periodEmployeeBalanceSettlementAmount: 0,
  postedJournalEntryCount: 0,
  sourceLinkCount: 0,
  payrollFinanceForecast: {
    status: "NON_AUTHORITATIVE",
    authoritative: false,
    reasonCode: "NO_DATA",
    message: "No payroll forecast",
    horizonStart: generatedAt,
    horizonEnd: generatedAt,
    upcomingNetPayAmount: 0,
    upcomingStatutoryLiabilityAmount: 0,
    totalUpcomingAmount: 0,
    payrollPeriodCount: 0,
    payrollRunCount: 0,
    paymentBatchCount: 0,
    declarationCount: 0,
    sourceLinkCount: 0,
    evidenceHashCount: 0,
    nextPayDate: null,
    nextDeclarationDueDate: null,
    personLevelAmountsRedacted: true,
    blockerCodes: [],
  },
  paymentTruth: paymentMetrics,
  inventoryCash: inventoryMetrics,
  closeReadiness: closeMetrics,
}

function snapshot<T>(kind: SnapshotKind, metrics: T): SnapshotResult<T> {
  return {
    kind,
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-07-11T00:00:00.000Z",
    periodEnd: "2026-07-11T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "operational",
    freshness: {
      generatedAt,
      sourceMaxUpdatedAt: generatedAt,
      maxAgeMinutes: 1440,
      stale: false,
      staleReason: null,
    },
    sourceHash: "sha256:test",
    generatedAt,
    sourceModules: ["dashboard"],
    metrics,
    blockers: [],
    redactions: [],
  }
}

const paymentTruth = snapshot("payment.truth", paymentMetrics)
const inventoryCash = snapshot("inventory.cash", inventoryMetrics)
const closeReadiness = snapshot("close.readiness", closeMetrics)
const tenantOperating = snapshot("tenant.operating", tenantMetrics)

function compose(actorPermissions: string[], actorRoleCodes: string[]) {
  return composeDailyHabitDigestData({
    organizationId: "org-1",
    organizationName: "Atelier OHADA",
    actorPermissions,
    actorRoleCodes,
    currency: "XAF",
    tenantOperating,
    paymentTruth,
    inventoryCash,
    closeReadiness,
    now: generatedAt,
  })
}

describe("Daily Habit Digest role cockpit", () => {
  it("shows only the stockkeeper workspace for an inventory-only warehouse role", () => {
    const result = compose(["inventory.read"], ["WAREHOUSE_MANAGER"])

    expect(result.digests.map((digest) => digest.id)).toEqual(["stockkeeper-stock"])
    expect(result.summary).toMatchObject({ digestCount: 1, hiddenDigestCount: 6 })
  })

  it("does not expose the owner workspace to a dashboard manager", () => {
    const result = compose(["dashboard.read"], ["MANAGER"])

    expect(result.digests.map((digest) => digest.id)).toEqual(["manager-run-sheet", "end-of-day"])
    expect(result.digests.map((digest) => digest.id)).not.toContain("owner-morning")
  })

  it("fails closed when a dashboard role has no recognized cockpit audience", () => {
    const result = compose(["dashboard.read"], ["CUSTOM_REPORT_VIEWER"])

    expect(result.digests).toEqual([])
    expect(result.summary).toMatchObject({ digestCount: 0, hiddenDigestCount: 7 })
  })

  it("loads tenant name and currency inside the service boundary", async () => {
    ;(db.organization.findFirst as jest.Mock).mockResolvedValue({ name: "Atelier OHADA", currency: "xaf" })
    ;(getPaymentTruthSnapshot as jest.Mock).mockResolvedValue(paymentTruth)
    ;(getInventoryCashSnapshot as jest.Mock).mockResolvedValue(inventoryCash)
    ;(getCloseReadinessSnapshot as jest.Mock).mockResolvedValue(closeReadiness)
    ;(getTenantOperatingSnapshotFromRelated as jest.Mock).mockResolvedValue(tenantOperating)

    const result = await getDailyHabitDigestData({
      organizationId: "org-1",
      actorPermissions: ["inventory.read"],
      actorRoleCodes: ["WAREHOUSE_MANAGER"],
    })

    expect(db.organization.findFirst).toHaveBeenCalledWith({
      where: { id: "org-1", isActive: true, deletedAt: null },
      select: { name: true, currency: true },
    })
    expect(result).toMatchObject({ organizationName: "Atelier OHADA", currency: "XAF" })
  })
})
