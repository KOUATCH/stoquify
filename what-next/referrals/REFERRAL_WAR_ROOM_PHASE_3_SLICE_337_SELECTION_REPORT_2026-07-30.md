# Referral War Room Phase 3 Slice 337 Selection Report - 2026-07-30

## Selected Slice

Slice 337 is selected as POS cash-shortage production activation evidence cabin.

## Basis

- Current register certifies Slice 336 and explicitly says no Slice 337 is selected yet.
- Slice 337 can extend the existing read-only evidence-wrapper chain without touching runtime activation, routes, actions, schedulers, workers, database writes, migrations, UI, AI, copilot, WhatsApp, rollback, or alert authority.
- The source-owned evidence chain remains anchored in `evaluateComposedPosCashShortageProductionActivationPreflight` output.

## Expected Changes

- Add `PosCashShortageProductionActivationSlice337EvidenceCabin` and `buildPosCashShortageProductionActivationSlice337EvidenceCabin` to `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Add blocked, ready, and partial tests to `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Save certification evidence in `what-next/referrals/POS_CASH_SHORTAGE_SLICE_337_EVIDENCE_CABIN_REPORT_2026-07-30.md`.

## Verification Plan

- Focused Jest for `pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the source and focused test file.
- Source authority scan for scheduler, route, database, migration, AI/copilot, WhatsApp, and activation authority terms.
- Whitespace and `git diff --check` hygiene.

## Guardrails

Production activation must remain blocked and unauthorized. Slice 337 must preserve `activationAuthorized: false` and must not add source-of-truth mutation or runtime activation authority.