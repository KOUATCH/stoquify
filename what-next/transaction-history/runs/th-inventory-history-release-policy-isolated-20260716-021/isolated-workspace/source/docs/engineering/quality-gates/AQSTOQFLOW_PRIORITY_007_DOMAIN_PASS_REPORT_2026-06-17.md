# AqStoqFlow Priority 007 Domain Error Normalization Pass

Date: 2026-06-17

## Objective

Use `priority-007-error-response-normalizer`, `exam-007-aqstoqflow-error-response-normalizer`, and supporting enterprise error-handling guidance to complete the next raw-error migration pass for:

- customers
- suppliers and item suppliers
- locations
- units and tax rates
- uploads and receipts
- POS
- purchase-order legacy service errors

The goal was not a broad service-boundary cleanup. The goal was to remove unsafe raw client-boundary throws/logs and raw service-domain `Error` usage from the requested domains while preserving existing behavior and avoiding unrelated refactors.

## Skills And References Used

- `C:\Users\J COMPUTER\.codex\skills\priority-007-error-response-normalizer\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-007-aqstoqflow-error-response-normalizer\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-007-aqstoqflow-error-response-normalizer\references\risk-brief.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-007-aqstoqflow-error-response-normalizer\references\runtime-boundary.md`
- `C:\Users\J COMPUTER\.codex\skills\enterprise-error-handling\SKILL.md`

## Implementation Summary

### Shared Error Envelope Hardening

- Added shared helpers in `actions/_shared/safe-action-responses.ts`:
  - `safeActionErrorMessage`
  - `safeLoggedActionErrorMessage`
  - `safeServerActionErrorResult`
- Updated `services/_shared/action-response.ts` so legacy `err()` and `errPaginated()` paths sanitize `Error` instances through the canonical safe-action mapper.
- Added regression tests proving internal database/Prisma-style messages are redacted while typed domain errors keep safe user messages.

### Customer Domain

- Replaced raw action validation, access, and not-found throws with typed errors in:
  - `actions/customers/customer-management-actions.ts`
  - `actions/customers/customerAction2.ts`
  - `actions/customers/customerActions.ts`
- Replaced raw service-domain errors with typed `BusinessRuleError`, `ConflictError`, and `NotFoundError` in `services/customer/customer.service.ts`.
- Wrapped legacy customer action failures with canonical safe server-action results where the action contract allowed it.

### Supplier And Item-Supplier Domains

- Replaced raw supplier action authorization and organization errors with typed domain errors.
- Replaced unsafe `console.error`/`console.log` and raw message exposure in:
  - `actions/suppliers/supplier-management-actions.ts`
  - `actions/suppliers/itemSupplierActions.ts`
  - `actions/item-suppliers/addItemSuppliers.ts`
  - `actions/item-suppliers/getItemWithSuppliers.ts`
- Replaced supplier service raw domain errors with typed errors in `services/supplier/supplier.service.ts`.

### Location Domain

- Replaced raw auth, organization, access, and not-found throws with typed errors in:
  - `actions/locations/location-management-actions.ts`
  - `actions/locations/updateLocationById.ts`
- Normalized catch blocks in:
  - `actions/locations/createLocation.ts`
  - `actions/locations/deleteLocation.ts`
  - `actions/locations/getOrgLocations.ts`
  - `actions/locations/updateLocationById.ts`
- Replaced raw location service errors with typed errors in `services/location/location.service.ts`.

### Units And Tax Rates

- Replaced raw auth, organization, access, validation, duplicate, and not-found errors with typed domain errors in:
  - `actions/units/unit-management-actions.ts`
  - `actions/units/getOrgUnits.ts`
  - `actions/units/deleteUnit.ts`
  - `actions/taxRate/tax-rate-management-actions.ts`
  - `services/unit/unit.service.ts`
  - `services/tax-rate/tax-rate.service.ts`

### Uploads And Receipts

- Hardened `actions/storage/photo-upload-actions.ts`:
  - unsupported file types now use `BusinessRuleError`
  - local storage preparation failure now uses a non-exposed `ApplicationError`
  - local file delete failures use safe warning logging
  - action catches return safe messages instead of raw exception text
- Updated `app/api/uploads/[...path]/route.ts` to return a safe JSON error envelope for unsupported SVG requests.
- Receipt routes were included in focused scanner verification and had no requested raw-error changes in this pass.

### POS

- Replaced raw POS action authorization and organization errors with typed errors in `actions/pos/terminal-management.actions.ts`.
- Replaced unsafe action catch logging with safe logged action messages.
- Replaced raw service-domain errors with typed errors in:
  - `services/pos/pos.service.ts`
  - `services/pos/terminal-management.service.ts`
  - `services/pos/drawer-dashboard.service.ts`

### Shared Organization Guards

- Replaced raw helper throws with typed errors in:
  - `services/_shared/require-org.ts`
  - `services/_shared/resolve-action-organization.ts`

