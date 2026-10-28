# Referral War Room Phase 3 / Slice 402 Selection Report

Date: 2026-07-31
Slice: 402
Name: POS Cash Shortage Production Activation Evidence Dossier
Operating skills: stoquify-referral-war-room-orchestrator, stoquify-cash-leakage-radar

## Selection Decision

Slice 402 is selected as the next bounded implementation slice after Slice 401 certification.

The slice adds a compact read-only evidence dossier derived from the certified Slice 401 production activation evidence compendium. It continues the service-owned evidence chain without creating production activation authority or any new operational execution path.

## Scope

Selected files:

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_402_EVIDENCE_DOSSIER_REPORT_2026-07-31.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Selected implementation:

- Add `PosCashShortageProductionActivationSlice402EvidenceDossier`.
- Add `buildPosCashShortageProductionActivationSlice402EvidenceDossier`.
- Wrap the Slice 401 compendium as the service-owned source evidence.
- Preserve the full inherited evidence chain and activation requirement details.
- Add blocked, ready, and partial-state tests.

## Explicit Non-Authority

Slice 402 does not select or create any route, action, UI, worker, scheduler, detector, DB/Prisma write, migration, browser automation, alert, rollback, AI, copilot, WhatsApp automation, or production activation authority.

The dossier remains evidence-only and keeps `activationAuthorized: false`.

## Expected Verification

- Authority scan over the production activation preflight source.
- Focused Jest for the production activation preflight test file.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint over the source and test files.
- Whitespace and diff hygiene.

## Next Skill

After Slice 402 certification, use `stoquify-referral-war-room-orchestrator` for post-Slice 402 review and Slice 403 selection.
