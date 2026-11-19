import { useSyncExternalStore } from "react"
import type { QueryClient } from "@tanstack/react-query"

type State = { organizationId: string; actorId: string; permissionState: string; allowRun: boolean; catalog: "both" | "empty"; holdRuns: boolean }
const state: State = { organizationId: "monthly-fixture-org", actorId: "monthly-fixture-actor-a", permissionState: "ready", allowRun: true, catalog: "both", holdRuns: false }
const subscribers = new Set<() => void>()
let version = 0, queryClient: QueryClient | undefined
const notifications: { type: string; title: string; body: string }[] = []
const calls: Record<string, unknown>[] = [], held: { resolve: (result: unknown) => void; result: unknown }[] = []
const periods = [
  { id: "monthly-fixture-june", name: "June 2026", startDate: "2026-06-01T00:00:00.000Z", endDate: "2026-06-30T23:59:59.999Z" },
  { id: "monthly-fixture-july", name: "July 2026", startDate: "2026-07-01T00:00:00.000Z", endDate: "2026-07-31T23:59:59.999Z" },
]
const scope = () => ({ organizationId: state.organizationId, actorId: state.actorId })
const ok = (data: unknown) => ({ success: true, data, error: null, status: 200 })
const denied = async () => ({ success: false, code: "FORBIDDEN", error: "MOCKED fixture: this unrelated operation is unavailable.", status: 403 })
function publish() { version++; for (const subscriber of subscribers) subscriber() }
export const fixture = {
  state, notifications, calls, periods,
  bind(client: QueryClient) { queryClient = client },
  async set(next: Partial<State>) {
    Object.assign(state, next); publish()
    await new Promise(resolve => setTimeout(resolve, 0))
    await queryClient?.invalidateQueries({ queryKey: ["payment-reconciliation"] })
    await queryClient?.invalidateQueries({ queryKey: ["payment-reconciliation-workbench"] })
  },
  clearNotifications() { notifications.length = 0 },
  release(fail = false) { for (const item of held.splice(0)) item.resolve(fail ? { success: false, code: "CONFLICT", error: "MOCKED uncertain run result", status: 409 } : item.result) },
  get waiting() { return held.length },
}
;(window as any).closeMonthlyFixture = fixture
export function usePermissions() {
  useSyncExternalStore(subscribe => { subscribers.add(subscribe); return () => { subscribers.delete(subscribe) } }, () => version, () => version)
  return { organizationId: state.organizationId, user: { id: state.actorId }, permissionState: state.permissionState,
    hasPermission: (permission: string) => permission === "payments.reconciliation.read" || (permission === "payments.reconciliation.run" && state.allowRun), refreshPermissions: async () => {} }
}
export function useNotifications() {
  return Object.fromEntries(["info", "success", "error"].map(type => [type, (title: string, body: string) => notifications.push({ type, title, body })])) as any
}
export async function getPaymentReconciliationWorkbenchAction() {
  return ok({ scope: scope(), generatedAt: "2026-11-09T12:00:00.000Z", organization: { id: state.organizationId, name: "MOCKED monthly reconciliation workspace", currency: "XAF" },
    filters: { locationId: null, period: "mtd", startDate: "2026-11-01T00:00:00.000Z", endDate: "2026-11-09T23:59:59.999Z" }, locations: [],
    source: { mode: "PAYMENT_CAPTURE_READ_MODEL", persistentRunsAvailable: false },
    summary: { railCount: 1, activeRailCount: 1, cleanRunCount: 0, attentionRunCount: 0, criticalRunCount: 0, totalPayments: 0, totalAmount: 0, matchedAmount: 0,
      failureCount: 0, criticalFailureCount: 0, duplicateProviderReferenceCount: 0, suspenseItemCount: 0, suspenseExposure: 0, providerReferenceCoverage: 0 },
    runSummaries: [], failureGroupsByRail: [], duplicateProviderReferenceAlerts: [], suspenseReadyFailures: [] })
}
export async function getPaymentReconciliationDashboardAction() {
  return ok({ scope: scope(), source: { mode: "DURABLE_EVIDENCE_KERNEL", certificationStatus: "NEEDS_REVIEW", asOf: "2026-11-09T12:00:00.000Z", organizationScoped: true, providerEvidenceAvailable: false, statementEvidenceAvailable: false },
    summary: { providerAccountCount: 1, activeProviderAccountCount: 1, recentRunCount: 0, readyForSignoffCount: 0, signedRunCount: 0, openExceptionCount: 0, criticalExceptionCount: 0, openSuspenseCount: 0, openSuspenseByCurrency: [], pendingRunCount: 0, closeBlockerCount: 0 },
    providerAccounts: [{ id: "monthly-fixture-account", displayName: "MOCKED active provider", providerCode: "MOCKED", status: "ACTIVE", currencyCode: "XAF", railName: "Mock bank", railType: "BANK_TRANSFER" }],
    openAccountingPeriods: state.catalog === "both" ? periods : [], statementFiles: [], manualMatchCandidates: [], manualMatchPreparation: { writeAllowed: false, checkedAt: "2026-11-09T12:00:00.000Z", hasMore: false, limit: 12 },
    manualMatchProposals: [], recentRuns: [], suspenseQueue: [], notificationQueue: [], exceptionGroups: [],
    controls: { certifiedModeEnabled: false, providerIngestionKillSwitch: true, signoffRequiresFreshAuth: true, manualMatchMakerChecker: true, suspensePostingGatewayOnly: true } })
}
export async function runPaymentReconciliationAction(input: Record<string, unknown>) {
  calls.push(JSON.parse(JSON.stringify(input)))
  const result = ok({ scope: scope(), runId: "MOCKED-run-receipt", status: "NEEDS_REVIEW" })
  if (state.holdRuns) return new Promise(resolve => held.push({ resolve, result }))
  return result
}

