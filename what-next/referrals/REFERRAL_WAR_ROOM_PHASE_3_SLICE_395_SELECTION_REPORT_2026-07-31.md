# Referral War Room Phase 3 / Slice 395 Selection Report

Date: 2026-07-31
Slice: 395
Name: POS Cash Shortage Production Activation Evidence Supplement
Operating skills: stoquify-referral-war-room-orchestrator, stoquify-cash-leakage-radar

## Selection Decision

Slice 395 was selected as the next bounded implementation slice after Slice 394 certification.

The slice adds a compact read-only evidence supplement derived from the certified Slice 394 production activation evidence addendum. It does not introduce production activation authority or any new operational execution path.

## Scope

Selected files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_395_EVIDENCE_SUPPLEMENT_REPORT_2026-07-31.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Selected implementation:

- Add `PosCashShortageProductionActivationSlice395EvidenceSupplement`.
- Add `buildPosCashShortageProductionActivationSlice395EvidenceSupplement`.
- Wrap the Slice 394 addendum as the service-owned source evidence.
- Preserve the full inherited evidence chain and activation requirement details.
- Add blocked, ready, and partial-state tests.

## Explicit Non-Authority

Slice 395 does not select or create any route, action, UI, worker, scheduler, detector, DB/Prisma write, migration, browser automation, alert, rollback, AI, copilot, WhatsApp automation, or production activation authority.

The supplement remains evidence-only and keeps `activationAuthorized: false`.

## Expected Verification

- Authority scan over the production activation preflight source.
- Focused Jest for the production activation preflight test file.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint over the source and test files.
- Whitespace and diff hygiene.

## Next Skill

After Slice 395 certification, use `stoquify-referral-war-room-orchestrator` for post-Slice 395 review and Slice 396 selection.