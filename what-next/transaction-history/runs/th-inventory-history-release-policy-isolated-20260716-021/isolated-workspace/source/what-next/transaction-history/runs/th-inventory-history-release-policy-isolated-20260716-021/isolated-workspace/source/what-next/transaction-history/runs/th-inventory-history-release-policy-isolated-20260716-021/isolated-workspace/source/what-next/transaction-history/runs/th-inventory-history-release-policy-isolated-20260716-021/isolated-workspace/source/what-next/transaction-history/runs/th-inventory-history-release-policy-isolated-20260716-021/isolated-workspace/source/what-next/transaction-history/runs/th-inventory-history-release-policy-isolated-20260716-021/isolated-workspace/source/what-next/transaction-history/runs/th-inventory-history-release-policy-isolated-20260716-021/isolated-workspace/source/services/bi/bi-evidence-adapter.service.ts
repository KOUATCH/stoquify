import type { ProofTrailSubjectType } from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import type {
  ActionItem,
  BusinessSignal,
  BusinessSignalSeverity,
} from "@/services/signals/business-signal-contracts"
import type {
  SnapshotBlocker,
  SnapshotFreshness,
  SnapshotRedaction,
  SnapshotResult,
  SnapshotSourceModule,
} from "@/services/snapshots/snapshot-contracts"

import type {
  BIActionLink,
  BIBlocker,
  BIChangeEvent,
  BICommandMode,
  BICommandSection,
  BICommandZone,
  BIDrillThrough,
  BIFreshness,
  BIFlowStep,
  BIInsight,
  BIKpiCard,
  BIKpiGroup,
  BIKpiValueFormat,
  BIProofDrawerSubject,
  BIRiskRank,
  BIRedaction,
} from "./bi-contracts"
import {
  evidenceGradeToBITrustState,
  snapshotStatusToBIState,
  snapshotStatusToFreshnessState,
} from "./bi-contracts"

export type SnapshotKpiInput<TMetrics> = {
  id: string
  title: string
  detail: string
  value: number | string | null
  unit: string
  format?: BIKpiValueFormat
  moduleSlug: CommercialModuleSlug
  requiredPermission: string
  snapshot: SnapshotResult<TMetrics>
  href?: string | null
  actionLink?: BIActionLink | null
  proofSubject?: {
    subjectType: ProofTrailSubjectType
    subjectId: string
  } | null
  drillThroughLabel?: string
}

export type SignalInsightInput = {
  signal: BusinessSignal
  disabledActionReason?: string | null
}

export type ActionItemLinkInput = {
  item: ActionItem
  moduleSlug: CommercialModuleSlug
  disabledReason?: string | null
}

export type CommandSectionFromKpiGroupInput = {
  group: BIKpiGroup
  mode?: BICommandMode
  detail?: string | null
  insights?: BIInsight[]
  changeEvents?: BIChangeEvent[]
  flowSteps?: BIFlowStep[]
  risks?: BIRiskRank[]
  actions?: BIActionLink[]
}

export type CommandZoneFromKpiGroupInput = CommandSectionFromKpiGroupInput & {
  businessQuestion: string
  summary: string
}

export type RiskRankFromInsightInput = {
  insight: BIInsight
  rank: number
  severityScore?: number
  moneyImpact?: number | null
  urgency?: BIRiskRank["urgency"]
}

export type ProofDrawerSubjectFromDrillThroughInput = {
  organizationId: string
  moduleSlug: CommercialModuleSlug
  drillThrough: BIDrillThrough | null
  sourceModules?: SnapshotSourceModule[]
  fallbackLabel?: string
}

export function createSnapshotKpi<TMetrics>(input: SnapshotKpiInput<TMetrics>): BIKpiCard {
  const { snapshot } = input
  const freshness = normalizeSnapshotFreshness(snapshot.freshness, snapshot.status)
  const evidenceGrade = snapshot.evidenceGrade

  return {
    id: input.id,
    organizationId: snapshot.organizationId,
    moduleSlug: input.moduleSlug,
    requiredPermission: input.requiredPermission,
    title: input.title,
    detail: input.detail,
    value: input.value,
    unit: input.unit,
    format: input.format ?? "number",
    state: snapshotStatusToBIState(snapshot.status, snapshot.uiState),
    evidenceGrade,
    trustState: evidenceGradeToBITrustState(evidenceGrade),
    freshness,
    provenance: {
      organizationId: snapshot.organizationId,
      locationId: snapshot.locationId,
      sourceKind: snapshot.kind,
      sourceHash: snapshot.sourceHash,
      sourceModules: snapshot.sourceModules,
      generatedAt: snapshot.generatedAt,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
    },
    blockers: snapshot.blockers.map(toBIBlocker),
    redactions: snapshot.redactions.map(toBIRedaction),
    drillThrough: createDrillThrough({
      href: input.href ?? null,
      proofSubject: input.proofSubject ?? null,
      label: input.drillThroughLabel ?? input.title,
      requiredPermission: input.requiredPermission,
      unavailableReason:
        snapshot.status === "blocked"
          ? "The source snapshot is blocked; clear blockers before drill-through can be trusted."
          : null,
    }),
    actionLink: input.actionLink ?? null,
  }
}

