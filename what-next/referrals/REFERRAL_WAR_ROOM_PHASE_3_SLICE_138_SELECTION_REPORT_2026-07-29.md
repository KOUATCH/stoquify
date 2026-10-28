# Referral War Room Phase 3 Slice 138 Selection Report

Date: 2026-07-29
Program owner: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 138 selects a read-only POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table table evidence-table digest contract.

The slice is intentionally narrow: derive a compact digest from the already-certified Slice 137 one-row evidence table so downstream review artifacts can consume table counts without treating the digest as an API route, worker, detector, scheduler, action, UI, AI, WhatsApp, or production activation authority.

## Evidence Inputs

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Slice 137 certified evidence-table report: `what-next/referrals/POS_CASH_SHORTAGE_SLICE_137_TABLE_EVIDENCE_TABLE_REPORT_2026-07-29.md`

## Authorized Scope

- Add only a deterministic, read-only digest helper derived from the Slice 137 evidence table.
- Preserve `activationAuthorized: false`.
- Add focused unit tests for blocked, ready, and partially satisfied evidence states.
- Update the war-room status register and save a certification report after verification.

## Out Of Scope

- No detector, scheduler, worker, route, server action, UI, dashboard, Prisma/DB write, migration, browser automation, incident transition, alert delivery, rollback execution, AI/copilot authority, WhatsApp authority, or production enablement.

## Verification Plan

1. Focused production activation preflight Jest suite.
2. Related activation/readiness Jest bundle.
3. `npm run typecheck`.
4. Scoped ESLint on touched source and test files.
5. Static authority scan for forbidden runtime surfaces.
6. Trailing-whitespace and scoped `git diff --check` hygiene.
7. Final focused Jest after report/status updates.

## Handoff

After Slice 138 is certified, return to `stoquify-referral-war-room-orchestrator` for post-Slice 138 evidence review and Slice 139 selection.