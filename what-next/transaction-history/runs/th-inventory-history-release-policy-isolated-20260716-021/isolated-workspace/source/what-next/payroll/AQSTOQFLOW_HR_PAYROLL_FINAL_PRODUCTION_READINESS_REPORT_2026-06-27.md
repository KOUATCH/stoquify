# AqStoqFlow HR/Payroll Final Production Readiness Report

Date: 2026-06-27
Prompt: 21 - Final Production Readiness Report
Workspace: E:\ohada saas\newStockFlow\aqstoqflow

## Final Decision

Decision: `NOT PRODUCTION-READY` for a full, unrestricted HR/payroll rollout.

Approved limited decision: `READY FOR CONTROLLED PILOT / LIMITED RELEASE` of the implemented, evidence-gated HR/payroll scope, provided the rollout is explicitly bounded to the workflows listed in this report and approved by product, accounting, security, and operations owners.

This decision is intentional, not pessimistic. The system now has a real HR/payroll kernel integrated with accounting, payment evidence, close assurance, data-trust, route guards, runbooks, and policy gates. It still must not be sold or operated as a complete statutory payroll product because production-critical blockers remain unresolved.

## Why Full Production Is Blocked

Prompt 21 requires `not production-ready` when any production-critical hard blocker remains unresolved. The following blockers remain:

| Blocker | Production impact | Status | Required next action |
| --- | --- | --- | --- |
| Full statutory payroll breadth | Blocks unrestricted statutory payroll claims | Unresolved | Complete expert-reviewed or regulator-confirmed country-pack formulas, fixtures, effective dating, caps, allowances, IRPP/income tax, benefits, YTD, leave/overtime, and jurisdiction expansion. |
| Production authority declaration automation | Blocks automated authority submission | Unresolved | Implement reviewed electronic payload mappings, response mappings, rejection/amendment rules, credential policy, retries, audit, and close-impact rules. |
| Production seed/backfill mutation | Blocks production migration of tenant payroll history | Unresolved | Approve idempotent tenant migration plan, redacted dry-run evidence, rollback/correction strategy, and signoff. |
| Payment/declaration detail operator routes | Blocks fully self-service operator workflows | Partial | Add service-backed payment and declaration operator routes only when they can expose real provider, ledger, declaration, and close proof without fake workflow surfaces. |
| Browser visual/accessibility validation | Blocks polished unrestricted release | Partial | Run Playwright or equivalent checks with authenticated payroll state for layout, proof drawers, role visibility, keyboard paths, mobile, dark/light, and redacted states. |
| Finance/BI/cash planning integration depth | Blocks full system-wide payroll intelligence | Partial | Replace remaining estimated payroll analytics with payroll register, ledger, payment, and declaration facts; add cash forecasts and cost allocation only where redaction and accounting proof allow it. |

## Approved Controlled Pilot Scope

The following may be piloted in a controlled tenant or internal staged release:

- Payroll setup readiness and read-only seed/backfill dry-run planning.
- Employee source data, evidence attachment, and safe source-data workbench.
- Contract lifecycle workbench for implemented create/update/terminate paths.
- Compensation approval and rubrique assignment flows with maker-checker and fresh-auth controls.
- Payment destination and attendance readiness evidence.
- Payroll command read model and command center.
- Payroll run control for implemented calculate/approve/post/release/declaration preparation paths.
- Payslip self-service read/export with verified fresh-auth evidence and redaction.
- Payroll register tie-out with payslip, payment, declaration, ledger, close, and proof links.
- Manual declaration lifecycle evidence with source payroll register proof.
- Payroll payment settlement evidence with source payroll register proof.
- Close/data-trust gates for payroll ledger, payslip, declaration, payment, register proof, and stale close evidence.
- Workflow assurance checks, incident redaction, action routing, and HR/payroll operations runbook.
- Cameroon CNPS statutory slice only where the supporting country-pack provenance is reviewed and the UI labels the scope honestly.

The controlled pilot must not imply full statutory coverage, automated legal filing, unrestricted payroll production readiness, or support for unsupported payroll jurisdictions.

## Explicitly Non-Production Scope

The following must not be represented as production-ready:

