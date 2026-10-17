import "server-only"
import { CASH_DESTINATION_PERMISSIONS, CASH_DESTINATION_DENIED } from "./cash-command-navigation"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import type { BIActionLink, BIFreshness, BIKpiCard } from "@/services/bi/bi-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import type { AuthorizedCashCommandData, CashCommandData } from "./cash-command-contracts"

type Viewer = {
  actorId: string
  actorPermissions: readonly string[]
  now: Date | string
}

/** The only projection returned to the browser; composed snapshots stay server-side. */
export async function authorizeCashCommandData(data: CashCommandData, viewer: Viewer): Promise<AuthorizedCashCommandData> {
  const moduleReads = new Map<CommercialModuleSlug, Promise<boolean>>()
  const permission = (value: string) => hasRbacPermission(viewer.actorPermissions, value)
  async function allowed(moduleSlug: CommercialModuleSlug, requiredPermission: string, additional: readonly string[] = []) {
    if (!permission(requiredPermission) || !additional.every(permission)) return false
    let read = moduleReads.get(moduleSlug)
    if (!read) {
      read = observeModuleAccess({
        organizationId: data.organizationId, userId: viewer.actorId, actorPermissions: viewer.actorPermissions,
        moduleSlug, surfaceType: "report", surface: "cash-command.domain-projection",
        accessIntent: "read", mode: "enforce", audit: true, now: viewer.now,
      }).then(decision => decision.allowed)
      moduleReads.set(moduleSlug, read)
    }
    return read
  }
  const [finance, reconciliation, drawers, inventory, payrollPayments, payrollDeclarations, close, accounting] = await Promise.all([
    allowed("finance", "finance.read"),
    allowed("payment_reconciliation", "payments.reconciliation.read"),
    allowed("cash_drawer", "CASH_DRAWER_READ"),
    allowed("inventory", "inventory.read"),
    allowed("payroll", "payroll.payments.reconcile"),
    allowed("payroll", "payroll.declarations.manage"),
    allowed("close_assurance", "accounting.close.read"),
    allowed("accounting", "accounting.journal.read"),
  ])
  const cardAccess: Record<string, boolean> = {
    cash_collected: finance, unreconciled_cash: reconciliation, open_suspense: reconciliation,
    drawer_risk: drawers, provider_risk: reconciliation, stock_cash_buffer: inventory,
    employee_balance_recovery: payrollPayments, upcoming_payroll_net_pay: payrollPayments,
    upcoming_statutory_liability: payrollDeclarations,
  }
  const proofSubjects = await Promise.all(data.proofSubjects.map(async subject => {
    if (!subject.available || await allowed(subject.moduleSlug, subject.requiredPermission)) return subject
    return { available: false as const, organizationId: data.organizationId, moduleSlug: subject.moduleSlug,
      label: subject.label, requiredPermission: subject.requiredPermission, sourceModules: subject.sourceModules,
      unavailableReason: "This proof is unavailable with your current access." }
  }))
  const visibleProofIds = new Set(proofSubjects.flatMap(subject => subject.available ? [`${subject.subjectType}:${subject.subjectId}`] : []))
  function scopedProof(card: BIKpiCard): BIKpiCard {
    const drill = card.drillThrough
    if (!drill.available || !drill.subjectId || visibleProofIds.has(`${drill.subjectType}:${drill.subjectId}`)) return card
    return { ...card, drillThrough: drill.href
      ? { available: true, type: "route", label: card.actionLink?.label ?? "Open workspace", href: drill.href, requiredPermission: drill.requiredPermission }
      : { available: false, type: "proof", label: "Proof unavailable", requiredPermission: drill.requiredPermission, unavailableReason: "This proof is unavailable with your current access." } }
  }
  // The tenant snapshot's metadata spans all these domains. It cannot be passed
  // through to a viewer missing any of them, even on an otherwise permitted card.
  const tenantMetadataAllowed = finance && reconciliation && inventory && payrollPayments && payrollDeclarations && close && accounting
  const unknownFreshness: BIFreshness = {
    state: "unknown", generatedAt: data.generatedAt, sourceMaxUpdatedAt: null,
    maxAgeMinutes: null, stale: false, staleReason: null,
  }
  const restriction = {
    id: "cash-command-restricted-source-metadata", field: "sourceMetadata",
    reason: "Cross-domain source details are restricted by your current access. This does not establish source readiness.",
    policy: "cash-command-domain-access",
  }
  function scopedCard(card: BIKpiCard): BIKpiCard {
    const mixedTenant = card.provenance.sourceKind === "tenant.operating" && !tenantMetadataAllowed
    const mixedPayroll = card.provenance.sourceKind === "payroll.forecast" && !(payrollPayments && payrollDeclarations)
    if (!mixedTenant && !mixedPayroll) return card
    const payroll = card.moduleSlug === "payroll"
    const unavailable = payroll && card.value === null
    return {
      ...card,
      detail: payroll ? "Authorized aggregate payroll value. Open the payroll workspace for the evidence available to your role." : "Collected payment value in the selected period. Cross-domain evidence is restricted.",
      state: unavailable ? "blocked" : "partial", evidenceGrade: unavailable ? "blocked" : "operational", trustState: unavailable ? "blocked" : "operational",
      freshness: unknownFreshness,
      provenance: { organizationId: data.organizationId, locationId: null, sourceKind: "cash-command.authorized-aggregate",
        sourceId: null, sourceHash: null, sourceModules: payroll ? ["payroll"] : ["finance"],
        generatedAt: data.generatedAt, periodStart: data.periodStart, periodEnd: data.periodEnd },
      // The mixed snapshot's blocked flag may belong to an inaccessible domain.
      // Keep a permitted inspection route independent of that private flag.
      drillThrough: card.actionLink
        ? { available: true, type: "route", label: card.actionLink.label, href: card.actionLink.href, requiredPermission: card.requiredPermission }
        : { available: false, type: "route", label: "Source workspace unavailable", requiredPermission: card.requiredPermission, unavailableReason: "No permitted source workspace is available." },
      blockers: unavailable ? [{ id: `cash-command-${card.id}-unavailable`, severity: "high", gate: "source_evidence",
        title: "Aggregate amount unavailable", detail: "Required source evidence is incomplete or restricted. Do not use this amount for a cash decision.", sourceTables: [] }] : [], redactions: [restriction],
    }
  }
  const canOpenAction = async (link: BIActionLink) => !link.disabled && allowed(link.moduleSlug, link.requiredPermission,
    [...(link.additionalRequiredPermissions ?? []), ...(CASH_DESTINATION_PERMISSIONS[link.href] ?? [])])
  const cards = await Promise.all(data.cards.filter(card => cardAccess[card.id] === true).map(scopedCard).map(scopedProof).map(async card => {
    const link = card.actionLink
    const permitted = link ? await canOpenAction(link) : false
    const actionLink = link && !permitted ? { ...link, disabled: true, disabledReason: link.disabledReason ?? CASH_DESTINATION_DENIED } : link
    const drill = card.drillThrough
    const drillAllowed = !drill.available || !drill.href || await canOpenAction({
      id: card.id + ":destination", label: drill.label, href: drill.href, moduleSlug: card.moduleSlug,
      requiredPermission: drill.requiredPermission, additionalRequiredPermissions: drill.additionalRequiredPermissions,
      disabled: false, disabledReason: null,
    })
    return { ...card, actionLink, drillThrough: drillAllowed ? drill : {
      available: false as const, type: drill.type, label: drill.label, requiredPermission: drill.requiredPermission,
      unavailableReason: CASH_DESTINATION_DENIED,
    } }
  }))
  const cardsById = new Map(cards.map(card => [card.id, card]))
  const restrictedCapabilities = [...(data.sourceRestrictions ?? []), ...data.cards.filter(card => cardAccess[card.id] !== true).map(card => ({
    id: card.id, title: card.title,
    reason: permission(card.requiredPermission) ? "module_unavailable" as const : "permission_denied" as const,
  }))]
  const actionAdmission = await Promise.all(data.actionsToday.map(action => canOpenAction(action.actionLink)))
  const actionsToday = data.actionsToday.filter((_, index) => actionAdmission[index]).map(action => {
    if (tenantMetadataAllowed || !["payroll", "purchasing"].includes(action.actionLink.moduleSlug)) return action
    return { ...action, nextStep: "Open the authorized source workspace to review this condition.",
      freshness: unknownFreshness, blockers: [], redactions: [restriction], evidenceGrade: "operational" as const,
      trustState: "operational" as const, state: "partial" as const }
  })
  const changes = data.changes.flatMap(change => {
    const id = change.id.replace("cash-command-change:", "")
    const card = cardsById.get(id)
    if (!card) return []
    if (card.provenance.sourceKind === "cash-command.authorized-aggregate") {
      // A combined forecast change can describe a denied declaration/payment
      // subdomain. The permitted card remains the source of the visible amount.
      return []
    }
    return [{ ...change, actionLink: card.actionLink, drillThrough: card.drillThrough }]
  })
  const risks = data.risks.flatMap(risk => {
    const card = cardsById.get(risk.id.replace("cash-command-risk:", ""))
    if (!card || card.provenance.sourceKind === "cash-command.authorized-aggregate") return []
    return [{ ...risk, actionLink: card.actionLink, drillThrough: card.drillThrough }]
  }).map((risk, index) => ({ ...risk, rank: index + 1 }))
  const trustAccess: Record<string, boolean> = {
    provider_evidence: reconciliation, reconciliation_signoff: reconciliation, open_suspense: reconciliation,
    drawer_confidence: drawers, close_readiness: close,
  }
  const trustSignals = data.trustSignals.filter(signal => trustAccess[signal.id] === true)
  const summary = {
    cashCollected: finance ? data.summary.cashCollected : null,
    unreconciledCash: reconciliation ? data.summary.unreconciledCash : null,
    openSuspenseCount: reconciliation ? data.summary.openSuspenseCount : null,
    drawerVariance: drawers ? data.summary.drawerVariance : null,
    drawerAlertCount: drawers ? data.summary.drawerAlertCount : null,
    providerRiskCount: reconciliation ? data.summary.providerRiskCount : null,
    activeEmployeeBalanceCaseCount: payrollPayments ? data.summary.activeEmployeeBalanceCaseCount : null,
    employeeBalanceOutstandingAmount: payrollPayments ? data.summary.employeeBalanceOutstandingAmount : null,
    upcomingPayrollNetPayAmount: payrollPayments ? data.summary.upcomingPayrollNetPayAmount : null,
    upcomingStatutoryLiabilityAmount: payrollDeclarations ? data.summary.upcomingStatutoryLiabilityAmount : null,
    payrollForecastTotalAmount: payrollPayments && payrollDeclarations ? data.summary.payrollForecastTotalAmount : null,
    actionCountToday: actionsToday.length,
    staleCount: cards.filter(card => card.state === "stale" || card.freshness.stale).length,
    blockedCount: cards.filter(card => card.state === "blocked" || card.blockers.length).length,
    redactedCount: cards.filter(card => card.redactions.length).length,
  }
  const primaryAction = actionsToday[0]?.actionLink ?? cards.find(card => card.actionLink && !card.actionLink.disabled)?.actionLink ?? null
  const blockers = cards.flatMap(card => card.blockers)
  const redactions = cards.flatMap(card => card.redactions)
  const sourceModules = [...new Set(cards.flatMap(card => card.provenance.sourceModules))]
  const freshness: BIFreshness = cards.some(card => card.freshness.state === "unknown") || !cards.length
    ? unknownFreshness
    : { ...cards[0].freshness, stale: cards.some(card => card.freshness.stale),
      state: cards.some(card => card.freshness.state === "blocked") ? "blocked"
        : cards.some(card => card.freshness.stale) ? "stale"
        : cards.some(card => card.freshness.state === "partial") ? "partial" : "fresh", staleReason: null }
  const state = summary.blockedCount ? "blocked" : restrictedCapabilities.length || redactions.length ? "partial" : freshness.stale ? "stale" : "ready"
  const commandBrief = {
    id: data.commandBrief.id, organizationId: data.organizationId, title: data.commandBrief.title,
    mode: data.commandBrief.mode, generatedAt: data.generatedAt, periodStart: data.periodStart, periodEnd: data.periodEnd,
    summary: cards.length ? cards.map(card => `${card.title}: ${card.value === null ? "unavailable" : card.value} ${card.unit}`).join("; ") : "No cash indicators are available with your current access.",
    conclusion: "Review the permitted source workspaces before making a cash decision. Unavailable indicators do not establish a zero balance or readiness.",
    state, evidenceGrade: state === "blocked" ? "blocked" : "operational", trustState: state === "blocked" ? "blocked" : "operational", freshness,
    provenance: null, sourceModules, blockers, redactions, primaryAction,
    drillThrough: primaryAction ? { available: true as const, type: "route" as const, label: primaryAction.label,
      href: primaryAction.href, requiredPermission: primaryAction.requiredPermission } : null,
    reviewState: null,
  } satisfies CashCommandData["commandBrief"]
  // Rebuild queue counts from disclosed actions; filtered-out counts and by-role
  // tallies from the original queue can expose denied domain activity.
  const queueSummary = { total: actionsToday.length, bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 0 } }
  for (const action of actionsToday) queueSummary.bySeverity[action.severity]++
  return {
    organizationId: data.organizationId, organizationName: data.organizationName, generatedAt: data.generatedAt,
    periodStart: data.periodStart, periodEnd: data.periodEnd, currency: data.currency,
    cards, commandBrief, changes, actionsToday, risks, trustSignals, summary,
    proofSubjects,
    drawerState: drawers ? data.drawerState : null,
    moduleControl: permission("MANAGE_SYSTEM_SETTINGS") ? data.moduleControl : null,
    actionQueue: { summary: queueSummary, filteredOutCount: null }, restrictedCapabilities,
  }
}
