# AqStoqFlow HR/Payroll Wave 1 Command Center Accounting Auditor Proof Report

Date: 2026-07-05
Selected skill: aqstoqflow-payroll-command-center
Phase: Phase 2 - payroll command center and proof-backed operator workflow
Executable slice: surface the redacted payroll auditor proof pack in the payroll command read model and command center UI

## Outcome

The payroll command center now consumes the accountant data-trust payroll audit proof pack for the linked accounting period. Operators can see accounting/payroll proof-gate status from payroll without exposing employee identities, salary rows, bank/mobile-money data, or raw provider/authority payloads.

This moves the full HR/payroll roadmap forward by connecting payroll operations to the accounting assurance backbone: payroll command readiness, blockers, next actions, freshness, proof drawer content, and finance-state UI now include the accountant payroll auditor proof pack.

## Files Changed

- `services/payroll/command-read-model.service.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Design Decisions

- Reused `getAccountantPortalData` instead of duplicating accounting assurance queries in payroll.
- Mapped only the redacted `payrollAuditProofPack` essentials into the payroll command read model.
- Added `accountingAuditProof` readiness so accounting proof blocks/reviews are visible in the lifecycle rail.
- Added command blockers and an accountant-portal next action when payroll auditor proof gates are blocked or require review.
- Added trusted counts, freshness, and source-scope metadata for proof-gate count and source-link coverage.
- Added a command-center finance card and proof drawer rows for proof gates, blocker IDs, redaction policy, aggregate gaps, source tables, and hashed source links.
- Preserved payroll immutability, statutory provenance, ledger source-link, audit, and close semantics; this slice adds no mutation path and no statutory formula logic.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand` - 6 tests passed
- `npm test -- --runTestsByPath components/payroll/__tests__/PayrollCommandCenter.test.tsx --runInBand` - 3 tests passed
- `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-command-read-model.actions.test.ts --runInBand` - 3 tests passed
- `npm run typecheck` - passed
- `npm run prisma:validate` - passed
- `npm run service:boundary:fail` - passed, 0 active violations
- `npm run policy:gates` - passed, including inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates
- `npm run lint -- --quiet` - passed with 4 pre-existing warnings and 0 errors

## Gates Blocked

None for this slice.

Operational note: commands were run with sandbox escalation because the Windows sandbox helper repeatedly failed or timed out before local verification could complete.

## Residual Risks

- This does not complete full statutory country-pack expansion or automated filing/payment adapters.
- This does not certify unrestricted production rollout; it surfaces the proof-pack state so operators and auditors can act on it.
- The command-center UI now consumes proof gates, but deeper route-specific proof drawers for `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, and `/dashboard/payroll/declarations` still need route-level polish and browser smoke evidence.

## Next Recommended Slice

Continue with `aqstoqflow-payroll-command-center`: add route-specific proof drawers and denied/redacted states for payroll runs, payments, and declarations, using the same service-backed proof source and keeping accounting as the financial assurance backbone.
