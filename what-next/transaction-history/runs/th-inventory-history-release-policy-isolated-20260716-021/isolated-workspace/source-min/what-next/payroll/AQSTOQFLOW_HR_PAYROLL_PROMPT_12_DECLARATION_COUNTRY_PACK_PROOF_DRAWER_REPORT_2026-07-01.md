# AqStoqFlow HR/Payroll Prompt 12 Declaration Country-Pack Proof Drawer Report

Date: 2026-07-01

Skill applied: `aqstoqflow-hrpayroll-12-command-center-ux`

Prompt name: Payroll Command Center UX And Proof Drawer

Related predecessor evidence:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_CENTER_UX_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_DECLARATION_COUNTRY_PACK_REGISTER_PROOF_CONTINUITY_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_18_CLOSE_DATA_TRUST_COUNTRY_PACK_PROOF_GATE_REPORT_2026-07-01.md`

## Decision

Status: passed for this narrow Prompt 12 operator-proof slice.

The payroll command center now exposes declaration country-pack register proof through the service-owned command read model and existing proof drawer. Operators can inspect the latest declaration proof chain from `/dashboard/payroll`, and missing or mismatched country-pack register proof now creates a service-owned blocker plus a routed next action to `/dashboard/payroll/declarations`.

This is not a full HR/payroll production signoff. It does not add statutory filing adapters, payment release automation, payroll recalculation rules, HR source-of-truth workflows, or unrestricted rollout approval. It makes the implemented declaration proof continuity visible and actionable on the existing operator surface.

## Implementation Summary

- Extended `PayrollCommandReadModel.evidence.latestDeclaration` with country-pack register proof metadata:
  - proof hash;
  - proof status;
  - proof-present boolean;
  - total, missing, and mismatched line counts;
  - line proof hashes;
  - statutory scenario coverage hash;
  - reviewed evidence source hashes;
  - legal references.
- Added metadata parsing helpers in the payroll command read model so the UI consumes normalized service output, not raw declaration metadata.
- Added the declaration proof gap blocker:
  - code: `PAYROLL_DECLARATION_COUNTRY_PACK_REGISTER_PROOF_MISSING`;
  - domain: `declaration`;
  - severity: `high`.
- Added the operator next action:
  - id: `review-declaration-country-pack-register-proof`;
  - route: `/dashboard/payroll/declarations`;
  - permission: `payroll.declarations.manage`;
  - blocked by the missing-proof blocker.
- Routed `payroll.declarations` through the command read model route map.
- Updated the command-center proof drawer to show declaration country-pack proof hashes, statuses, line counts, review evidence hashes, and legal refs.
- Kept proof display hash/status/count based; no salary, bank, mobile-money, tax ID, or employee personal data was added to the drawer.

## Files Changed

- `services/payroll/command-read-model.service.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

The two immutability files were refreshed by `npm run policy:gates`.

## Security And Privacy

- The browser does not infer declaration proof readiness from raw metadata.
- Route availability remains permission-gated by the protected payroll command read model.
- Unauthorized users still receive denied states instead of executable links.
- The proof drawer displays evidence hashes, statuses, counts, and references only.
- No employee master data, compensation amount, payment credential, tax/social identifier, or personal document value was exposed.

## Accounting, Finance, And Close Assurance

- The operator proof drawer now surfaces the same declaration country-pack register proof chain used by close/data-trust readiness.
- Missing declaration proof is visible before close certification instead of remaining a back-office-only blocker.
- The route sends operators to the declaration workbench; it does not create accounting postings or statutory submissions from the command center.
- Payroll remains the source of declaration/register evidence; finance and accounting consume the register, declaration, payment, and proof facts.

## UI And Workflow Decisions

- Reused the existing proof drawer instead of creating a new workflow surface.
- Routed only to an implemented payroll declaration surface.
- Preserved empty, denied, and proof-backed command-center behavior from the prior Prompt 12 UX work.
- Avoided fake filing/payment automation claims. The drawer explains evidence state; it does not imply authority submission has completed.

## Validation Evidence

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand`
  - Passed: 2 suites, 8 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx actions/payroll/__tests__/payroll-command-read-model.actions.test.ts config/__tests__/sidebar.test.ts --runInBand`
  - Passed: 5 suites, 33 tests.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run service:boundary:fail`
  - Passed with 0 active service-boundary violations.
- `npm run lint -- --quiet`
  - Passed with 0 errors and 4 pre-existing warnings.
- `npm run policy:gates`
  - Passed inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates.

## Known Non-Claims

- Authenticated browser smoke was not rerun for this slice.
- Accessibility, mobile, dark/light, and visual regression checks were not rerun.
- No authority adapter production payload/response mapping was added.
- No payment provider settlement adapter or automated payment release was added.
- No new statutory formula breadth was added.
- Full production remains blocked until the final readiness report blockers are closed, a controlled pilot payroll cycle reconciles cleanly, and accounting/security/operations sign off.

## Next Safe Slice

Recommended next execution target: authority adapter and declaration lifecycle production mappings.

That slice should add real declaration payload mappings, response mappings, rejection/amendment handling, credential custody, idempotency, retry behavior, receipts, and provider/authority audit trails. It should continue to preserve the service-owned proof spine and avoid UI claims until adapter evidence exists.
