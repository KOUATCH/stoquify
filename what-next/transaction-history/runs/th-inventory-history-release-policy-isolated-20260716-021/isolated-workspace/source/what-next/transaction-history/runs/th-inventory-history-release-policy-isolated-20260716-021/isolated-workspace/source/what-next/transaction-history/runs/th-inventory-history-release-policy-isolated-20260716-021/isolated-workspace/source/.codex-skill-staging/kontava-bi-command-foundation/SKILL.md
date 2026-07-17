---
name: kontava-bi-command-foundation
description: Establish or update Kontava shared BI command contracts before dashboard redesign. Use when adding command dashboard contracts, review/change/digest contracts, shared BI data normalizers, Daily Command Environment foundations, or BI contract tests in services/bi without redesigning pages or adding persisted BI tables.
---

# Kontava BI Command Foundation

Use this skill to establish the shared BI command contract foundation for Kontava's Daily Command Environment before any dashboard page redesign.

The mission is to make Owner War Room, Manager Action Center, Cash Command, Analytics, Accounting, Assurance, and future BI command surfaces speak the same contract language for business truth, change, risk, action, evidence, freshness, blockers, redaction, module availability, and proof.

## Operating Rules

- Inspect before editing.
- Keep the first slice contract-first and low risk.
- Do not redesign pages.
- Do not add Prisma migrations in the MVP.
- Do not create a BI data warehouse or persisted BI tables.
- Do not change product routing, dashboard layouts, or page components unless the user explicitly expands the scope.
- Preserve existing `BIKpiCard`, `BIInsight`, `BIFreshness`, `BIProvenance`, `BIDrillThrough`, `BIActionLink`, evidence grade, trust state, freshness, blockers, redactions, tenant scope, RBAC, module entitlement, and ledger-first semantics.
- UI must not compute trust state; contracts and services must provide trust, evidence, freshness, redaction, and blocker data.
- Save a run report in `innovation/` when requested or when the skill changes code.

## Inspect First

Read these files before modifying anything:

- `services/bi/bi-contracts.ts`
- `services/bi/bi-evidence-adapter.service.ts`
- `services/bi/__tests__/bi-evidence-adapter.service.test.ts`
- `services/snapshots/snapshot-contracts.ts`
- `services/signals/business-signal-contracts.ts`
- `services/evidence/evidence-contracts.ts`
- `services/modules/module-control-contracts.ts`

If a downstream consumer is affected, inspect focused consumers only:

- `services/owner-war-room/**`
- `services/manager-action-center/**`
- `components/bi/**`

## Allowed Areas

- `services/bi/**`
- Focused tests under `services/bi/__tests__/**`
- A saved run report under `innovation/`

## Forbidden Areas

- Page redesigns.
- Dashboard component recomposition.
- Prisma migrations.
- New persisted BI tables.
- BI warehouse or analytics warehouse work.
- Broad service rewrites outside `services/bi/**`.
- Client-side trust computation.

## Required Contract Work

Add or refine contract-only TypeScript types for:

- `BICommandBrief`
- `BICommandMode`
- `BICommandZone`
- `BICommandSection`
- `BIChangeEvent`
- `BIReviewState`
- `BIDailyDigest`
- `BIFlowStep`
- `BIRiskRank`
- `BIProofDrawerSubject`

Every new command contract should preserve or carry:

- `organizationId`
- `moduleSlug`
- `requiredPermission`
- `evidenceGrade`
- `trustState`
- `freshness`
- `provenance` when source data matters
- `sourceModules`
- `blockers`
- `redactions`
- `drillThrough`
- `actionLink`
- tenant-safe labels and details

## Normalizer Work

Add lightweight normalizers only when they reuse existing BI, snapshot, signal, or action contracts.

Useful normalizers include:

- KPI or insight to command section.
- Snapshot KPI group to command zone.
- Signal insight to risk rank.
- Action link or action item to proof subject.
- Existing freshness and provenance to command brief metadata.

Normalizers must not:

- Query the database directly.
- Compute authorization from the client.
- Drop blockers or redactions.
- Upgrade evidence grades.
- Treat stale or partial data as trusted.
- Infer hidden data from permission-denied or redacted values.

## Implementation Workflow

1. Inspect the required files.
2. Identify existing types and helpers that should be reused.
3. Add contract-only command types in `services/bi/bi-contracts.ts`.
4. Add minimal normalizers in `services/bi/bi-evidence-adapter.service.ts` only if they are safe and reusable.
5. Add or extend focused tests in `services/bi/__tests__/bi-evidence-adapter.service.test.ts`.
6. Verify existing BI consumers still compile.
7. Run validation commands.
8. Save a concise run report in `innovation/` with changed files, validation results, and next recommended skill.

## Testing Expectations

Focused tests should cover:

- Command brief and zone structures preserve organization, module, permission, trust, evidence, freshness, source modules, blockers, and redactions.
- Stale, partial, blocked, redacted, permission-denied, module-unavailable, and safe-error states are not normalized into ready/trusted states.
- Risk ranks preserve severity, evidence grade, trust state, blockers, redactions, and action links.
- Proof drawer subjects do not become available without subject type, subject id, and permission.
- Existing `createSnapshotKpi`, `createSignalInsight`, and action link helpers keep their current behavior.

## Validation Commands

Run:

```powershell
npm run typecheck
npm run lint
npm test -- services/bi/__tests__/bi-evidence-adapter.service.test.ts --runInBand
```

When time permits or the change touches broader gates, also run:

```powershell
node scripts/kontava-moat-release-gate.js --mode fail
```

## Completion Criteria

The skill is complete when:

- Shared BI command contracts exist and compile.
- Lightweight normalizers, if added, are tested.
- Existing BI consumers are not broken.
- Evidence grade, trust state, freshness, blockers, redactions, tenant scope, RBAC, module entitlement, and ledger-first semantics are preserved.
- Validation results are recorded.
- A run report is saved in `innovation/` when code was changed.

## Next Skills

After this skill passes, the next logical skill is `kontava-bi-command-primitives`, followed by `kontava-owner-morning-brief`.
