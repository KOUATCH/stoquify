# Referral War Room Phase 3 Slice 282 Selection Report

Date: 2026-07-30

## Selection

Slice 282 is selected: POS cash-shortage production activation evidence entry.

## Evidence Basis

- The current status register certifies Slice 281 and explicitly says no Slice 282 is selected yet.
- Slice 281 provides a read-only evidence record over the Slice 280 evidence memo.
- The next smallest dependency-aware step is a compact read-only entry derived from the certified Slice 281 evidence record.

## Scope

- Add `PosCashShortageProductionActivationSlice282EvidenceEntry`.
- Add `buildPosCashShortageProductionActivationSlice282EvidenceEntry`.
- Add blocked, ready, and partial tests.
- Save a Slice 282 certification report after verification.

## Guardrails

- Preserve `activationAuthorized: false`.
- Do not create detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production authority.
- Keep the helper deterministic, service-owned, and evidence-backed.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_282_EVIDENCE_ENTRY_REPORT_2026-07-30.md`

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for touched source and test files.
- Authority scan for runtime activation terms.
- Whitespace hygiene and `git diff --check`.

## Filename Note

The report filename is intentionally short enough for Windows filename component limits while preserving the slice number and purpose.