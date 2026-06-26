# Aqstoqflow HR/Payroll Seed, Backfill, And Admin Setup Plan

Date: 2026-06-25  
Skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`  
Source suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`  
Prompt: 06 - Migration, Seed, Backfill, And Payroll Admin Setup  
Decision: planning gate passed; production mutation gate remains blocked until a dedicated dry-run harness and payroll-specific setup readiness checks are implemented.

## Executive Decision

Prompt 06 should not mutate production or tenant data yet. The safe outcome for this phase is a setup and dry-run plan that defines what must be checked, what can be seeded, what can be backfilled, and what must stop before any write occurs.

The system has a payroll kernel, country-pack gate, access/privacy controls, and accounting close gate foundations from Prompts 02 through 05. However, the current seed/backfill surfaces are not payroll-ready for live mutation because:

- Existing seed scripts are demo-oriented and include destructive or fixture-specific behavior.
- Payroll posting rule templates exist, but payroll-specific account mappings and a payroll journal are not yet proven by the accounting setup readiness gate.
- The payroll schema supports `PayrollEmployee.userId`, but the source of employee-to-user mapping for backfill is not yet implemented.
- No existing seed/backfill path creates payroll employees, contracts, periods, attendance snapshots, payroll runs, payslips, declarations, payment batches, or payment allocations.
- Payment destination readiness must be hash/evidence based and must not introduce raw salary or bank details into logs, reports, or client surfaces.

## Prerequisite Gate

| Gate | Status | Evidence | Decision |
| --- | --- | --- | --- |
| Phase 0 inventory and ownership exists | Passed | Prior HR/Payroll inventory and Prompt 01 governance artifacts exist in `what-next/payroll/` and `docs/domains/hr-payroll/`. | Continue planning. |
| Runtime immutability proof exists | Passed | `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_2026-06-25.md` reports 7/7 triggers present and forbidden finalized mutations blocked in a dedicated non-production database. | Use immutable evidence assumptions. |
| Country-pack gate exists | Passed | `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_03_COUNTRY_PACK_GATE_REPORT_2026-06-25.md` passed and blocks unsupported statutory automation. | Do not add formulas here. |
| Access/privacy server action gate exists | Passed | `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_04_ACCESS_PRIVACY_ACTIONS_REPORT_2026-06-25.md` passed for protected salary-bearing surfaces. | Preserve RBAC, entitlement, fresh auth, audit, and redaction. |
| Accounting close gate exists | Passed with payroll setup caveat | `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_05_ACCOUNTING_CLOSE_GATE_REPORT_2026-06-25.md` passed payroll posting/close-assurance checks. | Payroll-specific setup readiness still needs implementation before mutation. |
| Employee/user data sources are understood | Partial | `PayrollEmployee.userId` is optional and unique per organization, but there is no implemented backfill source mapping. | Hard blocker for real backfill writes. |
| No production mutation without dry-run | Passed | This phase produced a plan only and ran validation checks. | Continue with read-only setup design. |

## Current System Findings

### Payroll Data Model

The Prisma schema already contains tenant-scoped payroll models for:

- `PayrollEmployee`
- `PayrollContract`
- `PayrollPeriod`
- `PayrollAttendanceSnapshot`
- `PayrollRun`
- `PayrollRunLine`
- `PayrollPayslip`
- `PayrollPayslipLine`
- `PayrollDeclaration`
- `PayrollPaymentBatch`
- `PayrollPaymentAllocation`

The model shape is suitable for an incremental payroll rollout because payroll employees can optionally link to platform users through `PayrollEmployee.userId`, contracts are employee-scoped, periods are unique by organization and date range, and downstream payroll artifacts carry evidence, status, and audit-oriented fields.

### Migration Surface

Current migrations are narrow and relevant:

- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `prisma/migrations/20260619120000_backfill_purchase_receive_permission/migration.sql`
- `prisma/migrations/20260618154500_repair_accounting_source_links/migration.sql`
- `prisma/migrations/20260621103000_workflow_assurance_registry_foundation/migration.sql`
- `prisma/migrations/20260621113000_workflow_assurance_incident_spine/migration.sql`

Prompt 06 does not require a new schema migration yet. The next production-safe implementation slice should first build read-only readiness and dry-run checks against the existing schema.

### Seed And Backfill Surface

`prisma/seed.ts` and `prisma/comprehensive-seed.ts` create broad demo/comprehensive fixtures. They are not safe production backfill tools.

Observed seed risks:

- `prisma/seed.ts` clears broad datasets and recreates demo data.
- Seeded accounting setup status is `IN_PROGRESS`, not `READY`.
- Demo and comprehensive seeds create default general, sales, purchase, cash, bank, inventory, adjustment, and opening journals, but do not create a default payroll journal.
- Payroll module labels and HR roles exist in comprehensive seed data, but payroll operational records are not seeded.
- No seed script currently creates payroll employees, contracts, periods, attendance snapshots, payroll runs, payslips, declarations, payment batches, or payment allocations.

