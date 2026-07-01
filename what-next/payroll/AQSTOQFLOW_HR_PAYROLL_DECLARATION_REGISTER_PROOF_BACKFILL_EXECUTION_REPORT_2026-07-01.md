# AqStoqFlow HR/Payroll Declaration Register Proof Backfill Execution Report

Date: 2026-07-01
Scope: HR/Payroll roadmap execution - declaration compliance and proof-backfill hardening
Decision: PASS for this scoped slice. The full HR/payroll production roadmap remains incomplete.

## Selected Skills

- `aqstoqflow-payroll-declaration-compliance`
- `aqstoqflow-payroll-payment-recon`

## Phase / Slice

- Primary phase: Phase 5 - declaration compliance.
- Cross-check phase: Phase 6 - payment reconciliation.
- Implemented slice: append-only execution path for declaration evidence rows missing source-register proof.
- Not implemented in this slice: authority adapter proof execution, authority lifecycle proof execution, payment provider proof execution, settlement register proof execution, and settlement lifecycle proof execution.

## Executive Result

The payroll proof-backfill executor can now close the declaration source-register proof gap through the declaration lifecycle service instead of mutating old evidence rows in place.

The dry-run planner now treats a declaration source-register proof gap as closed only when the declaration has AMEND evidence with `metadata.proofBackfill.coversDeclarationRegisterProof = true` and a non-null `sourceRegisterHash`.

This preserves the evidence spine:

1. Historical declaration evidence remains immutable.
2. Backfill remediation is represented as a new AMEND evidence event.
3. The AMEND event carries source-register proof, approval proof, release-gate proof, redacted covered evidence identifiers, and execution certificate linkage.
4. Setup/control-plane readiness can distinguish unresolved proof gaps from append-only remediated proof gaps.

## Files Changed

- `services/payroll/payroll-seed-backfill-plan.service.ts`
  - Added reusable filters for declaration source-register proof backfill coverage.
  - Updated the declaration source-register gap count to ignore evidence rows only when their declaration already has AMEND backfill coverage.

- `services/payroll/payroll-proof-backfill-executor.service.ts`
  - Added a supported execution target for `declarationEvidenceMissingSourceRegisterHash`.
  - Added declaration backfill preparation, preflight blockers, independent approval checks, and append-only execution through `recordPayrollDeclarationEvidence`.
  - Required actor identity, fresh authentication, exact `payroll.declarations.manage` permission, independent accounting-controller approval, signoff bundle, adapter chaos release-gate hash, and persisted execution certificate before mutation.
  - Kept all other declaration/payment proof gaps unsupported until their service-owned lifecycle paths are implemented.

- `services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts`
  - Added lifecycle-service mocking for declaration AMEND evidence.
  - Added regression coverage for successful declaration register proof backfill execution and certificate emission.

- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
  - Added regression coverage proving the planner recognizes AMEND backfill coverage rather than in-place evidence mutation.

- `what-next/payroll/policy-gates-declaration-register-backfill-2026-07-01.log`
  - Captured bounded policy-gate output for this slice.

## Execution Guardrails

- Immutability: existing declaration evidence rows are not updated to add missing proof.
- Lifecycle ownership: remediation is appended through `recordPayrollDeclarationEvidence` using the declaration lifecycle contract.
- Authorization: execution blocks without actor identity, fresh auth, and `payroll.declarations.manage`.
- Segregation of duties: execution blocks unless the accounting-controller signoff is from an independent approver.
- Evidence gating: execution requires signoff bundle hashes, dry-run evidence hash, adapter chaos release-gate hash, and persisted certificate intent.
- Redaction: covered evidence identifiers are redacted in persisted AMEND metadata.
- Tenant safety: execution remains scoped by organization and payroll declaration/run relationships.
- Unsupported targets stay blocked: authority-adapter, authority-lifecycle, provider-payment, settlement-register, and settlement-lifecycle backfills are not silently claimed as executable.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts --runInBand`
- `npx jest services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run service:boundary:fail`
- `npm run policy:gates`

The full policy gate suite completed with exit code 0. The captured tail includes passing hard-delete, regulatory-hardcode, demo/report-trust, and raw-error-boundary gates. The full run also executed the project policy-gate chain before returning success.

## Current Readiness Impact

This closes one concrete production-readiness gap: declaration evidence missing source-register proof now has an executable, audited, append-only remediation path.

It does not make HR/payroll fully production-ready. It moves the system closer to controlled production hardening by converting one former dry-run-only blocker into a service-owned execution path with proof, authorization, and certificate controls.

## Remaining Blockers

1. Authority adapter proof backfill remains unsupported.
2. Authority lifecycle proof backfill remains unsupported.
3. Payment provider adapter proof backfill remains unsupported.
4. Settlement register proof backfill remains unsupported.
5. Settlement lifecycle proof backfill remains unsupported.
6. Operator mutation routes still need a production-safe fresh-auth execution flow that forwards `executionMutationApproved` and `lastAuthAt` only from an approved action surface.
7. Authenticated browser smoke, accessibility, mobile, dark/light, tenant isolation, concurrency, closed-period, and provider-chaos checks still need to run against the completed operator flows.

## Recommended Next Slice

Build the authority declaration adapter/lifecycle proof execution path next.

Reason: declaration register proof now has an append-only remediation model. The next deepest declaration blocker is proving that outbound authority payloads, responses, rejections, amendments, receipts, credentials, retries, and idempotency are represented by service-owned evidence rather than UI claims or dry-run-only reports.

After that, move to payment provider and settlement proof execution, then expose the write-authorized operator route once the service truth is complete.
