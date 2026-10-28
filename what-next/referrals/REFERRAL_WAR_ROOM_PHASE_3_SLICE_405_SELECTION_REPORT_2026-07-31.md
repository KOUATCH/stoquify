# Referral War Room Phase 3 / Slice 405 Selection Report

Date: 2026-07-31
Slice: 405
Name: POS Cash Shortage Production Activation Evidence Casefile
Operating skills: stoquify-referral-war-room-orchestrator, stoquify-cash-leakage-radar

## Selection Decision

Slice 405 is selected as the next bounded implementation slice after Slice 404 certification.

The slice adds a compact read-only evidence casefile derived from the certified Slice 404 production activation evidence folder. It continues the service-owned evidence chain without creating production activation authority or any new operational execution path.

## Scope

Selected files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_405_EVIDENCE_CASEFILE_REPORT_2026-07-31.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Selected implementation:

- Add `PosCashShortageProductionActivationSlice405EvidenceCasefile`.
- Add `buildPosCashShortageProductionActivationSlice405EvidenceCasefile`.
- Wrap the Slice 404 folder as the service-owned source evidence.
- Preserve the full inherited evidence chain and activation requirement details.
- Add blocked, ready, and partial-state tests.

## Explicit Non-Authority

Slice 405 does not select or create any route, action, UI, worker, scheduler, detector, DB/Prisma write, migration, browser automation, alert, rollback, AI, copilot, WhatsApp automation, or production activation authority.

The casefile remains evidence-only and keeps `activationAuthorized: false`.

## Expected Verification

- Authority scan over the production activation preflight source.
- Focused Jest for the production activation preflight test file.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint over the source and test files.
- Whitespace and diff hygiene.

## Next Skill

After Slice 405 certification, use `stoquify-referral-war-room-orchestrator` for post-Slice 405 review and Slice 406 selection.