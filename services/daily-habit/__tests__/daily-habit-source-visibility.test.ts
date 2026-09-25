import { restrictCloseSnapshotDetails, restrictPaymentSnapshotDetails, restrictPayrollSnapshotDetails } from "../daily-habit-source-visibility"
import type { SnapshotResult } from "@/services/snapshots/snapshot-contracts"

it("collapses restricted blockers without losing severity or changing source evidence", () => {
  const source: SnapshotResult<Record<string, number>> = {
    kind: "tenant.operating", organizationId: "org", locationId: null, periodStart: "2026-09-19", periodEnd: "2026-09-20", generatedAt: "2026-09-19", sourceHash: "source-hash", sourceModules: ["payroll"], status: "blocked", uiState: "blocked", evidenceGrade: "blocked", metrics: { sourceCount: 3 }, redactions: [],
    freshness: { generatedAt: "2026-09-19", sourceMaxUpdatedAt: null, maxAgeMinutes: 60, stale: true, staleReason: "Refresh required" },
    blockers: [
      { id: "private-a", gate: "payroll_employee_balance", title: "Private title", detail: "Private amount", severity: "high", sourceTables: [] },
      { id: "private-b", gate: "future_gate", title: "Private name", detail: "Private detail", severity: "critical", sourceTables: ["payroll_runs"] },
      { id: "public", gate: "inventory_cash", title: "Stock issue", detail: "Review stock", severity: "medium", sourceTables: ["inventory_levels"] },
    ],
  }
  const before = JSON.stringify(source)
  const denied = restrictPayrollSnapshotDetails(source, false, "fr")
  expect(denied.blockers).toHaveLength(2)
  expect(denied.blockers[0]).toEqual(source.blockers[2])
  expect(denied.blockers[1]).toMatchObject({ gate: "restricted_source", severity: "critical", sourceTables: [], title: "Détails de source restreints" })
  expect(JSON.stringify(denied.blockers).includes("Private")).toBe(false)
  expect({ ...denied, blockers: [] }).toEqual({ ...source, blockers: [] })
  expect(restrictPayrollSnapshotDetails(source, true, "en")).toBe(source)
  expect(JSON.stringify(source)).toBe(before)
})

it.each(["en", "fr"] as const)("restricts payment gates and source tables while retaining status, freshness and evidence (%s)", locale => {
  const source: SnapshotResult<Record<string, number>> = {
    kind: "payment.truth", organizationId: "org", locationId: null, periodStart: "2026-09-19", periodEnd: "2026-09-20", generatedAt: "2026-09-19", sourceHash: "payment-hash", sourceModules: ["payments"], status: "blocked", uiState: "blocked", evidenceGrade: "blocked", metrics: { sourceCount: 3 }, redactions: [],
    freshness: { generatedAt: "2026-09-19", sourceMaxUpdatedAt: null, maxAgeMinutes: 60, stale: true, staleReason: "Refresh required" },
    blockers: [
      { id: "private-a", gate: "payment_truth_scope", title: "Private title", detail: "Private amount", severity: "high", sourceTables: [] },
      { id: "private-b", gate: "future_gate", title: "Private name", detail: "Private detail", severity: "critical", sourceTables: ["suspense_items"] },
      { id: "public", gate: "inventory_cash", title: "Stock issue", detail: "Review stock", severity: "medium", sourceTables: ["inventory_levels"] },
    ],
  }
  const before = JSON.stringify(source), denied = restrictPaymentSnapshotDetails(source, false, locale)
  expect(denied.blockers).toHaveLength(2)
  expect(denied.blockers[0]).toEqual(source.blockers[2])
  expect(denied.blockers[1]).toMatchObject({ id: "digest-restricted-payment-source", gate: "restricted_source", severity: "critical", sourceTables: [] })
  expect(JSON.stringify(denied.blockers)).not.toContain("Private")
  expect({ ...denied, blockers: [] }).toEqual({ ...source, blockers: [] })
  expect(restrictPaymentSnapshotDetails(source, true, locale)).toBe(source)
  expect(JSON.stringify(source)).toBe(before)
})

it.each(["en", "fr"] as const)("restricts close evidence by gate and table without losing severity or evidence (%s)", locale => {
  const source: SnapshotResult<Record<string, number>> = {
    kind: "close.readiness", organizationId: "org", locationId: null, periodStart: "2026-09-19", periodEnd: "2026-09-20", generatedAt: "2026-09-19", sourceHash: "close-hash", sourceModules: ["close"], status: "blocked", uiState: "blocked", evidenceGrade: "blocked", metrics: { sourceCount: 3 }, redactions: [],
    freshness: { generatedAt: "2026-09-19", sourceMaxUpdatedAt: null, maxAgeMinutes: 60, stale: true, staleReason: "Refresh required" },
    blockers: [
      { id: "private-a", gate: "close_readiness_scope", title: "Private title", detail: "Private evidence", severity: "high", sourceTables: [] },
      { id: "private-b", gate: "future_gate", title: "Private name", detail: "Private detail", severity: "critical", sourceTables: ["close_assurance_findings"] },
      { id: "public", gate: "inventory_cash", title: "Stock issue", detail: "Review stock", severity: "medium", sourceTables: ["inventory_levels"] },
    ],
  }
  const before = JSON.stringify(source), denied = restrictCloseSnapshotDetails(source, false, locale)
  expect(denied.blockers).toHaveLength(2)
  expect(denied.blockers[0]).toEqual(source.blockers[2])
  expect(denied.blockers[1]).toMatchObject({ id: "digest-restricted-close-source", gate: "restricted_source", severity: "critical", sourceTables: [] })
  expect(JSON.stringify(denied.blockers)).not.toContain("Private")
  expect({ ...denied, blockers: [] }).toEqual({ ...source, blockers: [] })
  expect(restrictCloseSnapshotDetails(source, true, locale)).toBe(source)
  expect(JSON.stringify(source)).toBe(before)
})
