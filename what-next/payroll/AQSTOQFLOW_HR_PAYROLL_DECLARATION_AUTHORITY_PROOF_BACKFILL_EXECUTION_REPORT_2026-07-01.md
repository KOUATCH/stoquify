# AqStoqFlow HR/Payroll Declaration Authority Proof Backfill Execution Report

Date: 2026-07-01
Scope: HR/Payroll roadmap execution - declaration authority adapter/lifecycle proof hardening
Decision: PASS for this scoped slice. The full HR/payroll production roadmap remains incomplete.

## Selected Skills

- `aqstoqflow-payroll-declaration-compliance`
- `aqstoqflow-payroll-payment-recon`

## Phase / Slice

- Primary phase: Phase 5 - declaration compliance.
- Cross-check phase: Phase 6 - payment reconciliation.
- Implemented slice: append-only execution path for declaration evidence rows missing authority adapter proof or authority lifecycle proof.
- Not implemented in this slice: payment provider proof execution, settlement register proof execution, settlement lifecycle proof execution, and operator mutation-route fresh-auth forwarding.

## Executive Result

Declaration authority adapter/lifecycle proof gaps now have an executable remediation path.

The dry-run planner now treats close-impacting declaration evidence as still missing authority proof unless the declaration has later AMEND evidence with the matching backfill marker:

- `metadata.proofBackfill.coversDeclarationAuthorityAdapterProof = true`
- `metadata.proofBackfill.coversDeclarationAuthorityLifecycleProof = true`

The executor can now prepare one append-only AMEND event per declaration to cover both authority proof families. The certificate still reports separate execution results for:

- `PayrollDeclarationEvidenceAuthorityAdapterProofBackfill`
- `PayrollDeclarationEvidenceAuthorityLifecycleProofBackfill`

This keeps the proof model service-owned while preserving the existing planned-job taxonomy.

## Files Changed

- `services/payroll/payroll-seed-backfill-plan.service.ts`
  - Added authority adapter and lifecycle backfill coverage filters.
  - Updated authority proof gap counts so old rows are only considered remediated when later AMEND coverage evidence exists.

- `services/payroll/payroll-proof-backfill-executor.service.ts`
  - Added executable support for declaration authority adapter/lifecycle proof gaps.
  - Added authority proof preparation grouped by declaration.
  - Appends AMEND evidence through `recordPayrollDeclarationEvidence` instead of mutating historical evidence rows.
  - Preserves actor, fresh-auth, permission, independent approver, signoff, release-gate, and persisted certificate requirements.
  - Keeps payment provider and settlement proof targets unsupported.

- `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
  - Added regression coverage proving two adapter-gap rows and one lifecycle-gap row can be remediated by one AMEND evidence event while producing two certificate result lines.

- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
  - Added regression coverage proving planner queries require AMEND coverage markers for authority adapter and lifecycle proof gaps.

- `what-next/payroll/policy-gates-declaration-authority-backfill-2026-07-01.log`
  - Captured bounded policy-gate output for this slice.

## Execution Guardrails

- Immutability: existing declaration evidence rows are not updated.
- Lifecycle ownership: remediation is appended through the declaration lifecycle service.
- Fresh-auth enforcement: execution blocks without `lastAuthAt`.
- Permission enforcement: execution blocks without exact `payroll.declarations.manage`.
- Segregation of duties: execution blocks without an independent accounting-controller approver.
- Evidence gating: execution requires matching dry-run evidence, signoff bundle, adapter chaos release-gate hash, and persisted certificate intent.
- Redaction: covered evidence identifiers are redacted in AMEND metadata.
- Tenant safety: gap detection and execution are scoped by organization and declaration/run relationships.
- Scope control: payment provider and settlement proof gaps remain unsupported instead of being silently claimed.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts --runInBand`
- `npx jest services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run service:boundary:fail`
- `npm run policy:gates`

The full policy gate suite completed with exit code 0. The captured tail includes passing hard-delete, regulatory-hardcode, demo/report-trust, and raw-error-boundary gates.

## Current Readiness Impact

This closes two declaration-compliance product blockers:

1. Declaration evidence missing authority adapter proof now has a service-owned, append-only remediation path.
2. Declaration evidence missing authority lifecycle proof now has a service-owned, append-only remediation path.

Together with the previous declaration register proof slice, declaration proof backfill is now substantially stronger: source-register proof, authority adapter proof, and authority lifecycle proof can be remediated through audited AMEND evidence rather than in-place metadata edits.

This still does not make HR/payroll fully production-ready. Payment provider/settlement proof execution and write-authorized operator routes remain open.

## Remaining Blockers

1. Payment provider adapter proof backfill remains unsupported.
2. Settlement register proof backfill remains unsupported.
3. Settlement lifecycle proof backfill remains unsupported.
4. Operator mutation routes still need a production-safe fresh-auth execution flow that forwards `executionMutationApproved` and `lastAuthAt` only from an approved action surface.
5. Authenticated browser smoke, accessibility, mobile, dark/light, tenant isolation, concurrency, closed-period, and provider-chaos checks still need to run against the completed operator flows.

## Recommended Next Slice

Build payment provider and settlement proof execution next.

Reason: declaration proof gaps now have append-only remediation coverage. The remaining proof-backfill blockers are concentrated in payment batches: provider adapter proof, settlement register proof, and settlement lifecycle proof. Closing those will let the setup/control-plane readiness model move from declaration-complete to declaration-and-payment proof-complete before operator write routes are exposed.