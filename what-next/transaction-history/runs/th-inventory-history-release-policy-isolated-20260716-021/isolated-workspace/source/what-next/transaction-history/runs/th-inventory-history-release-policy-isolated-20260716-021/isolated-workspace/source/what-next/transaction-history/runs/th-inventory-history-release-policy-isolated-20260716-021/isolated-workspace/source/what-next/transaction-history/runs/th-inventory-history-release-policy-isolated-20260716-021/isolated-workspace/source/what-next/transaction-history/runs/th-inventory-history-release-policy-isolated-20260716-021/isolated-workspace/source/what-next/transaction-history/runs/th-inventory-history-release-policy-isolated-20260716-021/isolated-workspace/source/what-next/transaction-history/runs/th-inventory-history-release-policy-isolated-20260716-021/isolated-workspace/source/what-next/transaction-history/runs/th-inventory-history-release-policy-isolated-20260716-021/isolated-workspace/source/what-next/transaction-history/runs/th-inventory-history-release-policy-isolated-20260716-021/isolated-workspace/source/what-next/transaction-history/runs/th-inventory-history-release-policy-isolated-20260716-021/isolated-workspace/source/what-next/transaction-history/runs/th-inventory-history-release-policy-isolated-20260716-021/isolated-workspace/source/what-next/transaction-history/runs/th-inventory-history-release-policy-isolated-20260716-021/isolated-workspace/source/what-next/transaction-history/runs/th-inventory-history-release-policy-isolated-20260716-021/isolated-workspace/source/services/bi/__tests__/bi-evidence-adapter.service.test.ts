import type { BusinessSignal } from "@/services/signals/business-signal-contracts"
import type {
  PaymentTruthMetrics,
  SnapshotResult,
} from "@/services/snapshots/snapshot-contracts"

import {
  createCommandSectionFromKpiGroup,
  createCommandZoneFromKpiGroup,
  createActionLinkFromSignal,
  createProofDrawerSubjectFromDrillThrough,
  createRiskRankFromInsight,
  createSignalInsight,
  createSnapshotKpi,
} from "../bi-evidence-adapter.service"

const freshness = {
  generatedAt: "2026-06-20T08:00:00.000Z",
  sourceMaxUpdatedAt: "2026-06-20T07:45:00.000Z",
  maxAgeMinutes: 1440,
  stale: false,
  staleReason: null,
}

function paymentSnapshot(
  overrides: Partial<SnapshotResult<PaymentTruthMetrics>> = {},
): SnapshotResult<PaymentTruthMetrics> {
  return {
    kind: "payment.truth",
    organizationId: "org-1",
    locationId: null,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-30T23:59:59.999Z",
    status: "fresh",
    uiState: "fresh",
    evidenceGrade: "reconciled",
    freshness,
    sourceHash: "sha256:payment-truth",
    generatedAt: "2026-06-20T08:00:00.000Z",
    sourceModules: ["payments", "finance"],
    metrics: {
      providerAccountCount: 1,
      activeProviderAccountCount: 1,
      recentRunCount: 1,
      readyForSignoffCount: 1,
      signedRunCount: 0,
      openExceptionCount: 0,
      criticalExceptionCount: 0,
      openSuspenseCount: 0,
      openSuspenseAmount: 0,
      pendingTransactionCount: 0,
    },
    blockers: [],
    redactions: [],
    ...overrides,
  }
}

function paymentSignal(overrides: Partial<BusinessSignal> = {}): BusinessSignal {
  return {
    id: "signal-1",
    organizationId: "org-1",
    moduleSlug: "payment_reconciliation",
    sourceModule: "payments",
    sourceSnapshotKind: "payment.truth",
    sourceHash: "sha256:payment-truth",
    signalType: "open_payment_suspense",
    title: "Open payment suspense",
    detail: "Suspense needs review.",
    businessImpact: "Cash cannot be trusted until suspense is cleared.",
    subjectType: "payment.suspense",
    subjectId: "suspense-1",
    evidenceGrade: "blocked",
    severity: "critical",
    severityScore: 95,
    status: "active",
    dedupeKey: "org-1:payment-suspense",
    generatedAt: "2026-06-20T08:00:00.000Z",
    expiresAt: "2026-06-21T08:00:00.000Z",
    freshness,
    suggestedAction: "Review suspense",
    actionPath: "/dashboard/finance/payments/reconciliation",
    requiredPermission: "payments.reconciliation.read",
    assignedRole: "finance",
    assigneeId: null,
    blockers: [
      {
        id: "suspense-open",
        severity: "critical",
        gate: "payments.suspense",
        title: "Suspense open",
        detail: "There is unresolved suspense.",
        sourceTables: ["SuspenseItem"],
        nextAction: "Review suspense",
      },
    ],
    redactions: [
      {
        id: "payment-provider-reference-masked",
        field: "providerReference",
        reason: "Provider references are masked on BI surfaces.",
        policy: "kontava-payment-provider-reference-mask-policy",
      },
    ],
    payload: { amount: 15000 },
    proofLink: {
      subjectType: "reconciliation.run",
      subjectId: "run-1",
    },
    ...overrides,
  }
}

