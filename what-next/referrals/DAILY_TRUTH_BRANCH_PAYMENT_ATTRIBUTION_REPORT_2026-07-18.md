# Daily Truth Branch Payment Attribution Report

Generated: 2026-07-18

Selected skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`

Companion audit: `01-payment-recon-readiness-audit`

Program control: `stoquify-referral-war-room-orchestrator`

## Decision

Phase 2 / Slice 7 is complete. Stoquify now has a read-only, service-owned contract for payment captures directly attributable to one authorized branch through `Payment.salesOrderId` and `SalesOrder.locationId`.

This evidence is operational capture attribution only. It does not represent provider settlement, statement matching, reconciliation, certification, manager sign-off, or complete branch payment coverage.

The next narrow slice is Phase 2 / Slice 8: integrate this capture attribution into the existing branch end-of-day readiness checklist while retaining external provider reconciliation and manager sign-off as explicit unsupported sources.

## Before

- The branch end-of-day checklist marked payment reconciliation `UNSUPPORTED` because no branch-owned external source existed.
- `Payment` had no direct `locationId`.
- The payment reconciliation workbench could filter captures through related orders, but it included monetary data and synthetic provider-line logic unsuitable for close truth.
- No dedicated branch capture evidence contract exposed counts, source hashes, freshness, and ownership limitations without money.

## After

`getBranchPaymentAttribution()` now returns exactly one branch and business date with:

- trusted actor and organization identity;
- tenant-wide or managed-location authority evidence;
- active organization-owned location identity;
- strict UTC business-date window based on `Payment.createdAt`;
- directly attributed payment identifiers, status counts, and method counts;
- deterministic source hash, latest observation time, freshness, and evidence grade;
- explicit partial coverage and actionable blockers;
- explicit `UNAVAILABLE` unlinked-payment branch coverage;
- explicit `UNSUPPORTED` external provider reconciliation.

The service states `AVAILABLE_WITH_LIMITATIONS`, `NO_ACTIVITY_WITH_LIMITATIONS`, or `STALE_WITH_LIMITATIONS`. No state claims that payment coverage or reconciliation is complete.

## Attribution Boundary

A payment is returned only when all of these are true:

- `Payment.organizationId` matches the active organization;
- `Payment.deletedAt` is null;
- `Payment.purchaseOrderId` is null;
- `Payment.createdAt` is inside the requested UTC day;
- a non-deleted `SalesOrder` exists;
- `SalesOrder.organizationId` matches the active organization;
- `SalesOrder.locationId` matches the authorized location;
- returned payment and sales-order identities remain coherent after the query.

Purchase-order payments, unlinked payments, deleted payments, foreign sales orders, foreign locations, and out-of-window records are excluded by query and fail-closed identity checks.

Online POS payment producers write `salesOrderId` directly. Offline replay ultimately uses the same committed sale path. This supports the selected attribution basis without inventing a new location field or backfilling fake ownership.

## Access And Tenant Controls

- The service validates location and date before evidence reads.
- Operating access resolves before location or payment reads.
- Tenant authority still requires an active, non-deleted organization-owned location.
- Managed-location authority is constrained to its exact assigned identifiers.
- Authority/scope disagreement fails closed.
- Missing, inactive, deleted, and cross-tenant locations use the same non-enumerating denial.
- Returned payment and sales-order identity is checked before evidence enters the result.
- The response never aggregates, ranks, compares, or falls back across branches.

## Data Minimization

The Prisma selector contains only:

- payment ID, organization ID, sales-order ID, method, status, creation time, and update time;
- sales-order ID, organization ID, and location ID.

It does not select or return payment amounts, fees, balances, variances, tender/change values, currency, phone numbers, bank fields, card fields, customer data, processor responses, transaction identifiers, or provider references.

The service does not query `ProviderEvent`, `StatementLine`, `PaymentTransaction`, or `ReconciliationRun`.

## Source Honesty

| Evidence | Slice 7 state | Reason |
|---|---|---|
| Direct sales-order payment capture | supported | Payment, sale, organization, location, and UTC date are verified. |
| Unlinked payment branch coverage | unavailable | An unlinked payment has no trustworthy branch owner. |
| Purchase-order payment capture | excluded | It is not inbound sales capture for branch close. |
| Provider event or statement evidence | unsupported | Durable records exist but have no trusted branch ownership. |
| Branch reconciliation or settlement | unsupported | Provider-account/reconciliation ownership is not location-proven. |
| Manager sign-off | unsupported | This slice is read-only capture evidence. |

The June payment readiness audit correctly prohibited faking provider evidence, but its statement that durable reconciliation models were absent is now stale. Live schema inspection takes precedence: those models now exist at tenant/provider-account scope, while branch ownership remains the unresolved boundary.

## Files Added

- `services/end-of-day-close/branch-payment-attribution-contracts.ts`
- `services/end-of-day-close/branch-payment-attribution.service.ts`
- `services/end-of-day-close/__tests__/branch-payment-attribution.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_BRANCH_PAYMENT_ATTRIBUTION_REPORT_2026-07-18.md`

The war-room register and generated role cockpit evidence were refreshed. No schema, migration, write service, action, route, page, component, notification, export, AI, or WhatsApp behavior was added.

## Verification

Focused Slice 7 tests:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-payment-attribution.service.test.ts
```

