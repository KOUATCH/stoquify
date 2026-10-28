# Referral War Room Phase 3 Slice 357 Selection Report - 2026-07-31

## Selected Slice

Slice 357 is selected as POS cash-shortage production activation evidence instrument.

## Basis

- Current register certifies Slice 356 and explicitly says no Slice 357 is selected yet.
- Slice 357 can extend the existing read-only evidence-wrapper chain without touching runtime activation, routes, actions, schedulers, workers, database writes, migrations, UI, AI, copilot, WhatsApp, rollback, or alert authority.
- The source-owned evidence chain remains anchored in `evaluateComposedPosCashShortageProductionActivationPreflight` output.

## Expected Changes

- Add `PosCashShortageProductionActivationSlice357EvidenceInstrument` and `buildPosCashShortageProductionActivationSlice357EvidenceInstrument` to `services/leakage/pos-cash-shortage-production-activation-preflight.ts`.
- Add blocked, ready, and partial tests to `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Save certification evidence in `what-next/referrals/POS_CASH_SHORTAGE_SLICE_357_EVIDENCE_INSTRUMENT_REPORT_2026-07-31.md`.

## Verification Plan

- Focused Jest for `pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the source and focused test file.
- Source authority scan for scheduler, route, database, migration, AI/copilot, WhatsApp, and activation authority terms.
- Whitespace and `git diff --check` hygiene.

## Guardrails

Production activation must remain blocked and unauthorized. Slice 357 must preserve `activationAuthorized: false` and must not add source-of-truth mutation or runtime activation authority.