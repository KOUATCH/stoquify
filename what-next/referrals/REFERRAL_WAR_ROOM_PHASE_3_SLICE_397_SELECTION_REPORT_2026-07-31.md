# Referral War Room Phase 3 / Slice 397 Selection Report

Date: 2026-07-31
Slice: 397
Name: POS Cash Shortage Production Activation Evidence Exhibit
Operating skills: stoquify-referral-war-room-orchestrator, stoquify-cash-leakage-radar

## Selection Decision

Slice 397 was selected as the next bounded implementation slice after Slice 396 certification.

The slice adds a compact read-only evidence exhibit derived from the certified Slice 396 production activation evidence annex. It continues the service-owned evidence chain without creating production activation authority or any new operational execution path.

## Scope

Selected files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_397_EVIDENCE_EXHIBIT_REPORT_2026-07-31.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Selected implementation:

- Add `PosCashShortageProductionActivationSlice397EvidenceExhibit`.
- Add `buildPosCashShortageProductionActivationSlice397EvidenceExhibit`.
- Wrap the Slice 396 annex as the service-owned source evidence.
- Preserve the full inherited evidence chain and activation requirement details.
- Add blocked, ready, and partial-state tests.

## Explicit Non-Authority

Slice 397 does not select or create any route, action, UI, worker, scheduler, detector, DB/Prisma write, migration, browser automation, alert, rollback, AI, copilot, WhatsApp automation, or production activation authority.

The exhibit remains evidence-only and keeps `activationAuthorized: false`.

## Expected Verification

- Authority scan over the production activation preflight source.
- Focused Jest for the production activation preflight test file.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint over the source and test files.
- Whitespace and diff hygiene.

## Next Skill

After Slice 397 certification, use `stoquify-referral-war-room-orchestrator` for post-Slice 397 review and Slice 398 selection.