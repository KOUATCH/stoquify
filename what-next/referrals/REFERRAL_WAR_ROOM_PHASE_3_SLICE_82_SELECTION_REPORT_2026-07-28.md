# Referral War Room Phase 3 / Slice 82 Selection Report

Date: 2026-07-28
Program owner: `stoquify-referral-war-room-orchestrator`
Implementation skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 82: POS cash-shortage production policy readiness review evidence-row contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 81 certified and no Slice 82 selected.
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_REVIEW_ARTIFACT_STATUS_LINE_REPORT_2026-07-28.md`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_READINESS_REVIEW_EVIDENCE_ROW_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`

## Scope

Add a compact read-only evidence-row representation derived from the existing production policy readiness review artifact status line. The row is intended for later activation review tables or packets and must preserve service-owned evidence, deterministic fingerprint identity, blocker counts, summary text, and `activationAuthorized: false`.

## Non-Goals

Do not seed policy, approve policy, configure production thresholds, activate a detector, run workers or schedulers, send alerts, execute rollback, expose routes/actions/UI, run browser automation, create auth states, mutate fixtures, write to Prisma, run migrations, grant terminal resolution, or add AI/WhatsApp authority.

## Expected Files

- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_REVIEW_EVIDENCE_ROW_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- Related leakage policy/preflight Jest bundle covering production policy readiness, policy service, batch policy resolution, runner-input prerequisite, and production activation preflight.
- `npm run typecheck`
- Scoped ESLint for the touched Slice 82 source and test files.
- Source-only authority scan proving no worker, scheduler, route/action, incident command, Prisma write, migration, seed, browser, AI, or WhatsApp authority was introduced.
- Scoped trailing-whitespace and `git diff --check` hygiene.

## Selection Decision

Slice 82 is selected as a narrow read-only contract over certified production policy readiness review status-line evidence. It does not authorize production activation, policy seeding, policy approval, production threshold configuration, or terminal resolution.