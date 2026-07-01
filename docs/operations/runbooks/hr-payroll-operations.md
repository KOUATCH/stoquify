# HR/Payroll Operations Runbook

Last updated: 2026-06-29

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
- Payroll run lifecycle workbench: `/dashboard/payroll/runs`
- Setup control plane: `/dashboard/payroll/setup`
- Employee source data: `/dashboard/payroll/employees`
- Payroll payments and employee balance recovery: `/dashboard/payroll/payments`
- Contract lifecycle: `/dashboard/payroll/contracts`
- Declaration evidence workbench: `/dashboard/payroll/declarations`
- Compensation readiness: `/dashboard/payroll/compensation`
- Payment and attendance readiness: `/dashboard/payroll/attendance`
- Payslip self-service: `/dashboard/payroll/payslips`
- Payroll register: `/dashboard/payroll/register`
- Assurance control tower: `/dashboard/assurance/control-tower`
- Close center: `/dashboard/accounting/close`

## Workflow Assurance Checks

Prompt 20 adds these payroll operational signals to the existing Workflow Assurance registry:

- `payroll.released_payment_evidence.required`: released payroll payments must retain approved run, allocation, payment, and hash evidence.
- `payroll.payment_reconciliation_exception.visible`: failed, exception, or unreconciled payroll payment batches must be visible and routed.
- `payroll.provider_inbox_worker_sla.visible`: provider inbox rows must be leased, retried, completed, or dead-lettered visibly within SLA.
- `payroll.declaration_lifecycle_exception.visible`: rejected, overdue, or manual-authority payroll declaration states must be visible before close.
- `payroll.close_evidence.stale.visible`: certified close packs must not hide unresolved high or critical payroll findings.

All checks run in observe mode and route to existing implemented pages only.

## Policy Gate Evidence Inputs

Use these existing evidence inputs before escalating an operational payroll incident:

- Runtime immutability: run `npm run payroll:immutability:runtime` and attach `what-next/payroll/payroll-immutability-runtime-check.md`.
- Setup readiness and dry run: review `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_06_SETUP_READINESS_DRY_RUN_REPORT_2026-06-26.md` and run `node scripts/payroll-seed-backfill-dry-run.js --dry-run true` for the target tenant parameters when live setup evidence is needed.
- Route smoke: use `__tests__/payroll-dashboard-routes.smoke.test.tsx` for implemented route coverage only.
- Browser smoke: `npm run ui:smoke:payroll` requires a running local server and `playwright/.auth/payroll.json`; if either is missing, record an environment skip and rely on route-smoke/static route-list evidence until browser auth is provisioned.
- Release evidence: review `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_ASSURANCE_RELEASE_GATES_REPORT_2026-06-27.md` and `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CLOSE_DATA_TRUST_REPORT_2026-06-27.md` after release-impacting repairs.
- Release policy: use `npm run policy:gates` for release-impacting repairs.

Do not paste dry-run output that contains tenant-specific identifiers into broad channels. Keep incident summaries to aggregate, redacted evidence only.

## Payroll Cycle Operation

Use when a payroll cycle is blocked, unclear, or ready for review.

1. Open `/dashboard/payroll/runs`.
2. Review run lifecycle blockers from the service-owned run workbench.
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
5. Route setup blockers to `/dashboard/payroll/setup`, `/dashboard/payroll`, or `/dashboard/accounting/close`; do not create additional setup-only dashboard routes.

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

## Register Proof And Data-Trust Incidents

Use when declaration lifecycle evidence, payment settlement evidence, close evidence, or accountant data-trust blockers report missing payroll register proof.

1. Open `/dashboard/payroll/register` and confirm the server-owned register hash for the affected payroll run.
2. For declaration evidence, confirm `sourceRegisterHash` is present on the append-only declaration evidence record.
3. For payment settlement evidence, confirm `metadata.latestSettlementSourceRegisterHash` is present on the payroll payment batch metadata.
4. In accountant data-trust, triage `payroll-declaration-register-proof-missing` and `payroll-payment-settlement-register-proof-missing` as release-blocking high-severity findings.
5. Do not calculate or reconstruct the register hash in the browser or incident notes. Use only the service-owned register proof and redacted evidence links.

Stop if:

- The register proof is missing from finalized declaration or settlement evidence.
- The proposed fix would mutate finalized payroll evidence in place.
- The incident cannot be explained without exposing salary, bank, authority payload, phone, email, or employee identifiers.

Validation:

- Accounting data-trust tests.
- Payroll register tests.
- Declaration lifecycle tests.
- Payment reconciliation tests.

## Payment Failure Or Reconciliation Exception

Use when a payroll payment batch fails, has provider exceptions, or cannot reconcile.

1. Open `/dashboard/payroll/payments`.
2. Confirm the batch status through service-owned payment reconciliation data.
3. Check approved destination evidence before any retry or release decision.
4. Confirm provider, statement, payment transaction, ledger, and source register proof evidence exists.
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