describe("BI evidence adapter", () => {
  it("normalizes a snapshot into a trust-rich KPI contract", () => {
    const kpi = createSnapshotKpi({
      id: "cash-at-risk",
      title: "Cash at risk",
      detail: "Open suspense value.",
      value: 0,
      unit: "XAF",
      format: "currency",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      snapshot: paymentSnapshot(),
      href: "/dashboard/finance/payments/reconciliation",
      proofSubject: {
        subjectType: "reconciliation.run",
        subjectId: "run-1",
      },
    })

    expect(kpi).toMatchObject({
      organizationId: "org-1",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      state: "ready",
      evidenceGrade: "reconciled",
      trustState: "reconciled",
      freshness: {
        state: "fresh",
        stale: false,
      },
      provenance: {
        sourceKind: "payment.truth",
        sourceHash: "sha256:payment-truth",
        sourceModules: ["payments", "finance"],
      },
      drillThrough: {
        available: true,
        type: "route_and_proof",
        requiredPermission: "payments.reconciliation.read",
      },
    })
  })

  it("keeps blocked snapshots blocked and disables drill-through trust", () => {
    const kpi = createSnapshotKpi({
      id: "payment-exceptions",
      title: "Payment exceptions",
      detail: "Critical exception count.",
      value: 3,
      unit: "items",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      snapshot: paymentSnapshot({
        status: "blocked",
        uiState: "blocked",
        evidenceGrade: "blocked",
        blockers: [
          {
            id: "critical-exception",
            severity: "critical",
            gate: "payments.exception",
            title: "Critical exception",
            detail: "Critical payment exception open.",
            sourceTables: ["PaymentException"],
          },
        ],
      }),
      href: "/dashboard/finance/payments",
    })

    expect(kpi.state).toBe("blocked")
    expect(kpi.trustState).toBe("blocked")
    expect(kpi.freshness.state).toBe("blocked")
    expect(kpi.drillThrough).toMatchObject({
      available: false,
      unavailableReason: "The source snapshot is blocked; clear blockers before drill-through can be trusted.",
    })
    expect(kpi.blockers).toEqual([expect.objectContaining({ id: "critical-exception" })])
  })

  it("normalizes business signals into BI insights and action links", () => {
    const signal = paymentSignal()
    const insight = createSignalInsight({ signal })
    const actionLink = createActionLinkFromSignal(signal)

    expect(insight).toMatchObject({
      organizationId: "org-1",
      moduleSlug: "payment_reconciliation",
      severity: "critical",
      evidenceGrade: "blocked",
      trustState: "blocked",
      state: "ready",
      actionLink: {
        href: "/dashboard/finance/payments/reconciliation",
        requiredPermission: "payments.reconciliation.read",
        disabled: false,
      },
      drillThrough: {
        available: true,
        type: "route_and_proof",
        subjectType: "reconciliation.run",
        subjectId: "run-1",
      },
    })
    expect(actionLink).toMatchObject({
      id: "signal-1",
      label: "Review suspense",
      moduleSlug: "payment_reconciliation",
      disabled: false,
    })
  })

  it("composes command sections and zones without dropping trust metadata", () => {
    const cashAtRisk = createSnapshotKpi({
      id: "cash-at-risk",
      title: "Cash at risk",
      detail: "Open suspense value.",
      value: 15000,
      unit: "XAF",
      format: "currency",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      snapshot: paymentSnapshot({
        status: "partial",
        uiState: "partial",
        blockers: [
          {
            id: "missing-statement-line",
            severity: "high",
            gate: "payments.statement",
            title: "Missing statement line",
            detail: "A provider line is not yet imported.",
            sourceTables: ["PaymentProviderTransaction"],
          },
        ],
        redactions: [
          {
            id: "provider-ref-redacted",
            field: "providerReference",
            reason: "Provider reference is hidden in BI command surfaces.",
            policy: "kontava-provider-reference-redaction",
          },
        ],
      }),
      href: "/dashboard/finance/payments/reconciliation",
    })
    const group = {
      id: "cash-truth",
      organizationId: "org-1",
      title: "Cash Truth",
      detail: "Cash confidence and suspense pressure.",
      moduleSlug: "payment_reconciliation" as const,
      requiredPermission: "payments.reconciliation.read",
      state: cashAtRisk.state,
      evidenceGrade: cashAtRisk.evidenceGrade,
      trustState: cashAtRisk.trustState,
      freshness: cashAtRisk.freshness,
      cards: [cashAtRisk],
      blockers: cashAtRisk.blockers,
      redactions: cashAtRisk.redactions,
    }

    const section = createCommandSectionFromKpiGroup({ group })
    const zone = createCommandZoneFromKpiGroup({
      group,
      businessQuestion: "How much cash can be trusted today?",
      summary: "Cash is partial because provider evidence is incomplete.",
    })

    expect(section).toMatchObject({
      organizationId: "org-1",
      mode: "command",
      state: "partial",
      evidenceGrade: "reconciled",
      trustState: "reconciled",
      sourceModules: ["payments", "finance"],
      blockers: [expect.objectContaining({ id: "missing-statement-line" })],
      redactions: [expect.objectContaining({ id: "provider-ref-redacted" })],
    })
    expect(zone).toMatchObject({
      moduleSlug: "payment_reconciliation",
      businessQuestion: "How much cash can be trusted today?",
      primaryMetric: expect.objectContaining({ id: "cash-at-risk" }),
      sections: [expect.objectContaining({ id: "cash-truth" })],
    })
  })

  it("converts BI insights into risk ranks without upgrading blocked evidence", () => {
    const insight = createSignalInsight({ signal: paymentSignal() })
    const risk = createRiskRankFromInsight({
      insight,
      rank: 1,
      moneyImpact: 15000,
    })

    expect(risk).toMatchObject({
      id: "signal-1",
      rank: 1,
      severity: "critical",
      severityScore: 100,
      moneyImpact: 15000,
      urgency: "now",
      evidenceGrade: "blocked",
      trustState: "blocked",
      blockers: [expect.objectContaining({ id: "suspense-open" })],
      redactions: [expect.objectContaining({ id: "payment-provider-reference-masked" })],
    })
  })

  it("creates proof drawer subjects only when proof data is available", () => {
    const availableKpi = createSnapshotKpi({
      id: "cash-at-risk",
      title: "Cash at risk",
      detail: "Open suspense value.",
      value: 0,
      unit: "XAF",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      snapshot: paymentSnapshot(),
      href: "/dashboard/finance/payments/reconciliation",
      proofSubject: {
        subjectType: "reconciliation.run",
        subjectId: "run-1",
      },
    })
    const blockedKpi = createSnapshotKpi({
      id: "blocked-cash",
      title: "Blocked cash",
      detail: "Blocked cash value.",
      value: 0,
      unit: "XAF",
      moduleSlug: "payment_reconciliation",
      requiredPermission: "payments.reconciliation.read",
      snapshot: paymentSnapshot({ status: "blocked", uiState: "blocked" }),
      href: "/dashboard/finance/payments/reconciliation",
    })

    expect(
      createProofDrawerSubjectFromDrillThrough({
        organizationId: "org-1",
        moduleSlug: "payment_reconciliation",
        drillThrough: availableKpi.drillThrough,
        sourceModules: availableKpi.provenance.sourceModules,
      }),
    ).toMatchObject({
      available: true,
      subjectType: "reconciliation.run",
      subjectId: "run-1",
      requiredPermission: "payments.reconciliation.read",
    })
    expect(
      createProofDrawerSubjectFromDrillThrough({
        organizationId: "org-1",
        moduleSlug: "payment_reconciliation",
        drillThrough: blockedKpi.drillThrough,
        sourceModules: blockedKpi.provenance.sourceModules,
      }),
    ).toMatchObject({
      available: false,
      unavailableReason: "The source snapshot is blocked; clear blockers before drill-through can be trusted.",
    })
  })
})
