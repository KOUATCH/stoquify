# AqStoqFlow HR/Payroll Phase 1 Prompt 15 Register Tie-Out Report

Date: 2026-06-27
Prompt: 15 - Payroll Register And Livre De Paie Tie-Out
Workspace: E:\ohada saas\newStockFlow\aqstoqflow

## Executive Summary

Prompt 15 was already materially implemented in the codebase: the payroll register is service-owned, route-backed, RBAC-protected, redaction-aware, and tied to payslips, run totals, payment allocations, payment batches, declarations, accounting source links, and close evidence.

This pass completed a security and audit hardening gap discovered after the Prompt 14 fresh-auth improvement. The register export action, payroll run approval/posting action, payroll payment release action, declaration evidence action, and payroll settlement evidence action now pass the verified `lastAuthAt` timestamp from the protected action context instead of using a request-time `new Date()` as freshness evidence.

That distinction matters: operation time and fresh-auth time are different audit facts. Sensitive payroll finance evidence now carries the timestamp that was actually verified by `requireFreshAuth`.

## Source And Skill Notes

Skill applied: `aqstoqflow-hrpayroll-15-register-tieout`

The skill's listed source prompt-suite path under `what-next/payroll/` was stale. The current source suite was found and read at:

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Current supporting reports read:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_PAYSLIP_SELF_SERVICE_ARCHIVE_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_STATUTORY_COUNTRY_PACK_EXPANSION_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_15_REGISTER_TIEOUT_REPORT_2026-06-26.md`

## What Was Present

- Register service: `services/payroll/payroll-register.service.ts`
- Register action: `actions/payroll/payroll-register.actions.ts`
- Register route: `app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx`
- Register UI: `components/payroll/PayrollRegisterTieOut.tsx`
- Register tests: `services/payroll/__tests__/payroll-register.service.test.ts`
- Action tests: `actions/payroll/__tests__/payroll-register.actions.test.ts`

The register read model already:

- ties run lines to payslips;
- ties paid amounts to payment allocations and payment batches;
- ties statutory/declaration amounts to declaration payloads;
- checks payroll run and payment batch accounting source links;
- includes close evidence and close findings;
- computes tie-out status server-side;
- applies payroll amount redaction server-side;
- exposes export content hash, register hash, watermark, business event, audit, and redaction metadata.

## Change Made

### Verified Fresh-Auth Evidence

Files changed:

- `actions/payroll/payroll-register.actions.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/payroll-payment-reconciliation.actions.ts`

The following sensitive workflows now use `ctx.freshAuth?.lastAuthAt`:

- payroll register export;
- payroll run approval and posting;
- payroll payment batch release;
- payroll declaration evidence recording;
- payroll payment settlement evidence recording.

`now` remains available where the service needs the operation/event timestamp. It is no longer used as a substitute for verified step-up authentication evidence.

### Test Coverage

Files changed:

- `actions/payroll/__tests__/payroll-register.actions.test.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts`

The tests now assert the exact verified timestamp:

- register export passes the verified `lastAuthAt`;
- payroll run approval/posting passes the verified `lastAuthAt`;
- payment release passes the verified `lastAuthAt`;
- declaration evidence passes the verified `lastAuthAt`;
- settlement evidence passes the verified `lastAuthAt`.

## Security And Privacy Decisions

- No new route, UI shortcut, or client-computed payroll truth was added.
- Tenant and actor context still come from the protected action context, not client input.
- Payroll module entitlement remains enforced before register export, payment release, declaration evidence, and settlement evidence.
- Salary and payroll amount redaction remain service-owned.
- The change reduces audit risk by preventing request-time timestamps from masquerading as fresh-auth evidence.

## Accounting And Finance Decisions

- Payroll register accounting tie-out logic remains service-owned.
- Payroll run approval/posting, payment release, declaration evidence, and settlement evidence now carry verified step-up evidence into finance-critical service workflows.
- Register export evidence remains tied to register hash, content hash, redaction state, watermark, and business event.
- No declaration submission adapter, payment reconciliation UI, or statutory formula expansion was added.

## UI/UX Decisions

No UI changes were made.

The existing `PayrollRegisterTieOut` component remains render-only for trusted server data and does not compute payroll totals or tie-outs in the browser.

## Verification

Passed:

```text
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-register.actions.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-register.service.test.ts actions/payroll/__tests__/payroll-register.actions.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts services/payroll/__tests__/payroll-payslip-self-service.service.test.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
npm run prisma:validate
npm run service:boundary:fail
npm run policy:gates
npm run typecheck
npm run lint -- --quiet
git diff --check
```

Results:

- Action tests: 3 suites passed, 17 tests passed.
- Register/control/payslip/close tests: 8 suites passed, 45 tests passed.
- Immutability/tenant/privacy tests: 3 suites passed, 17 tests passed.
- Prisma schema validation: passed.
- Service boundary gate: 0 active violations.
- Policy gates: passed.
- Payroll runtime immutability: 8/8 triggers present, 12/12 forbidden mutation checks blocked, 3/3 allowed lifecycle checks passed.
- Typecheck: passed.
- Lint: 0 errors, 5 existing unrelated warnings.
- Diff check: passed with line-ending normalization warnings only.

Skipped:

- `npm run prisma:generate`: no schema or Prisma client change was made.
- Browser smoke: no UI or route behavior changed in this slice.

## Files Changed

- `actions/payroll/payroll-register.actions.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/payroll-payment-reconciliation.actions.ts`
- `actions/payroll/__tests__/payroll-register.actions.test.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_REGISTER_TIEOUT_REPORT_2026-06-27.md`

## Prompt 15 Status

Status: completed for the Prompt 15 hardening pass.

The register tie-out remains ready for declaration, payment, and close assurance expansion, with stronger authentication evidence for the finance-critical workflows that feed and export the register.

Next safe slice: Prompt 16 declaration lifecycle revalidation/hardening, while continuing to avoid unsupported authority automation claims.
