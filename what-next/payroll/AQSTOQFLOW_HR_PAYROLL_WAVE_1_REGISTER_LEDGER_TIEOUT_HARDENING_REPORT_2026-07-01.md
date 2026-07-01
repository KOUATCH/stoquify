# AqStoqFlow HR/Payroll Wave 1 Register Ledger Tie-Out Hardening Report - 2026-07-01

## Decision

This slice hardens payroll register accounting proof, but it does not change the overall production decision by itself. AqStoqFlow HR/Payroll remains suitable for controlled pilot / limited release of the evidence-gated scope, with full production still dependent on closing the remaining release blockers and completing at least one clean pilot payroll cycle.

## Scope

Focus: payroll register -> accounting posting -> close assurance evidence.

The implementation keeps the existing service-owned spine intact:

- HR/payroll source truth stays in payroll services.
- Accounting consumes posted payroll run facts and source links.
- POS/sales/BI remain downstream consumers or approved-input providers, not payroll authorities.
- No statutory formulas, rates, account numbers, or legal rules were added.

## What Changed

### Payroll Register Ledger Tie-Out

`services/payroll/payroll-register.service.ts` now exposes a richer `PayrollRegisterLedgerTieOut` read-model object for posted payroll runs.

It verifies and surfaces:

- payroll run accounting source link presence;
- payroll payment source link presence;
- payroll journal line count;
- expected debit total from gross payroll plus employer charges;
- expected credit total from net payable, employee deductions, and employer charges;
- actual debit and credit totals from journal lines;
- debit, credit, and journal balance deltas;
- required payroll ledger mapping keys;
- present, missing, and extra mapping keys;
- unmapped journal-line count;
- unhashed journal-line count;
- posting purpose match to `PAYROLL_RUN`;
- source match to the payroll run posting batch / journal entry.

### Close-Readiness Blocking

Register blockers now include ledger tie-out failures:

- `PAYROLL_REGISTER_LEDGER_TIEOUT_MISSING`
- `PAYROLL_REGISTER_LEDGER_TIEOUT_MISMATCH`

This prevents a payroll register from looking close-ready when the accounting journal has extra, unmapped, unhashed, mis-sourced, or unbalanced payroll lines.

### Regression Coverage

`services/payroll/__tests__/payroll-register.service.test.ts` now covers the production-risk case where all required mapped payroll lines are present and mathematically balanced, but extra unmapped debit/credit lines are also present. The component mapping still matches, but the ledger tie-out now correctly reports `MISMATCH` and emits a close blocker.

## Why This Matters

Before this hardening, the register could prove component mappings and source links while still allowing additional journal lines to sit outside payroll component evidence. That is unsafe for full HR/payroll production because accounting, close assurance, BI, and cash planning rely on the payroll register being the immutable financial truth.

This change makes the run-level accounting tie-out explicit and evidence-backed without bloating the payroll engine or moving accounting truth into the UI.

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-register.service.test.ts --runInBand`
  - 1 suite passed
  - 9 tests passed
- `npm run typecheck`
  - `tsc --noEmit --pretty false` passed
- `npm run service:boundary:fail`
  - active service-boundary violations: 0
- `npm run policy:gates`
  - inventory boundary: passed
  - service boundary: passed
  - workflow assurance runtime check: ready, blockers 0
  - payroll immutability runtime: ready, 9/9 triggers present, 14/14 forbidden mutation checks blocked, blockers 0
  - hard-delete gate: passed
  - regulatory hardcode gate: passed
  - demo/report trust gate: passed
  - raw-error boundary gate: passed

Generated/updated gate evidence:

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Remaining Production Work

This closes a register/accounting evidence gap only. Full production still requires the broader readiness standard:

- statutory country-pack breadth and expert-reviewed fixtures;
- complete country and authority mappings;
- controlled pilot payroll cycle reconciliation;
- production migration/backfill signoff;
- authenticated browser release gates across payroll routes;
- accounting/security/operations signoff.

## Next Best Slice

Continue with country-pack/payroll engine breadth or pilot-cycle certification evidence. Operator routes and BI should keep consuming these service-owned read models rather than introducing separate payroll truth.
