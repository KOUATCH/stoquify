# Aqstoqflow HR/Payroll Prompt 20 Observability Runbooks Report

Date: 2026-06-26

Skill: `aqstoqflow-hrpayroll-20-observability-runbooks`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Outcome

Prompt 20 is implemented for the current, deliberately bounded HR/Payroll release surface.

The slice adds the smallest useful operations layer on top of the existing Workflow Assurance control plane: payroll-critical check definitions, service-owned runners, redacted incident payload behavior, an operator runbook, and focused tests. No new payroll business workflow, dashboard route, alerting provider, or generic incident infrastructure was introduced.

## Prerequisite Gate

Status: passed with explicit scope boundaries.

Evidence reviewed:

- Prompt 19 original report: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_19_ASSURANCE_RELEASE_GATES_REPORT_2026-06-26.md`.
- Prompt 19 rerun report: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_19_ASSURANCE_RELEASE_GATES_RERUN_REPORT_2026-06-26.md`.
- Runtime immutability evidence: `what-next/payroll/payroll-immutability-runtime-check.md`.
- Setup readiness/dry-run evidence: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_06_SETUP_READINESS_DRY_RUN_REPORT_2026-06-26.md`.
- Implemented route smoke: `__tests__/payroll-dashboard-routes.smoke.test.tsx`.

Continuing scope boundaries:

- Declaration authority automation remains limited to reviewed mappings and manual authority evidence.
- Statutory payroll claims remain limited by expert-reviewed or regulator-confirmed country-pack provenance.
- Operational routing uses existing implemented surfaces only: `/dashboard/payroll`, `/dashboard/payroll/payslips`, `/dashboard/payroll/register`, `/dashboard/assurance/control-tower`, and `/dashboard/accounting/close`.

## Implementation

Added or tightened:

- `services/assurance/assurance-registry-contracts.ts`
  - Payroll release evidence assurance metadata is now explicitly marked `aggregate_redacted`.
- `services/assurance/__tests__/assurance-registry-contracts.test.ts`
  - Prompt 20 safe aggregate-routing coverage now includes `payroll.released_payment_evidence.required`.
- `services/assurance/__tests__/payroll-observability-runbook.test.ts`
  - Runbook review now checks policy-gate evidence inputs, setup readiness/dry-run evidence, immutability runtime evidence, and route-smoke evidence.
- `docs/operations/runbooks/hr-payroll-operations.md`
  - Added policy-gate evidence inputs and setup readiness/dry-run response steps.

Existing Prompt 20 foundations retained:

- Payroll assurance checks:
  - `payroll.released_payment_evidence.required`
  - `payroll.payment_reconciliation_exception.visible`
  - `payroll.declaration_lifecycle_exception.visible`
  - `payroll.close_evidence.stale.visible`
- Payroll runner tests for release evidence, payment reconciliation exceptions, declaration lifecycle exceptions, and stale close evidence.
- Workflow assurance incident redaction test that protects payroll destination and source evidence from incident and notification payloads.

## Security And Privacy Decisions

- Incident evidence remains aggregate and redacted.
- Payroll incidents use the existing `kontava-payroll-person-redaction-policy` path.
- The runbook forbids copying salary, bank, payment destination, authority payload, raw statutory payload, phone, email, or employee identifiers into incident notes or broad channels.
- No client-computed payroll truth or dashboard-specific shadow service was added.

## Accounting And Finance Decisions

- Payment release observability focuses on approved/postable runs, allocations, payment transaction references, and evidence hashes.
- Payment reconciliation observability focuses on visible exceptions and owner-routed triage.
- Declaration lifecycle observability keeps authority automation blocked unless mappings are reviewed.
- Close evidence observability routes payroll stale evidence to the close center and requires recertification only after findings are resolved or waived by policy.

## UI/UX Decisions

- No new UI was added.
- Operational links point only to existing implemented surfaces and the existing assurance control tower.
- The runbook explicitly avoids linking to unfinished `/dashboard/payroll/payments` or `/dashboard/payroll/declarations` routes.

## Validation

Passed:

- `npm test -- --runTestsByPath services/assurance/__tests__/assurance-registry-contracts.test.ts services/assurance/__tests__/assurance-registry.service.test.ts services/assurance/__tests__/assurance-incident.service.test.ts services/assurance/__tests__/payroll-observability-runbook.test.ts --runInBand`
  - 4 suites passed, 55 tests passed.
- `npm run service:boundary:fail`
  - 0 active service-boundary violations.
- `npx eslint services/assurance/assurance-registry-contracts.ts services/assurance/__tests__/assurance-registry-contracts.test.ts services/assurance/__tests__/payroll-observability-runbook.test.ts`
  - Passed with no reported findings.

Attempted:

- `npm run typecheck`
  - Timed out twice with no TypeScript diagnostics returned: once at 180 seconds and once at 300 seconds.
  - This is recorded as a verification caveat, not a discovered Prompt 20 code error. The touched TypeScript files were covered by focused Jest and narrow ESLint.

## Files Changed By This Prompt

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/__tests__/assurance-registry-contracts.test.ts`
- `services/assurance/__tests__/payroll-observability-runbook.test.ts`
- `docs/operations/runbooks/hr-payroll-operations.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_20_OBSERVABILITY_RUNBOOKS_REPORT_2026-06-26.md`

## Handoff

Prompt 20 handoff criteria are satisfied for the implemented observability/runbook scope, with the repo-wide typecheck timeout recorded above as a verification caveat.

Recommended next ordered skill:

- `aqstoqflow-hrpayroll-21-final-readiness`