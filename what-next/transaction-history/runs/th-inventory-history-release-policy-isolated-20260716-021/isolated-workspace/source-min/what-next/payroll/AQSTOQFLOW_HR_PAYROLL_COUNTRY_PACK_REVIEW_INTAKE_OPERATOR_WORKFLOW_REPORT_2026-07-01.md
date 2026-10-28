# AqStoqFlow HR/Payroll Country-Pack Review Intake Operator Workflow Report - 2026-07-01

Selected skills:

- `aqstoqflow-payroll-country-pack-engine`
- `aqstoqflow-payroll-command-center`

Phase/slice:

- Phase 3 statutory country-pack provenance.
- Phase 2 command-center operator workflow.
- Executable slice: service-backed country-pack review intake actions plus command-center final-release proof visibility.

## Outcome

This slice turns the country-pack review intake gate into an operator-callable workflow without promoting any country pack automatically.

Operators can now:

- evaluate a proposed payroll country pack against the active base pack;
- record a server-recomputed intake certificate after fresh auth;
- approve a persisted ready certificate with the critical payroll approval permission and fresh-auth evidence;
- see the country-pack legal-owner approval gate inside final-release readiness and the payroll command-center proof drawer.

The UI continues to render service-owned proof only. It does not compute statutory readiness, legal truth, or payroll totals.

## Files Changed

- `actions/payroll/payroll-country-pack-review-intake.actions.ts`
- `actions/payroll/__tests__/payroll-country-pack-review-intake.actions.test.ts`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`

## Action Boundary

Added protected server actions:

- `evaluatePayrollCountryPackReviewIntakeAction`
  - permission: `payroll.runs.calculate`
  - module surface: `payroll.country_pack_review_intake.evaluate`
  - access intent: `read`
  - no fresh auth required
  - parses proposed country-pack payload server-side and resolves the base pack from the country-pack registry

- `recordPayrollCountryPackReviewIntakeAction`
  - permission: `payroll.runs.calculate`
  - module surface: `payroll.country_pack_review_intake.record`
  - access intent: `write`
  - fresh auth required
  - recomputes the certificate server-side before recording audit evidence

- `approvePayrollCountryPackReviewIntakeAction`
  - permission: `payroll.runs.approve`
  - module surface: `payroll.country_pack_review_intake.approve`
  - access intent: `write`
  - fresh auth required
  - forwards verified `lastAuthAt` to the approval service

## Command Center Evidence

The command read model now exposes `finalRelease.countryPackReviewIntake` with:

- approval status;
- approval hash;
- source certificate hash;
- proposed pack version;
- target families;
- fresh-auth proof;
- approval evidence presence;
- country-pack review intake gate blockers.

The command-center final-release proof drawer now renders those fields and the final-release panel shows a `Pack approval` metric.

## Verification

Passed:

- `npx jest actions/payroll/__tests__/payroll-country-pack-review-intake.actions.test.ts --runInBand`
- `npx jest actions/payroll/__tests__/payroll-country-pack-review-intake.actions.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand`
- `npm run typecheck`
- `npx jest actions/payroll/__tests__/payroll-country-pack-review-intake.actions.test.ts services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
- `npm run regulatory:hardcode:fail`
- `npm run service:boundary:fail`
- `npm run prisma:validate`
- `npm run policy:gates`
- `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3003 --timeout-ms 180000 --require-screenshots --route payroll --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-country-pack-review-intake-command-center --out what-next/payroll/AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_COMMAND_CENTER_UI_ROUTE_SMOKE_BROWSER.json`

Browser smoke evidence:

- Report: `what-next/payroll/AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_COMMAND_CENTER_UI_ROUTE_SMOKE_BROWSER.json`
- Tablet screenshot: `what-next/payroll/screenshots/payroll-country-pack-review-intake-command-center/payroll-tablet.png`
- Desktop screenshot: `what-next/payroll/screenshots/payroll-country-pack-review-intake-command-center/payroll-desktop.png`

## Boundaries Preserved

- No production legal values were hardcoded.
- Proposed country packs are parsed and evaluated server-side.
- Recording and approval are tenant-derived through protected action context.
- Sensitive write actions require fresh auth.
- Approval uses critical payroll approval permission.
- UI renders proof and blockers from services only.
- Active country packs are not promoted or mutated by this slice.

## Residual Risk

- There is still no dedicated operator form/upload surface for proposed pack payloads and review-topic evidence.
- There is still no automated country-pack promotion or migration flow after legal-owner approval.
- A dedicated permission such as `payroll.country_packs.approve` may be cleaner later, but this slice reused existing critical payroll approval permission to avoid broad RBAC churn.

## Next Recommended Slice

Build the operator intake form/surface under the payroll setup or command-center route:

- paste/upload proposed pack JSON;
- enter review-topic evidence;
- run evaluation;
- record certificate after fresh auth;
- approve certificate after fresh auth;
- show success/denied/error/loading states from the server actions.
