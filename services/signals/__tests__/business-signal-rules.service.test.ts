import type {
  CloseReadinessMetrics,
  PaymentTruthMetrics,
  SnapshotResult,
} from "@/services/snapshots/snapshot-contracts"

import {
  buildBusinessSignalsFromFacts,
  buildBusinessSignalsFromSnapshots,
} from "../business-signal-rules.service"

describe("Kontava business signal rules", () => {
  it("dedupes repeated facts by stable key and keeps the strongest signal", () => {
    const signals = buildBusinessSignalsFromFacts(
      [
        {
          organizationId: "org-1",
          signalType: "open_payment_suspense",
          moduleSlug: "payment_reconciliation",
          sourceModule: "payments",
          subjectType: "payment.suspense",
          subjectId: "suspense-1",
          severity: "medium",
          payload: { amount: 250_000 },
        },
        {
          organizationId: "org-1",
          signalType: "open_payment_suspense",
          moduleSlug: "payment_reconciliation",
          sourceModule: "payments",
          subjectType: "payment.suspense",
          subjectId: "suspense-1",
          severity: "critical",
          payload: { amount: 1_500_000 },
        },
      ],
      { now: "2026-06-20T08:00:00.000Z" },
    )

    expect(signals).toHaveLength(1)
    expect(signals[0]).toMatchObject({
      severity: "critical",
      requiredPermission: "payments.reconciliation.read",
      assignedRole: "finance",
    })
  })

  it("redacts sensitive payload fields before returning signal payloads", () => {
    const [signal] = buildBusinessSignalsFromFacts(
      [
        {
          organizationId: "org-1",
          signalType: "duplicate_provider_reference",
          moduleSlug: "payment_reconciliation",
          sourceModule: "payments",
          subjectType: "provider.transaction",
          subjectId: "txn-1",
          payload: {
            providerReference: "MTN-MOMO-SECRET-123456",
            count: 2,
          },
          redactions: [
            {
              id: "provider-reference-redaction",
              field: "providerReference",
              reason: "Provider reference is masked unless reconciliation permission passes.",
              policy: "kontava-payment-provider-reference-mask-policy",
            },
          ],
        },
      ],
      { now: "2026-06-20T08:00:00.000Z" },
    )

    expect(signal.payload.providerReference).toBe("[REDACTED:SIGNAL]")
    expect(JSON.stringify(signal)).not.toContain("MTN-MOMO-SECRET-123456")
    expect(signal.redactions).toHaveLength(1)
  })

  it("creates actionable payment and close signals from snapshot metrics", () => {
    const paymentSnapshot: SnapshotResult<PaymentTruthMetrics> = {
      kind: "payment.truth",
      organizationId: "org-1",
      locationId: null,
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-20T00:00:00.000Z",
      status: "partial",
      uiState: "partial",
      evidenceGrade: "reconciled",
      freshness: {
        generatedAt: "2026-06-20T08:00:00.000Z",
        sourceMaxUpdatedAt: "2026-06-20T07:30:00.000Z",
        maxAgeMinutes: 1440,
        stale: false,
        staleReason: null,
      },
      sourceHash: "hash-payment",
      generatedAt: "2026-06-20T08:00:00.000Z",
      sourceModules: ["payments"],
      metrics: {
        providerAccountCount: 1,
        activeProviderAccountCount: 1,
        recentRunCount: 1,
        readyForSignoffCount: 0,
        signedRunCount: 0,
        openExceptionCount: 2,
        criticalExceptionCount: 1,
        openSuspenseCount: 3,
        openSuspenseAmount: 750_000,
        pendingTransactionCount: 4,
      },
      blockers: [],
      redactions: [],
    }
    const closeSnapshot: SnapshotResult<CloseReadinessMetrics> = {
      ...paymentSnapshot,
      kind: "close.readiness",
      uiState: "blocked",
      evidenceGrade: "blocked",
      sourceHash: "hash-close",
      sourceModules: ["close", "accounting"],
      metrics: {
        accountingPeriodCount: 1,
        openPeriodCount: 1,
        recentCloseRunCount: 1,
        certifiedCloseRunCount: 0,
        blockedCloseRunCount: 1,
        averageReadinessScore: 62,
        openFindingCount: 4,
        criticalOpenFindingCount: 1,
        unavailableEvidenceCount: 2,
      },
    }

    const signals = buildBusinessSignalsFromSnapshots({
      organizationId: "org-1",
      snapshots: [paymentSnapshot, closeSnapshot],
    })

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: "open_payment_suspense",
          evidenceGrade: "reconciled",
          requiredPermission: "payments.reconciliation.read",
        }),
        expect.objectContaining({
          signalType: "close_blocker",
          severity: "critical",
          requiredPermission: "accounting.close.read",
        }),
      ]),
    )
  })
})
