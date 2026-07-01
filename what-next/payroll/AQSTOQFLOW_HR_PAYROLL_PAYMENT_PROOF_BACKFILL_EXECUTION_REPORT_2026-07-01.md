# AqStoqFlow HR/Payroll Payment Proof Backfill Execution Report

Date: 2026-07-01
Scope: HR/Payroll roadmap execution - payment provider, settlement register, and settlement lifecycle proof hardening
Decision: PASS for this scoped slice. The full HR/payroll production roadmap remains incomplete.

## Selected Skills

- `aqstoqflow-payroll-declaration-compliance`
- `aqstoqflow-payroll-payment-recon`

## Phase / Slice

- Primary phase: Phase 6 - payment reconciliation.
- Supporting phase: Phase 5 - declaration compliance, already hardened in prior slices.
- Implemented slice: service-owned metadata-only payment proof backfill execution for payment batches missing provider adapter proof, settlement register proof, or settlement lifecycle proof.
- Not implemented in this slice: operator mutation-route fresh-auth forwarding, browser smoke, provider chaos scenario expansion, and end-to-end pilot payroll reconciliation.

## Executive Result

Payment proof-backfill gaps now have a signed execution path in the payroll proof-backfill executor.

The dry-run planner now treats payment batches as still missing proof unless their own metadata carries the matching backfill marker:

- `metadata.proofBackfill.coversPaymentProviderAdapterProof = true`
- `metadata.proofBackfill.coversPaymentSettlementRegisterProof = true`
- `metadata.proofBackfill.coversPaymentSettlementLifecycleProof = true`

The executor can now prepare one metadata-only correction per payment batch and report separate certificate result lines for:

- `PayrollPaymentBatchProviderAdapterProofBackfill`
- `PayrollPaymentSettlementRegisterProofBackfill`
- `PayrollPaymentSettlementLifecycleProofBackfill`

This follows the existing payment-batch evidence model: payment release and settlement evidence are represented on the service-owned payment batch metadata, with certificate linkage and previous-proof breadcrumbs.

## Files Changed

- `services/payroll/payroll-seed-backfill-plan.service.ts`
  - Added payment provider, settlement register, and settlement lifecycle coverage filters.
  - Updated payment proof gap counts so batches only stop blocking after matching proofBackfill markers exist.

- `services/payroll/payroll-proof-backfill-executor.service.ts`
  - Added executable payment proof backfill targets.
  - Added payment batch preparation grouped by batch.
  - Derived provider adapter proof through the payment adapter registry contract.
  - Derived settlement lifecycle proof through the settlement lifecycle contract helper.
  - Updated payment batch metadata only, preserving previous proof hashes and linking the correction to dry-run evidence, signoff, release gate, and idempotency ledger.
  - Required actor identity, fresh auth, exact `payroll.payments.reconcile`, independent accounting-controller approval, signoff bundle, adapter chaos release-gate hash, and persisted certificate intent before mutation.

- `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
  - Added regression coverage proving one settled payment batch missing all three proof families is corrected once while producing three certificate result lines.

- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
  - Added regression coverage proving payment proof gap queries honor the matching proofBackfill coverage markers.

- `what-next/payroll/policy-gates-payment-proof-backfill-2026-07-01.log`
  - Captured bounded policy-gate output for this slice.

## Execution Guardrails

- Service ownership: payment proof remediation lives inside the payroll proof-backfill executor and updates payment batch metadata through the service layer.
- Metadata-only correction: no payment transaction, settlement, ledger, or employee payment destination is mutated by this backfill path.
- Fresh-auth enforcement: execution blocks without `lastAuthAt`.
- Permission enforcement: execution blocks without exact `payroll.payments.reconcile`.
- Segregation of duties: execution blocks without an independent accounting-controller approver.
- Evidence gating: execution requires matching dry-run evidence, signoff bundle, adapter chaos release-gate hash, and persisted certificate intent.
- Register proof: settlement register backfill blocks if no source register hash can be derived from settlement metadata, batch evidence, or payroll run evidence.
- Provider proof: provider adapter proof is derived from the reviewed adapter registry contract and refuses file-backed disbursement proof when the batch lacks the required file hash.
- Tenant safety: gap detection and execution are scoped by organization and batch/run relationships.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts --runInBand`
- `npx jest services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run service:boundary:fail`
- `npm run policy:gates`

The full policy gate suite completed with exit code 0. The captured tail includes passing hard-delete, regulatory-hardcode, demo/report-trust, and raw-error-boundary gates.

## Current Readiness Impact

This closes the remaining payment proof-backfill product blockers in the setup/control-plane proof model:

1. Payment provider adapter proof backfill is now executable.
2. Payment settlement register proof backfill is now executable.
3. Payment settlement lifecycle proof backfill is now executable.

Together with the declaration register and declaration authority proof slices, the proof-backfill executor now covers the previously unsupported payroll run, declaration, and payment proof families that blocked setup readiness.

This still does not make HR/payroll fully production-ready. The next blockers move from proof-backfill mechanics to write-authorized operator workflows, authenticated browser smoke, tenant isolation, provider chaos, closed-period behavior, and pilot-cycle reconciliation.

## Remaining Blockers

1. Operator routes must forward fresh-auth execution inputs from approved write surfaces only.
2. Browser smoke must cover `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, `/dashboard/payroll/declarations`, and setup/control-plane proof execution states.
3. Tenant isolation and denied-state tests must prove payroll proof data cannot leak across tenants.
4. Closed-period and double-submit/concurrency tests must prove proof execution cannot corrupt certified periods or duplicate corrections.
5. Provider chaos and adapter failure tests must cover payment proof correction and settlement-readiness reporting.
6. One controlled pilot payroll cycle still needs to reconcile cleanly with accounting/security/operations signoff.

## Recommended Next Slice

Build the operator execution route/action hardening next.

Reason: the service truth now supports payroll run, declaration, and payment proof-backfill execution. The next production claim should be that operators can execute these flows only through fresh-auth, proof-backed, redacted, denied-state-safe routes and that browser smoke proves the surfaces are real.