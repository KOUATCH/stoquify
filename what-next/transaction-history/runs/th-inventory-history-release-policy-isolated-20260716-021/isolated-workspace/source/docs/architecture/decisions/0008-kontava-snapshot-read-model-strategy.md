# ADR 0008: Kontava Snapshot Read-Model Strategy

Date: 2026-06-20

Status: Accepted for Phase 0 governance

## Context

Kontava's future Owner War Room, Cash Leakage Radar, Stock-to-Cash Twin, Payment Truth, Close Autopilot, and accountant views need fast, stable, cross-module data. Building those surfaces from unbounded live joins would risk performance problems, inconsistent results, and tenant leakage.

The codebase already has dashboard read-model foundations, analytics services, finance services, accounting services, reconciliation, close assurance, POS, purchasing, payroll, inventory, and audit primitives.

## Decision

Cross-module dashboards should consume stable snapshot/read-model contracts, not raw live joins from every operational module.

Initial snapshot families:

- Tenant daily operating snapshot.
- Branch daily operating snapshot.
- Payment truth snapshot.
- Inventory cash snapshot.
- Close readiness snapshot.
- Snapshot build run.

## Snapshot Contract

Every snapshot response should include:

```ts
type SnapshotResult<TMetrics> = {
  organizationId: string
  locationId?: string
  periodStart: string
  periodEnd: string
  status: "fresh" | "stale" | "partial" | "blocked" | "building" | "failed"
  evidenceGrade: EvidenceGrade
  freshness: {
    generatedAt: string
    sourceMaxUpdatedAt?: string
    staleReason?: string
  }
  sourceHash: string
  sourceModules: string[]
  metrics: TMetrics
  blockers: SnapshotBlocker[]
  redactions: SnapshotRedaction[]
}
```

## Rules

1. Snapshots must be tenant-scoped.
2. Snapshot rebuilds must be idempotent and retry-safe.
3. Stale or partial data must be visible to the UI.
4. A failed snapshot rebuild must not break existing dashboards.
5. Sensitive fields must be redacted server-side.
6. Snapshot consumers must not infer blocked/redacted/stale state from nulls.
7. Source modules and evidence grade must travel with the metric.
8. Background rebuilds should come after request/response contracts are stable.

## UX States

Dashboard consumers must be able to render:

- Loading.
- Empty.
- Fresh.
- Stale.
- Partial.
- Blocked.
- Redacted.
- Permission denied.
- Module unavailable.
- Safe error.

## Phase 0 Gate

This ADR passes Phase 0 when the snapshot skill can build contracts and services without deciding dashboard state language again.

