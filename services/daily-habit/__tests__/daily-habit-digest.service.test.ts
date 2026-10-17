jest.mock("server-only", () => ({}))
jest.mock("@/services/operating-access/operating-access-scope.service", () => ({ resolveOperatingAccessScope: jest.fn() }))

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
jest.mock("@/services/snapshots/inventory-loss-snapshot.service", () => ({
  getInventoryLossSnapshot: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

import { db } from "@/prisma/db"
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getInventoryLossSnapshot } from "@/services/snapshots/inventory-loss-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  InventoryLossMetrics,
  SnapshotKind,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import { composeDailyHabitDigestData as composeWithExplicitAccess, getDailyHabitDigestData } from "../daily-habit-digest.service"
import { normalizeSnapshotScope } from "@/services/snapshots/snapshot-utils"

const generatedAt = "2026-07-11T08:00:00.000Z"
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetInventoryLossSnapshot = getInventoryLossSnapshot as jest.Mock

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

const inventoryLossMetrics: InventoryLossMetrics = {
  lossLineCount: 2,
  adjustmentCount: 1,
  totalLossValue: 45000,
  currency: "XAF",
  countVarianceLineCount: 0,
  damagedLineCount: 2,
  expiredLineCount: 0,
  recordedTheftCategoryLineCount: 0,
  writeOffLineCount: 0,
  evidenceCoveredLineCount: 2,
  evidenceCoveragePercent: 100,
  valuationCoveredLineCount: 2,
  valuationCoveragePercent: 100,
  approvalAttributedLineCount: 2,
  approvalCoveragePercent: 100,
  missingEvidenceLineCount: 0,
  missingValuationLineCount: 0,
  missingApprovalAttributionLineCount: 0,
  sourceTruncated: false,
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
const inventoryLoss = snapshot("inventory.loss", inventoryLossMetrics)
const tenantOperating = snapshot("tenant.operating", tenantMetrics)

// Existing source/role fixtures represent an entitled tenant with verified handoffs.
// Admission tests call the unwrapped composer to exercise missing grants/authority.
function composeDailyHabitDigestData(input: Parameters<typeof composeWithExplicitAccess>[0]) {
  return composeWithExplicitAccess({ dashboardModuleAccess: true, analyticsModuleAccess: true, operatingHandoffs: { owner: true, manager: true }, ...input })
}

it.each(["en", "fr"] as const)("does not present completed payroll activity as a risk (%s)", locale => {
  const tenant = { ...tenantOperating, metrics: { ...tenantMetrics, approvedOrPaidPayrollRunCount: 20 } }
  const input = { organizationId: "org-1", organizationName: "Owned", actorPermissions: ["dashboard.read", "payroll.command.read"], actorRoleCodes: ["owner"], payrollModuleAccess: true, currency: "XAF", locale, tenantOperating: tenant, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
  const before = JSON.stringify(input)
  const data = composeDailyHabitDigestData(input)
  expect(data.digests.length).toBeGreaterThan(0)
  expect(data.summary.visibleActionCount).toBe(0)
  for (const digest of data.digests) {
    expect(digest.actions).toEqual([])
    expect(digest.risks).toEqual([])
    expect(digest.changes).toEqual([])
  }
  expect(JSON.stringify(input)).toBe(before)
})

it.each(["en", "fr"] as const)("preserves source meaning, localized labels and units for all six generated signal families (%s)", locale => {
  const cases = [
    { family: "payment", id: "finance-cash", role: "finance", permissions: ["finance.read", "payments.reconciliation.read"], titles: { en: "Open Payment Suspense", fr: "Suspens de paiement ouverts" }, metric: 123.45, units: { en: "EUR", fr: "EUR" }, patch: { paymentTruth: snapshot("payment.truth", { ...paymentMetrics, openSuspenseCount: 1, openSuspenseAmount: 123.45, suspenseCurrencyCode: "EUR" }) } },
    { family: "stockout", id: "stockkeeper-stock", role: "stockkeeper", permissions: ["inventory.read", "inventory.items.read"], titles: { en: "Stockout Risk", fr: "Risque de rupture de stock" }, metric: 98765.43, units: { en: "EUR", fr: "EUR" }, patch: { inventoryCash: snapshot("inventory.cash", { ...inventoryMetrics, zeroStockLevelCount: 1, inventoryValue: 98765.43 }) } },
    { family: "loss", id: "owner-morning", role: "owner", permissions: ["dashboard.read", "inventory.levels.read"], titles: { en: "Recorded inventory loss needs review", fr: "Des pertes de stock enregistrées doivent être examinées" }, metric: 0, units: { en: "EUR", fr: "EUR" }, patch: { inventoryLoss } },
    { family: "purchasing", id: "manager-run-sheet", role: "manager", permissions: ["dashboard.read", "purchases.orders.read"], titles: { en: "Purchase Order Receiving Delay", fr: "Commandes au-delà de la date de livraison prévue" }, metric: 9, units: { en: "POs", fr: "commandes" }, patch: { tenantOperating: snapshot("tenant.operating", { ...tenantMetrics, pendingPurchaseOrderCount: 9, overduePurchaseOrderCount: 1 }) } },
    { family: "close", id: "accountant-close", role: "accountant", permissions: ["accounting.close.read"], titles: { en: "Close Blocker", fr: "Blocage de clôture" }, metric: 37, units: { en: "%", fr: "%" }, patch: { closeReadiness: snapshot("close.readiness", { ...closeMetrics, openFindingCount: 1, criticalOpenFindingCount: 1, averageReadinessScore: 37 }) } },
    { family: "payroll", id: "owner-morning", role: "owner", permissions: ["dashboard.read", "payroll.command.read", "payments.reconciliation.read"], titles: { en: "Payroll Exposure", fr: "Exposition liée à la paie" }, metric: 0, units: { en: "EUR", fr: "EUR" }, patch: { tenantOperating: snapshot("tenant.operating", { ...tenantMetrics, activeEmployeeBalanceCaseCount: 1, openEmployeeBalanceCaseCount: 1, employeeBalanceOutstandingAmount: 123.45 }) } },
  ]
  for (const example of cases) {
    const input = { organizationId: "org-1", organizationName: "Source audit", actorPermissions: example.permissions, actorRoleCodes: [example.role], currency: "EUR", locale, tenantOperating, paymentTruth, inventoryCash, closeReadiness, payrollModuleAccess: true, inventoryModuleAccess: true, purchasingModuleAccess: true, financeModuleAccess: true, reconciliationModuleAccess: true, closeModuleAccess: true, now: generatedAt, ...example.patch }
    const before = JSON.stringify(input)
    const digest = composeDailyHabitDigestData(input).digests.find(d => d.id === example.id)!
    expect({ family: example.family, titles: digest.changes.map(c => c.title) }).toEqual({ family: example.family, titles: [example.titles[locale]] })
    expect(digest.risks[0]).toMatchObject({ title: example.titles[locale], moneyImpact: null, urgency: null })
    expect(digest.zones[0].primaryMetric).toMatchObject({ value: example.metric, unit: example.units[locale] })
    expect(digest.changes[0]).toMatchObject({ direction: "observed", previousValue: null, unit: "risk", provenance: { organizationId: "org-1" } })
    expect(digest.changes[0].provenance.sourceHash).toBeTruthy()
    expect(digest.actions[0].href).toMatch(new RegExp(`^/${locale}/dashboard/`))
    if (example.family === "loss") expect(digest.changes[0].detail).toContain("XAF")
    if (example.family === "payroll") expect(digest.actions[0].additionalRequiredPermissions).toContain("payroll.command.read")
    expect(JSON.stringify(input)).toBe(before)
  }
})

describe("Operating destination authority", () => {
  afterEach(() => jest.resetAllMocks())
  const input = { organizationId: "org-1", organizationName: "Owned", dashboardModuleAccess: true, actorPermissions: ["dashboard.read"], actorRoleCodes: ["owner", "manager"], currency: "XAF", tenantOperating, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
  it.each(["en", "fr"] as const)("preserves summaries but explains unavailable destinations (%s)", locale => {
    const missing = composeWithExplicitAccess({ ...input, locale }).digests
    expect(missing.map(d => d.id)).toEqual(["owner-morning", "manager-run-sheet", "end-of-day"])
    for (const digest of missing) {
      expect(digest.commandBrief.drillThrough.available).toBe(false)
      expect(digest.commandBrief.primaryAction?.disabled).toBe(true)
    }
    const scoped = composeWithExplicitAccess({ ...input, locale, operatingHandoffs: { owner: false, manager: true } }).digests
    expect(scoped[0]!.commandBrief.drillThrough).toMatchObject({ available: false, unavailableReason: expect.stringContaining(locale === "fr" ? "toute l’organisation" : "organization-wide") })
    for (const digest of scoped.slice(1)) expect(digest.commandBrief.drillThrough).toMatchObject({ available: true, href: `/${locale}/dashboard/manager-action-center` })
  })
  const context = { orgId: "org-1", userId: "reader-1", roles: [], permissions: ["dashboard.read"], isSuperUser: false }
  const request = { ...input, actorId: "reader-1", operatingAccessContext: context }
  it.each(["TENANT", "LOCATIONS", "DENIED"])("uses the destination's shared %s authority", async kind => {
    mockDailyHabitSources(); mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    ;(resolveOperatingAccessScope as jest.Mock).mockResolvedValue({ organizationId: "org-1", actorId: "reader-1", allowed: kind !== "DENIED", scope: kind === "DENIED" ? null : { kind }, authority: { kind: kind === "TENANT" ? "TENANT_WIDE" : "LOCATION_RESPONSIBILITY" } })
    const data = await getDailyHabitDigestData(request)
    expect(resolveOperatingAccessScope).toHaveBeenCalledWith(context)
    expect(data.digests.find(d => d.id === "owner-morning")!.commandBrief.drillThrough.available).toBe(kind === "TENANT")
    expect(data.digests.find(d => d.id === "manager-run-sheet")!.commandBrief.drillThrough.available).toBe(kind !== "DENIED")
  })
  it("rejects inconsistent tenant/actor context, foreign scope and query failure", async () => {
    mockDailyHabitSources(); mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    for (const operatingAccessContext of [{ ...context, orgId: "foreign" }, { ...context, userId: "foreign" }]) await expect(getDailyHabitDigestData({ ...request, operatingAccessContext })).rejects.toThrow("context is inconsistent")
    expect(resolveOperatingAccessScope).not.toHaveBeenCalled()
    ;(resolveOperatingAccessScope as jest.Mock).mockResolvedValue({ organizationId: "foreign", actorId: "reader-1", allowed: false })
    await expect(getDailyHabitDigestData(request)).rejects.toThrow("scope evidence is inconsistent")
    ;(resolveOperatingAccessScope as jest.Mock).mockRejectedValue(new Error("Scope lookup failed"))
    await expect(getDailyHabitDigestData(request)).rejects.toThrow("Scope lookup failed")
  })
  it("does not resolve operating scope without current module admission", async () => {
    mockDailyHabitSources(); mockObserveModuleAccess.mockResolvedValue({ allowed: false })
    expect((await getDailyHabitDigestData(request)).digests).toEqual([])
    expect(resolveOperatingAccessScope).not.toHaveBeenCalled()
  })
})

describe("Dashboard and analytics workspace admission", () => {
  afterEach(() => jest.resetAllMocks())
  const week = <T,>(source: SnapshotResult<T>) => ({ ...source, periodStart: "2026-07-05T00:00:00.000Z" })
  const input = { organizationId: "org-1", organizationName: "Owned", actorPermissions: ["dashboard.read", "analytics.read"], actorRoleCodes: ["owner", "manager"], currency: "XAF", tenantOperating, paymentTruth, inventoryCash, closeReadiness, weeklySources: { tenantOperating: week(tenantOperating), paymentTruth: week(paymentTruth), inventoryCash: week(inventoryCash), closeReadiness: week(closeReadiness) }, now: generatedAt }
  it("fails closed for absent decisions and keeps core and analytics grants independent", () => {
    expect(composeWithExplicitAccess(input).digests).toEqual([])
    expect(composeWithExplicitAccess({ ...input, dashboardModuleAccess: true }).digests.map(d => d.id)).toEqual(["owner-morning", "manager-run-sheet", "end-of-day"])
    expect(composeWithExplicitAccess({ ...input, analyticsModuleAccess: true }).digests.map(d => d.id)).toEqual(["weekly"])
    expect(composeWithExplicitAccess({ ...input, dashboardModuleAccess: false, analyticsModuleAccess: false }).digests).toEqual([])
  })
  it.each(["en", "fr"] as const)("does not advertise a destination permission the weekly reader lacks (%s)", locale => {
    const compose = (actorPermissions: string[]) => composeWithExplicitAccess({ ...input, locale, actorPermissions, analyticsModuleAccess: true }).digests[0]!
    expect(compose(["analytics.read"]).commandBrief.drillThrough).toMatchObject({ available: false, requiredPermission: "reports.read" })
    expect(compose(["analytics.read"]).commandBrief.primaryAction).toMatchObject({ disabled: true })
    for (const permission of ["reports.read", "dashboard.read"]) expect(compose(["analytics.read", permission]).commandBrief.drillThrough).toMatchObject({ available: true, requiredPermission: permission, href: `/${locale}/dashboard/analytics` })
  })
  it("does not load a weekly window when analytics entitlement denies", async () => {
    mockDailyHabitSources(); mockObserveModuleAccess.mockImplementation(({ moduleSlug }) => Promise.resolve({ allowed: moduleSlug === "dashboard" }))
    const result = await getDailyHabitDigestData({ organizationId: "org-1", actorId: "reader-1", actorPermissions: input.actorPermissions, actorRoleCodes: ["owner"], now: generatedAt })
    expect(result.digests.map(d => d.id)).toEqual(["owner-morning", "end-of-day"])
    expect(getTenantOperatingSnapshotFromRelated).toHaveBeenCalledTimes(1)
    expect(mockObserveModuleAccess.mock.calls.map(([value]) => value.moduleSlug).sort()).toEqual(["analytics", "dashboard"])
  })
})

describe("Purchasing source read authority", () => {
  afterEach(() => jest.resetAllMocks())
  it.each(["en", "fr"] as const)("restricts unavailable purchasing without hiding the Manager workspace (%s)", locale => {
    const source = { ...tenantOperating, metrics: { ...tenantMetrics, pendingPurchaseOrderCount: 17, overduePurchaseOrderCount: 9 } }
    const base = { locale, organizationId: "org-1", organizationName: "Owned", actorPermissions: ["dashboard.read", "purchases.orders.read"], actorRoleCodes: ["manager"], currency: "XAF", tenantOperating: source, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
    const denied = composeDailyHabitDigestData({ ...base, purchasingModuleAccess: false })
    const manager = denied.digests.find(d => d.id === "manager-run-sheet")!
    expect(manager.zones[0]!.primaryMetric).toMatchObject({ value: null, state: "module_unavailable" })
    expect(JSON.stringify(denied)).not.toContain("purchase_order_receiving_delay")
    expect(denied.digests.flatMap(d => d.actions).some(a => a.href.endsWith("/purchase-orders"))).toBe(false)
    const allowed = composeDailyHabitDigestData({ ...base, purchasingModuleAccess: true })
    expect(allowed.digests.find(d => d.id === "manager-run-sheet")!.zones[0]!.primaryMetric!.value).toBe(17)
    expect(allowed.digests.flatMap(d => d.actions).some(a => a.href.endsWith("/purchase-orders"))).toBe(true)
    const summary = composeDailyHabitDigestData({ ...base, purchasingModuleAccess: true, actorPermissions: ["dashboard.read"] })
    expect(summary.digests.find(d => d.id === "manager-run-sheet")!.zones[0]!.primaryMetric!.value).toBe(17)
    expect(summary.digests.flatMap(d => d.actions)).toHaveLength(0)
    expect(source.metrics.pendingPurchaseOrderCount).toBe(17)
  })
  it("checks the purchasing read grant with server identity even for a summary-only manager", async () => {
    mockDailyHabitSources()
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    await getDailyHabitDigestData({ organizationId: "org-1", actorId: "manager-1", actorPermissions: ["dashboard.read"], actorRoleCodes: ["manager"], now: generatedAt })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", userId: "manager-1", moduleSlug: "purchasing", mode: "enforce", accessIntent: "read", now: generatedAt }))
  })
})

describe("Inventory source read authority", () => {
  afterEach(() => jest.resetAllMocks())
  it.each(["en", "fr"] as const)("separates module, summary and item detail access across daily and weekly output (%s)", locale => {
    const blockers = [{ id: "private-stock", gate: "inventory_cash", severity: "high" as const, title: "Private stock", detail: "Private stock evidence", sourceTables: ["inventory_levels"] }]
    const stock = { ...inventoryCash, status: "blocked" as const, uiState: "blocked" as const, blockers, metrics: { ...inventoryMetrics, inventoryValue: 2468135, zeroStockLevelCount: 1 } }
    const tenant = { ...tenantOperating, status: "blocked" as const, uiState: "blocked" as const, blockers }
    const week = <T,>(source: SnapshotResult<T>) => ({ ...source, periodStart: "2026-07-05T00:00:00.000Z" })
    const input = { organizationId: "org-1", organizationName: "Inventory access fixture", actorPermissions: ["dashboard.read", "inventory.read", "inventory.items.read", "analytics.read"], actorRoleCodes: ["owner"], currency: "XAF", locale, tenantOperating: tenant, paymentTruth, inventoryCash: stock, closeReadiness, weeklySources: { tenantOperating: week(tenant), paymentTruth: week(paymentTruth), inventoryCash: week(stock), closeReadiness: week(closeReadiness) }, now: generatedAt }
    const before = JSON.stringify(input)
    for (const changes of [{}, { inventoryModuleAccess: false }, { inventoryModuleAccess: true, actorPermissions: ["dashboard.read", "analytics.read"] }]) {
      const denied = composeDailyHabitDigestData({ ...input, ...changes })
      expect(denied.digests.some(d => d.id === "stockkeeper-stock")).toBe(false)
      expect(JSON.stringify(denied)).not.toContain("Private stock")
      expect(JSON.stringify(denied)).not.toContain("private-stock")
      expect(denied.digests.every(d => d.commandBrief.state === "blocked")).toBe(true)
      expect(denied.digests.flatMap(d => d.actions)).toEqual([])
      expect(denied.digests[0].blockers).toEqual(expect.arrayContaining([expect.objectContaining({ gate: "restricted_source", severity: "high" })]))
    }
    const summary = composeDailyHabitDigestData({ ...input, inventoryModuleAccess: true, actorPermissions: ["dashboard.read", "analytics.read", "inventory.read"] })
    expect(summary.digests.find(d => d.id === "stockkeeper-stock")!.zones[0].primaryMetric!.value).toBe(2468135)
    expect(summary.digests.flatMap(d => d.actions)).toEqual([])
    const details = composeDailyHabitDigestData({ ...input, inventoryModuleAccess: true, actorPermissions: ["dashboard.read", "analytics.read", "inventory.items.read"] })
    expect(details.digests.some(d => d.id === "stockkeeper-stock")).toBe(false)
    expect(details.digests.find(d => d.id === "weekly")!.actions).toHaveLength(1)
    expect(JSON.stringify(input)).toBe(before)
  })

  it.each(["inventory.read", "inventory.items.read", "inventory.levels.read"])("uses one enforced source decision for %s", async permission => {
    mockDailyHabitSources(); mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    await getDailyHabitDigestData({ organizationId: "org-1", actorId: "reader-1", actorPermissions: [permission], actorRoleCodes: ["stockkeeper"], now: generatedAt })
    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(1)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", userId: "reader-1", moduleSlug: "inventory", mode: "enforce", accessIntent: "read", now: generatedAt }))
  })

  it("fails closed when inventory authority cannot be established", async () => {
    mockDailyHabitSources(); mockObserveModuleAccess.mockRejectedValue(new Error("Inventory access unavailable"))
    const input = { organizationId: "org-1", actorPermissions: ["inventory.read"], actorRoleCodes: ["stockkeeper"], now: generatedAt }
    expect((await getDailyHabitDigestData(input)).digests).toEqual([])
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    await expect(getDailyHabitDigestData({ ...input, actorId: "reader-1" })).rejects.toThrow("Inventory access unavailable")
  })
})

describe("Close Assurance source access", () => {
  afterEach(() => jest.resetAllMocks())

  it.each(["en", "fr"] as const)("restricts close evidence across daily and weekly output without clearing limitations (%s)", locale => {
    const blockers = [{ id: "private-close", gate: "close_readiness", severity: "critical" as const, title: "Private close title", detail: "Private close evidence", sourceTables: ["close_runs"] }]
    const close = { ...closeReadiness, status: "blocked" as const, uiState: "blocked" as const, blockers, metrics: { ...closeMetrics, averageReadinessScore: 83, blockedCloseRunCount: 1 } }
    const tenant = { ...tenantOperating, status: "blocked" as const, uiState: "blocked" as const, blockers }
    const week = <T,>(source: SnapshotResult<T>) => ({ ...source, periodStart: "2026-07-05T00:00:00.000Z" })
    const input = { organizationId: "org-1", organizationName: "Close access fixture", actorPermissions: ["dashboard.read", "accounting.close.read", "analytics.read"], actorRoleCodes: ["owner"], currency: "XAF", locale, tenantOperating: tenant, paymentTruth, inventoryCash, closeReadiness: close, weeklySources: { tenantOperating: week(tenant), paymentTruth: week(paymentTruth), inventoryCash: week(inventoryCash), closeReadiness: week(close) }, now: generatedAt }
    const before = JSON.stringify(input)
    for (const changes of [{}, { closeModuleAccess: false }, { closeModuleAccess: true, actorPermissions: ["dashboard.read", "analytics.read"] }]) {
      const denied = composeDailyHabitDigestData({ ...input, ...changes })
      expect(denied.digests.some(d => d.id === "accountant-close")).toBe(false)
      expect(JSON.stringify(denied)).not.toContain("private-close")
      expect(JSON.stringify(denied)).not.toContain("Private close")
      expect(denied.digests.every(d => d.commandBrief.state === "blocked")).toBe(true)
      expect(denied.digests.flatMap(d => d.actions)).toEqual([])
      expect(denied.digests[0].blockers).toEqual(expect.arrayContaining([expect.objectContaining({ gate: "restricted_source", severity: "critical" })]))
    }
    const allowed = composeDailyHabitDigestData({ ...input, closeModuleAccess: true })
    expect(allowed.digests.find(d => d.id === "accountant-close")!.zones[0].primaryMetric!.value).toBe(83)
    expect(allowed.digests.find(d => d.id === "weekly")!.actions).toHaveLength(1)
    expect(allowed.digests.find(d => d.id === "owner-morning")!.actions).toHaveLength(1)
    expect(JSON.stringify(input)).toBe(before)
  })

  it.each([true, false])("uses the current Close Assurance read decision (allowed=%s)", async allowed => {
    mockDailyHabitSources(); mockObserveModuleAccess.mockResolvedValue({ allowed })
    const input = { organizationId: "org-1", actorId: "reader-1", actorPermissions: ["accounting.close.read"], actorRoleCodes: ["accountant"], now: generatedAt }
    expect((await getDailyHabitDigestData(input)).digests.some(d => d.id === "accountant-close")).toBe(allowed)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", userId: "reader-1", moduleSlug: "close_assurance", mode: "enforce", accessIntent: "read", now: generatedAt }))
    mockObserveModuleAccess.mockClear()
    expect((await getDailyHabitDigestData({ ...input, actorId: undefined })).digests).toEqual([])
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("propagates a failed Close Assurance access read", async () => {
    mockDailyHabitSources(); mockObserveModuleAccess.mockRejectedValue(new Error("Close access unavailable"))
    await expect(getDailyHabitDigestData({ organizationId: "org-1", actorId: "reader-1", actorPermissions: ["accounting.close.read"], actorRoleCodes: ["accountant"] })).rejects.toThrow("Close access unavailable")
  })
})

describe("Finance and reconciliation source access", () => {
  afterEach(() => jest.resetAllMocks())

  it.each(["en", "fr"] as const)("fails closed across daily and weekly output while retaining source limitations (%s)", locale => {
    const payment = { ...paymentTruth, metrics: { ...paymentMetrics, openSuspenseAmount: 987654.32, openSuspenseCount: 1 } }
    const tenant = { ...tenantOperating, status: "blocked" as const, uiState: "blocked" as const, blockers: [{ id: "private-payment", gate: "payment_truth", severity: "critical" as const, title: "Private payment", detail: "Suspense 987654.32", sourceTables: ["suspense_items"] }] }
    const week = <T,>(source: SnapshotResult<T>) => ({ ...source, periodStart: "2026-07-05T00:00:00.000Z" })
    const input = { organizationId: "org-1", organizationName: "Access fixture", actorPermissions: ["dashboard.read", "finance.read", "payments.reconciliation.read", "analytics.read"], actorRoleCodes: ["owner"], currency: "XAF", locale, tenantOperating: tenant, paymentTruth: payment, inventoryCash, closeReadiness, weeklySources: { tenantOperating: week(tenant), paymentTruth: week(payment), inventoryCash: week(inventoryCash), closeReadiness: week(closeReadiness) }, now: generatedAt }
    const original = JSON.stringify(input)
    for (const grants of [{}, { financeModuleAccess: false, reconciliationModuleAccess: false }]) {
      const denied = composeDailyHabitDigestData({ ...input, ...grants })
      expect(denied.digests.some(d => d.id === "finance-cash")).toBe(false)
      expect(JSON.stringify(denied)).not.toContain("987654.32")
      expect(denied.digests.every(d => d.commandBrief.state === "blocked")).toBe(true)
      expect(denied.digests.flatMap(d => d.actions)).toEqual([])
      expect(denied.digests[0].blockers).toEqual(expect.arrayContaining([expect.objectContaining({ gate: "restricted_source", severity: "critical", title: locale === "fr" ? "Détails de source restreints" : "Restricted source details" })]))
    }
    const financeOnly = composeDailyHabitDigestData({ ...input, financeModuleAccess: true })
    expect(financeOnly.digests.find(d => d.id === "finance-cash")!.zones[0].primaryMetric!.value).toBe(987654.32)
    expect(financeOnly.digests.flatMap(d => d.actions)).toEqual([])
    const reconOnly = composeDailyHabitDigestData({ ...input, reconciliationModuleAccess: true })
    expect(reconOnly.digests.some(d => d.id === "finance-cash")).toBe(false)
    expect(reconOnly.digests.find(d => d.id === "weekly")!.actions).toHaveLength(1)
    const permissionDenied = composeDailyHabitDigestData({ ...input, financeModuleAccess: true, reconciliationModuleAccess: true, actorPermissions: ["dashboard.read", "analytics.read"] })
    expect(JSON.stringify(permissionDenied)).not.toContain("987654.32")
    expect(JSON.stringify(input)).toBe(original)
  })

  it.each([true, false])("uses current server read decisions (allowed=%s)", async allowed => {
    mockDailyHabitSources()
    mockObserveModuleAccess.mockResolvedValue({ allowed })
    const input = { organizationId: "org-1", actorId: "reader-1", actorPermissions: ["finance.read", "payments.reconciliation.read"], actorRoleCodes: ["finance"], now: generatedAt }
    const data = await getDailyHabitDigestData(input)
    expect(data.digests.some(d => d.id === "finance-cash")).toBe(allowed)
    for (const moduleSlug of ["finance", "payment_reconciliation"]) {
      expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", userId: "reader-1", moduleSlug, mode: "enforce", accessIntent: "read", now: generatedAt }))
    }
    mockObserveModuleAccess.mockClear()
    const missingActor = await getDailyHabitDigestData({ ...input, actorId: undefined })
    expect(missingActor.digests).toEqual([])
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
  })

  it("propagates an unavailable module decision instead of assuming access", async () => {
    mockDailyHabitSources()
    mockObserveModuleAccess.mockRejectedValue(new Error("Finance access query failed"))
    await expect(getDailyHabitDigestData({ organizationId: "org-1", actorId: "reader-1", actorPermissions: ["finance.read"], actorRoleCodes: ["finance"] })).rejects.toThrow("Finance access query failed")
  })
})

it.each(["en", "fr"] as const)("withholds payroll blocker details in every Digest representation without payroll read authority (%s)", locale => {
  const privateDetail = "3 active employee balance cases have 983421.78 outstanding."
  const payrollSource = { ...tenantOperating, metrics: { ...tenantOperating.metrics, employeeBalanceOutstandingAmount: null, employeeBalanceOutstandingByCurrency: [{ currencyCode: "USD", amount: 983421.78, count: 3 }] }, status: "partial" as const, uiState: "partial" as const, blockers: [{ id: "tenant-payroll-employee-balance-open", gate: "payroll_employee_balance", severity: "high" as const, title: "Employee balance recovery cases are open", detail: privateDetail, sourceTables: ["payroll_employee_balance_cases"], nextAction: "Review payroll payments" }, { id: "tenant-payroll-balance-currency-mismatch", gate: "payroll_employee_balance", severity: "high" as const, title: "Employee balance currencies cannot be combined", detail: "Amounts by currency: 983421.78 USD. No conversion evidence establishes a total in XAF.", sourceTables: ["payroll_employee_balance_cases"] }] }
  const input = { organizationId: "org-1", organizationName: "Owned", inventoryModuleAccess: true, actorPermissions: ["dashboard.read", "inventory.read"], actorRoleCodes: ["owner"], currency: "XAF", locale, tenantOperating: payrollSource, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
  const original = JSON.stringify(payrollSource)
  const denied = composeDailyHabitDigestData(input)
  expect(JSON.stringify(denied).includes("983421.78")).toBe(false)
  expect(JSON.stringify(denied)).not.toContain("employee balance")
  expect(JSON.stringify(denied)).not.toContain("payroll_employee_balance_cases")
  expect(denied.digests.every(digest => digest.commandBrief.state === "partial")).toBe(true)
  expect(denied.digests[0].blockers).toEqual(expect.arrayContaining([expect.objectContaining({ gate: "restricted_source", severity: "high" })]))
  for (const access of [{ payrollModuleAccess: true }, { actorPermissions: [...input.actorPermissions, "payroll.command.read"] }]) {
    expect(JSON.stringify(composeDailyHabitDigestData({ ...input, ...access })).includes("983421.78")).toBe(false)
  }
  const allowed = composeDailyHabitDigestData({ ...input, payrollModuleAccess: true, actorPermissions: [...input.actorPermissions, "payroll.command.read"] })
  expect(JSON.stringify(allowed)).toContain("983421.78")
  expect(JSON.stringify(payrollSource)).toBe(original)
})

it.each(["en", "fr"] as const)("retains the inventory summary while independently gating every item handoff (%s)", locale => {
  const input = { organizationId: "org-1", organizationName: "Owned", inventoryModuleAccess: true, actorPermissions: ["inventory.read"], actorRoleCodes: ["stockkeeper"], currency: "XAF", locale, tenantOperating, paymentTruth, inventoryCash: snapshot("inventory.cash", { ...inventoryMetrics, inventoryValue: 2_000_000, zeroStockLevelCount: 1 }), closeReadiness, now: generatedAt }
  const [denied] = composeDailyHabitDigestData(input).digests
  expect(denied.id).toBe("stockkeeper-stock")
  expect(denied.zones[0].primaryMetric?.value).toBe(2_000_000)
  expect(denied.actions).toEqual([])
  expect(denied.commandBrief.primaryAction).toMatchObject({ disabled: true, requiredPermission: "inventory.items.read" })
  for (const drill of [denied.commandBrief.drillThrough, denied.zones[0].drillThrough, denied.zones[0].primaryMetric?.drillThrough]) {
    expect(drill).toMatchObject({ available: false, requiredPermission: "inventory.items.read" })
    expect(drill).not.toHaveProperty("href")
  }
  const [allowed] = composeDailyHabitDigestData({ ...input, actorPermissions: [...input.actorPermissions, "inventory.items.read"] }).digests
  expect(allowed.actions).toHaveLength(1)
  expect(allowed.changes).toHaveLength(1)
  expect(allowed.zones[0].primaryMetric?.drillThrough).toMatchObject({ available: true, requiredPermission: "inventory.items.read", href: `/${locale}/dashboard/inventory/items` })
  expect(allowed.actions[0]).toMatchObject({ disabled: false, requiredPermission: "inventory.items.read", href: `/${locale}/dashboard/inventory/items` })
})

function compose(actorPermissions: string[], actorRoleCodes: string[], locale: "en" | "fr" = "en") {
  const week = <T,>(source: SnapshotResult<T>) => ({ ...source, periodStart: "2026-07-05T00:00:00.000Z" })
  return composeDailyHabitDigestData({
    locale,
    organizationId: "org-1",
    organizationName: "Atelier OHADA",
    purchasingModuleAccess: true,
    inventoryModuleAccess: true,
    closeModuleAccess: true,
    financeModuleAccess: true,
    reconciliationModuleAccess: true,
    actorPermissions,
    actorRoleCodes,
    currency: "XAF",
    tenantOperating,
    paymentTruth,
    inventoryCash,
    closeReadiness,
    weeklySources: { tenantOperating: week(tenantOperating), paymentTruth: week(paymentTruth), inventoryCash: week(inventoryCash), closeReadiness: week(closeReadiness) },
    now: generatedAt,
  })
}

it.each(["en", "fr"] as const)("preserves an unavailable suspense total and its source handoff in %s", locale => {
  const payment = { ...paymentTruth, metrics: { ...paymentMetrics, openSuspenseAmount: null, openSuspenseCount: 2, suspenseCurrencyCode: "XAF" } }
  const result = composeDailyHabitDigestData({ locale, organizationId: "org-1", organizationName: "Owned", financeModuleAccess: true, reconciliationModuleAccess: true, actorPermissions: ["finance.read", "payments.reconciliation.read"], actorRoleCodes: ["finance"], currency: "XAF", tenantOperating, paymentTruth: payment, inventoryCash, closeReadiness, now: generatedAt })
  const digest = result.digests.find(item => item.id === "finance-cash")!
  expect(digest.zones[0]!.cards[0]).toMatchObject({ value: null, state: "blocked", unit: "XAF" })
  expect(digest.risks[0]).toMatchObject({ title: locale === "fr" ? "Suspens de paiement ouverts" : "Open Payment Suspense", actionLink: { href: `/${locale}/dashboard/finance/reconciliation` } })
})

function mockDailyHabitSources() {
  ;(db.organization.findFirst as jest.Mock).mockResolvedValue({
    name: "Atelier OHADA",
    currency: "xaf",
  })
  ;(getPaymentTruthSnapshot as jest.Mock).mockResolvedValue(paymentTruth)
  ;(getInventoryCashSnapshot as jest.Mock).mockResolvedValue(inventoryCash)
  ;(getCloseReadinessSnapshot as jest.Mock).mockResolvedValue(closeReadiness)
  ;(getTenantOperatingSnapshotFromRelated as jest.Mock).mockResolvedValue(
    tenantOperating,
  )
}

describe("Digest request period consistency", () => {
  afterEach(() => { jest.useRealTimers(); jest.resetAllMocks() })

  it("keeps every source in the request's UTC day when loading crosses midnight", async () => {
    jest.useFakeTimers()
    const requestedAt = new Date("2026-09-19T23:59:59.999Z")
    jest.setSystemTime(requestedAt)
    mockDailyHabitSources()
    const observed: Array<{ source: string; periodStart: string; generatedAt: string }> = []
    const timed = <T,>(source: SnapshotResult<T>, input: Parameters<typeof normalizeSnapshotScope>[0]) => {
      const scope = normalizeSnapshotScope(input)
      observed.push({ source: source.kind, periodStart: scope.periodStart.toISOString(), generatedAt: scope.now.toISOString() })
      return { ...source, generatedAt: scope.now.toISOString(), periodStart: scope.periodStart.toISOString(), periodEnd: scope.periodEnd.toISOString() }
    }
    ;(getPaymentTruthSnapshot as jest.Mock).mockImplementationOnce(async input => {
      const source = timed(paymentTruth, input)
      jest.setSystemTime(new Date("2026-09-20T00:00:01.000Z"))
      return source
    })
    ;(getInventoryCashSnapshot as jest.Mock).mockImplementationOnce(async input => timed(inventoryCash, input))
    ;(getCloseReadinessSnapshot as jest.Mock).mockImplementationOnce(async input => timed(closeReadiness, input))
    ;(getTenantOperatingSnapshotFromRelated as jest.Mock).mockImplementationOnce(async input => timed(tenantOperating, input))
    const result = await getDailyHabitDigestData({ organizationId: "org-1", actorPermissions: ["dashboard.read"], actorRoleCodes: ["manager"] })
    expect(observed).toHaveLength(4)
    expect(observed.map(value => value.periodStart)).toEqual(Array(4).fill("2026-09-19T00:00:00.000Z"))
    expect(observed.map(value => value.generatedAt)).toEqual(Array(4).fill(requestedAt.toISOString()))
    expect(result.periodStart).toBe("2026-09-19T00:00:00.000Z")
    expect(result.generatedAt).toBe(requestedAt.toISOString())
  })
})

describe("Weekly Digest reporting window", () => {
  afterEach(() => jest.resetAllMocks())

  function weeklyComposition() {
    const week = <T,>(source: SnapshotResult<T>) => ({ ...source, periodStart: "2026-07-05T00:00:00.000Z" })
    const payment = { ...paymentTruth, metrics: { ...paymentMetrics, openSuspenseCount: 1, openSuspenseAmount: 50 } }
    return { organizationId: "org-1", organizationName: "Owned", financeModuleAccess: true, reconciliationModuleAccess: true, currency: "XAF", actorPermissions: ["dashboard.read", "analytics.read", "payments.reconciliation.read"], actorRoleCodes: ["owner"], tenantOperating, paymentTruth: payment, inventoryCash, closeReadiness, weeklySources: { tenantOperating: week(tenantOperating), paymentTruth: week(payment), inventoryCash: week(inventoryCash), closeReadiness: week(closeReadiness) }, now: generatedAt }
  }

  it("counts a current payment obligation once across daily and weekly workspaces", () => {
    const data = composeDailyHabitDigestData(weeklyComposition())
    expect(data.summary.visibleActionCount).toBe(1)
    expect(data.actionQueue.summary.total).toBe(1)
    expect(data.digests.find(d => d.id === "weekly")!.actions).toHaveLength(1)
    expect(data.digests.find(d => d.id === "owner-morning")!.actions).toHaveLength(1)
  })

  it.each(["tenantOperating", "paymentTruth", "inventoryCash", "closeReadiness"] as const)("rejects foreign, daily-period and stale-clock weekly %s evidence", key => {
    const input = weeklyComposition()
    for (const mutation of [{ organizationId: "foreign" }, { periodStart: input.tenantOperating.periodStart }, { generatedAt: "2026-07-12T08:00:00.000Z" }]) {
      expect(() => composeDailyHabitDigestData({ ...input, weeklySources: { ...input.weeklySources, [key]: { ...input.weeklySources[key], ...mutation } } })).toThrow(/Digest source/)
    }
    expect(() => composeDailyHabitDigestData({ ...input, weeklySources: undefined })).toThrow("Weekly Digest sources are unavailable")
  })

  it.each(["en", "fr"] as const)("redacts weekly payroll evidence before serialization (%s)", locale => {
    const input = weeklyComposition()
    input.weeklySources.tenantOperating.blockers = [{ id: "tenant-payroll-employee-balance-open", gate: "payroll_employee_balance", severity: "high", title: "Employee balance recovery cases are open", detail: "3 active employee balance cases have 983421.78 outstanding.", sourceTables: ["payroll_employee_balance_cases"] }]
    expect(JSON.stringify(composeDailyHabitDigestData({ ...input, locale }))).not.toContain("983421.78")
    const permitted = composeDailyHabitDigestData({ ...input, locale, payrollModuleAccess: true, actorPermissions: [...input.actorPermissions, "payroll.command.read"] })
    expect(JSON.stringify(permitted)).toContain("983421.78")
  })

  function scopedSources() {
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockDailyHabitSources()
    const timed = <T,>(source: SnapshotResult<T>, input: Parameters<typeof normalizeSnapshotScope>[0]) => {
      const scope = normalizeSnapshotScope(input)
      return { ...source, generatedAt: scope.now.toISOString(), periodStart: scope.periodStart.toISOString(), periodEnd: scope.periodEnd.toISOString(), sourceHash: scope.periodStart.toISOString() }
    }
    ;(getPaymentTruthSnapshot as jest.Mock).mockImplementation(async input => timed(paymentTruth, input))
    ;(getInventoryCashSnapshot as jest.Mock).mockImplementation(async input => timed(inventoryCash, input))
    ;(getCloseReadinessSnapshot as jest.Mock).mockImplementation(async input => timed(closeReadiness, input))
    ;(getTenantOperatingSnapshotFromRelated as jest.Mock).mockImplementation(async input => {
      const source = timed(tenantOperating, input)
      const days = (Date.parse(source.periodEnd) + 1 - Date.parse(source.periodStart)) / 86400000
      return { ...source, metrics: { ...source.metrics, completedSalesRevenue: days * 100, cashCollected: days * 10 } }
    })
  }

  it.each([
    ["2026-09-19T23:59:59.999Z", undefined, undefined, "2026-09-19", "2026-09-13"],
    ["2026-01-02T12:00:00Z", undefined, undefined, "2026-01-02", "2025-12-27"],
    ["2026-09-19T12:00:00Z", "2026-08-01", "2026-08-02", "2026-08-01", "2026-07-27"],
  ])("binds weekly sources independently while preserving the requested daily scope: %s", async (now, periodStart, periodEnd, dailyStart, weeklyStart) => {
    scopedSources()
    const data = await getDailyHabitDigestData({ organizationId: "org-1", actorId: "reader-1", actorPermissions: ["dashboard.read", "analytics.read"], actorRoleCodes: ["owner"], now, periodStart, periodEnd })
    const daily = data.digests.find(d => d.id === "owner-morning")!
    const weekly = data.digests.find(d => d.id === "weekly")!
    expect(daily.periodStart).toBe(dailyStart + "T00:00:00.000Z")
    expect(weekly.periodStart).toBe(weeklyStart + "T00:00:00.000Z")
    expect(weekly.periodEnd).toBe(daily.periodEnd)
    expect(weekly.zones[0].cards[0].value).toBe(700)
    expect(daily.zones[0].cards[0].value).toBe(periodEnd ? 20 : 10)
    expect(weekly.zones[0].cards[0].provenance.sourceHash).toBe(weekly.periodStart)
    for (const source of [getPaymentTruthSnapshot, getInventoryCashSnapshot, getCloseReadinessSnapshot, getTenantOperatingSnapshotFromRelated]) {
      expect(source).toHaveBeenCalledTimes(2)
      expect((source as jest.Mock).mock.calls[1][0]).toMatchObject({ periodStart: new Date(weekly.periodStart), periodEnd: new Date(weekly.periodEnd), now })
    }
  })

  it("does not load or expose a weekly window without analytics permission", async () => {
    scopedSources()
    const data = await getDailyHabitDigestData({ organizationId: "org-1", actorPermissions: ["dashboard.read"], actorRoleCodes: ["owner"], now: generatedAt })
    expect(data.digests.some(d => d.id === "weekly")).toBe(false)
    expect(getTenantOperatingSnapshotFromRelated).toHaveBeenCalledTimes(1)
  })

  it("propagates a weekly query failure instead of substituting daily sales or zero", async () => {
    scopedSources()
    ;(getPaymentTruthSnapshot as jest.Mock).mockResolvedValueOnce(paymentTruth).mockRejectedValueOnce(new Error("Weekly query failed"))
    await expect(getDailyHabitDigestData({ organizationId: "org-1", actorId: "reader-1", actorPermissions: ["analytics.read"], actorRoleCodes: [], now: generatedAt })).rejects.toThrow("Weekly query failed")
  })
})

describe("Daily Habit Digest role cockpit", () => {
  it.each([
    ["owner", ["dashboard.read", "payments.reconciliation.read"], ["owner-morning", "end-of-day"]],
    ["manager", ["dashboard.read", "purchases.orders.read"], ["manager-run-sheet", "end-of-day"]],
    ["finance", ["finance.read", "payments.reconciliation.read"], ["finance-cash"]],
    ["accountant", ["accounting.close.read"], ["accountant-close"]],
    ["stockkeeper", ["inventory.read", "inventory.items.read"], ["stockkeeper-stock"]],
  ])("binds every %s handoff to the authorized source module in EN/FR", (role, permissions, ids) => {
    const sources = {
      tenantOperating: snapshot("tenant.operating", { ...tenantMetrics, overduePurchaseOrderCount: 1 }),
      paymentTruth: snapshot("payment.truth", { ...paymentMetrics, openSuspenseCount: 1 }),
      inventoryCash: snapshot("inventory.cash", { ...inventoryMetrics, zeroStockLevelCount: 1 }),
      closeReadiness: snapshot("close.readiness", { ...closeMetrics, openFindingCount: 1 }),
    }
    for (const locale of ["en", "fr"] as const) {
      const input = { ...sources, organizationId: "org-1", organizationName: "Owned", purchasingModuleAccess: true, inventoryModuleAccess: true, closeModuleAccess: true, financeModuleAccess: true, reconciliationModuleAccess: true, currency: "XAF", actorPermissions: permissions as string[], actorRoleCodes: [role as string], locale, now: generatedAt }
      const result = composeDailyHabitDigestData(input)
      expect(result.digests.map(digest => digest.id)).toEqual(ids)
      for (const digest of result.digests) {
        if (role === "manager" && digest.id === "end-of-day") {
          // Purchasing work belongs to the manager run sheet, not the end-of-day action audience.
          expect(digest.actions).toEqual([])
          expect(digest.risks).toEqual([])
          expect(digest.changes).toEqual([])
          expect(digest.commandBrief.primaryAction).toMatchObject({ moduleSlug: "dashboard", requiredPermission: "dashboard.read", href: `/${locale}/dashboard/manager-action-center` })
          continue
        }
        expect(digest.actions.length).toBeGreaterThan(0)
        const destinations: Record<string, { moduleSlug: string; path: string }> = {
          "payments.reconciliation.read": { moduleSlug: "payment_reconciliation", path: "/dashboard/finance/reconciliation" },
          "purchases.orders.read": { moduleSlug: "purchasing", path: "/dashboard/purchase-orders" },
          "inventory.items.read": { moduleSlug: "inventory", path: "/dashboard/inventory/items" },
          "accounting.close.read": { moduleSlug: "close_assurance", path: "/dashboard/accounting/close" },
        }
        const links = [...digest.actions, digest.commandBrief.primaryAction!, ...digest.zones[0]!.actions, ...digest.risks.map(risk => risk.actionLink!), ...digest.changes.map(change => change.actionLink!)]
        for (const link of links) {
          const destination = destinations[link.requiredPermission!]
          expect(destination).toBeDefined()
          expect(link).toMatchObject({ moduleSlug: destination!.moduleSlug, href: `/${locale}${destination!.path}` })
        }
      }
      // Revoking source grants must remove their actions on the next composition.
      const denied = composeDailyHabitDigestData({ ...input, actorPermissions: ["dashboard.read"] })
      expect(denied.digests.flatMap(digest => [...digest.actions, ...digest.risks, ...digest.changes])).toEqual([])
    }
  })
  it.each([
    ["fresh", "fresh", "ready"], ["stale", "stale", "stale"], ["partial", "partial", "partial"],
    ["empty", "empty", "empty"], ["failed", "safe_error", "safe_error"], ["blocked", "blocked", "blocked"],
    ["building", "loading", "loading"], ["fresh", "redacted", "redacted"],
    ["fresh", "permission_denied", "permission_denied"], ["fresh", "module_unavailable", "module_unavailable"],
  ] as const)("preserves each metric source's %s/%s availability", (status, uiState, expected) => {
    const payment = { ...paymentTruth, status, uiState, sourceHash: "payment-own-hash", freshness: { ...paymentTruth.freshness, generatedAt: "2026-07-10T08:00:00.000Z", stale: status === "stale" } }
    const inventory = { ...inventoryCash, status, uiState, sourceHash: "inventory-own-hash" }
    const close = { ...closeReadiness, status, uiState, sourceHash: "close-own-hash", metrics: { ...closeMetrics, averageReadinessScore: 63 } }
    const result = composeDailyHabitDigestData({ organizationId: "org-1", organizationName: "Owned", inventoryModuleAccess: true, closeModuleAccess: true, financeModuleAccess: true, reconciliationModuleAccess: true, actorPermissions: ["finance.read", "inventory.read", "accounting.close.read"], actorRoleCodes: ["admin"], currency: "XAF", tenantOperating, paymentTruth: payment, inventoryCash: inventory, closeReadiness: close, now: generatedAt })
    for (const [id, source] of [["finance-cash", payment], ["stockkeeper-stock", inventory], ["accountant-close", close]] as const) {
      const digest = result.digests.find(value => value.id === id)!, card = digest.zones[0]!.cards[0]!
      expect(card.state).toBe(expected)
      expect(digest.commandBrief.state).toBe(expected)
      expect(card.provenance.sourceHash).toBe(source.sourceHash)
      expect(card.freshness.generatedAt).toBe(source.freshness.generatedAt)
    }
  })
  it("distinguishes an absent close score from a measured zero and honors a stale source flag", () => {
    const input = { organizationId: "org-1", organizationName: "Owned", closeModuleAccess: true, actorPermissions: ["accounting.close.read"], actorRoleCodes: ["accountant"], currency: "XAF", tenantOperating, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
    const cardFor = (value: typeof input) => composeDailyHabitDigestData(value).digests[0]!.zones[0]!.cards[0]!
    expect(cardFor(input)).toMatchObject({ value: null, state: "empty" })
    expect(cardFor({ ...input, closeReadiness: { ...closeReadiness, metrics: { ...closeMetrics, averageReadinessScore: 0 } } })).toMatchObject({ value: 0, state: "ready" })
    expect(cardFor({ ...input, closeReadiness: { ...closeReadiness, metrics: { ...closeMetrics, averageReadinessScore: 63 }, freshness: { ...closeReadiness.freshness, stale: true } } })).toMatchObject({ value: 63, state: "stale", freshness: { stale: true, state: "stale" } })
  })
  it("reports populated signals as observations without inventing changes from their order", () => {
    const tenant = snapshot("tenant.operating", { ...tenantMetrics, pendingPurchaseOrderCount: 3, overduePurchaseOrderCount: 1 })
    const stock = snapshot("inventory.cash", { ...inventoryMetrics, zeroStockLevelCount: 2 })
    const input = { organizationId: "org-1", organizationName: "Owned", purchasingModuleAccess: true, inventoryModuleAccess: true, actorPermissions: ["dashboard.read", "inventory.read", "inventory.items.read", "purchases.orders.read"], actorRoleCodes: ["manager"], currency: "XAF", tenantOperating: tenant, paymentTruth, inventoryCash: stock, closeReadiness, now: generatedAt }
    const first = composeDailyHabitDigestData(input)
    const changes = first.digests.find(digest => digest.id === "manager-run-sheet")!.changes
    expect(changes.length).toBeGreaterThanOrEqual(2)
    for (const observation of changes) {
      expect(observation.direction).toBe("observed")
      expect(observation.previousValue).toBeNull()
      expect(observation.currentValue).toEqual(expect.any(Number))
      expect(observation.provenance?.sourceHash).toBe("sha256:test")
    }
    expect(composeDailyHabitDigestData(input).digests).toEqual(first.digests)
    const french = composeDailyHabitDigestData({ ...input, locale: "fr" }).digests.find(digest => digest.id === "manager-run-sheet")!
    expect(french.changes).toEqual(expect.arrayContaining([expect.objectContaining({
      title: "Commandes au-delà de la date de livraison prévue",
      provenance: expect.objectContaining({ sourceHash: "sha256:test" }),
    })]))
    expect(JSON.stringify(french)).toContain("1 commande en attente a dépassé")
    expect(JSON.stringify(french)).toContain("Vérifiez les commandes en attente")
    expect(french.risks).toEqual(expect.arrayContaining([expect.objectContaining({ businessImpact: "Les retards de réception peuvent signaler un risque fournisseur, une rupture de stock ou un décalage des échéances fournisseurs.", urgency: null })]))
    expect(tenant.metrics.overduePurchaseOrderCount).toBe(1)
    const denied = composeDailyHabitDigestData({ ...input, actorPermissions: ["dashboard.read"] })
    expect(denied.digests.flatMap(digest => digest.changes)).toEqual([])
  })

  it("binds risk freshness and source module to the originating signal instead of the tenant summary", () => {
    const stock = snapshot("inventory.cash", { ...inventoryMetrics, zeroStockLevelCount: 2 })
    stock.freshness = { ...stock.freshness, stale: true, generatedAt: "2026-07-10T08:00:00.000Z", sourceMaxUpdatedAt: "2026-07-09T08:00:00.000Z", staleReason: "Source requires refresh" }
    const result = composeDailyHabitDigestData({ organizationId: "org-1", organizationName: "Owned", inventoryModuleAccess: true, actorPermissions: ["dashboard.read", "inventory.read", "inventory.items.read"], actorRoleCodes: ["manager"], currency: "XAF", tenantOperating, paymentTruth, inventoryCash: stock, closeReadiness, now: generatedAt })
    const risks = result.digests.find(digest => digest.id === "manager-run-sheet")!.risks
    expect(risks.length).toBeGreaterThan(0)
    expect(risks[0]).toMatchObject({ state: "stale", urgency: null, sourceModules: ["inventory"], freshness: { state: "stale", stale: true, generatedAt: stock.freshness.generatedAt, sourceMaxUpdatedAt: stock.freshness.sourceMaxUpdatedAt } })
  })

  it.each(["tenantOperating", "paymentTruth", "inventoryCash", "closeReadiness"] as const)("rejects foreign %s evidence before composing a digest", (key) => {
    const input = { organizationId: "org-1", organizationName: "Owned", actorPermissions: ["dashboard.read"], actorRoleCodes: ["manager"], currency: "XAF", tenantOperating, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
    expect(() => composeDailyHabitDigestData({ ...input, [key]: { ...input[key], organizationId: "foreign-org" } })).toThrow("Digest source scope does not match the organization")
  })

  it("does not turn a critical source severity into an assessed urgency", () => {
    const close = snapshot("close.readiness", { ...closeMetrics, criticalOpenFindingCount: 2, openFindingCount: 2 })
    const result = composeDailyHabitDigestData({ organizationId: "org-1", organizationName: "Owned", closeModuleAccess: true, actorPermissions: ["accounting.close.read"], actorRoleCodes: ["accountant"], currency: "XAF", tenantOperating, paymentTruth, inventoryCash, closeReadiness: close, now: generatedAt })
    const risks = result.digests.flatMap(digest => digest.risks)
    expect(risks.some(risk => risk.severity === "critical")).toBe(true)
    expect(risks.every(risk => risk.urgency === null)).toBe(true)
  })

  it.each(["en", "fr"] as const)("treats expired evidence as stale without inventing a business blocker (%s)", locale => {
    const stock = snapshot("inventory.cash", { ...inventoryMetrics, zeroStockLevelCount: 1 })
    const before = JSON.stringify(stock)
    const input = { organizationId: "org-1", organizationName: "Owned", inventoryModuleAccess: true, actorPermissions: ["inventory.read", "inventory.items.read"], actorRoleCodes: ["stockkeeper"], currency: "XAF", tenantOperating, paymentTruth, inventoryCash: stock, closeReadiness, now: "2026-07-14T08:00:00.000Z", locale }
    const result = composeDailyHabitDigestData(input)
    const digest = result.digests[0]!
    expect(result.actionQueue.summary.expired).toBe(1)
    expect(result.summary).toMatchObject({ staleSignalCount: 1, blockedDigestCount: 0 })
    expect(digest.commandBrief.state).toBe("stale")
    expect(digest.zones[0]!.state).toBe("stale")
    expect(digest.changes[0]).toMatchObject({ state: "stale", severity: "medium", freshness: { state: "stale", stale: true, staleReason: locale === "fr" ? "Le signal a expiré." : "Signal is expired." } })
    expect(digest.risks[0]).toMatchObject({ state: "stale", severity: "medium", urgency: null, freshness: { staleReason: locale === "fr" ? "Le signal a expiré." : "Signal is expired." } })
    expect(digest.actions[0]!.href).toBe(`/${locale}/dashboard/inventory/items`)
    expect(JSON.stringify(stock)).toBe(before)
    const blocked = composeDailyHabitDigestData({ ...input, inventoryCash: { ...stock, status: "blocked", uiState: "blocked", blockers: [{ id: "real-blocker", gate: "inventory_cash", severity: "critical", title: "Unresolved source control", detail: "Required evidence is missing", sourceTables: ["inventory_levels"] }] } })
    expect(blocked.digests[0]!.commandBrief.state).toBe("blocked")
    expect(blocked.digests[0]!.zones[0]!.cards[0]!.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ id: "real-blocker", severity: "critical" })]))
    const refreshed = composeDailyHabitDigestData({ ...input, inventoryCash: { ...stock, generatedAt: input.now, freshness: { ...stock.freshness, generatedAt: input.now, sourceMaxUpdatedAt: input.now } } })
    expect(refreshed.actionQueue.summary.expired).toBe(0)
    expect(refreshed.summary).toMatchObject({ staleSignalCount: 0, blockedDigestCount: 0 })
    expect(refreshed.digests[0]!.commandBrief.state).toBe("ready")
  })

  it("rejects foreign optional inventory-loss evidence", () => {
    expect(() => composeDailyHabitDigestData({ organizationId: "org-1", organizationName: "Owned", inventoryModuleAccess: true, actorPermissions: ["dashboard.read"], actorRoleCodes: ["admin"], currency: "XAF", tenantOperating, paymentTruth, inventoryCash, closeReadiness, inventoryLoss: { ...snapshot("inventory.loss", inventoryLossMetrics), organizationId: "foreign-org" }, now: generatedAt })).toThrow("Digest source scope does not match the organization")
  })
  it("localizes setup blockers across digest views without changing source evidence or custom messages", () => {
    const source = snapshot("tenant.operating", tenantMetrics)
    source.blockers = [{ id: "payment-provider-account-missing", gate: "payment_truth", severity: "medium", title: "No active provider account", detail: "Payment truth is partial until at least one bank, cash, or mobile-money provider account is active.", nextAction: "Activate a provider account and connect statement/provider evidence.", sourceTables: ["provider_accounts"] }, { id: "custom", gate: "custom", severity: "high", title: "Operator supplied title", detail: "Keep this exact detail.", sourceTables: [] }]
    const original = JSON.stringify(source)
    const result = composeDailyHabitDigestData({ locale: "fr", organizationId: "org-1", organizationName: "Owned", financeModuleAccess: true, reconciliationModuleAccess: true, actorPermissions: ["dashboard.read", "payments.reconciliation.read"], actorRoleCodes: ["admin"], currency: "XAF", tenantOperating: source, paymentTruth, inventoryCash, closeReadiness, now: generatedAt })
    for (const digest of result.digests) {
      for (const values of [digest.blockers, digest.commandBrief.blockers, digest.zones[0]!.blockers, digest.zones[0]!.cards[0]!.blockers]) {
        expect(values[0]).toMatchObject({ id: source.blockers[0]!.id, gate: "payment_truth", severity: "medium", sourceTables: ["provider_accounts"], title: "Aucun compte de prestataire actif", nextAction: "Activez un compte de prestataire et associez les relevés ou les justificatifs du prestataire." })
        expect(values[1]).toEqual(source.blockers[1])
      }
      expect(digest.commandBrief.provenance?.sourceHash).toBe(source.sourceHash)
      expect(digest.zones[0]!.cards[0]!.provenance.sourceHash).toBe(source.sourceHash)
    }
    expect(JSON.stringify(source)).toBe(original)
  })
  it("translates all seven templates while preserving IDs, authority, monetary values and evidence", () => {
    const permissions = ["dashboard.read", "finance.read", "accounting.close.read", "inventory.read", "analytics.read"]
    const en = compose(permissions, ["admin", "manager"], "en")
    const fr = compose(permissions, ["admin", "manager"], "fr")
    expect(fr.digests).toHaveLength(7)
    expect(fr.summary).toEqual(en.summary)
    expect(fr.actionQueue).toEqual(en.actionQueue)
    for (const [index, digest] of fr.digests.entries()) {
      const original = en.digests[index]!
      expect(digest.id).toBe(original.id)
      expect(digest.commandBrief.title).not.toBe(original.commandBrief.title)
      expect(digest.commandBrief.provenance).toEqual(original.commandBrief.provenance)
      expect(digest.blockers).toEqual(original.blockers)
      expect(digest.redactions).toEqual(original.redactions)
      expect(digest.commandBrief.primaryAction?.href).toMatch(/^\/fr\/dashboard/)
      expect(digest.commandBrief.primaryAction?.requiredPermission).toEqual(original.commandBrief.primaryAction?.requiredPermission)
      const card = digest.zones[0]!.cards[0]!, previous = original.zones[0]!.cards[0]!
      expect(card).toMatchObject({ id: previous.id, value: previous.value, format: previous.format, requiredPermission: previous.requiredPermission, state: previous.state, evidenceGrade: previous.evidenceGrade, provenance: previous.provenance })
      expect(card.title).not.toBe(previous.title)
      expect(card.drillThrough).toMatchObject({ available: previous.drillThrough.available, requiredPermission: previous.drillThrough.requiredPermission })
    }
  })
  beforeEach(() => {
    jest.clearAllMocks()
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockGetInventoryLossSnapshot.mockResolvedValue(inventoryLoss)
  })

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

  it("loads tenant name, currency and timezone inside the service boundary", async () => {
    ;(db.organization.findFirst as jest.Mock).mockResolvedValue({ name: "Atelier OHADA", currency: "xaf", timezone: "Africa/Douala" })
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
      select: { name: true, currency: true, timezone: true },
    })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockGetInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(result).toMatchObject({ organizationName: "Atelier OHADA", currency: "XAF", timezone: "Africa/Douala" })
  })

  it.each([true, false])("checks the current payroll module before exposing payroll source details (allowed=%s)", async allowed => {
    mockDailyHabitSources()
    const detail = "Restricted test amount 983421.78"
    ;(getTenantOperatingSnapshotFromRelated as jest.Mock).mockResolvedValue({ ...tenantOperating, blockers: [{ id: "payroll-private", gate: "payroll_employee_balance", severity: "critical", title: "Payroll private evidence", detail, sourceTables: ["payroll_employee_balance_cases"] }] })
    mockObserveModuleAccess.mockResolvedValue({ allowed })
    const result = await getDailyHabitDigestData({ organizationId: "org-1", actorId: "reader-1", actorPermissions: ["inventory.read", "payroll.command.read"], actorRoleCodes: ["stockkeeper"], now: generatedAt })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", userId: "reader-1", moduleSlug: "payroll", mode: "enforce", accessIntent: "read", surface: "daily-habit-digest.payroll-source" }))
    expect(JSON.stringify(result).includes(detail)).toBe(allowed)
  })

  it("does not fall back to unrestricted payroll details when the module check fails", async () => {
    mockDailyHabitSources()
    mockObserveModuleAccess.mockRejectedValue(new Error("Module read unavailable"))
    await expect(getDailyHabitDigestData({ organizationId: "org-1", actorId: "reader-1", actorPermissions: ["inventory.read", "payroll.command.read"], actorRoleCodes: ["stockkeeper"] })).rejects.toThrow("Module read unavailable")
  })

  it("loads one tenant Inventory Loss action for an entitled administrator", async () => {
    mockDailyHabitSources()
    const actorPermissions = [
      "dashboard.read",
      "inventory.levels.read",
    ]

    const result = await getDailyHabitDigestData({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions,
      actorRoleCodes: [" Administrator "],
      isSuperUser: false,
      periodStart: "2026-07-11",
      periodEnd: "2026-07-11",
      now: generatedAt,
    })

    expect(mockObserveModuleAccess.mock.calls.map(([value]) => value.moduleSlug).sort()).toEqual(["dashboard", "inventory"])
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-1",
      userId: "user-1",
      actorPermissions,
      moduleSlug: "inventory",
      surfaceType: "report",
      surface: "daily-habit-digest.inventory-source",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
      now: generatedAt,
    })
    expect(mockGetInventoryLossSnapshot).toHaveBeenCalledWith({
      organizationId: "org-1",
      periodStart: "2026-07-11",
      periodEnd: "2026-07-11",
      now: generatedAt,
    })
    expect(result.actionQueue.summary).toMatchObject({ total: 1 })
    expect(
      result.digests.find((digest) => digest.id === "owner-morning")?.actions,
    ).toEqual([
      expect.objectContaining({
        href: "/en/dashboard/inventory/loss-control",
        requiredPermission: "inventory.levels.read",
      }),
    ])
    expect(result).not.toHaveProperty("inventoryLoss")
  })

  it("does not load tenant loss evidence for a location-responsibility role", async () => {
    mockDailyHabitSources()

    const result = await getDailyHabitDigestData({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["dashboard.read", "inventory.levels.read"],
      actorRoleCodes: ["manager"],
      isSuperUser: false,
      now: generatedAt,
    })

    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(3)
    expect(mockObserveModuleAccess.mock.calls.map(([input]) => input.moduleSlug).sort()).toEqual(["dashboard", "inventory", "purchasing"])
    expect(mockGetInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(result.actionQueue.summary).toMatchObject({ total: 0 })
  })

  it("does not evaluate inventory entitlement without Inventory Loss RBAC", async () => {
    mockDailyHabitSources()

    await getDailyHabitDigestData({
      organizationId: "org-1",
      actorId: "admin-1",
      actorPermissions: ["dashboard.read"],
      actorRoleCodes: ["admin"],
      isSuperUser: false,
      now: generatedAt,
    })

    expect(mockObserveModuleAccess.mock.calls.map(([value]) => value.moduleSlug)).toEqual(["dashboard"])
    expect(mockGetInventoryLossSnapshot).not.toHaveBeenCalled()
  })

  it("keeps non-inventory digests available when inventory entitlement denies", async () => {
    mockDailyHabitSources()
    mockObserveModuleAccess.mockImplementation(({ moduleSlug }) => Promise.resolve({ allowed: moduleSlug !== "inventory" }))

    const result = await getDailyHabitDigestData({
      organizationId: "org-1",
      actorId: "admin-1",
      actorPermissions: ["dashboard.read", "inventory.read", "inventory.levels.read"],
      actorRoleCodes: ["admin"],
      isSuperUser: false,
      now: generatedAt,
    })

    expect(mockObserveModuleAccess.mock.calls.map(([value]) => value.moduleSlug).sort()).toEqual(["dashboard", "inventory"])
    expect(mockGetInventoryLossSnapshot).not.toHaveBeenCalled()
    expect(result.digests.map((digest) => digest.id)).toEqual([
      "owner-morning",
      "end-of-day",
    ])
    expect(result.actionQueue.summary).toMatchObject({ total: 0 })
  })
})


it.each(["en", "fr"] as const)("shows employee balance handoffs only to permitted owner and finance audiences (%s)", locale => {
  const source = snapshot("tenant.operating", { ...tenantMetrics, activeEmployeeBalanceCaseCount: 1, openEmployeeBalanceCaseCount: 1, employeeBalanceOutstandingAmount: 983421.78 })
  const input = { organizationId: "org-1", organizationName: "Owned", inventoryModuleAccess: true, financeModuleAccess: true, reconciliationModuleAccess: true, actorPermissions: ["dashboard.read", "finance.read", "inventory.read", "payroll.command.read", "payments.reconciliation.read"], actorRoleCodes: ["owner"], payrollModuleAccess: true, currency: "XAF", locale, tenantOperating: source, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
  const result = composeDailyHabitDigestData(input)
  for (const id of ["owner-morning", "finance-cash"]) {
    const digest = result.digests.find(item => item.id === id)!
    expect(digest.actions).toEqual(expect.arrayContaining([expect.objectContaining({ href: `/${locale}/dashboard/payroll/payments`, requiredPermission: "payments.reconciliation.read", additionalRequiredPermissions: ["payroll.command.read"], disabled: false })]))
    expect(digest.actions.some(action => action.label === (locale === "fr" ? "Examinez les preuves de recouvrement des soldes salariés avant de vous fier aux paiements et à la clôture." : "Review employee balance recovery evidence before payment and close claims are trusted."))).toBe(true)
  }
  expect(result.digests.find(item => item.id === "stockkeeper-stock")!.actions).toEqual([])
  for (const permission of ["payroll.command.read", "payments.reconciliation.read"]) {
    const denied = composeDailyHabitDigestData({ ...input, actorPermissions: input.actorPermissions.filter(value => value !== permission) })
    expect(denied.digests.flatMap(digest => digest.actions).some(action => action.href.includes("/payroll/"))).toBe(false)
  }
  const moduleDenied = composeDailyHabitDigestData({ ...input, payrollModuleAccess: false })
  expect(moduleDenied.digests.flatMap(digest => digest.actions).some(action => action.href.includes("/payroll/"))).toBe(false)
})


it("localizes payroll limitations across every Digest representation without altering source evidence", () => {
  const source = { ...tenantOperating, status: "blocked" as const, uiState: "blocked" as const, metrics: { ...tenantMetrics, activeEmployeeBalanceCaseCount: 1, employeeBalanceOutstandingAmount: 983421.78 }, blockers: [{ id: "tenant-payroll-employee-balance-open", gate: "payroll_employee_balance", severity: "high" as const, title: "Employee balance recovery cases are open", detail: "1 active employee balance case(s) have 983421.78 outstanding.", sourceTables: ["payroll_employee_balance_cases"], nextAction: "Open payroll payments and settle, refund, or review employee balance recovery cases." }] }
  const before = JSON.stringify(source)
  const input = { organizationId: "org-1", organizationName: "Owned", financeModuleAccess: true, reconciliationModuleAccess: true, actorPermissions: ["dashboard.read", "finance.read", "payroll.command.read", "payments.reconciliation.read"], actorRoleCodes: ["owner"], payrollModuleAccess: true, currency: "XAF", tenantOperating: source, paymentTruth, inventoryCash, closeReadiness, now: generatedAt }
  const english = composeDailyHabitDigestData({ ...input, locale: "en" })
  const french = composeDailyHabitDigestData({ ...input, locale: "fr" })
  const serialized = JSON.stringify(french)
  expect(serialized.includes("Employee balance recovery cases are open")).toBe(false)
  expect(serialized.includes("active employee balance case(s)")).toBe(false)
  expect(serialized).toContain("1 dossier actif de solde salarié présente un montant restant de 983421.78.")
  expect(french.digests.map(digest => ({ id: digest.id, state: digest.commandBrief.state, evidence: digest.commandBrief.evidenceGrade, provenance: digest.commandBrief.provenance, metric: digest.zones[0].primaryMetric?.value }))).toEqual(english.digests.map(digest => ({ id: digest.id, state: digest.commandBrief.state, evidence: digest.commandBrief.evidenceGrade, provenance: digest.commandBrief.provenance, metric: digest.zones[0].primaryMetric?.value })))
  expect(JSON.stringify(source)).toBe(before)
})
