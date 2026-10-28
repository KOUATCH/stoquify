# AqStoqFlow HR/Payroll Prompt 16 Certified Authority Execution Enqueue Report

Date: 2026-07-01

Skill applied: `aqstoqflow-hrpayroll-16-declaration-lifecycle`

Prompt name: Declaration Lifecycle And Adapter Foundation

Related predecessor evidence:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_16_DECLARATION_LIFECYCLE_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_DECLARATIONS_OPERATOR_WORKBENCH_REPORT_2026-06-28.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_DECLARATION_AUTHORITY_PROOF_BACKFILL_EXECUTION_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_DECLARATION_COUNTRY_PACK_REGISTER_PROOF_CONTINUITY_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_12_DECLARATION_COUNTRY_PACK_PROOF_DRAWER_REPORT_2026-07-01.md`

## Decision

Status: passed for this scoped Prompt 16 protected-action slice.

Certified authority adapter execution can now be queued through a protected server action that derives organization and actor from the authenticated context, requires fresh authentication, enforces payroll module entitlement, and requires `payroll.declarations.manage`.

This does not claim unrestricted production statutory filing. The existing service still blocks queueing unless the declaration evidence is production-submission-supported and has complete certified authority adapter proof, mapping proof, credential proof, idempotency/replay proof, legal review proof, and adapter chaos release-gate proof.

## Prerequisite Gate

Result: passed for this narrow enqueue-action slice.

- The source prompt suite was readable.
- Prior Prompt 16 manual evidence lifecycle and immutable evidence reports were available.
- Country-pack declaration register proof continuity was already implemented.
- Authority adapter execution, worker, certification harness, fixture runner, and adapter operations read model already existed.
- The missing safe product path was a protected server action for enqueueing certified executions; no unreviewed adapter automation was needed.

## Implementation Summary

- Added `enqueuePayrollAuthorityAdapterExecutionAction` to `actions/payroll/payroll-control.actions.ts`.
- The action uses `protect` with:
  - permission: `payroll.declarations.manage`;
  - audit resource: `PayrollDeclaration`;
  - fresh auth: required;
  - tenant guard: handler-derived;
  - payroll module entitlement: enforce mode;
  - surface: `payroll.declarations.adapter_execution.enqueue`.
- The action parses input through `enqueuePayrollAuthorityAdapterExecutionInputSchema` after overriding:
  - `organizationId` from `ctx.orgId`;
  - `actorId` from `ctx.userId`.
- The action revalidates payroll, payroll runs, payroll payments, payroll declarations, and presence paths through the existing payroll revalidation helper.
- No UI route, fake wizard, or client-computed declaration truth was added.

## Security And Privacy Decisions

- Client-supplied `organizationId` and `actorId` cannot steer queueing.
- Fresh auth runs before permission checks for the enqueue action.
- Payroll module entitlement is enforced before service execution.
- The action exposes no raw authority payload, credential secret, salary value, employee identity, bank value, tax/social identifier, or legal document body.
- The existing enqueue service preserves redacted execution metadata, business events, audit logs, and idempotency constraints.

## Accounting, Finance, And Close Decisions

- The action does not post payroll, release payment, reconcile cash, or certify close.
- Queueing remains tied to existing declaration evidence, source register hash, country-pack proof, mapping proof, response/receipt proof, and adapter chaos proof.
- Close/data-trust can continue to consume declaration lifecycle evidence after the authority worker records accepted, rejected, payment-due, or amendment evidence.

## UI And Workflow Decisions

- No new visible operator workflow was exposed in this slice.
- The existing `/dashboard/payroll/declarations` and command-center proof surfaces remain read-oriented unless backed by protected actions.
- A future operator mutation UI can call this action only after adding fresh-auth UX and denied/empty/error states; that was not claimed here.

## Files Changed

- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

The two immutability files were refreshed by `npm run policy:gates`.

## Validation Evidence

- `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand`
  - Passed: 1 suite, 17 tests.
- `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-control.actions.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/authority-adapter-worker.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts --runInBand`
  - Passed: 5 suites, 50 tests.
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
- `git diff --check -- actions/payroll/payroll-control.actions.ts actions/payroll/__tests__/payroll-control.actions.test.ts what-next/payroll/payroll-immutability-runtime-check.md what-next/payroll/payroll-immutability-runtime-check.json`
  - Passed with CRLF normalization warnings only on refreshed evidence files.

## Known Non-Claims

- No authority payload or response mapping content was authored in this slice.
- No regulator credential custody system was changed.
- No browser/operator mutation form was added.
- No background scheduler/deployment worker was configured.
- No payment provider settlement proof execution was added.
- No full pilot payroll reconciliation or final production go-live decision was made.

## Handoff Decision

Prompt 16 is stronger for certified authority execution entry, but full HR/payroll production readiness remains incomplete.

Recommended next safe slice: payment provider and settlement proof execution, or the fresh-auth operator mutation UI for declaration enqueueing if the product priority is controlled operator execution from `/dashboard/payroll/declarations`.
