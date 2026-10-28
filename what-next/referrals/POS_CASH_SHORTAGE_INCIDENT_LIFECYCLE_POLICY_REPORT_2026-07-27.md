# POS Cash-Shortage Incident Lifecycle Policy Report

Date: 2026-07-27

## Outcome

Phase 3 / Slice 14 is certified complete.

Stoquify now has a dormant POS cash-shortage incident lifecycle policy that can approve a future resolution command only when the caller proves current source evidence, POS session identity, unredacted shortage metadata, reviewer independence, POS read permission, resolution note, and resolution evidence hash.

## Before

- Slice 13 certified only dormant runner-input gating.
- Generic Workflow Assurance incidents already required current-source-hash confirmation for resolution.
- POS cash-shortage findings carried source and shortage metadata, but cashier/closer IDs were not yet preserved in the emitted finding metadata.
- The war-room status still blocked POS-specific owning-source recheck and maker-checker closure before any production Leakage Radar resolution workflow.

## After

- Added `services/leakage/pos-cash-shortage-incident-lifecycle-policy.ts`.
- Added `assertPosCashShortageIncidentResolutionAllowed`.
- The policy accepts only `pos.closed_shift_cash_shortage.review` incidents with concrete `POSSession` source identity.
- The policy rejects stale `currentSourceHash` confirmation.
- The policy rejects final lifecycle states, aggregate sources, blocked source-repair findings, missing evidence, missing note, missing evidence hash, and missing POS read permission.
- The policy rejects cashier or closer self-resolution.
- The policy returns a deterministic future-command payload and does not mutate state.
- The POS cash-shortage adapter now preserves `cashierId` and `closerId` in triggered finding metadata so lifecycle policy can enforce reviewer independence from source-owned evidence.

## Activation State

No runtime activation was added.

- No incident command call.
- No `resolveWorkflowAssuranceIncident` invocation.
- No `CHECK_RUNNERS` registration.
- No assurance registry invocation.
- No worker, scheduler, checkpoint, production detector, production policy entry, route, action, dashboard, notification, inventory behavior, AI authority, or WhatsApp authority.
- Static activation scan found no POS cash-shortage references in active registry/runtime surfaces.

## Verification

- Focused POS lifecycle/adapter/runner-input tests passed: 3 suites / 18 tests.
- Related focused suites passed: 6 suites / 84 tests across lifecycle policy, adapter, runner-input, generic incident lifecycle, registry contracts, and registry service.
- `npm run typecheck` passed.
- Focused ESLint passed for Slice 14 files.
- `npm run workflow:assurance:release-gate` passed with 38/38 checks ready and 0 blockers.
- `npm run workflow:assurance:runtime-check` passed.
- `npm run service:boundary:fail` passed.
- Static no-activation scan returned no matches in active registry/runtime surfaces.
- `git diff --check` passed for Slice 14 files and the selection report.

## Remaining Blockers

- Runner registration remains unselected.
- Worker checkpoint, lease, retry, overlap, watermark, and dead-letter contracts remain unselected.
- Production detector execution and incident persistence path remain unauthorized.
- POS resolution route, server action, UI, notification, production policy entry, and inventory-loss workflows remain unauthorized.
- A dedicated write permission for POS cash-shortage resolution remains unselected; Slice 14 intentionally uses the already-certified POS read permission only for dormant pre-command gating.

## Next Handoff

Return to `/stoquify-referral-war-room` to select at most one next narrow slice. Leading candidate is worker checkpoint design, still without runtime activation unless separately selected and certified.