// All remaining action exports terminate in controlled denial. Real child
// components remain mounted; no unrelated financial command reaches a backend.
export const approveManualMatchAction = denied, approveSuspensePostingAction = denied, assignPaymentSuspenseItemAction = denied,
  exportReconciliationCertificateAction = denied, getReconciliationRunDetailAction = denied, importProviderStatementAction = denied,
  proposeManualMatchAction = denied, proposeSuspenseReclassificationAction = denied, signReconciliationRunAction = denied,
  getProofTrailAction = denied, stepUpWithPasswordAction = denied, readAlertScanRecoveryAction = denied, recoverAlertScanPageAction = denied,
  getPaymentSuspenseRecordsAction = denied, readReconciliationCertificateHistoryAction = denied, readReconciliationPreparationAction = denied,
  previewReconciliationPreparationAction = denied, prepareReconciliationRunAction = denied, previewAdditionalReconciliationSourcesAction = denied,
  incorporateAdditionalReconciliationSourcesAction = denied, previewReconciliationSignOffAction = denied, signReviewedReconciliationAction = denied,
  previewSuspenseCorrectionAction = denied, proposeSuspenseCorrectionAction = denied, reviewSuspenseCorrectionAction = denied,
  decideSuspenseCorrectionAction = denied, readSuspenseCorrectionHistoryAction = denied, exportSuspenseCorrectionAction = denied,
  readReconciliationExceptionLinkAction = denied, repairReconciliationExceptionLinkAction = denied,
  decideExceptionClosureAction = denied, listExceptionClosureCasesAction = denied, previewExceptionClosureAction = denied,
  proposeExceptionClosureAction = denied, readExceptionClosureHistoryAction = denied, reviewExceptionClosureAction = denied,
  decideSuspenseResolutionAction = denied, decideSuspenseResolutionRecoveryAction = denied, exportSuspenseResolutionAction = denied,
  previewSuspenseResolutionAction = denied, previewSuspenseResolutionRecoveryAction = denied, proposeSuspenseResolutionAction = denied,
  proposeSuspenseResolutionRecoveryAction = denied, readSuspenseResolutionWorkspaceAction = denied, reviewSuspenseResolutionAction = denied,
  reviewSuspenseResolutionRecoveryAction = denied, searchSuspenseClearingJournalsAction = denied
