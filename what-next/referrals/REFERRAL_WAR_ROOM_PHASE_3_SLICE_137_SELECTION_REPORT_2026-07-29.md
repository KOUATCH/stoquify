# Referral War Room Phase 3 Slice 137 Selection Report

Date: 2026-07-29
Program owner: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 137 selects a read-only POS cash-shortage production activation review evidence-table packet artifact evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table evidence-table table evidence-table contract.

The slice is intentionally narrow: wrap the already-certified Slice 136 table status-line evidence row into a single-row review table so downstream packet composition can consume a stable table shape without treating it as an API route, worker, detector, scheduler, action, UI, AI, WhatsApp, or production activation authority.

## Evidence Inputs

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Slice 136 certified evidence-row report: `what-next/referrals/POS_CASH_SHORTAGE_SLICE_136_TABLE_STATUS_LINE_EVIDENCE_ROW_REPORT_2026-07-29.md`

## Authorized Scope

- Add only a deterministic, read-only one-row table helper derived from the Slice 136 evidence row.
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

After Slice 137 is certified, return to `stoquify-referral-war-room-orchestrator` for post-Slice 137 evidence review and Slice 138 selection.