Result: 1 suite passed, 19 tests passed, 0 failed.

Focused regression set:

```text
npm test -- --runInBand services/end-of-day-close/__tests__/branch-payment-attribution.service.test.ts services/end-of-day-close/__tests__/end-of-day-close-readiness.service.test.ts services/operating-access/__tests__/operating-access-scope.service.test.ts
```

Result: 3 suites passed, 39 tests passed, 0 failed.

Additional gates:

- `npm run typecheck`: passed.
- focused ESLint for the Slice 7 contract, service, and tests: passed.
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers.
- static database-call audit: only `db.location.findFirst` and `db.payment.findMany` are used.
- prohibited-selector/write audit: no monetary/provider selector or create, update, delete, transaction, audit, event, or outbox call was found.

The role gate covers Daily Digest, not every manager surface.

## Test Coverage

The focused tests prove:

- tenant-authority and managed-location branch attribution;
- access-before-location and location-before-payment ordering;
- exact organization/location/date query constraints;
- direct sales-order attribution and coherent identities;
- purchase-order, unlinked, deleted, foreign, and out-of-window exclusion rules;
- no-activity and stale states;
- non-enumerating location denial and authority/scope failure;
- no monetary selectors or result keys;
- explicit unlinked and external reconciliation limitations;
- no provider, statement, payment-transaction, or reconciliation-run reads;
- zero domain writes.

## Residual Risks

- Direct sales-order attribution proves capture location, not provider settlement or reconciliation.
- The service cannot count unlinked payments at branch scope without inventing location ownership, so that coverage remains unavailable rather than zero.
- Provider-account-to-location ownership may be exclusive, shared, or time-varying and still needs a domain decision before schema work.
- The service uses the existing UTC business-date convention; organization timezone migration remains separate work.
- Method/status counts include `CREDIT` and other captured payment records but make no claim that every method represents settled funds.
- Slice 6's migration remains validated but not locally deployed.
- No sign-off is allowed until a later command has fresh-auth, maker/checker, permission, entitlement, and evidence-drift controls.

## Next Slice Gate

Phase 2 / Slice 8 will integrate branch payment capture into end-of-day readiness only. It must:

1. Reuse the readiness service's already-resolved access decision and verified location; do not resolve operating access or query location twice.
2. Expose a narrowly named internal attribution reader that accepts coherent resolved access and verified location evidence, while keeping the public Slice 7 service fail closed.
3. Add a separate `PAYMENT_CAPTURE_ATTRIBUTION` checklist item and source type; do not rename or replace `PAYMENT_RECONCILIATION`.
4. Map capture availability, no activity, and staleness honestly into readiness evidence with IDs, source hash, observation time, freshness, evidence grade, and blockers.
5. Keep `PAYMENT_RECONCILIATION` and `MANAGER_SIGN_OFF` explicitly `UNSUPPORTED`.
6. Add attributed payment counts and status/method counts only if the existing no-money contract remains intact.
7. Recompute readiness source hashes and evidence coverage deterministically.
8. Preserve one branch, tenant isolation, managed-location scope, UTC date basis, and zero writes.
9. Update the non-final Slice 6 manifest/tests to capture the new supported source without introducing a sign-off claim.
10. Add no schema, migration, action, route, UI, notification, provider mapping, synthetic matching, AI, or WhatsApp behavior.
11. Prove single access resolution, single location verification, capture checklist mapping, unsupported reconciliation honesty, stale/no-activity behavior, no monetary fields, deterministic review manifest, and zero writes with focused tests.

Next primary skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`.