Conclusion: current seeds may support demos after careful review, but they must not be used as payroll migration/backfill tooling.

### Accounting Setup Readiness

Payroll posting templates exist in `services/accounting/default-posting-rules.ts`:

- `PAYROLL-RUN`
- `PAYROLL-PAYMENT`

Those templates depend on these payroll-specific mapping keys:

- `PAYROLL_GROSS_EXPENSE`
- `PAYROLL_EMPLOYER_CHARGE_EXPENSE`
- `EMPLOYEE_PAYABLES`
- `PAYROLL_WITHHOLDING_PAYABLE`
- `SOCIAL_CONTRIBUTIONS_PAYABLE`

However, `services/accounting/accounting-settings.service.ts` currently defines general accounting readiness mappings, journal types, and posting purposes. It does not yet prove payroll-specific account mappings, `JournalType.PAYROLL`, or payroll posting purposes as part of the accounting setup-ready gate.

Conclusion: production payroll backfill must remain blocked until a payroll setup readiness gate proves payroll account mappings, payroll journal, payroll posting rules, and an open accounting period for the intended pay date.

### Module Entitlement And Navigation

The module catalog includes a `payroll` module and `/dashboard/payroll` route prefix. Module access is currently derived from organization requested modules and legacy full-suite behavior. Prompt 06 must treat module entitlement as a setup prerequisite, not as payroll truth.

The dry-run must verify:

- The tenant has payroll module access.
- Accounting is present or explicitly accepted as a required payroll rollout dependency.
- Payroll is not seeded for tenants that are not entitled to payroll.

## Dry-Run Design

The next implementation slice should add a read-only dry-run harness. It should default to no writes and produce a report before any mutation is possible.

Recommended file targets:

- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
- `scripts/payroll-seed-backfill-dry-run.ts`

Required input:

- `organizationId`
- `actorId`
- `countryCode`
- `periodStart`
- `periodEnd`
- `payDate`
- employee source mode, such as `users`, `csv`, `external`, or `manual-plan`
- `dryRun`, defaulting to `true`
- optional `maxRows`
- optional `reportPath`

The dry-run must inspect only server-side trusted data and must not compute payroll amounts in the client.

### Dry-Run Step Order

1. Tenant and module preflight
   - Verify organization exists.
   - Verify payroll module entitlement.
   - Verify accounting dependency for payroll rollout.
   - Verify actor has required admin/setup permissions.

2. Accounting preflight
   - Verify accounting settings exist.
   - Verify setup is ready or identify missing readiness items.
   - Verify payroll account mappings exist and are leaf accounts.
   - Verify a default payroll journal exists and is active.
   - Verify payroll posting rules are active, balanced, and effective.
   - Verify an open accounting period covers the pay date.

3. Country-pack preflight
   - Verify selected country pack exists.
   - Verify expert-review/provenance status.
   - Block unsupported statutory automation.

4. Employee source mapping scan
   - Identify source users or external employee records.
   - Check uniqueness by organization.
   - Check missing names, emails, employee numbers, country, hire dates, and employment status.
   - Plan `PayrollEmployee` records without writing them.

5. Contract readiness scan
   - Verify each planned employee has exactly one active or planned active contract for the period.
   - Verify base salary is present only in server-side protected data.
   - Verify signed document hash or approved contract evidence exists before activation.

6. Payment destination readiness scan
   - Verify payment method and payment destination hash/evidence exist.
   - Never print raw account, mobile money, card, national ID, tax ID, or salary details.
   - Classify missing approved payment destination evidence as a hard blocker for payment release.

7. Payroll period readiness scan
   - Plan `PayrollPeriod` creation using the existing unique key: organization, period start, and period end.
   - Validate frequency, pay date, country code, and accounting period linkage.

8. Attendance snapshot readiness scan
   - Verify attendance source availability.
   - Require source hash and freeze plan before calculation.
   - Do not fabricate attendance snapshots.

9. Report and audit plan
   - Save a dry-run report with counts, blockers, proposed writes, and redacted identifiers.
   - Record who ran the dry-run and which inputs were used.
   - Do not write business events as if payroll data was changed.

## Idempotency Rules

Any future mutation mode must use deterministic keys and must be retry-safe.

