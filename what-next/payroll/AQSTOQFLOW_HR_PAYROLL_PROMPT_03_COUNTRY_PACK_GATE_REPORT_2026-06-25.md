# AqStoqFlow HR/Payroll Prompt 03 Country-Pack Gate Report

Date: 2026-06-25

Skill executed: `aqstoqflow-hrpayroll-03-country-pack-gate`

Prompt phase: Prompt 03, Payroll Hardcode, Country-Pack, And Legal Boundary Gate.

## Decision

Decision: passed.

Prompt 03 is complete for the current implementation slice. Payroll statutory calculation paths are inspectable, country-pack provenance is wired through the payroll calculation service, expert-review and unsupported-state boundaries are represented in country-pack capability metadata, and a new release gate now fails on production regulatory hardcodes.

The next ordered skill may be `aqstoqflow-hrpayroll-04-access-privacy-actions`, subject to its own prerequisite gate.

## Expert Lenses Applied

- OHADA/SYSCOHADA-aware platform architecture.
- Payroll statutory boundary review.
- Compliance and release-gate review.
- SaaS single-source-of-truth review.
- Security/privacy review for statutory and payroll evidence.

## Source Prerequisite IDs

P0.26, P0.27, P3.01, P3.03, P3.04.

## Source Documents And Reports Read

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-03-country-pack-gate\SKILL.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_2026-06-25.md`

Note: the installed skill still references the older prompt-suite path under `what-next/payroll/`; the readable source suite in this repo is under `docs/prompts/skills/`.

## Files Inspected

- `services/regulatory/hardcode-detector.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `scripts/__tests__/policy-gates.test.js`
- `package.json`

## Prerequisite Gate Result

| Gate | Result | Evidence |
|---|---|---|
| Prompt 01 governance/source-of-truth report passed | Passed | Prompt 01 report says payroll calculation is service-owned and country-pack/statutory work is partial but inspectable. |
| Prompt 02 runtime DB immutability passed | Passed | Prompt 02 proof report records 7/7 triggers present, 9/9 forbidden mutations blocked, and 3/3 lifecycle checks passed. |
| Country-pack resolver inspectable | Passed | `services/regulatory/country-packs/resolve.ts` resolves versioned parameters with legal reference, effective dates, verification status, capability status, and resolution hash. |
| Payroll calculation path inspectable | Passed | `services/payroll/payroll-control.service.ts` resolves CNPS pension rates and employer rules through `resolveRegulatoryParameter`. |
| Production statutory values have country-pack provenance | Passed | Payroll runs and run lines persist country, pack version, schema version, country-pack resolution hash, and rule provenance. |
| Unsupported/expert-review states can be represented | Passed | Country-pack schemas and Cameroon pack support `REQUIRES_EXPERT_REVIEW`, `NOT_SUPPORTED`, `NOT_YET_SUPPORTED`, `OUT_OF_SCOPE`, and `REQUIRES_CONFIGURATION`. |
| Production hardcode gate exists | Passed | Added `scripts/regulatory-hardcode-gate.js` and wired `npm run regulatory:hardcode:fail` into `npm run policy:gates`. |

## Implementation Summary

Implemented a release-enforced regulatory hardcode boundary:

- Added `scripts/regulatory-hardcode-gate.js`.
- Added `npm run regulatory:hardcode` and `npm run regulatory:hardcode:fail`.
- Added `npm run regulatory:hardcode:fail` to `npm run policy:gates`.
- Refined `services/regulatory/hardcode-detector.ts` so seed and fixture data are not treated as production statutory logic.
- Added focused tests for production payroll hardcode detection and seed/fixture exclusion.
- Extended policy-gate tests to require the regulatory hardcode gate in the release path.
- Saved regulatory hardcode gate evidence under `what-next/payroll/`.

## Security And Privacy Decisions

- No salary or person data was exposed.
- The new gate scans source text only and does not connect to databases or services.
- Statutory payloads and payroll calculations remain server-owned.
- No UI, export, incident, or self-service surface was expanded.

## Accounting And Finance Decisions

- Payroll statutory values must continue to resolve from country packs or reviewed configuration.
- Country-pack provenance remains attached to payroll runs, run lines, payslips, business events, and declarations through existing service-owned evidence paths.
- No new statutory formulas were added.
- No declaration submission automation was added.
- Expert-review and unsupported states remain explicit and blocking for future statutory expansion.

## UI/UX Decisions

No UI work was performed.

Future UI must render country-pack capability and expert-review state from server-provided read models. It must not imply legal certainty where the country pack says expert review or unsupported status is required.

## Tests And Validation

`npm run regulatory:hardcode:fail`

Result: passed.

- Active findings: 0.

`npx jest scripts/__tests__/regulatory-hardcode-gate.test.js services/regulatory/__tests__/country-pack.service.test.ts scripts/__tests__/policy-gates.test.js --runInBand`

Result: passed.

- Test suites: 3 passed, 3 total.
- Tests: 14 passed, 14 total.

`node --check scripts/regulatory-hardcode-gate.js`

Result: passed.

`npm run policy:gates`

Result: passed.

- Inventory boundary: 0 active violations.
- Service boundary: 0 active violations.
- Workflow assurance runtime: ready, 0 blockers.
- Hard-delete: 0 active unsafe findings.
- Regulatory hardcode: 0 active findings.
- Demo/report trust: 0 active findings.
- Raw error boundary: 0 active unsafe findings.

`npm run typecheck`

Result: passed.

`npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`

Result: passed.

- Test suites: 1 passed, 1 total.
- Tests: 6 passed, 6 total.

## Evidence Artifacts

- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.json`

## Files Changed

- `package.json`
- `services/regulatory/hardcode-detector.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `scripts/regulatory-hardcode-gate.js`
- `scripts/__tests__/regulatory-hardcode-gate.test.js`
- `scripts/__tests__/policy-gates.test.js`
- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_03_COUNTRY_PACK_GATE_REPORT_2026-06-25.md`

## Source-Of-Truth Risks Avoided

- Avoided adding payroll statutory formulas directly to services.
- Avoided UI-first statutory claims.
- Avoided treating seed/demo identifiers as production statutory logic.
- Avoided dashboard-specific shadow payroll calculations.
- Avoided unsupported declaration automation.
- Avoided salary/person-data exposure.

## Remaining Risks And Boundaries

- Cameroon payroll coverage still must not be treated as a complete statutory payroll engine beyond the currently resolved country-pack parameters.
- Later statutory expansion must add expert-reviewed country-pack provenance and golden fixtures before new production claims.
- Declaration lifecycle and authority adapters remain future phases.
- Payslip legal claims, payroll register, and payment reconciliation remain blocked until their ordered gates pass.

## Handoff Decision

Decision: Prompt 03 passed.

`aqstoqflow-hrpayroll-03-country-pack-gate` is complete for this slice. The next ordered skill may be `aqstoqflow-hrpayroll-04-access-privacy-actions`, subject to its own prerequisite gate.