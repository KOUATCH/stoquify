# Referral War Room Phase 3 Slice 241 Selection Report - 2026-07-30

## Selection

Slice 241 is selected as a narrow POS cash-shortage production activation preflight contract slice.

## Scope

Build a read-only evidence-row helper over the certified Slice 240 evidence-row table digest status line so downstream reporting can consume a stable row representation without treating it as a route, scheduler, detector, worker, database writer, UI, AI, WhatsApp, or activation mechanism.

## Evidence Inputs

- Slice 240 certified in `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.
- Slice 240 certification report: `what-next/referrals/POS_CASH_SHORTAGE_SLICE_240_TABLE_DIGEST_STATUS_LINE_REPORT_2026-07-30.md`.
- Touched source: `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Touched tests: `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.

## Guardrails

- Preserve `activationAuthorized: false`.
- No route/action exposure.
- No scheduler, cron, detector, worker, alert, rollback, or production enablement.
- No Prisma/database/migration writes.
- No AI copilot or WhatsApp source-of-truth behavior.
- Service-owned evidence only.

## Verification Plan

- Focused Jest for the Slice 241 test file.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint.
- Authority scan for forbidden runtime surfaces.
- Trailing whitespace and `git diff --check` hygiene.

## Filename Note

Short certification filenames remain required to avoid Windows filename component limits in the repeated evidence-helper sequence.