export function createCommandSectionFromKpiGroup(
  input: CommandSectionFromKpiGroupInput,
): BICommandSection {
  const { group } = input
  const actions = [
    ...(input.actions ?? []),
    ...group.cards.flatMap((card) => (card.actionLink ? [card.actionLink] : [])),
  ]

  return {
    id: group.id,
    organizationId: group.organizationId,
    title: group.title,
    detail: input.detail ?? group.detail ?? null,
    mode: input.mode ?? "command",
    state: group.state,
    evidenceGrade: group.evidenceGrade,
    trustState: group.trustState,
    freshness: group.freshness,
    sourceModules: collectSourceModules(group.cards),
    cards: group.cards,
    insights: input.insights ?? [],
    changeEvents: input.changeEvents ?? [],
    flowSteps: input.flowSteps ?? [],
    risks: input.risks ?? [],
    actions,
    blockers: group.blockers,
    redactions: group.redactions,
  }
}

export function createCommandZoneFromKpiGroup(input: CommandZoneFromKpiGroupInput): BICommandZone {
  const section = createCommandSectionFromKpiGroup(input)
  const primaryMetric = input.group.cards[0] ?? null

  return {
    id: input.group.id,
    organizationId: input.group.organizationId,
    moduleSlug: input.group.moduleSlug,
    title: input.group.title,
    businessQuestion: input.businessQuestion,
    summary: input.summary,
    state: input.group.state,
    evidenceGrade: input.group.evidenceGrade,
    trustState: input.group.trustState,
    freshness: input.group.freshness,
    sourceModules: section.sourceModules,
    primaryMetric,
    sections: [section],
    cards: input.group.cards,
    insights: section.insights,
    risks: section.risks,
    flowSteps: section.flowSteps,
    actions: section.actions,
    blockers: input.group.blockers,
    redactions: input.group.redactions,
    drillThrough: primaryMetric?.drillThrough ?? null,
  }
}

export function createSignalInsight(input: SignalInsightInput): BIInsight {
  const { signal } = input
  const actionLink = createActionLinkFromSignal(signal, input.disabledActionReason ?? null)
  const drillThrough = createDrillThrough({
    href: signal.actionPath,
    proofSubject: signal.proofLink ?? null,
    label: signal.title,
    requiredPermission: signal.requiredPermission,
    unavailableReason: signal.status === "active" ? null : `Signal is ${signal.status}.`,
  })

  return {
    id: signal.id,
    organizationId: signal.organizationId,
    moduleSlug: signal.moduleSlug,
    sourceModules: [signal.sourceModule],
    title: signal.title,
    detail: signal.detail,
    businessImpact: signal.businessImpact,
    severity: normalizeSignalSeverity(signal.severity),
    state: signal.status === "active" ? "ready" : signal.status === "stale" ? "stale" : "blocked",
    evidenceGrade: signal.evidenceGrade,
    trustState: evidenceGradeToBITrustState(signal.evidenceGrade),
    freshness: normalizeSnapshotFreshness(signal.freshness, signal.status === "stale" ? "stale" : "fresh"),
    blockers: signal.blockers.map(toBIBlocker),
    redactions: signal.redactions.map(toBIRedaction),
    actionLink,
    drillThrough,
  }
}

export function createRiskRankFromInsight(input: RiskRankFromInsightInput): BIRiskRank {
  const { insight } = input

  return {
    id: insight.id,
    organizationId: insight.organizationId,
    moduleSlug: insight.moduleSlug,
    rank: input.rank,
    title: insight.title,
    detail: insight.detail,
    businessImpact: insight.businessImpact,
    severity: insight.severity,
    severityScore: input.severityScore ?? severityToScore(insight.severity),
    moneyImpact: input.moneyImpact ?? null,
    urgency: input.urgency ?? severityToUrgency(insight.severity),
    state: insight.state,
    evidenceGrade: insight.evidenceGrade,
    trustState: insight.trustState,
    freshness: insight.freshness,
    sourceModules: insight.sourceModules,
    blockers: insight.blockers,
    redactions: insight.redactions,
    drillThrough: insight.drillThrough,
    actionLink: insight.actionLink,
  }
}

