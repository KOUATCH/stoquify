# AqStoqFlow HR/Payroll Wave 1 Adapter Chaos Readiness Surfacing Report

Date: 2026-06-30
Scope: Surface certified adapter chaos release-gate proof in payroll adapter operations, command readiness, operator proof drawers, and release blockers.
Status: PASS for this slice. Full HR/payroll production readiness remains incomplete until the broader roadmap blockers and pilot cycle are closed.

## Skills Applied

- aqstoqflow-payroll-assurance-chaos: release gate, chaos evidence, no duplicate evidence, rollback/no-write expectations.
- aqstoqflow-payroll-command-center: tenant-safe, role-redacted, service-backed read model and proof drawer surfacing.

## What Changed

- Added adapter chaos release-gate aggregate evidence to the adapter operations read model.
- Required authority automation claims and provider payment automation claims to carry adapterChaosReleaseGateHash proof.
- Added missing-proof blockers:
  - AUTHORITY_CHAOS_GATE_PROOF_MISSING
  - PROVIDER_CHAOS_GATE_PROOF_MISSING
  - PAYROLL_ADAPTER_CHAOS_GATE_MISSING
- Propagated chaos-gate blocker counts into payroll command readiness and next-action blocking.
- Added a compact command-center chaos gate card, metric, row-level chaos hashes, and proof drawer rows.
- Updated focused service and component tests to prove blocked and proof-backed states.

## Files Touched

- services/payroll/adapter-operations-read-model.service.ts
- services/payroll/command-read-model.service.ts
- components/payroll/PayrollCommandCenter.tsx
- services/payroll/__tests__/adapter-operations-read-model.service.test.ts
- services/payroll/__tests__/payroll-command-read-model.service.test.ts
- services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts
- components/payroll/__tests__/PayrollCommandCenter.test.tsx
- services/payroll/payroll-adapter-chaos-release-gate.service.ts

## Verification

- npm test -- --runTestsByPath services/payroll/__tests__/adapter-operations-read-model.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts --runInBand
  - PASS: 4 suites, 11 tests.
- npm run typecheck
  - PASS.
- npm run lint
  - PASS with 4 existing unrelated warnings about img usage and anonymous default export.
- npm run policy:gates
  - PASS. Inventory boundary, service boundary, workflow assurance, payroll immutability, hard delete, regulatory hardcode, demo trust, and raw error boundary gates all passed.
- git diff --check -- touched tracked files
  - PASS. Git reported line-ending normalization warnings only.

## Release Impact

Adapter automation can no longer appear ready only because certification harness evidence exists. Payroll command readiness now also requires certified adapter chaos release-gate proof for production authority filing and provider payment automation claims.

## Remaining Work

- Keep this as one release-gate surface, not the whole HR/payroll system.
- Next recommended slice: persist and review real chaos-gate proof hashes from adapter execution workflows so production tenant pilot evidence can clear PAYROLL_ADAPTER_CHAOS_GATE_MISSING without manual fixture assumptions.
