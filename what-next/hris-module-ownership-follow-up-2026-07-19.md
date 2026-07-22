# HRIS Module Ownership Follow-up - 2026-07-19

- Skill: `aqstoqflow-module-surface-inventory-gate`
- Purpose: close the narrow HRIS ownership and People navigation slug gaps without enabling entitlement enforcement or changing HRIS behavior.

## Sources inspected

- `what-next/module-surface-inventory.md` and `.json`
- `what-next/module-surface-registry-baseline-2026-07-12.json`
- `scripts/module-surface-inventory.js` and its focused Jest suites
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `config/sidebar.ts`
- `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `graphify-out/GRAPH_REPORT_actions.md` / `graph_actions.json` when present

## Before and after

- Before: 301 mapped, 41 unmapped, 1 unknown slug, 62 active gaps, baseline delta `+7`.
- After: 308 mapped, 35 unmapped, 0 unknown slugs, 55 active gaps, baseline delta `0`.
- Resolved in this slice: six `actions/hris/*.actions.ts` unmapped findings and the `/dashboard/people` unknown-slug finding.

## Changes

- Added the scanner alias `hris -> payroll`, matching the canonical Payroll catalog owned by People.
- Changed only the `/dashboard/people` sidebar `moduleSlug` from `hris` to `payroll`.
- Added focused inventory tests for all six HRIS actions and the People navigation surface.
- Regenerated `what-next/module-surface-inventory.md` and `.json` in warn/ratchet mode.

## Control posture

- Tenant isolation, RBAC permissions, existing `protect` guards, audit evidence, redaction, and release gates were not changed.
- Module access remains report-only; no hard enforcement, migration, reseed, or unrelated HRIS functionality was introduced.

## Verification

- `npm test -- --runInBand scripts/__tests__/module-surface-hris-ownership.test.js scripts/__tests__/module-surface-inventory.test.js` - 2 suites and 19 tests passed.
- `npm run module:surface:ratchet` - regenerated 367 records; command exited 0 in warn mode.

## Remaining boundary

- Ratchet status remains failed because three unrelated new gaps remain: two findings for `actions/security/step-up-auth.actions.ts` and one missing-permission finding for `actions/analytics/analytics/financial-reports.ts`.
- Next prompt: address those non-HRIS gaps as separate, explicitly scoped follow-ups.
