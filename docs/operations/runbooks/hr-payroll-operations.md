# HR/Payroll Operations Runbook

Last updated: 2026-06-26

Scope: Aqstoqflow HR/Payroll operational readiness for the implemented, service-owned payroll workflows.

This runbook covers payroll operations, correction handling, payment failures, declaration fallback, country-pack review, exports, privacy incidents, and stale close evidence. It does not authorize statutory automation, new payroll routes, direct database repair, or exposure of employee salary/person data.

## Principles

- Services own HR/payroll truth.
- Server actions are the protected workflow boundary.
- RBAC and module entitlement govern access.
- Payroll evidence is immutable after finalization; corrections use reversal, amendment, or new evidence records.
- Incidents use aggregate, redacted evidence only.
- No salary, bank, payment destination, authority payload, or raw statutory payload is copied into tickets, chat, email, or incident notes.

## Operational Surfaces

- Payroll command center: `/dashboard/payroll`
- Payslip self-service: `/dashboard/payroll/payslips`
- Payroll register: `/dashboard/payroll/register`
- Assurance control tower: `/dashboard/assurance/control-tower`
- Close center: `/dashboard/accounting/close`

## Workflow Assurance Checks

Prompt 20 adds these payroll operational signals to the existing Workflow Assurance registry:

- `payroll.released_payment_evidence.required`: released payroll payments must retain approved run, allocation, payment, and hash evidence.
- `payroll.payment_reconciliation_exception.visible`: failed, exception, or unreconciled payroll payment batches must be visible and routed.
- `payroll.declaration_lifecycle_exception.visible`: rejected, overdue, or manual-authority payroll declaration states must be visible before close.
- `payroll.close_evidence.stale.visible`: certified close packs must not hide unresolved high or critical payroll findings.

All checks run in observe mode and route to existing implemented pages only.

## Policy Gate Evidence Inputs

Use these existing evidence inputs before escalating an operational payroll incident:

- Runtime immutability: run `npm run payroll:immutability:runtime` and attach `what-next/payroll/payroll-immutability-runtime-check.md`.
- Setup readiness and dry run: review `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_06_SETUP_READINESS_DRY_RUN_REPORT_2026-06-26.md` and run `node scripts/payroll-seed-backfill-dry-run.js --dry-run true` for the target tenant parameters when live setup evidence is needed.
- Route smoke: use `__tests__/payroll-dashboard-routes.smoke.test.tsx` for implemented route coverage only.
- Release policy: use `npm run policy:gates` for release-impacting repairs.

Do not paste dry-run output that contains tenant-specific identifiers into broad channels. Keep incident summaries to aggregate, redacted evidence only.

## Payroll Cycle Operation

Use when a payroll cycle is blocked, unclear, or ready for review.

1. Open `/dashboard/payroll`.
2. Review command-center blockers from the service-owned read model.
3. Confirm module entitlement and RBAC are active for the operator.
4. Confirm employee, contract, compensation, payment destination, payslip, register, payment, declaration, and close readiness states.
5. Do not calculate, approve, post, release, export, or close payroll from a client-derived number.
6. If a blocker references accounting, open `/dashboard/accounting/close` or the accounting setup workflow instead of editing payroll evidence directly.

Stop if:

- The blocker would require direct database edits.
- The operator lacks the required payroll permission.
- The data shown would require unredacted salary/person data that the operator is not allowed to view.

Validation:

- Rerun the relevant payroll service/action tests.
- Rerun `npm run policy:gates` for release-impacting repairs.

## Setup Readiness And Dry-Run Evidence

Use when payroll cannot start because tenant setup, accounting configuration, posting rules, journals, country-pack readiness, or employee source mapping is incomplete.

1. Review setup readiness through the server-owned setup readiness service and dry-run plan.
2. Confirm accounting module dependency, accounting settings, account mappings, active payroll journal, posting rules, open accounting period, country-pack support, and employee-to-user mapping readiness.
3. Keep the dry-run read-only. Mutation mode is intentionally unavailable in this rollout slice.
4. Record only counts, stable keys, blocker classes, and evidence hashes in incidents.
5. Route setup blockers to `/dashboard/payroll` or `/dashboard/accounting/close`; do not create setup-only dashboard routes.

Stop if:

- A fix requires seed/backfill mutation mode.
- Contract, payment destination, or attendance source evidence is missing.
- Dry-run evidence would expose salary, bank, payment destination, email, phone, or employee identifiers.

Validation:

- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
- `node --check scripts/payroll-seed-backfill-dry-run.js`

## Correction And Evidence Repair

Use when finalized payroll evidence is wrong, incomplete, or contradicted by later proof.

1. Confirm whether the evidence is finalized, emitted, posted, released, submitted, or certified.
2. Do not mutate finalized payroll rows in place.
3. Use the approved correction, reversal, amendment, or new-evidence path for the specific workflow.
4. Attach source evidence hashes and actor context.
5. If the change affects accounting, payment, declaration, or close evidence, verify close invalidation and data-trust freshness.
6. Record an assurance incident when correction evidence is missing, disputed, or close-impacting.

Stop if:

