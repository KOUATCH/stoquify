# Referral War Room Phase 3 / Slice 86 Selection Report

Date: 2026-07-28
Program owner: `stoquify-referral-war-room-orchestrator`
Implementation skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 86: POS cash-shortage production activation review evidence-table status-line contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 85 certified and no Slice 86 selected.
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_DIGEST_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`

## Scope

Add a compact display-safe status-line representation derived from the existing production activation review evidence-table digest. The status line must preserve table status, row count, blocked/satisfied requirement counts, summary text, and `activationAuthorized: false`.

## Non-Goals

Do not activate the definition, run workers or schedulers, execute detector logic, send alerts, execute rollback, expose routes/actions/UI, run browser automation, create auth states, mutate fixtures, write to Prisma, run migrations, seed policy, configure production thresholds, grant terminal resolution, or add AI/WhatsApp authority.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_EVIDENCE_TABLE_STATUS_LINE_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related POS cash-shortage activation/readiness bundle covering production activation, production policy readiness, source-owned resolution readiness, browser certification gate, and activation evidence composition.
- `npm run typecheck`
- Scoped ESLint for the touched Slice 86 source and test files.
- Source-only authority scan proving no worker, scheduler, route/action, incident command, Prisma write, migration, seed, browser, AI, or WhatsApp authority was introduced.
- Scoped trailing-whitespace and `git diff --check` hygiene.

## Selection Decision

Slice 86 is selected as a narrow read-only status-line contract over certified production activation review evidence-table digest output. It does not authorize production activation, browser certification, worker execution, policy seeding, production threshold configuration, or terminal resolution.