1. Open `/dashboard/payroll/declarations`.
2. Confirm declaration status and evidence through the payroll declaration lifecycle service.
3. Attach manual authority evidence using immutable evidence records and include the source payroll register hash.
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

## Adapter Certification Harness

Use before enabling any payroll authority adapter or payment provider adapter beyond manual or controlled pilot mode.

1. Generate an authority or provider certification harness certificate through the service-owned harness.
2. Confirm the harness certificate includes proof hashes for reviewed payload mapping, response mapping, rejection/reversal or amendment mapping, credential proof, credential rotation, least-privilege scope, idempotent replay, duplicate response handling, outage handling, retry policy, dead-letter triage, audit trail, redaction, and close-impact rules.
3. Pass only the resulting `authorityCertificationHarnessHash`, `certificationHarnessHash`, or `providerCertificationHarnessHash` into declaration or payment metadata. Never paste raw credentials, salary/person data, authority payloads, or provider payloads into metadata, logs, reports, screenshots, or incidents.
4. Confirm `SUPPORTED_CERTIFIED` registry decisions remain blocked when the harness certificate hash is absent.
5. For dead-lettered authority executions, keep the declaration lifecycle unchanged until the adapter issue is triaged and a corrected, idempotent replay or manual evidence path is approved.
6. For provider outages or duplicate settlement responses, use the payment reconciliation exception workflow and attach only hashed provider/statement evidence.

Stop if:

- The harness certificate hash is missing or was not produced by reviewed service-owned evidence.
- Any required mapping, credential, replay, outage, dead-letter, redaction, audit, legal, or close-impact proof is missing.
- The only available evidence is a raw payload, screenshot with employee details, provider secret, or unreviewed operator note.
- The adapter would move money or claim legal filing success without provider/authority receipt evidence.

Validation:

- `services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts`
- `services/payroll/__tests__/payroll-adapter-registry.service.test.ts`
- `services/payroll/__tests__/authority-adapter-worker.service.test.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`

## Adapter Operations Command Triage

Use when the payroll command center shows provider, authority adapter, or certification harness blockers.

1. Open the payroll command center and inspect the Adapter operations panel, readiness badge, provider health cards, authority execution rows, payment adapter gap rows, and proof drawer.
2. For provider blockers, confirm the provider account is active, statement evidence is fresh, callbacks are not lagging, inbox rows are not failed, retry-due, stale-processing, or dead-lettered, no replay/tamper events are open, and the latest reconciliation run guard/dedupe key does not show an in-progress or unresolved same-provider/business-date run.
3. For authority blockers, inspect the queued execution status, retry schedule, dead-letter status, attempts, redacted error code, adapter proof hash, and `authorityCertificationHarnessHash`.
4. For payment adapter gaps, inspect `providerCertificationHarnessHash`, payment adapter proof hash, provider contract hash, reconciliation status, and linked payment exception id.
5. Use the payment reconciliation inbox worker for service-owned lease, retry, completion, and dead-letter transitions; keep `PROCESSING + nextAttemptAt` as the lease marker, require `leasedBy + leaseToken` ownership before completion/failure, and record only stable error codes.
6. Escalate dead-letter, stale-processing lease, replay, tamper, duplicate response, or missing harness proof as release-blocking until corrected replay or manual evidence is approved.
7. Keep all incident notes hash-only: provider payload hashes, statement file hashes, adapter proof hashes, and certificate hashes are acceptable; raw provider payloads, credentials, employee identities, salary lines, and payment destinations are not.

Stop if:

- The command signal requires raw provider or authority payloads to explain the issue.
- A provider account has stale statements, callback lag, failed or retry-due inbox rows, stale processing leases, dead-letter inbox rows, or replay/tamper evidence.
- A same-provider/business-date reconciliation guard reports a duplicate, in-progress, blocked, failed, or needs-review run.
- An authority execution is dead-lettered or missing `authorityCertificationHarnessHash`.
- A payment batch claims certified provider automation without `providerCertificationHarnessHash`.

Validation:

- `services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts`
- `services/payroll/__tests__/adapter-operations-read-model.service.test.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `services/assurance/__tests__/assurance-registry.service.test.ts`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts`
- `services/payments/__tests__/provider-event.service.test.ts`
- `npm run policy:gates`

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

1. Confirm the actor has export permission and, where required, verified fresh authentication with `claims.lastAuthAt` evidence.
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
4. Confirm close evidence became stale or a high/critical payroll finding is visible, including register-proof blockers from data-trust when applicable.
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

- Prompt 19 assurance report exists and passed, including static browser-smoke route-list evidence.
- Prompt 20 workflow assurance checks are registered and tested.
- Runbook sections above were reviewed.
- `npm run policy:gates` passes.
- Typecheck passes.
- Browser smoke is either executed with a running server and payroll auth state or explicitly recorded as an environment skip.
- Declaration and payment settlement evidence carry source payroll register proof where required.
- Authority and payment automation claims have adapter certification harness certificate hashes, or remain blocked/manual.
- No incident payload leaks salary/person/payment destination/authority data.
- Known statutory and declaration adapter limitations remain explicit.