| Object | Idempotency rule |
| --- | --- |
| Payroll module entitlement | Normalize requested module slug/name and update only if missing. |
| Payroll setup readiness | Read-only until explicit setup approval; no accidental `READY` transition. |
| Payroll account mappings | Upsert by organization and normalized mapping key. |
| Payroll journal | Upsert by organization, journal type `PAYROLL`, and stable code. |
| Payroll posting rules | Upsert by organization and posting rule code; never duplicate `PAYROLL-RUN` or `PAYROLL-PAYMENT`. |
| Payroll employee | Upsert by organization and employee number or unique user mapping. |
| Payroll contract | Upsert by organization and contract number; require employee scope and effective dates. |
| Payroll period | Use existing unique key: organization, period start, and period end. |
| Payment destination readiness | Store hashes/evidence only; never raw destination details. |
| Attendance snapshot | Require source ID and source hash; never fabricate default attendance. |

## Admin Readiness Checklist

The payroll admin setup screen or server action should not mark payroll ready unless all required checks pass.

Hard blockers:

- Payroll module is not entitled for the tenant.
- Actor lacks payroll setup/admin permission.
- Accounting settings are missing.
- Accounting setup is not ready for payroll.
- Payroll account mappings are missing or map to parent/inactive accounts.
- Default payroll journal is missing or inactive.
- Payroll posting rules are missing, inactive, unbalanced, or lack effective dates.
- No open accounting period covers the pay date.
- Country pack is unsupported or lacks required provenance.
- Employee/user mapping is ambiguous or duplicated.
- Active employees lack active approved contracts.
- Payment destination evidence is missing for payment-release readiness.
- Attendance source cannot produce frozen snapshots.
- Required redaction/audit controls are unavailable.

Soft readiness items:

- Demo seed needs payroll sample data for non-production showcases.
- Admin UI needs a guided readiness checklist.
- Dry-run reports should be exportable for accountants and implementers.
- Bulk import adapters can be added after the dry-run contract is stable.

## What Must Not Be Implemented In This Slice

- No blind production migrations.
- No production payroll fixture insertion.
- No self-service payroll surfaces.
- No payment release UI.
- No statutory formula automation.
- No client-computed payroll truth.
- No dashboard-specific payroll setup shadow service.
- No raw salary, tax, national ID, bank, mobile money, or payment destination data in logs or reports.
- No mutation of finalized payroll evidence in place.

## Recommended Implementation Order

1. Build a read-only payroll setup readiness service.
2. Add tests proving readiness failures for missing payroll mappings, missing payroll journal, missing posting rules, missing open period, unsupported country pack, missing module entitlement, and ambiguous employee/user mapping.
3. Build a dry-run plan service that returns proposed writes without writing data.
4. Add a CLI script that invokes the dry-run service and saves a redacted report.
5. Add tenant fixture tests proving the dry-run is organization-scoped and idempotent.
6. Add an admin-facing readiness server action only after the service tests pass.
7. Add optional non-production demo seed fixtures for payroll employees, contracts, periods, and payment destination hashes.
8. Only after explicit approval, add mutation mode for approved non-production setup or controlled tenant onboarding.

## Safest First Implementation Slice

The safest next slice is a read-only payroll setup readiness service plus tests.

Minimum scope:

- Inspect module entitlement.
- Inspect accounting settings.
- Inspect payroll account mappings.
- Inspect payroll journal.
- Inspect payroll posting rules.
- Inspect country-pack support status.
- Inspect employee/user mapping uniqueness.
- Return blockers and warnings without writing data.

This gives Phase 1 a reliable setup boundary without inventing payroll data or forcing a UI-first implementation.

## Handoff To Prompt 07

Prompt 07 can proceed only with these boundaries:

- It may build HR source-data foundation around `PayrollEmployee` and `PayrollContract`.
- It must not assume production payroll employees or contracts have already been seeded.
- It must treat employee/user mapping as a first-class prerequisite.
- It must preserve salary redaction and server-owned payroll truth.
- It must not calculate payroll until attendance snapshots, active contracts, country-pack support, and accounting readiness are proven.

## Validation Run

Commands executed:

```powershell
npm run prisma:validate
npm run service:boundary:fail
```

Results:

- `npm run prisma:validate` passed. Prisma schema is valid.
- `npm run service:boundary:fail` passed. Active service-boundary violations: 0.

Checks intentionally not run:

- No seed/backfill mutation script was run because this phase explicitly forbids blind production mutation.
- No idempotency runtime test was run because the dry-run harness does not exist yet.
- No UI route smoke test was run because this phase did not change routes or UI.

## Final Status

Prompt 06 is complete as a plan-and-boundary phase.

Production data mutation remains blocked until:

1. A read-only payroll setup readiness service exists.
2. A dry-run seed/backfill harness exists.
3. Payroll-specific accounting readiness is proven.
4. Employee/user mapping is selected and validated.
5. Tenant-scoped idempotency tests pass.
6. A redacted dry-run report is reviewed before any write mode is allowed.