- A proposed fix requires bypassing the immutability migration or runtime trigger proof.
- A correction path is not implemented for the workflow.
- The correction would make certified close evidence falsely fresh.

Validation:

- Payroll immutability migration test.
- Payroll runtime immutability check against the dedicated non-production test DB.
- Related payroll service tests for the corrected workflow.

## Payment Failure Or Reconciliation Exception

Use when a payroll payment batch fails, has provider exceptions, or cannot reconcile.

1. Open `/dashboard/payroll`.
2. Confirm the batch status through service-owned payment reconciliation data.
3. Check approved destination evidence before any retry or release decision.
4. Confirm provider, statement, or payment transaction evidence exists.
5. Resolve or assign the assurance incident from `/dashboard/assurance/control-tower`.
6. If payment status affects close, open `/dashboard/accounting/close` and confirm stale evidence is visible.

Stop if:

- Payment destination evidence is missing or self-approved by the requester.
- Provider/statement evidence is absent.
- A payment release would rely on client-entered destination data or unverified file content.

Validation:

- `services/payroll/__tests__/payroll-payment-evidence.service.test.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts`

## Declaration Fallback

Use when payroll declarations are rejected, overdue, or require manual authority evidence.

1. Open `/dashboard/payroll`.
2. Confirm declaration status and evidence through the payroll declaration lifecycle service.
3. Attach manual authority evidence using immutable evidence records.
4. Keep statutory adapter automation disabled unless reviewed mappings and close-impact rules are approved.
5. Confirm declaration liability and payment state tie to payroll register and close evidence.
6. Escalate country-pack or formula questions to expert review instead of changing production logic.

Stop if:

- The adapter mapping is not expert-reviewed or regulator-confirmed.
- The requested action would claim statutory submission success without authority evidence.
- The declaration payload contains salary/person details that cannot be safely redacted.

Validation:

- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- Regulatory hardcode gate.
- Payroll register tie-out tests.

## Country-Pack Review

Use when payroll calculation, statutory fixture, or legal provenance is questioned.

1. Identify the country, pack version, schema version, and resolution hash.
2. Confirm the formula envelope is `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED` before production claims.
3. If the pack is source-checked only, keep the workflow in unsupported or manual-review state.
4. Do not hardcode statutory values in production services.
5. Attach reviewed fixtures and provenance to the prompt/report before expanding payroll automation.

Stop if:

- Legal inputs are not reviewed.
- A requested automation would hide unsupported statutory state.
- Fixtures do not match the reviewed formula envelope.

Validation:

- Regulatory hardcode gate.
- Country-pack tests.
- Payroll control tests for unsupported-state behavior.

## Export And Payslip Privacy

Use when payslip or register export is requested.

1. Confirm the actor has export permission and, where required, fresh authentication.
2. Confirm the export purpose is recorded.
3. Use only protected server actions.
4. Confirm salary/person data is redacted unless the actor has permission and audit is recorded.
5. Never paste raw payslip, salary, bank, phone, authority payload, or employee identifiers into support notes.

Stop if:

- Export audit cannot be recorded.
- Fresh-auth requirement fails.
- The export includes salary/person data for an unauthorized actor.

Validation:

- Payslip self-service action tests.
- Payroll register action tests.
- Salary privacy and redaction tests.

## Privacy Incident

Use when salary, employee, payment destination, authority payload, or raw payroll data may have leaked.

1. Treat as SEV1 until scoped.
2. Preserve evidence without copying sensitive values.
3. Open or update an assurance incident using redacted aggregate evidence.
4. Rotate exposed secrets or payment files if applicable.
5. Notify the data protection owner and legal owner before customer messaging.
6. Do not resolve the incident until access logs, audit rows, export logs, and affected workflows are reviewed.

Stop if:

- Triage notes contain raw salary, account, bank, authority payload, phone, or employee identifiers.
- The incident cannot be scoped by tenant.
- Export logs or salary-read audit are unavailable.

Validation:

- Redaction policy tests.
- Workflow assurance incident redaction tests.
- Payroll privacy tests.

## Stale Close Evidence

Use when payroll payment, declaration, correction, register, or posting facts change after close evidence was certified.

1. Open `/dashboard/accounting/close`.
2. Confirm the period and close run.
3. Identify the payroll source that changed.
4. Confirm close evidence became stale or a high/critical payroll finding is visible.
5. Resolve the payroll source issue before recertifying the close pack.
6. Export a new close pack only after payroll findings are resolved or explicitly waived by policy.

Stop if:

- Certified close evidence remains fresh after a close-impacting payroll event.
- A waiver is requested without accountant approval and documented rationale.
- Payroll totals require client-side recalculation to explain the close difference.

Validation:

- Close assurance pack tests.
- Accounting data-trust tests.
- Payroll register tests.
- Prompt 20 workflow assurance registry tests.

## Release Checklist

Before handing payroll operations to production readiness:

- Prompt 19 assurance report exists and passed.
- Prompt 20 workflow assurance checks are registered and tested.
- Runbook sections above were reviewed.
- `npm run policy:gates` passes.
- Typecheck passes.
- No incident payload leaks salary/person/payment destination/authority data.
- Known statutory and declaration adapter limitations remain explicit.
