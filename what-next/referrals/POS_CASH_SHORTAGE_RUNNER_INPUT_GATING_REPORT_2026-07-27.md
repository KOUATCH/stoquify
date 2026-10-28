# POS Cash-Shortage Runner Input Gating Report

Date: 2026-07-27

## Outcome

Phase 3 / Slice 13 is certified complete.

Stoquify now has a dormant POS cash-shortage runner-input gate that can prepare the existing bounded batch loader input only when a future caller supplies the disabled staged definition, the explicit cash-shortage check key, the POS read permission, and a bounded recorded-time window.

## Before

- Slice 12 created `pos.closed_shift_cash_shortage.review` as disabled registry metadata.
- The existing batch loader already enforced tenant, applied POS close-event, recorded-time window, cursor, and page-size boundaries.
- No contract existed between generic Workflow Assurance run input and the POS cash-shortage batch loader.
- Runner registration, worker checkpointing, POS-specific lifecycle closure, production policy entry, and product surfaces remained blocked.

## After

- Added `services/leakage/pos-shift-cash-shortage-runner-input.ts`.
- Added `buildPosShiftCashShortageBatchInputForAssuranceRun`.
- The builder rejects broad registry runs that omit the explicit POS cash-shortage check key.
- The builder rejects source, period, or location narrowing because this check remains window/page based until POS-specific lifecycle gating is separately selected.
- The builder rejects active, enforced, wrong-version, wrong-domain, or non-staged definitions.
- The builder requires `pos.transactions.read`.
- The builder delegates recorded-time, cursor, and limit validation to `loadPosShiftCashShortageBatchInputSchema`.
- The builder returns only the parsed input for the already-certified batch loader.

## Activation State

No runtime activation was added.

- No `CHECK_RUNNERS` registration.
- No assurance registry invocation.
- No worker, scheduler, checkpoint, production detector, production policy entry, route, action, dashboard, notification, inventory behavior, AI authority, or WhatsApp authority.
- Static activation scan found no POS cash-shortage references in active registry/runtime surfaces.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-shift-cash-shortage-runner-input.test.ts` passed: 1 suite / 7 tests.
- Related focused suites passed: 5 suites / 80 tests across runner-input, batch loader, adapter, registry contracts, and registry service.
- `npm run typecheck` passed.
- Focused ESLint passed for the new Slice 13 files.
- `npm run workflow:assurance:release-gate` passed with 38/38 checks ready and 0 blockers.
- `npm run workflow:assurance:runtime-check` passed.
- `npm run service:boundary:fail` passed.
- Static no-activation scan returned no matches in active registry/runtime surfaces.
- `git diff --check` passed for the Slice 13 files and reports.

## Remaining Blockers

- Runner registration remains unselected.
- Worker checkpoint, lease, retry, overlap, watermark, and dead-letter contracts remain unselected.
- POS-specific owning-source lifecycle recheck and maker-checker closure remain unselected.
- Production policy entry, detector execution, dashboard, route, action, notification, and inventory-loss workflows remain unauthorized.

## Next Handoff

Return to `/stoquify-referral-war-room` to select at most one next narrow slice. Leading candidates are POS-specific lifecycle gating or worker checkpoint design, still without runtime activation unless separately selected and certified.
