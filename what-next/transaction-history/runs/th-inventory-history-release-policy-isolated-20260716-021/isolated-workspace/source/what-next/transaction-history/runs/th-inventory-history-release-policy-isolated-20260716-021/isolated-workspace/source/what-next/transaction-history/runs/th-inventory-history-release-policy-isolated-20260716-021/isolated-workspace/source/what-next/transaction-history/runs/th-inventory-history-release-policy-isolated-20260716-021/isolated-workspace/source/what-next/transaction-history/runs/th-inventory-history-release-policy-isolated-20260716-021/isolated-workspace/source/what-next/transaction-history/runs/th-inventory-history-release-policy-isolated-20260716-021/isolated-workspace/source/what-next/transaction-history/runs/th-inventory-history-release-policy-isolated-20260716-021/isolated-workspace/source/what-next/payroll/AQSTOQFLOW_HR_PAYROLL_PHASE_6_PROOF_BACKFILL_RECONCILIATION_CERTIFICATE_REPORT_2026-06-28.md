# AqStoqFlow HR/Payroll Phase 6 Proof Backfill Reconciliation Certificate Report - 2026-06-28

## Scope

Skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`

Roadmap lane: production migration/backfill and release evidence.

This slice adds a post-backfill reconciliation certificate runner for the proof-backfill chain. It consumes a previously persisted payroll proof-backfill execution certificate from `AuditLog`, validates the source certificate, reruns the tenant proof-gap dry-run, maps any remaining proof gaps to data-trust blocker ids, and can persist a redacted reconciliation certificate as audit evidence.

This does not enable production backfill mutation, statutory filing automation, payment automation, or close certification by itself.

## Source Context

Inspected:

- User-provided full HR/payroll production roadmap prompt attachment.
- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-06-seed-backfill-setup\SKILL.md`.
- `services/payroll/payroll-proof-backfill-executor.service.ts`.
- `services/payroll/payroll-seed-backfill-plan.service.ts`.
- `actions/payroll/payroll-setup.actions.ts`.
- `services/accounting/data-trust.service.ts` payroll proof blocker ids.
- Current proof-backfill executor/action tests.

Source prerequisite gap:

- The skill's source prompt suite path `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md` is still not present in this worktree. This slice used the available roadmap prompt, prior Phase 6 reports, current readiness artifacts, and live code as the controlling evidence.

## Implemented Design

Added service-owned runner:

- `reconcilePayrollProofBackfillCertificate`
- `formatPayrollProofBackfillReconciliationCertificate`

Added protected action:

- `reconcilePayrollProofBackfillCertificateAction`

The runner now:

- requires a persisted source execution-certificate audit id or ledger key before tenant scans;
- loads only tenant-scoped `AuditLog` rows for `PayrollProofBackfillExecutionCertificate` and action `PAYROLL_PROOF_BACKFILL_EXECUTION_CERTIFICATE_RECORDED`;
- validates source certificate kind, source certificate hash, dry-run evidence hash, ledger key, dry-run approval match, approval bundle hash, complete signoff state, execution disabled flag, and mutationAttempted false flag;
- reruns `generatePayrollSeedBackfillDryRunPlan` in dry-run mode for the current tenant state;
- reports `READY_FOR_CLOSE_RECHECK` only when the source certificate validates, current proof gaps are zero, and setup/backfill status is ready;
- reports `PROOF_GAPS_REMAIN`, `BLOCKED_BY_SETUP`, or `BLOCKED_BY_SOURCE_CERTIFICATE` when evidence is not strong enough;
- maps remaining proof-gap counts to data-trust blocker ids:
  - `payroll-declaration-register-proof-missing`
  - `payroll-declaration-authority-adapter-proof-missing`
  - `payroll-declaration-authority-lifecycle-proof-missing`
  - `payroll-payment-provider-adapter-proof-missing`
  - `payroll-payment-settlement-register-proof-missing`
  - `payroll-payment-settlement-lifecycle-proof-missing`
- includes release gate requirements for payroll immutability runtime and accounting data-trust focused tests;
- optionally writes a redacted `PayrollProofBackfillReconciliationCertificate` audit row.

## Controls Preserved

- No mutation of payroll declaration evidence, payment batches, payroll registers, payslips, or close evidence.
- Server action derives tenant and actor from RBAC context; client-supplied `organizationId` and `actorId` are ignored.
- Module entitlement is enforced through `payroll.setup.proof_backfill_reconciliation`.
- Audit JSON contains redacted refs, hashes, statuses, counts, and blocker ids only.
- Raw employee identity, salary data, payment destination hashes, provider payloads, and raw audit ids are excluded from certificate payloads.
- Source certificate mismatch does not certify or persist reconciliation evidence.

## Files Changed

- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts`
- `actions/payroll/payroll-setup.actions.ts`
- `actions/payroll/__tests__/payroll-setup.actions.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by policy gate
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by policy gate

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts actions/payroll/__tests__/payroll-setup.actions.test.ts --runInBand
```

Result: 3 suites passed, 15 tests passed.

```powershell
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-setup.actions.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand
```

Result: 5 suites passed, 24 tests passed.

```powershell
npm run typecheck
```

Result: passed.

```powershell
npm run service:boundary:fail
```

Result: passed. Active service-boundary violations: 0.

```powershell
npm run regulatory:hardcode:fail
```

Result: passed. Active findings: 0.

```powershell
npm run prisma:validate
```

Result: passed. Prisma schema is valid.

```powershell
npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts --runInBand
```

Result: 1 suite passed, 10 tests passed.

```powershell
npm run policy:gates
```

Result: passed. Included inventory boundary, service boundary, workflow assurance runtime check, payroll immutability runtime check, hard-delete gate, regulatory hardcode gate, demo trust gate, and raw error boundary gate.

## Test Evidence Added

- Reconciliation requires a persisted source execution certificate selector before tenant scans.
- Missing source certificate is blocked without scanning payroll history.
- Clean current proof-gap scan produces `READY_FOR_CLOSE_RECHECK` and can persist a redacted reconciliation certificate.
- Source certificate hash mismatch produces `BLOCKED_BY_SOURCE_CERTIFICATE` and does not persist reconciliation evidence.
- Remaining proof gaps produce `PROOF_GAPS_REMAIN` and data-trust blocker ids.
- Protected action derives tenant/actor context and parses source certificate selectors and persistence flag.
- RBAC denial does not call setup, execution, or reconciliation services.

## Remaining Limits

This is not a full production backfill executor. It proves the reconciliation contract around an already persisted execution certificate and current proof-gap state.

Still required before unrestricted HR/payroll rollout:

- approved production mutation plan with explicit correction event strategy;
- real tenant-by-tenant dry run and signoff workflow;
- actual execution mechanism for approved metadata/correction backfill, still append-only and idempotent;
- full post-execution close assurance/data-trust certification in the accounting flow;
- country-pack breadth and payroll engine hardening;
- operator UI exposure with denied/loading/error/empty states only after service read models are stable.

## Handoff

Next recommended slice: expose the payroll setup control-plane read model for proof-backfill execution and reconciliation certificates, then wire the existing setup route to render source certificate state, current proof-gap state, denied states, and redacted audit evidence without creating payroll truth in the UI.