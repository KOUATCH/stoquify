import { digestData } from "@/components/daily-habit/__tests__/phase2-fixtures"
import { buildData } from "@/components/manager-action-center/__tests__/manager-fixtures"
import { buildLocationData } from "@/components/manager-action-center/__tests__/manager-location-fixtures"
import { buildOwnerData } from "@/docs/command-center/phase-2-2026-10-24/owner-browser-fixture"
import { presentManagerData } from "@/services/manager-action-center/manager-action-center-presentation"
import { presentDailyDigest } from "@/services/daily-habit/daily-habit-digest-presentation"
import type { OwnerWarRoomData } from "@/services/owner-war-room/owner-war-room-contracts"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"

type Locale = "en" | "fr"
export function actions(locale: Locale, count = 25) {
  const item = buildLocationData().bundles[0].actionQueue.actionItems[0]
  return Array.from({length: count}, (_, index) => ({...item, id: `action-${index + 1}`, signalId: `signal-${index + 1}`, title: `${locale === "fr" ? "Preuve à examiner" : "Evidence to review"} ${index + 1}`, nextStep: locale === "fr" ? "Examinez les preuves de la source avant toute action." : "Review source evidence before taking action.", actionPath: `/dashboard/finance/reconciliation?record=fixture-${index + 1}`}))
}
export function manager(locale: Locale, count = 25) {
  const data = buildData()
  data.actionItems = actions(locale, count).map(item => ({...data.actionItems[0], ...item, dateKind: "evidence_expiry", dueState: "scheduled", actionLink: {...data.actionItems[0].actionLink, href: item.actionPath}}))
  data.summary = {...data.summary, total: count, dueToday: 0, overdue: 0, critical: count}
  data.assuranceCoverage = {state: "AVAILABLE", loaded: 1, limit: 25, possiblyTruncated: true}
  data.runSheetGroups = []
  data.commandBrief.primaryAction = data.actionItems[0]?.actionLink ?? null
  return presentManagerData(data, locale)
}
export function locations(locale: Locale, count = 25) {
  const data = buildLocationData()
  data.bundles.forEach((bundle, index) => {
    bundle.location.name = locale === "fr" ? `Site autorisé ${index + 1}` : `Authorized location ${index + 1}`
    bundle.actionQueue.actionItems = actions(locale, count).map(item => ({...item, id: `${bundle.location.id}:${item.id}`}))
    bundle.actionQueue.summary.total = count
  })
  return data
}
export function owner(locale: Locale, count = 25): OwnerWarRoomData {
  const base = buildOwnerData()
  const data = {...base, morningBrief: {...base.morningBrief, headlineMetrics: {...base.morningBrief.headlineMetrics, payrollForecastTotal: null}}} as OwnerWarRoomData
  data.actionQueue.actionItems = actions(locale, count)
  data.actionQueue.summary = {...data.actionQueue.summary, total: count, open: count, bySeverity: {...data.actionQueue.summary.bySeverity, critical: count}, byRole: {manager: count}}
  data.summary.criticalCount = count
  data.morningBrief.priorityActions = data.morningBrief.priorityActions.map(item => ({...item, id: "action-1", title: actions(locale, 1)[0].title, nextStep: actions(locale, 1)[0].nextStep, dueLabel: locale === "fr" ? "Expiration des preuves (UTC)" : "Evidence expiry (UTC)"}))
  if (locale === "fr") {
    data.morningBrief.commandBrief.title = "Point du jour du dirigeant"
    data.morningBrief.commandBrief.conclusion = "Examinez les preuves de trésorerie avant de prendre une décision."
    data.proofSubjects.forEach(s => {s.label = "Preuves du rapprochement";s.detail = "Examinez les preuves de rapprochement."})
    data.morningBrief.proofSubjects.forEach(s => {s.label = "Preuves du rapprochement"})
  }
  return data
}
export function daily(locale: Locale) {
  const data = digestData()
  data.digests = data.digests.map((digest, index) => {
    digest.id = index ? "manager-run-sheet" : "owner-morning"
    digest.actions = digest.actions.map((action, i) => ({...action, label: locale === "fr" ? `Examiner la source ${i + 1}` : `Review source ${i + 1}`, disabledReason: action.disabled ? locale === "fr" ? "Autorisation actuelle requise" : "Current permission required" : null}))
    digest.commandBrief.conclusion = locale === "fr" ? "Examinez les limites des preuves avant d’agir." : "Review evidence limitations before acting."
    return presentDailyDigest(digest, locale)
  })
  return data
}
export const proof: ProofTrailResult = {organizationId: "org-1", subjectType: "reconciliation.run", subjectId: "rr-1", moduleSlug: "payment_reconciliation", evidenceGrade: "raw", reason: "Source evidence requires review", freshness: "unknown", generatedAt: "2026-10-24T10:00:00Z", sourceModules: ["payments"], nodes: [], edges: [], blockers: [], redactions: [], nextActions: [], audit: {accessLogged: false, sensitiveAccess: false}}
