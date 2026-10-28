# Referral War Room Phase 3 Slice 281 Selection Report

Date: 2026-07-30

## Selection

Slice 281 is selected: POS cash-shortage production activation evidence record.

## Evidence Basis

- The current status register certifies Slice 280 and explicitly says no Slice 281 is selected yet.
- Slice 280 provides a read-only evidence memo over the Slice 279 evidence note.
- The next smallest dependency-aware step is a compact read-only record derived from the certified Slice 280 evidence memo.

## Scope

- Add `PosCashShortageProductionActivationSlice281EvidenceRecord`.
- Add `buildPosCashShortageProductionActivationSlice281EvidenceRecord`.
- Add blocked, ready, and partial tests.
- Save a Slice 281 certification report after verification.

## Guardrails

- Preserve `activationAuthorized: false`.
- Do not create detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production authority.
- Keep the helper deterministic, service-owned, and evidence-backed.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_281_EVIDENCE_RECORD_REPORT_2026-07-30.md`

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for touched source and test files.
- Authority scan for runtime activation terms.
- Whitespace hygiene and `git diff --check`.

## Filename Note

The report filename is intentionally short enough for Windows filename component limits while preserving the slice number and purpose.