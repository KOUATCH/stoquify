// Explicit fixture boundary: no authentication, server action or business operation.
import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()
let version = 0
export const fixture = {
  actorId: "fixture-actor-a", organizationId: "fixture-organization", permissionState: "loading", allowRead: true,
  pendingExport: false, fresh: false, exportDenial: null as null | "FORBIDDEN" | "AUTH_REQUIRED", recoveryDenial: null as null | "FORBIDDEN" | "AUTH_REQUIRED",
  calls: { dashboard: 0, exports: 0, recovery: 0, password: 0 }, notifications: [] as string[],
  waiting: [] as Array<() => void>,
  set(patch: Record<string, unknown>) { Object.assign(this, patch); version++; listeners.forEach(listener => listener()) },
  releaseExports() { const pending = this.waiting.splice(0); pending.forEach(resolve => resolve()) },
}
Object.assign(window, { closeFixture: fixture })
export function usePermissions() {
  useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => version)
  return { user: { id: fixture.actorId }, organizationId: fixture.organizationId, permissionState: fixture.permissionState,
    hasPermission: (permission: string) => fixture.permissionState === "ready" && (permission !== "accounting.close.read" || fixture.allowRead),
    refreshPermissions: async () => { fixture.set({ permissionState: "ready" }) },
  }
}
export const useNotifications = () => ({ info: () => {}, error: () => { fixture.notifications.push("error") }, success: () => { fixture.notifications.push("success") } })
const ok = <T,>(data: T) => ({ success: true, data, error: null })
const denied = async (..._input: unknown[]) => ({ success: false, data: null, code: "FORBIDDEN", error: "This fixture does not connect an evidence workflow operation." })
const periods = [
  { id: "fixture-june", name: "June 2026", status: "OPEN", startDate: "2026-06-01T00:00:00Z", endDate: "2026-06-30T23:59:59.999Z" },
  { id: "fixture-july", name: "July 2026", status: "OPEN", startDate: "2026-07-01T00:00:00Z", endDate: "2026-07-31T23:59:59.999Z" },
]
export function dashboard(periodId = periods[0].id) {
  const period = periods.find(item => item.id === periodId) || periods[0]
  return { actorId: fixture.actorId, organizationId: fixture.organizationId, period, periods: { currentOpenPeriod: periods[0], recentPeriods: periods },
    currentProof: { checkedAt: "2026-11-09T12:00:00Z", assessmentState: "CURRENT", grade: "operational", blockers: [] },
    run: { id: "run-" + period.id, status: "READY", readinessScore: 100, evidenceCoveragePct: 100, criticalBlockerCount: 0, highBlockerCount: 0,
      correlationId: "mocked-assessment", runById: "fixture-maker", startedAt: "2026-11-09T11:00:00Z", completedAt: "2026-11-09T11:01:00Z", createdAt: "2026-11-09T11:00:00Z" },
    source: { mode: "CLOSE_ASSURANCE_CENTER", organizationScoped: true, persisted: true, trustLevel: "T4", provenance: "POSTED", asOf: "2026-11-09T12:00:00Z", sourceTables: ["MOCKED_FIXTURE_ONLY"] },
    summary: { passedCount: 1, checklistCount: 1, failedCount: 0, warningCount: 0, unavailableCount: 0, evidenceCount: 0, openFindingCount: 0, findingCount: 0, commentCount: 0 },
    checklist: [{ id: "gate", key: "gate", label: `Private evidence ${fixture.actorId} ${period.id}`, domain: "ledger", status: "PASSED", severity: "LOW", detail: "Synthetic controlled input; no ledger or certification is connected.", evidenceCount: 0,
      sourceService: "MOCKED_ACTION", blockerReason: null, nextActionHref: null, ownerId: null, dueAt: null }],
    findings: [], evidenceItems: [], provenance: [], comments: [], reviews: [],
    controls: { assignmentRequiresPermission: "accounting.close.finding.assign", waiverApprovalRequiresFreshAuth: true, certificationAvailable: true,
      certificationDisabledReason: "Synthetic controls only; this is not current certification.", packExportAvailable: true, packExportDisabledReason: null },
  }
}
export async function getCloseAssuranceDashboardAction(input: { periodId?: string }) { fixture.calls.dashboard++; return ok(dashboard(input.periodId)) }
export async function getCloseEvidenceGraphAction(input: { periodId?: string; closeRunId?: string }) { return ok({ source: { mode: "CLOSE_ASSURANCE_EVIDENCE_GRAPH", organizationScoped: true, asOf: "2026-11-09T12:00:00Z", periodId: input.periodId, closeRunId: input.closeRunId }, nodes: [], edges: [] }) }
export const retainedContent = '{"classification":"MOCKED_AUTH_ACTIONS","retained":true}\n'
// The runner independently checks the downloaded bytes and binds their SHA-256.
declare const __CLOSE_FIXTURE_DOCUMENT_DIGEST__: string
const documentDigest = __CLOSE_FIXTURE_DOCUMENT_DIGEST__
function result(closeRunId: string, mode: "CERTIFIED" | "DRAFT_NOT_CERTIFIED", historical = false) {
  return { exportId: "fixture-export", closeRunId, periodId: closeRunId.replace(/^run-/, ""), fileName: "mocked-close-pack.json", mimeType: "application/json", content: retainedContent,
    contentHash: "fixture-canonical-hash", documentDigest, watermarkId: "fixture-watermark", mode, isCertified: mode === "CERTIFIED", rowCount: 0,
    generatedAt: "2026-11-09T12:00:00Z", correlationId: "fixture-correlation", redactionNote: "Synthetic data only", certificationLimitations: ["Mocked fixture only"],
    ...(historical ? { replayed: true, historicalNotice: "Historical fixture bytes; no current certification is established." } : {}) }
}
async function exportFile(input: { closeRunId: string }, mode: "CERTIFIED" | "DRAFT_NOT_CERTIFIED") {
  fixture.calls.exports++; const captured = result(input.closeRunId, mode)
  if (fixture.exportDenial) return { success: false, data: null, code: fixture.exportDenial, error: "Mocked private authority diagnostic" }
  if (fixture.pendingExport) await new Promise<void>(resolve => fixture.waiting.push(resolve))
  return ok(captured)
}
export const exportDraftClosePackAction = (input: { closeRunId: string }) => exportFile(input, "DRAFT_NOT_CERTIFIED")
export const exportCertifiedClosePackAction = (input: { closeRunId: string }) => exportFile(input, "CERTIFIED")
export async function listClosePackExportsAction(input: { closeRunId: string }) {
  const base = { closeRunId: input.closeRunId, periodId: input.closeRunId.replace(/^run-/, ""), mode: "CERTIFIED", isCertified: true,
    exportedAt: "2026-11-09T12:00:00Z", contentHash: "fixture-canonical-hash", correlationId: "fixture-correlation" }
  return ok([{ ...base, exportId: "retained", documentDigest, retained: true }, { ...base, exportId: "legacy", documentDigest: null, retained: false }])
}
export async function getRetainedClosePackExportAction(input: { exportId: string; mode: "CERTIFIED" | "DRAFT_NOT_CERTIFIED" }) {
  fixture.calls.recovery++
  if (fixture.recoveryDenial) return { success: false, data: null, code: fixture.recoveryDenial, error: "Mocked private authority diagnostic" }
  if (!fixture.fresh) return { success: false, data: null, code: "FRESH_AUTH_REQUIRED", error: "Mocked password assurance required" }
  return ok(result("run-fixture-june", input.mode, true))
}
export async function stepUpWithPasswordAction(..._input: unknown[]) { fixture.calls.password++; fixture.fresh = true; return { success: true } }
export const assignCloseFindingAction = denied, commentOnCloseFindingAction = denied, requestCloseWaiverAction = denied, approveCloseWaiverAction = denied, updateAccountantReviewAction = denied
export const runCloseAssuranceAction = async (input: { periodId: string }) => ok(dashboard(input.periodId))
export const getCloseEvidenceWorkflowAction = denied, getCloseEvidenceReviewAction = denied, requestCloseEvidenceAction = denied, respondCloseEvidenceAction = denied, acceptCloseEvidenceAction = denied, replaceCloseEvidenceRecipientAction = denied, getCloseEvidenceInvestigationAction = denied
export const proposeCloseEvidenceResolutionAction = denied, approveCloseEvidenceResolutionAction = denied, closeEvidenceResolutionProposalAction = denied
export const getCloseEvidenceNotificationsAction = denied, getCloseNotificationOperationsAction = denied, retryCloseNotificationAction = denied
