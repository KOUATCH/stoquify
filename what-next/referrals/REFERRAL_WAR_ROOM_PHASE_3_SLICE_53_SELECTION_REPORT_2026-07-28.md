# Referral War Room Phase 3 Slice 53 Selection Report

Date: 2026-07-28

## Selected Slice

Phase 3 / Slice 53: POS cash-shortage production activation production-policy readiness ratchet.

## Decision

Select one read-only activation-contract refinement: add production policy readiness as an explicit production activation requirement.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` reports Slice 52 certified and no Slice 53 preselected.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` currently requires browser gate evidence after Slice 51, but it does not require production policy readiness evidence.
- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts` already defines the production policy readiness contract: approved policy evidence, observe-only mode, effective window, threshold ordering, policy hash binding, approval event binding, resolver verification, batch policy resolution ordering, runner prerequisite, and no default activation behavior.
- The status register still lists “No effective approved production threshold policy exists” as a blocker, so activation must not be able to report ready without this requirement.

## Why This Slice

A cash-shortage detector cannot be production-ready without an approved policy contract. The safest next step is not to create policy evidence or enable runtime behavior; it is to make production activation impossible unless production policy readiness is explicitly certified.

## Scope

- Add `production_policy_readiness` to `POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REQUIREMENTS`.
- Add `productionPolicyReadinessCertified` to `PosCashShortageProductionActivationEvidence`.
- Update focused and adjacent activation evidence fixtures to acknowledge the new field.
- Add a focused regression proving all existing activation evidence remains blocked when production policy readiness is false.

## Expected Verification

- Focused production activation preflight Jest.
- Related production policy readiness and activation-evidence Jest suites.
- Typecheck.
- Scoped ESLint.
- Source-only forbidden runtime scan.
- Scoped hygiene checks, with dirty/untracked worktree caveats recorded.

## Non-Goals

- Do not create approved policy evidence.
- Do not mutate policy tables or seed production configuration.
- Do not enable the POS cash-shortage definition.
- Do not run or schedule workers.
- Do not add routes, actions, UI, alerts, browser runs, rollback execution, AI, or WhatsApp behavior.
