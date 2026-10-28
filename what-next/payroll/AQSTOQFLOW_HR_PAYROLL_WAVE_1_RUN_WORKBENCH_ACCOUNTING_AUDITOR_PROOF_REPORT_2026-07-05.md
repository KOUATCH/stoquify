# AqStoqFlow HR/Payroll Wave 1 Run Workbench Accounting Auditor Proof Report - 2026-07-05

## Selected Skill
- `aqstoqflow-payroll-command-center`
- Phase 2: command-center/operator route hardening with proof-backed, tenant-safe payroll evidence.

## Executed Slice
Added accounting-backed payroll auditor proof to `/dashboard/payroll/runs` so the run lifecycle workbench now carries the accountant trust-pack proof context for the returned run scope.

## Files Changed
- `services/payroll/payroll-control.service.ts`
- `components/payroll/PayrollRunWorkbench.tsx`
- `components/payroll/PayrollProofDrawerButton.tsx`
- `services/payroll/__tests__/payroll-run-workbench.service.test.ts`
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`

## Design Result
- The run workbench now calls `getAccountantPortalData` for the latest returned accounting period and maps `payrollAuditProofPack` into a route-level `accountingAuditProof` read model.
- The proof model exposes status, trust level, verdict, gate counts, blockers, source tables, aggregate evidence, and source-link hashes only.
- Source scope now declares the accounting period used, returned accounting period ids, proof availability, gate count, source-link count, and whether auditor proof coverage is complete for the returned run set.
- The run workbench audit log now records the accountant proof summary alongside read redaction decisions and returned run count.
- The UI shows an `Auditor proof` panel and a dedicated `Auditor proof drawer` that links to the accountant portal and preserves hashes/aggregates-only redaction.

## Verification
- PASS: `npm test -- --runTestsByPath services/payroll/__tests__/payroll-run-workbench.service.test.ts --runInBand` (3 tests)
- PASS: `npm test -- --runTestsByPath components/payroll/__tests__/PayrollRunWorkbench.test.tsx --runInBand` (8 tests)
- PASS: `npm run typecheck`
- PASS: `npm run prisma:validate`
- PASS: `npm run service:boundary:fail`
- PASS: `npm run policy:gates`
- PASS: `npm run lint -- --quiet` with 0 errors and 4 pre-existing warnings (`<img>` usage in three existing files and anonymous default export in `config/permissions.ts`).

## Residual Risks
- Auditor proof coverage is period-scoped. If the run workbench returns multiple accounting periods, the proof panel marks coverage as latest-period-only instead of claiming full coverage.
- No browser smoke was run in this slice; it remains part of the broader release certification gate.
- Payment and declaration route-level accountant proof panels still need the same treatment.

## Next Recommended Slice
Apply the same accountant/auditor proof pattern to `/dashboard/payroll/payments` and `/dashboard/payroll/declarations`, then add route-level browser smoke coverage for runs, payments, and declarations together.