export function createActionLinkFromSignal(
  signal: BusinessSignal,
  disabledReason: string | null = null,
): BIActionLink {
  return {
    id: signal.id,
    label: signal.suggestedAction,
    href: signal.actionPath,
    requiredPermission: signal.requiredPermission,
    moduleSlug: signal.moduleSlug,
    disabled: Boolean(disabledReason),
    disabledReason,
  }
}

export function createProofDrawerSubjectFromDrillThrough(
  input: ProofDrawerSubjectFromDrillThroughInput,
): BIProofDrawerSubject {
  const label = input.drillThrough?.label ?? input.fallbackLabel ?? "Proof trail"
  const requiredPermission = input.drillThrough?.requiredPermission ?? "dashboard.read"
  const sourceModules = input.sourceModules ?? []

  if (
    input.drillThrough?.available &&
    input.drillThrough.subjectType &&
    input.drillThrough.subjectId
  ) {
    return {
      available: true,
      organizationId: input.organizationId,
      moduleSlug: input.moduleSlug,
      subjectType: input.drillThrough.subjectType,
      subjectId: input.drillThrough.subjectId,
      label,
      requiredPermission,
      sourceModules,
    }
  }

  return {
    available: false,
    organizationId: input.organizationId,
    moduleSlug: input.moduleSlug,
    label,
    requiredPermission,
    unavailableReason:
      input.drillThrough && !input.drillThrough.available
        ? input.drillThrough.unavailableReason
        : "No proof subject is available for this command surface.",
    sourceModules,
  }
}

export function createActionLinkFromActionItem(input: ActionItemLinkInput): BIActionLink {
  return {
    id: input.item.id,
    label: input.item.nextStep,
    href: input.item.actionPath,
    requiredPermission: input.item.requiredPermission,
    moduleSlug: input.moduleSlug,
    disabled: Boolean(input.disabledReason),
    disabledReason: input.disabledReason ?? null,
  }
}

export function normalizeSnapshotFreshness(
  freshness: SnapshotFreshness,
  status: SnapshotResult<unknown>["status"],
): BIFreshness {
  return {
    state: snapshotStatusToFreshnessState(status),
    generatedAt: freshness.generatedAt,
    sourceMaxUpdatedAt: freshness.sourceMaxUpdatedAt,
    maxAgeMinutes: freshness.maxAgeMinutes,
    stale: freshness.stale,
    staleReason: freshness.staleReason,
  }
}

function createDrillThrough(input: {
  href: string | null
  proofSubject: { subjectType: ProofTrailSubjectType; subjectId: string } | null
  label: string
  requiredPermission: string
  unavailableReason: string | null
}): BIDrillThrough {
  const hasRoute = Boolean(input.href)
  const hasProof = Boolean(input.proofSubject)
  const type = hasRoute && hasProof ? "route_and_proof" : hasProof ? "proof" : "route"

  if (input.unavailableReason || (!hasRoute && !hasProof)) {
    return {
      available: false,
      type,
      label: input.label,
      requiredPermission: input.requiredPermission,
      unavailableReason: input.unavailableReason ?? "No supported route or proof subject is available yet.",
    }
  }

  return {
    available: true,
    type,
    label: input.label,
    href: input.href ?? undefined,
    subjectType: input.proofSubject?.subjectType,
    subjectId: input.proofSubject?.subjectId,
    requiredPermission: input.requiredPermission,
  }
}

function toBIBlocker(blocker: SnapshotBlocker): BIBlocker {
  return {
    id: blocker.id,
    severity: blocker.severity,
    gate: blocker.gate,
    title: blocker.title,
    detail: blocker.detail,
    sourceTables: blocker.sourceTables,
    nextAction: blocker.nextAction,
  }
}

function toBIRedaction(redaction: SnapshotRedaction): BIRedaction {
  return {
    id: redaction.id,
    field: redaction.field,
    reason: redaction.reason,
    policy: redaction.policy,
  }
}

function normalizeSignalSeverity(severity: BusinessSignalSeverity) {
  return severity === "info" ? "info" : severity
}

function collectSourceModules(cards: BIKpiCard[]): SnapshotSourceModule[] {
  return Array.from(
    new Set(cards.flatMap((card) => card.provenance.sourceModules)),
  )
}

function severityToScore(severity: BIRiskRank["severity"]) {
  if (severity === "critical") return 100
  if (severity === "high") return 80
  if (severity === "medium") return 60
  if (severity === "low") return 30
  return 10
}

function severityToUrgency(severity: BIRiskRank["severity"]): BIRiskRank["urgency"] {
  if (severity === "critical") return "now"
  if (severity === "high") return "today"
  if (severity === "medium") return "soon"
  return "watch"
}