- Full Cameroon statutory payroll engine beyond the reviewed CNPS slice.
- IRPP/income tax, complex allowances, benefits, sector/risk automation, leave/overtime, YTD, multi-period statutory history, and unreviewed statutory formulas.
- Automated authority declaration submission.
- Production payroll seed/backfill mutation.
- Unsupported payroll payment provider automation.
- Client-computed payroll totals, settlement truth, declaration truth, close readiness, or register proof.
- Placeholder routes for `/dashboard/payroll/payments`, `/dashboard/payroll/declarations`, or `/dashboard/payroll/runs`.
- Unauthenticated, unredacted, or non-audited salary/person-data export.

## Evidence Reports

The following 2026-06-27 reports were verified as present:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SETUP_CONTROL_PLANE_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SOURCE_DATA_FOUNDATION_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CONTRACT_LIFECYCLE_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMPENSATION_APPROVAL_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_PAYMENT_ATTENDANCE_READINESS_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_READ_MODEL_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_CENTER_UX_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_STATUTORY_COUNTRY_PACK_EXPANSION_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_PAYSLIP_SELF_SERVICE_ARCHIVE_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_REGISTER_TIEOUT_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_DECLARATION_LIFECYCLE_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_PAYMENT_RECONCILIATION_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CLOSE_DATA_TRUST_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_ASSURANCE_RELEASE_GATES_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_OBSERVABILITY_RUNBOOKS_REPORT_2026-06-27.md`

The prior final report remains useful historical context:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-26.md`

## Validation Summary

Most recent release evidence:

| Gate | Result |
| --- | --- |
| Payroll route smoke | Passed, 1 suite / 5 tests |
| Fixed action fresh-auth suites | Passed, 4 suites / 23 tests |
| Broad payroll/action/component/close/data-trust matrix | Passed, 30 suites / 159 tests |
| Prompt 20 assurance/runbook tests | Passed, 4 suites / 55 tests |
| Alert/action routing and operational surface tests | Passed, 5 suites / 12 tests |
| Typecheck | Passed |
| Prisma validation | Passed |
| Policy gates | Passed |
| Inventory boundary gate | 0 active violations |
| Service boundary gate | 0 active violations |
| Workflow assurance runtime check | Ready, 6/6 runtime tables, 2/2 migration rows, 0 blockers |
| Payroll runtime immutability | 8/8 triggers present, 12/12 forbidden mutations blocked, 3/3 allowed lifecycle checks passed |
| Hard-delete gate | 0 active unsafe findings |
| Regulatory hardcode gate | Passed, 0 active findings |
| Demo/report trust gate | 0 active production trust findings |
| Raw error boundary gate | 0 active unsafe findings |
| Lint | 0 errors, 5 existing unrelated warnings |
| Diff check | Passed with line-ending normalization warnings only |

Skipped with reason:

- `npm run prisma:generate`: no schema or Prisma client change was made.
- `npm run ui:smoke:payroll`: no local server was listening on `localhost:3000` and `playwright/.auth/payroll.json` was not present.

## Source Of Truth Status

Status: acceptable for controlled pilot.

- Services own HR/payroll business truth.
- Server actions derive tenant and actor context server-side.
- Dashboard pages render service/action data and do not compute payroll truth.
- Data-trust consumes service-owned payroll facts.
- Register proof now flows into declaration lifecycle evidence and payment settlement evidence.
- Browser smoke route lists are statically guarded against unsupported payroll routes.

Remaining risk: finance/BI/cash planning still needs deeper payroll fact consumption before full system-wide payroll intelligence can be claimed.

## Security And Privacy Status

Status: acceptable for controlled pilot.

Implemented controls:

- RBAC on payroll routes and server actions.
- Payroll module entitlement on implemented route/action surfaces.
- Fresh-auth enforcement with verified `claims.lastAuthAt` evidence for sensitive paths.
- Maker-checker controls on sensitive payroll finance operations.
- Payroll salary/person redaction.
- Incident redaction for payroll destination/source evidence.
- Export audit and watermarking for payslip/register export paths.
- Runtime immutability triggers for finalized payroll evidence.

Remaining risk: every future route, export, adapter, and provider integration must repeat the same tenant/RBAC/entitlement/fresh-auth/redaction/audit tests before release.

