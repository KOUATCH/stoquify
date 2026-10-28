# AqStoqFlow HR/Payroll Phase 1 Prompt 19 Assurance Release Gates Report

Date: 2026-06-27
Prompt: 19 - Assurance, Chaos, Browser Smoke, And Release Gates
Workspace: E:\ohada saas\newStockFlow\aqstoqflow

## Executive Summary

Prompt 19 is complete for the implemented HR/payroll scope.

This pass refreshed assurance after the Prompt 18 close/data-trust proof gates. It added a static browser-smoke route-list guard and fixed stale action-test fresh-auth mocks so the payroll action matrix exercises the current protected action contract.

The important outcome is that the implemented payroll routes, actions, services, components, close/data-trust checks, and policy gates now pass together:

```text
route smoke -> protected actions -> payroll services -> close/data-trust -> policy gates
```

No new business feature, fake route, dashboard-only payroll metric, client-computed payroll truth, or unsupported authority/statutory workflow was added.

## Source And Skill Notes

Skill applied: `aqstoqflow-hrpayroll-19-assurance-release-gates`

The skill's listed source prompt-suite path under `what-next/payroll/` is stale. The current source suite remains:

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Reports/evidence read:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_19_ASSURANCE_RELEASE_GATES_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_19_ASSURANCE_RELEASE_GATES_RERUN_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CLOSE_DATA_TRUST_REPORT_2026-06-27.md`

## Prerequisite Gate

Status: passed for the implemented, evidence-gated payroll scope.

- Earlier prompts are implemented or explicitly bounded by blocker reports.
- Prompt 18 close/data-trust gates passed.
- Browser smoke targets only implemented payroll routes.
- Unimplemented routes for payroll declarations, payroll payments, payroll runs, and presence remain excluded from smoke route lists and UI surface links.
- Full production remains bounded by statutory breadth, authority adapter automation, production backfill approval, and full browser/accessibility validation.

## Change Made

### Browser Smoke Route-List Guard

File: `__tests__/payroll-dashboard-routes.smoke.test.tsx`

Added a static guard that verifies:

- `scripts/ui-route-smoke-gate.js` includes the implemented payroll route IDs;
- `package.json` script `ui:smoke:payroll` targets those implemented route IDs;
- unsupported route IDs are not included;
- unsupported payroll paths are not listed by the browser smoke script.

Implemented route IDs checked:

- `payroll`
- `payroll-attendance`
- `payroll-compensation`
- `payroll-contracts`
- `payroll-employees`
- `payroll-payslips`
- `payroll-register`
- `payroll-setup`

Unsupported route IDs checked as absent:

- `payroll-declarations`
- `payroll-payments`
- `payroll-runs`
- `payroll-presence`

### Fresh-Auth Test Contract Fix

Files changed:

- `actions/payroll/__tests__/payroll-contract.actions.test.ts`
- `actions/payroll/__tests__/payroll-compensation.actions.test.ts`
- `actions/payroll/__tests__/payroll-employee.actions.test.ts`
- `actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts`

The broad action matrix exposed stale mocks that returned `{}` from `requireFreshAuth`. The protected action wrapper now consumes verified `claims.lastAuthAt`, so these tests were exercising an impossible fresh-auth success shape and failing before service/RBAC assertions.

The mocks now return:

```text
{ claims: { lastAuthAt: "2026-06-27T00:00:00.000Z" } }
```

This aligns the tests with the Prompt 14/15 fresh-auth hardening.

## Security And Privacy Decisions

- Route smoke still verifies RBAC and module entitlement before action calls.
- Action tests now exercise verified fresh-auth shape instead of an invalid placeholder object.
- No salary/person data was added to route smoke, logs, or reports.
- Payroll browser smoke cannot advertise unsupported routes as implemented workflows.

## Accounting And Finance Decisions

- The broad matrix includes payroll services, payroll actions, payroll components, route smoke, close assurance pack tests, and data-trust tests.
- Prompt 18 proof-quality gates are included in the Prompt 19 regression run.
- Policy gates reran after Prompt 19 changes, including service boundary and payroll immutability runtime checks.
- No payment/declaration/ledger automation was added.

## Browser Smoke Decision

Code-level route smoke passed.

The optional HTTP/Playwright smoke script was not executed because the required local environment was not available:

- `localhost:3000` was not listening.
- `playwright/.auth/payroll.json` was not present.

This was recorded as an environment skip, not a code pass. The static guard now prevents the configured browser smoke route list from drifting to unsupported payroll routes.

## Verification

Passed:

```text
npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-contract.actions.test.ts actions/payroll/__tests__/payroll-compensation.actions.test.ts actions/payroll/__tests__/payroll-employee.actions.test.ts actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts --runInBand
npm test -- --runInBand services/payroll/__tests__ actions/payroll/__tests__ components/payroll/__tests__ __tests__/payroll-dashboard-routes.smoke.test.tsx services/accounting/__tests__/data-trust.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts
npm run typecheck
npm run prisma:validate
npm run policy:gates
npm run lint -- --quiet
git diff --check
```

Results:

- Payroll route smoke: 1 suite passed, 5 tests passed.
- Fixed action suites: 4 suites passed, 23 tests passed.
- Broad Prompt 19 matrix: 30 suites passed, 159 tests passed.
- Typecheck: passed.
- Prisma schema validation: passed.
- Policy gates: passed.
- Inventory boundary gate: 0 active violations.
- Service boundary gate: 0 active violations.
- Workflow assurance runtime check: ready, 6/6 runtime tables present, 2/2 migration rows present, 0 blockers.
- Payroll runtime immutability: 8/8 triggers present, 12/12 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed.
- Hard-delete gate: 0 active unsafe findings.
- Regulatory hardcode gate: passed, 0 active findings.
- Demo/report trust gate: 0 active production trust findings.
- Raw error boundary gate: 0 active unsafe findings.
- Lint: 0 errors, 5 existing unrelated warnings.
- Diff check: passed with line-ending normalization warnings only.

Observed and resolved during this prompt:

- The first broad Prompt 19 matrix run failed in four action suites because of stale `requireFreshAuth` mocks.
- After updating those mocks to return `claims.lastAuthAt`, the four suites and the full matrix passed.

Skipped:

- `npm run prisma:generate`: no schema or Prisma client change was made.
- `npm run ui:smoke:payroll`: local server and saved payroll auth state were unavailable.

## Files Changed

- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `actions/payroll/__tests__/payroll-contract.actions.test.ts`
- `actions/payroll/__tests__/payroll-compensation.actions.test.ts`
- `actions/payroll/__tests__/payroll-employee.actions.test.ts`
- `actions/payroll/__tests__/payroll-payment-evidence.actions.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_ASSURANCE_RELEASE_GATES_REPORT_2026-06-27.md`

## Prompt 19 Status

Status: completed for the implemented HR/payroll assurance and release-gate scope.

The validation evidence is ready for operations/runbooks and final readiness review over the implemented payroll workflows. Full unrestricted production remains blocked by the broader roadmap items already documented.

Next safe slice: Prompt 20 observability and runbooks.