### Purchase Order

- The requested legacy purchase-order service raw-error target was checked explicitly. `services/purchase-order/purchase-order.service.ts` no longer matches `throw new Error(...)` in the focused scan.

## Regression Tests Added Or Updated

- `actions/_shared/__tests__/safe-action-responses.test.ts`
- `services/_shared/__tests__/action-response.test.ts`

## Verification

### Focused Jest

Command:

```powershell
npm test -- actions/_shared/__tests__/safe-action-responses.test.ts services/_shared/__tests__/action-response.test.ts services/_shared/__tests__/action-errors.test.ts services/unit/__tests__/unit.service.test.ts services/tax-rate/__tests__/tax-rate.service.test.ts services/pos/__tests__/pos.service.test.ts services/pos/__tests__/receipt-public.test.ts --runInBand
```

Result:

- 7 test suites passed
- 28 tests passed

### Typecheck

Command:

```powershell
npm run typecheck
```

Result:

- Passed

### Prisma Validation

Command:

```powershell
npm run prisma:validate
```

Result:

- Passed
- Existing Prisma config deprecation/update notices remain informational.

### Lint

Command:

```powershell
npm run lint
```

Result:

- Passed
- Pre-existing warnings remain:
  - missing hook dependencies in `components/auth/EmailVerificationForm.tsx`
  - `<img>` warnings in item/frontend/inventory components
  - Next.js `next lint` deprecation notice

### Requested-Domain Raw Error Scan

Command:

```powershell
rg -n "throw new Error\(|throw error|console\.error\(|console\.log\(" actions\customers actions\suppliers actions\item-suppliers actions\locations actions\units actions\taxRate actions\storage app\api\uploads app\api\receipts actions\pos services\pos services\unit services\tax-rate services\customer services\supplier services\location services\_shared\require-org.ts services\_shared\resolve-action-organization.ts services\purchase-order\purchase-order.service.ts
```

Result:

- No matches.

### Global Raw Error Scanner

Report:

- `what-next/AQSTOQFLOW_PRIORITY_007_DOMAIN_PASS_RAW_ERROR_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_PRIORITY_007_DOMAIN_PASS_RAW_ERROR_REPORT_2026-06-17.json`

Result:

- Active unsafe raw-error findings: 93
- Allowed classified findings: 35
- Total raw-error callsites scanned: 128
- Active counts:
  - `CLIENT_BOUNDARY_UNSAFE`: 42
  - `SERVICE_RAW_DOMAIN_ERROR`: 49
  - `NEEDS_MIGRATION`: 2

The remaining active findings are outside this requested domain pass.

### Service Boundary Ratchet

Command:

```powershell
node scripts/service-boundary-gate.js --mode fail --baseline what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json
```

Result:

- Active service-boundary violations: 186
- Baseline active violations: 283
- Active violation delta: -97
- New active findings: 0
- Ratchet status: passed

## Remaining Work Outside This Slice

The next error-normalization pass should target:

1. Accounting service raw domain errors:
   - `services/accounting/accounts.service.ts`
   - `services/accounting/invariants.ts`
   - `services/accounting/journals.service.ts`
   - `services/accounting/periods.service.ts`
   - `services/accounting/posting.service.ts`
2. Brand and category raw service/action errors:
   - `services/brand/brand.service.ts`
   - `services/category/category.service.ts`
   - `actions/brands/getBrandsAction.ts`
   - `actions/categories/getCategoriesAction.ts`
3. Finance and payment reconciliation service errors:
   - `services/finance/finance-dashboard.service.ts`
   - `services/payments/payment-reconciliation-workbench.service.ts`
4. Analytics, dashboard, inventory, and organization client-boundary errors:
   - `actions/analytics/getSalesAnalytics.ts`
   - `actions/dashboard/getDashboardData.ts`
   - `actions/inventory/inventoryActions.ts`
   - `actions/inventory/inventoryMovementActions.ts`
   - `actions/organization/organization-settings-actions.ts`
5. Remaining explicit raw rethrow migrations:
   - `services/inventory/inventory-transfer.service.ts`
   - `services/payments/adapters/mobile-money-hmac.adapter.ts`

## Known Non-Goal And Debt

This pass normalized error handling only. It did not complete broader service-boundary migration for legacy direct Prisma/action-owned logic. The service-boundary ratchet still reports legacy debt in customers, suppliers, locations, units, tax rates, users, analytics, dashboard, and auth areas. That debt is now ratcheted and should be handled domain by domain under the service-boundary migration priorities.

## Final Status

The requested domain pass is complete:

- Requested domains no longer expose the scanned raw throw/log patterns.
- Legacy action response helpers now sanitize raw `Error` instances.
- Typed service-domain errors are used across the requested service targets.
- Focused regression tests pass.
- Typecheck, Prisma validation, lint, raw-error scan, and service-boundary ratchet were run.
- Remaining error-normalization findings are documented and outside this requested pass.
