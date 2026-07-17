# AqStoqFlow HR/Payroll YTD Accumulator And Register Proof Report

Date: 2026-07-01
Scope: HR/payroll roadmap execution slice - payroll engine hardening and register evidence.
Status: implemented and locally verified.

## Decision

Implemented service-owned year-to-date accumulator proof for payroll calculation and register read models.

This is not statutory tax logic. The YTD window is derived from tenant accounting fiscal-year settings (`OrganizationAccountingSettings.fiscalYearStartMonth` / `fiscalYearStartDay`) and is carried as evidence. Country-pack statutory formula behavior remains in the regulatory country-pack engine and reviewed fixtures.

## What Changed

- Added `AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY` evidence to payroll country-pack resolution.
- Added per-employee `AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_ACCUMULATOR_PROOF` to payroll line calculation snapshots.
- Loaded prior posted/paid payroll run lines in the current tenant, YTD window, and employee scope only.
- Accumulated prior locked line amounts plus current effective line amounts, including correction deltas.
- Added prior run ids, prior run document hashes, prior line document hashes, missing-proof counts, current amounts, prior amounts, YTD amounts, and accumulator hash to the line proof.
- Included YTD policy hash and accumulator hashes in payroll run document/evidence metadata and calculated business-event payloads.
- Exposed row-level YTD proof metadata in the payroll register read model.
- Folded YTD accumulator hashes into the payroll register tie-out hash and bumped that hash payload version to 6.

## Files Touched

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-register.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Verification

Passed:

- `npx jest services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
- `npx jest services/payroll/__tests__/payroll-register.service.test.ts --runInBand`
- `npx jest services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run regulatory:hardcode:fail`
- `npm run service:boundary:fail`
- `npm run prisma:validate`
- `npx jest services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand`
- `npm run policy:gates`

Policy gates refreshed payroll immutability runtime artifacts at:

- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Release Impact

This closes a payroll-engine hardening gap around multi-period/YTD proof. It gives finance, BI, close assurance, declarations, and operator proof drawers a verifiable accumulator hash anchored to locked payroll line evidence.

Still required before full unrestricted HR/payroll rollout:

- Reviewed statutory country-pack formulas and golden fixtures for each production jurisdiction.
- Authority filing/payment adapters with real payload, response, receipt, amendment, rejection, retry, credential, and settlement evidence.
- Full operator route proof drawers and denied/redacted states for payroll runs, payments, and declarations.
- Tenant-by-tenant migration dry run/backfill, reconciliation signoff, and pilot-cycle evidence.