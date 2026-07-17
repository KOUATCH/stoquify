# AqStoqFlow HR/Payroll Wave 1 Adapter Operations Worker State Report - 2026-06-30

## Decision

Status: implemented and evidence-gated for the current roadmap slice.

This slice exposes provider inbox settlement worker state through the existing adapter operations read model and command center proof surfaces. It does not introduce a separate payroll truth source, does not expose raw provider payloads, and does not claim filing/payment automation beyond the evidence-backed adapter surfaces already present.

## Scope Completed

- Added redacted provider settlement worker state to provider health cards:
  - leased, retry scheduled, dead-lettered, completed, and unknown worker counts.
  - latest worker action, action source, action timestamp, next retry, and safe error code.
  - hashed evidence refs with inbox item id, source, status, payload hash, external id, correlation id, action, retry time, and redaction policy.
- Kept active/problem inbox rows separate from recent processed rows so completed evidence does not crowd out blocker detection.
- Extended adapter incident digest with worker action proof while continuing to omit raw payloadSummary, worker actor ids, provider payloads, salary, identity, credentials, and secrets.
- Extended the Payroll Command Center adapter proof drawer with settlement worker counters and per-provider worker evidence hashes.
- Extended the provider health panel with compact worker state rows for operators.
- Updated focused read-model and command-center tests to prove redaction and worker-state rendering.

## Files Changed

- services/payroll/adapter-operations-read-model.service.ts
- services/payroll/__tests__/adapter-operations-read-model.service.test.ts
- components/payroll/PayrollCommandCenter.tsx
- components/payroll/__tests__/PayrollCommandCenter.test.tsx
- services/payroll/__tests__/payroll-command-read-model.service.test.ts

## Verification

- npm test -- --runTestsByPath services/payroll/__tests__/adapter-operations-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx services/payroll/__tests__/payroll-command-read-model.service.test.ts services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts --runInBand
  - Result: passed, 4 suites, 14 tests.
- npm run typecheck
  - Result: passed.
- npm run lint
  - Result: passed with 4 unrelated existing warnings in image/default-export surfaces.
- npm run policy:gates
  - Result: passed.
  - Covered inventory boundary, service boundary, workflow assurance runtime tables, payroll immutability runtime, hard-delete gate, regulatory hardcode gate, demo trust gate, and raw error boundary gate.
- git diff --check
  - Result: passed; output only line-ending normalization warnings already present across the dirty worktree.

## Remaining Production Notes

- This closes the operator visibility gap for provider inbox settlement worker state.
- It does not replace the remaining full-production blockers around broader statutory country-pack breadth, live authority/provider credentials, tenant migration dry runs, and one clean controlled pilot payroll cycle.
- The next sensible slice is provider/authority adapter settlement proof replay and chaos coverage, followed by browser smoke of the updated adapter proof drawer.
