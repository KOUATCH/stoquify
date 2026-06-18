# AqStoqFlow 012 Payroll Presence Engine Slice Report

Date: 2026-06-15

Selected skill: `012-aqstoqflow-payroll-presence-engine`

Gate contract: `what-next/AQSTOQFLOW_012_PAYROLL_PRESENCE_ARCHITECTURE_GATE_REPORT_2026-06-15.md`

Result: `PASSED FOR BACKEND FOUNDATION SLICE - CONTINUE 012`

Do not advance to 013 yet.

## Scope Completed

This slice starts the live payroll/presence engine on the architecture contract:

- Payroll period service with country-pack payroll provenance pins.
- Attendance snapshot freeze service with immutable source hash and business event/outbox notification.
- Payroll run calculation service from frozen attendance and active contracts.
- Country-pack-backed CNPS pension provenance using `resolveRegulatoryParameter`.
- Payroll approval/posting orchestration with maker-checker, fresh-auth policy, posting rules, ledger batch, journal entry, source link, payslip emission, business event, and outbox messages.
- Idempotency payload-hash checks for calculation and approval replay.
- Rollback test proving no payroll event or payslip is emitted when journal creation fails.

## Files Changed

- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`

## Events Added

- `attendance.period.frozen`
- `payroll.run.calculated`
- `payroll.run.posted`

Outbox messages added through the business-event gateway:

- `attendance_snapshot.frozen`
- `payroll_run.calculated`
- `payroll_run.posted`
- `payslips.emitted`

## Invariants Enforced

- Tenant scope is required on payroll period, attendance snapshot, payroll run, ledger, event, and audit mutations.
- Attendance snapshots are frozen from a source payload hash; replay with changed payload is rejected.
- Payroll calculation only uses active employees, active contracts, and frozen attendance evidence.
- Payroll calculation pins country-pack version, schema version, resolution hash, capability status, and per-line rule provenance.
- National payroll rates are resolved from country packs, not hardcoded in service logic.
- Payroll run approval uses the shared sensitive-action control plane for permission, fresh auth, and self-approval blocking.
- Payroll posting resolves tenant posting rules and leaf account mappings before creating a posted payroll journal.
- Payroll events and payslips are created only after posting succeeds inside the transaction.
- Approved/posted payroll replay returns the existing result when the approval payload hash matches.
- Changed idempotency payloads fail with `ConflictError`.

## Tests Added

New suite: `services/payroll/__tests__/payroll-control.service.test.ts`

Coverage:

- Payroll calculation creates run lines from frozen attendance and pins country-pack provenance.
- Mutated payroll calculation replay fails before side effects.
- Approval posts a payroll journal, emits payslips, records the business event, and queues outbox messages.
- Identical posted-run replay returns the existing posting without duplicate journal/event creation.
- Journal failure prevents payslip creation, payroll run update, business event recording, and event-apply marking.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand
npm run prisma:validate
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/accounting/__tests__/default-posting-rules.service.test.ts services/controls/__tests__/sensitive-action.service.test.ts lib/security/__tests__/rbac-permissions.test.ts --runInBand
npm run typecheck
rg -n "parseFloat|Float|0\\.042|4\\.2|420|840|750000|CNPS|pensionRatesBps" services\payroll --glob "!**/__tests__/**"
```

Static scan result:

- No hardcoded payroll rates were found in non-test payroll service code.
- The remaining matches are the country-pack resolver path and explicit CNPS expert-review flag.

## Gates Passed

- Architecture gate: implemented against the saved 012 architecture report.
- Tenant gate: all service inputs require `organizationId`; queries scope by tenant.
- Country-pack gate: payroll calculation records effective country-pack provenance.
- Ledger gate: approval creates a posted payroll ledger batch and journal before final payroll event emission.
- Event/outbox gate: payroll evidence is recorded through the existing business-event gateway.
- RBAC/fresh-auth/SoD gate: approval uses `payroll.run.approve` sensitive-action policy.
- Idempotency gate: calculation and approval replay behavior is tested.
- Rollback gate: journal failure blocks event and payslip side effects.
- Verification gate: focused tests, shared tests, Prisma validation, typecheck, and static payroll-rate scan passed.

## Gates Still Blocked

- Payroll payment batch release and outbound payment reconciliation are not implemented in this slice.
- Payroll declarations are not implemented beyond the schema foundation.
- HR employee/contract management actions and UI are not implemented in this slice.
- Server actions, TanStack hooks, and payroll/presence workbench UI are still pending.
- DB-level immutability triggers for posted payroll runs/payslips are still pending.
- Full payroll legal formulas beyond the currently resolved CNPS pension-rate slice still require country-pack expansion and qualified expert validation.

## Next 012 Step

Continue `012-aqstoqflow-payroll-presence-engine` with:

1. Payroll payment batch release service tied to posted employee payables.
2. Outbound payroll payment reconciliation evidence and exception queue integration.
3. Payroll declaration preparation read model.
4. Server actions and safe action results.
5. Read-only payroll workbench cards showing period readiness, run status, posting status, event/outbox status, and blockers.

Next recommended numbered skill remains `013-aqstoqflow-data-trust-accountant-portal`, but only after the remaining 012 gates above pass.
