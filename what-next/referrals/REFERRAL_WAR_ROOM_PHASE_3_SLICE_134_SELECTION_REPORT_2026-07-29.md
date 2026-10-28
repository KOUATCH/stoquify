# Referral War Room Phase 3 Slice 134 Selection Report

Date: 2026-07-29
Program owner: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 134 selects a read-only POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table table digest contract.

The slice is intentionally narrow: derive a compact digest from the already-certified Slice 133 table contract so downstream review artifacts can consume row counts and blocked/satisfied requirement counts without treating the digest as an API route, worker, detector, scheduler, action, UI, AI, WhatsApp, or production activation authority.

## Evidence Inputs

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Slice 133 certified table report: `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_PACKET_ARTIFACT_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_EVIDENCE_TABLE_TABLE_REPORT_2026-07-29.md`

## Authorized Scope

- Add only a deterministic, read-only digest helper derived from the Slice 133 table builder.
- Preserve `activationAuthorized: false`.
- Add focused unit tests for blocked, ready, and partially satisfied evidence states.
- Update the war-room status register and save a certification report after verification.

## Out Of Scope

- No detector, scheduler, worker, route, server action, UI, dashboard, Prisma/DB write, migration, browser automation, incident transition, alert delivery, rollback execution, AI/coplilot authority, WhatsApp authority, or production enablement.

## Verification Plan

1. Focused production activation preflight Jest suite.
2. Related activation/readiness Jest bundle.
3. `npm run typecheck`.
4. Scoped ESLint on touched source and test files.
5. Static authority scan for forbidden runtime surfaces.
6. Trailing-whitespace and scoped `git diff --check` hygiene.
7. Final focused Jest after report/status updates.

## Handoff

After Slice 134 is certified, return to `stoquify-referral-war-room-orchestrator` for post-Slice 134 evidence review and Slice 135 selection.