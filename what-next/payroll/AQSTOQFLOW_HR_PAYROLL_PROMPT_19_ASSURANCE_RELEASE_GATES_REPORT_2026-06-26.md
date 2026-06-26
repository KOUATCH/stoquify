# Aqstoqflow HR/Payroll Prompt 19 Assurance And Release Gates Report

Date: 2026-06-26

Skill: `aqstoqflow-hrpayroll-19-assurance-release-gates`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Outcome

Prompt 19 is complete for the implemented HR/Payroll surface.

The release gate added a focused payroll dashboard route smoke suite and validated the existing payroll service/action assurance matrix. No hard blocker remains for the next ordered skill, with the continuing scope limits noted below.

## Prerequisite Gate

Status: passed with explicit scope boundaries.

Evidence reviewed:

- Prompt 01 governance evidence was found in `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md`.
- Prompt 18 handoff evidence was found in `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_18_CLOSE_DATA_TRUST_REPORT_2026-06-26.md`.
- Prompt 18 release gate unblock evidence was found in `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_18_RELEASE_GATE_UNBLOCK_REPORT_2026-06-26.md`.
- Runtime payroll immutability evidence was regenerated at `what-next/payroll/payroll-immutability-runtime-check.md` and `.json`.

Continuing scope boundaries:

- Production statutory payroll automation remains bounded by expert-reviewed or regulator-confirmed country-pack provenance.
- Payroll declaration authority adapter automation remains dependent on reviewed declaration mappings and lifecycle close-impact rules.
- Browser smoke is implemented through the repository's existing Jest route-smoke pattern. No Playwright configuration is present in this repo, so no screenshot/pixel visual smoke was added.

## Implementation

Added:

- `__tests__/payroll-dashboard-routes.smoke.test.tsx`

The new smoke suite verifies:

- `/dashboard/payroll` loads only after `payroll.command.read`, payroll module entitlement, and `getPayrollCommandReadModelAction`.
- `/dashboard/payroll/payslips` loads only after `payroll.payslips.self.read`, payroll module entitlement, and `getMyPayrollPayslipsAction`.
- `/dashboard/payroll/register` loads only after `payroll.reports.read`, payroll module entitlement, and `getPayrollRegisterAction`.
- Module entitlement denial stops execution before payroll actions are called.
- RBAC denial renders safe route states and stops execution before payroll actions are called.
- Implemented payroll routes are backed by protected actions and payroll components.
- Payroll UI surface links do not advertise unfinished workflow routes such as employees, contracts, declarations, payments, runs, or setup.
- Implemented route shells keep the dashboard overflow/width guard classes used to avoid critical text overflow.

No new business feature, route, service, dashboard-specific shadow service, or client-computed payroll truth was introduced.

## Validation Evidence

Passed:

- `npm test -- --runTestsByPath __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand`
  - 1 suite passed, 4 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`
  - 5 suites passed, 27 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand`
  - 1 suite passed, 11 tests passed.
- `npm test -- --runInBand services/payroll/__tests__ actions/payroll/__tests__ components/payroll/__tests__ __tests__/payroll-dashboard-routes.smoke.test.tsx`
  - 26 suites passed, 127 tests passed.
- `npm run prisma:validate`
  - Prisma schema valid.
- `npm run prisma:generate`
  - Initial run failed with Windows `EPERM` because the local Next dev server held the Prisma query engine DLL.
  - Stopped the identified Aqstoqflow Next dev server PIDs `20628` and `13344`.
  - Retry passed and generated Prisma Client v6.19.3.
- `npm run service:boundary:fail`
  - 0 active service-boundary violations.
- `npm run policy:gates`
  - Inventory boundary: 0 active violations.
  - Service boundary: 0 active violations.
  - Workflow assurance runtime check: ready, 6/6 runtime tables present, 2/2 migration rows present, 0 blockers.
  - Payroll immutability runtime check: ready against `stockflow_immutability_test`, 8/8 required triggers present, 12/12 forbidden mutations blocked, 3/3 allowed lifecycle checks passed, 0 blockers.
  - Hard-delete gate: 0 active unsafe hard-delete findings.
  - Regulatory hardcode gate: pass, 0 active findings.
  - Demo/report trust gate: 0 active production trust findings.
  - Raw error boundary gate: 0 active unsafe raw-error findings.
- `npm run typecheck`
  - Passed before and after the final route-smoke edit.
- `npm run lint`
  - Passed with 0 errors and 5 pre-existing warnings.

Dev server:

- The local dev server was stopped to release the Prisma DLL lock and then restarted.
- `localhost:3000` is listening.

## Single Source Of Truth Review

Risks avoided:

- No client-side payroll metric computation was added.
- No duplicated payroll read model was added.
- No dashboard-only payroll shadow service was added.
- No placeholder payroll route was introduced.
- Payroll pages continue to render trusted server-action data.
- Protected server actions continue to derive tenant/actor context server-side.
- RBAC and module entitlement remain prerequisites before page data loading.
- Route smoke explicitly checks that implemented pages stay action-backed.

Watch item:

- `actions/payroll/payroll-payment-reconciliation.actions.ts` revalidates `/dashboard/payroll/payments`, but no current payroll UI surface links to that route. This was not treated as a Prompt 19 fake-route blocker because it is not advertised in the UI; it should be aligned when a real payment route is intentionally implemented or the revalidation path is retired.

## Blockers

No Prompt 19 hard blocker remains.

Deferred or externally governed items:

- Playwright-level visual smoke is not available because no Playwright setup exists in this repo.
- Country-pack statutory production claims remain dependent on reviewed country-pack provenance.
- Declaration adapter automation remains dependent on reviewed statutory declaration mappings.

## Files Changed By This Prompt

- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_19_ASSURANCE_RELEASE_GATES_REPORT_2026-06-26.md`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

The broader worktree contains many pre-existing modified, deleted, and untracked files unrelated to this Prompt 19 slice. They were not reverted or normalized.

## Handoff

Prompt 19 handoff criteria are satisfied for the implemented route and assurance scope.

Recommended next ordered skill:

- `aqstoqflow-hrpayroll-20-observability-runbooks`
