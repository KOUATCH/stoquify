# AqStoqFlow HR/Payroll Phase 6 Setup Evidence Control Plane Report - 2026-06-28

## Scope

Skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`

Roadmap lane: production migration/backfill, setup/admin readiness, and operator proof visibility.

This slice exposes proof-backfill execution and reconciliation evidence in the payroll setup control plane through a service-owned, audit-backed read model. The UI now renders current proof-gap dry-run state and persisted proof certificate state without computing payroll truth in React and without querying Prisma from the route or component.

This does not enable production backfill mutation, payroll evidence mutation, statutory filing automation, payment automation, or close certification.

## Source Context

Inspected:

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-06-seed-backfill-setup\SKILL.md`.
- `app/[locale]/(dashboard)/dashboard/payroll/setup/page.tsx`.
- `components/payroll/PayrollSetupControlPlane.tsx`.
- `actions/payroll/payroll-setup.actions.ts`.
- `services/payroll/payroll-proof-backfill-executor.service.ts`.
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`.
- `services/payroll/payroll-seed-backfill-plan.service.ts`.
- Existing payroll route smoke and setup action tests.

Source prerequisite gap:

- The skill's source prompt suite path `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md` is still not present in this worktree. This slice used current code, the user-approved roadmap direction, and prior Phase 6 artifacts as controlling evidence.

## Implemented Design

Added service-owned read model:

- `services/payroll/payroll-setup-evidence.service.ts`
- `getPayrollSetupEvidenceReadModel`

The read model:

- reads tenant-scoped `AuditLog` rows for `PayrollProofBackfillExecutionCertificate` and `PayrollProofBackfillReconciliationCertificate`;
- summarizes latest execution and reconciliation certificates;
- exposes redacted audit refs instead of raw audit log ids;
- exposes certificate hash, dry-run hash, ledger hash, status, signoff count, mutation flags, proof-gap counts, data-trust proof gate status, and blocker ids;
- reports setup evidence status as `NO_EVIDENCE`, `EXECUTION_SIGNOFF_REQUIRED`, `AWAITING_RECONCILIATION_CERTIFICATE`, `READY_FOR_CLOSE_RECHECK`, `PROOF_GAPS_REMAIN`, `BLOCKED_BY_SETUP`, or `BLOCKED_BY_SOURCE_CERTIFICATE`;
- redacts raw person data, salary data, payment destination data, provider payloads, and raw audit ids.

Added protected action:

- `getPayrollSetupEvidenceReadModelAction`
- Permission: `payroll.runs.calculate`
- Module surface: `payroll.setup.evidence`
- Tenant guard: handler-derived
- Audit mode: read-only/no mutation audit row

Updated setup route:

- `/dashboard/payroll/setup` now loads readiness, dry-run plan, and evidence read model in parallel.
- Client-supplied tenant/actor values remain ignored by the protected action layer.

Updated setup UI:

- Adds a `Historical proof backfill` section with current dry-run proof-gap counts, evidence ref, signoff list, correction strategy, and reconciliation checks.
- Adds a `Proof certificate trail` section with latest execution/reconciliation status, hashes, mutation flags, data-trust blocker ids, empty state, and error state.
- Keeps all proof data service-supplied and redacted.

## Files Changed

- `services/payroll/payroll-setup-evidence.service.ts`
- `services/payroll/__tests__/payroll-setup-evidence.service.test.ts`
- `actions/payroll/payroll-setup.actions.ts`
- `actions/payroll/__tests__/payroll-setup.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/setup/page.tsx`
- `components/payroll/PayrollSetupControlPlane.tsx`
- `components/payroll/__tests__/PayrollSetupControlPlane.test.tsx`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by policy gate
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by policy gate

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-setup-evidence.service.test.ts actions/payroll/__tests__/payroll-setup.actions.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
```

Result: 4 suites passed, 18 tests passed.

```powershell
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-setup.actions.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts services/payroll/__tests__/payroll-setup-evidence.service.test.ts components/payroll/__tests__/PayrollSetupControlPlane.test.tsx __tests__/payroll-dashboard-routes.smoke.test.tsx --runInBand
```

Result: 8 suites passed, 36 tests passed.

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
npm run policy:gates
```

Result: passed. Included inventory boundary, service boundary, workflow assurance runtime check, payroll immutability runtime check, hard-delete gate, regulatory hardcode gate, demo trust gate, and raw error boundary gate.

## Test Evidence Added

- Empty setup evidence returns `NO_EVIDENCE` with redaction flags.
- Execution and reconciliation certificate summaries do not leak raw audit ids, tenant ids, or actor ids.
- Signoff-required execution evidence blocks the read-model status before reconciliation exists.
- Reconciliation evidence with remaining proof gaps keeps data-trust blocker ids visible.
- Protected setup evidence action derives tenant/actor context server-side and enforces module surface `payroll.setup.evidence`.
- Setup control plane renders proof-gap dry-run facts, certificate trail, empty state, error state, and redaction facts.
- Payroll setup route smoke covers the new setup evidence action.

## Remaining Limits

This slice improves operator visibility but does not close the full HR/payroll roadmap. Remaining production blockers include:

- approved append-only production backfill execution;
- tenant-by-tenant migration signoff and rollback/correction strategy;
- statutory country-pack breadth and payroll engine hardening;
- real authority/payment adapter mappings and credentials;
- pilot payroll cycle reconciliation;
- full browser accessibility/mobile/dark/light proof for the setup evidence surface.

## Handoff

Next recommended slice: implement the approved append-only production backfill execution mechanism behind an explicit disabled-by-default release flag and tenant signoff bundle, or move to payroll setup UI browser validation if execution remains intentionally blocked.