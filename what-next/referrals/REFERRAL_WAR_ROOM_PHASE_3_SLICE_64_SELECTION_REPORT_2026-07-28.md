# Referral War Room Phase 3 Slice 64 Selection Report

Date: 2026-07-28
Selected by: `stoquify-referral-war-room-orchestrator`
Execution skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 64: POS cash-shortage production activation review packet fingerprint contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_PACKET_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`

## Selection Rationale

Slice 63 certified a deterministic review packet that combines preflight identity, summary, checklist, and non-authority. The next safe slice is to add a pure fingerprint contract for that packet so future review/report surfaces can detect drift and attach stable evidence without running activation, querying the database, adding UI, or introducing runtime authority.

## Scope

Add a pure fingerprint builder over `PosCashShortageComposedProductionActivationPreflightResult` that returns:

- algorithm: `sha256`
- deterministic packet hash value
- `activationAuthorized: false`

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REVIEW_PACKET_FINGERPRINT_REPORT_2026-07-28.md`

## Verification Plan

- Focused Jest for `pos-cash-shortage-production-activation-preflight.test.ts`
- Related activation-evidence/preflight bundle if focused tests pass
- `npm run typecheck`
- scoped ESLint for touched source/test
- static source scan for runtime authority
- trailing-whitespace scan
- scoped `git diff --check`

## Explicit Non-Goals

Do not run browser certification, create auth state, mutate fixtures, activate the definition, write database records, start workers, schedule scans, send alerts, execute rollback, add UI/routes/actions, add AI/copilot authority, or add WhatsApp authority.

## Handoff

Run `/stoquify-leakage-radar` for Slice 64 only, then return to `/stoquify-referral-war-room` for certification and next-slice selection.