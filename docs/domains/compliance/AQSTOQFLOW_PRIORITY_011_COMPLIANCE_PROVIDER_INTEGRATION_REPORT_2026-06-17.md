# AqStoqFlow Priority 011 Compliance Provider Integration Report

Date: 2026-06-17

Skill: `priority-011-compliance-provider-integration`

## Source Reports And Files Inspected

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `what-next/PAYMENT_RECON*.md`
- `services/compliance/adapters/*`
- `services/regulatory/country-packs/*`
- `services/payments/*`
- `services/payroll/*`
- `services/accounting/data-trust.service.ts`
- `prisma/schema.prisma`

## Status Before Changes

Compliance and regulatory code already truthfully prevented sandbox flows from becoming statutory production certification claims. The Cameroon DGI adapter remained sandbox-only, tenant adapter credentials were required through a reference instead of raw secrets, and Cameroon country-pack e-invoicing/payroll capabilities continued to expose expert-review blockers.

The remaining gap in this priority slice was accountant trust readiness for provider-backed payment balances: payment exceptions were checked, but an active provider account with no external statement evidence could still leave the payment module looking clean enough for a certified accountant trust pack.

## Files Changed

- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `what-next/AQSTOQFLOW_PRIORITY_011_COMPLIANCE_PROVIDER_INTEGRATION_REPORT_2026-06-17.md`

Note: the workspace is already heavily dirty and these accounting data-trust files are currently untracked in Git, so the report records the live touched paths rather than implying a clean git diff.

## Implementation

- Added provider readiness evidence to the accountant data-trust service:
  - active provider account count;
  - imported/processed provider statement file count;
  - provider statement line count;
  - signed reconciliation run count.
- Added a high-severity close/certification blocker when active provider accounts have no statement file or line evidence:
  - blocker id: `provider-statement-evidence-missing`;
  - gate: `payments.provider-statement-evidence`;
  - source tables: `provider_accounts`, `statement_files`, `statement_lines`.
- Added a high-severity blocker when provider statement evidence exists but no signed reconciliation run exists:
  - blocker id: `provider-reconciliation-signoff-missing`;
  - gate: `payments.reconciliation.signoff`;
  - source tables: `provider_accounts`, `statement_files`, `statement_lines`, `reconciliation_runs`.
- Extended payment module evidence so accountant exports expose provider account, statement, and signoff facts.
- Added provider statement and reconciliation signoff scanning to the accountant trust certificate evidence list.

No action, route, hook, or UI caller was migrated in this slice because the gap was inside the existing service-owned accountant data-trust boundary.

## Controls Added Or Reused

- Tenant scope: all new counts are scoped by `organizationId`.
- Service ownership: readiness logic remains in `services/accounting/data-trust.service.ts`.
- Audit/business-event posture: existing compliance submission tests continue to prove accepted sandbox submissions emit business-event evidence without production certification claims.
- Close/certification blocker discipline: provider-backed payment readiness now blocks certified accountant trust-pack export until external statement evidence and signed reconciliation evidence exist.
- Statutory honesty: no production statutory certification claim was added.

## Tests Added Or Changed

- Added regression coverage in `services/accounting/__tests__/data-trust.service.test.ts`:
  - active provider account with no statement evidence downgrades trust to `T2`;
  - certified trust-pack export readiness is disabled;
  - blocker `provider-statement-evidence-missing` is exposed;
  - payment module evidence reports active provider accounts, statement files, statement lines, and signed reconciliation runs.

Existing tests also cover:

- sandbox adapter cannot produce production certification status;
- missing compliance adapter credentials fail safely;
- payroll country-pack/expert-review fallback blocks statutory readiness;
- compliance submission readiness transitions emit business-event evidence.

## Verification

Passed:

```powershell
npm test -- services/accounting/__tests__/data-trust.service.test.ts --runInBand
```

Result: 1 suite passed, 6 tests passed.

Passed:

```powershell
npm test -- services/compliance services/payments services/payroll services/accounting --runInBand
```

Result: 28 suites passed, 113 tests passed.

Passed:

```powershell
npm run prisma:validate
```

Result: Prisma schema valid. Existing Prisma 7 deprecation warning for `package.json#prisma` remains.

Passed:

```powershell
npm run typecheck
```

Result: TypeScript completed successfully.

Boundary note: `node scripts/service-boundary-gate.js --mode report` was not rerun because this slice did not modify actions, App Router files, hooks, or components.

## Remaining Blockers

- Production statutory certification remains blocked until real authority adapters, country-pack expert/legal validation, and official authority prerequisites exist.
- Payment provider integrations still need operational statement channels and credential provisioning beyond this readiness gate.
- Payroll statutory parameters remain expert-review gated until legally sourced, effective-dated, expert-reviewed country-pack values and filing adapters are complete.
- Provider-backed reconciliation can now block certified accountant exports, but broader operational monitoring for provider outages and stale statement cadence remains a later hardening slice.

## Next Priority

Continue with `priority-012-ci-release-gate-modernizer` after reviewing whether any remaining priority-011 provider operations work should be split into a dedicated provider statement channel implementation slice.
