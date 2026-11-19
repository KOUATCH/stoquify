import type { DailyHabitDigestData } from "@/services/daily-habit/daily-habit-digest-contracts"
import type { BIChangeEvent, BIDailyDigest, BIActionLink, BIFreshness, BIBlocker } from "@/services/bi/bi-contracts"
const freshness: BIFreshness = { state: "stale", stale: true, generatedAt: "2026-07-11T08:00:00Z", sourceMaxUpdatedAt: null, maxAgeMinutes: 60, staleReason: "Source needs refresh" }
const blocker: BIBlocker = { id: "source-blocker", title: "Source evidence missing", detail: "Review the source before use.", severity: "high", gate: "source.review", sourceTables: [], nextAction: "Inspect source" }
const action: BIActionLink = { id: "source-action", label: "Review source", href: "/fr/dashboard/inventory", requiredPermission: "inventory.read", moduleSlug: "inventory", disabled: false, disabledReason: null }
export function digest(id: string, role: string): BIDailyDigest {
  return {
    id, audienceRole: role, organizationId: "owned-org", generatedAt: freshness.generatedAt!, periodStart: "2026-07-11T00:00:00Z", periodEnd: "2026-07-11T23:59:59Z", freshness,
    commandBrief: { id: id + "-brief", organizationId: "owned-org", title: "Role summary", summary: "Scoped signals", conclusion: "Review limitations", mode: "brief", generatedAt: freshness.generatedAt!, periodStart: "2026-07-11T00:00:00Z", periodEnd: "2026-07-11T23:59:59Z", state: "stale", evidenceGrade: "operational", trustState: "operational", freshness, provenance: { organizationId: "owned-org", locationId: null, sourceHash: "owned-hash", sourceModules: ["inventory"], generatedAt: freshness.generatedAt! }, sourceModules: ["inventory"], blockers: [blocker], redactions: [], primaryAction: null, drillThrough: null, reviewState: null },
    actions: [action, { ...action, id: "disabled", label: "Restricted action", disabled: true, disabledReason: "Current permission required" }], changes: [], risks: [], blockers: [blocker], redactions: [],
    zones: [{ id: id + "-zone", organizationId: "owned-org", moduleSlug: "inventory", title: "Original source view", businessQuestion: "Can I rely on the source?", summary: "Source limitations remain", state: "stale", evidenceGrade: "operational", trustState: "operational", freshness, sourceModules: ["inventory"], primaryMetric: null, sections: [], cards: [], insights: [], risks: [], flowSteps: [], actions: [], blockers: [blocker], redactions: [], drillThrough: null }],
  }
}
export function digestData(): DailyHabitDigestData {
  return { organizationId: "owned-org", organizationName: "Owned test", generatedAt: freshness.generatedAt!, periodStart: "2026-07-11T00:00:00Z", periodEnd: "2026-07-11T23:59:59Z", currency: "XAF", timezone: "UTC", digests: [digest("owner", "owner"), digest("manager", "manager")], actionQueue: { filteredOutCount: 0, summary: { total: 2, open: 2, assigned: 0, stale: 0, expired: 0, redacted: 0, bySeverity: { info: 0, low: 0, medium: 0, high: 2, critical: 0 }, byRole: { owner: 2 } } }, summary: { digestCount: 2, visibleActionCount: 2, filteredOutActionCount: 0, staleSignalCount: 1, redactedSignalCount: 0, blockedDigestCount: 0, hiddenDigestCount: 0 } }
}


export function observation(id = "one", locationId: string | null = "branch-a", sourceId = "record-one"): BIChangeEvent {
  const digest = digestData().digests[0]
  return { id, organizationId: digest.organizationId, moduleSlug: "inventory", requiredPermission: "inventory.read", title: "Stock review", detail: "Current stock evidence", businessImpact: "Evidence needs review", direction: "changed", severity: "high", state: "stale", evidenceGrade: "operational", trustState: "operational", freshness: digest.freshness, sourceModules: ["inventory"], changedAt: digest.generatedAt, previousValue: 40, currentValue: 50, unit: "items", format: "number", provenance: {organizationId: digest.organizationId, locationId, sourceKind: "inventory", sourceId, sourceHash: "hash", sourceModules: ["inventory"], generatedAt: digest.generatedAt, periodStart: digest.periodStart, periodEnd: digest.periodEnd}, blockers: digest.blockers, redactions: [], drillThrough: {available: true, type: "route", label: "Inspect stock", href: "/dashboard/inventory", requiredPermission: "inventory.read"}, actionLink: {...digest.actions[0], id, href: "/dashboard/inventory?source=" + id} }
}