## Accounting And Finance Status

Status: acceptable for controlled pilot.

Implemented controls:

- SYSCOHADA-aware payroll posting foundations for payroll runs and payments.
- Payroll ledger source-link checks.
- Payment destination approval and evidence readiness.
- Payroll payment reconciliation evidence and exception handling.
- Payroll register tie-out across runs, payslips, payments, declarations, ledger, and close evidence.
- Declaration lifecycle evidence tied to source payroll register hash.
- Payment settlement evidence tied to source payroll register hash.
- Close evidence stale invalidation for payroll run, payment, and declaration lifecycle changes.
- Accountant data-trust blockers for payroll ledger, payslip, declaration, payment, register proof, and source-link gaps.

Remaining risk: full statutory liabilities, authority adapter mappings, and provider automation still require reviewed production rules before legal or financial automation claims.

## Statutory And Compliance Status

Status: limited controlled scope only.

- Regulatory hardcode gate passes with 0 active findings.
- Country-pack provenance boundaries are present.
- Cameroon CNPS is a narrow reviewed slice.
- Unsupported statutory states remain blocked or surfaced as blockers.

Remaining risk: full statutory payroll production is not ready until expert-reviewed or regulator-confirmed formulas and golden fixtures exist for the intended jurisdictions and scenarios.

## UI/UX Status

Status: route-ready for implemented scope.

Implemented payroll surfaces:

- `/dashboard/payroll`
- `/dashboard/payroll/setup`
- `/dashboard/payroll/employees`
- `/dashboard/payroll/contracts`
- `/dashboard/payroll/compensation`
- `/dashboard/payroll/attendance`
- `/dashboard/payroll/payslips`
- `/dashboard/payroll/register`

Implemented UI validation:

- Route smoke verifies RBAC, module entitlement, protected actions, implemented components, width/overflow guards, and unsupported-route absence.
- Static browser-smoke route-list guard verifies `ui:smoke:payroll` only targets implemented payroll route IDs.

Remaining risk: HTTP/Playwright visual/accessibility smoke was not executed because the local server and payroll auth state were unavailable.

## Changed Files Summary

Code and test surfaces touched across the hardening sequence include:

- `services/_shared/protect.ts`
- `actions/payroll/payroll-payslip-self-service.actions.ts`
- `actions/payroll/payroll-register.actions.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/payroll-payment-reconciliation.actions.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/accounting/data-trust.service.ts`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- payroll action tests under `actions/payroll/__tests__/`
- payroll service tests under `services/payroll/__tests__/`
- accounting data-trust tests under `services/accounting/__tests__/`
- assurance runbook tests under `services/assurance/__tests__/`
- `docs/operations/runbooks/hr-payroll-operations.md`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- dated reports under `what-next/payroll/`

The working tree contains broader pre-existing changes outside this report. They were not reverted or normalized.

## Recommended Next Action

For controlled pilot:

1. Select one pilot tenant and one payroll period.
2. Approve the pilot scope in writing: implemented workflows only, no production seed/backfill mutation, no automated authority filing, no unsupported statutory claims.
3. Provision payroll browser smoke auth state and rerun `npm run ui:smoke:payroll` against a running local or staging server.
4. Run a parallel payroll cycle against known accounting/payment evidence.
5. Require accountant/security signoff before any real payout or close certification.

For full production readiness:

1. Complete statutory country-pack breadth with reviewed formulas and fixtures.
2. Implement authority declaration adapters only after legal payload/response mappings are reviewed.
3. Approve production seed/backfill mutation with rollback and correction evidence.
4. Add payment/declaration/runs operator routes only when service-backed and proof-backed.
5. Replace remaining finance/BI/cash payroll estimates with payroll register, ledger, payment, and declaration facts.
6. Add authenticated browser visual/accessibility regression checks.
7. Rerun Prompt 19 and Prompt 21 after those blockers are closed.

## Handoff

This closes the current HR/payroll prerequisite implementation program for the implemented scope.

Final handoff: `not production-ready` for unrestricted release; `ready for controlled limited pilot` of the implemented, evidence-gated HR/payroll workflows.
