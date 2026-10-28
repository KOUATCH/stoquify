# AqStoqFlow Priority 007 Remaining Error Pass Report

Date: 2026-06-17

## Objective

Use `priority-007-error-response-normalizer` and `exam-007-aqstoqflow-error-response-normalizer` to close the remaining active raw-error findings documented by the previous Priority 007 domain pass.

Targeted areas:

- accounting services
- brand and category services/actions
- finance dashboard service
- payment reconciliation workbench service
- analytics, dashboard, inventory, and organization actions
- explicit raw rethrow sites in inventory transfer and mobile-money HMAC ingestion

## Source Evidence Read

- `C:\Users\J COMPUTER\.codex\skills\priority-007-error-response-normalizer\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-007-aqstoqflow-error-response-normalizer\SKILL.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-007-aqstoqflow-error-response-normalizer\references\risk-brief.md`
- `C:\Users\J COMPUTER\.codex\skills\exam-007-aqstoqflow-error-response-normalizer\references\runtime-boundary.md`
- `what-next/AQSTOQFLOW_PRIORITY_007_DOMAIN_PASS_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_PRIORITY_007_DOMAIN_PASS_RAW_ERROR_REPORT_2026-06-17.md`
- relevant sections from the enterprise examination report, statutory service modernization scan, and graph report

## Files Changed

### Shared Domain Services

- `services/accounting/accounts.service.ts`
- `services/accounting/invariants.ts`
- `services/accounting/journals.service.ts`
- `services/accounting/periods.service.ts`
- `services/accounting/posting.service.ts`
- `services/brand/brand.service.ts`
- `services/category/category.service.ts`
- `services/finance/finance-dashboard.service.ts`
- `services/payments/payment-reconciliation-workbench.service.ts`
- `services/inventory/inventory-transfer.service.ts`
- `services/payments/adapters/mobile-money-hmac.adapter.ts`

### Server Actions

- `actions/analytics/getSalesAnalytics.ts`
- `actions/dashboard/getDashboardData.ts`
- `actions/inventory/inventoryActions.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `actions/organization/organization-settings-actions.ts`
- `actions/brands/getBrandsAction.ts`
- `actions/categories/getCategoriesAction.ts`
- `actions/categories/createBulkCategories.ts`

### Tests

- `services/accounting/__tests__/invariants.test.ts`
- `services/payments/__tests__/mobile-money-hmac.adapter.test.ts`

## Controls Added

- Replaced accounting raw service errors with typed `BusinessRuleError`, `NotFoundError`, and `ForbiddenError`.
- Replaced brand/category duplicate and not-found raw errors with `ConflictError` and `NotFoundError`.
- Replaced finance and payment workbench date-range and organization errors with typed service errors.
- Replaced analytics action catch blocks with `safeLoggedActionErrorMessage` and typed `ApplicationError`.
- Replaced dashboard auth/access/not-found raw throws with `AuthRequiredError`, `ForbiddenError`, and `NotFoundError`.
- Replaced inventory action validation/auth/access raw throws with typed errors handled by the existing `inventoryAction` wrapper.
- Replaced organization action `console.error` calls with safe logged action messages while preserving legacy `{ success: false, error }` envelopes.
- Replaced brand/category action raw auth/access throws with typed errors and sanitized legacy `actionError` responses.
- Reworked the mobile-money HMAC adapter JSON parser to avoid catching and rethrowing typed ingestion errors.
- Converted the inventory transfer raw rethrow fallback into a non-exposed typed `ApplicationError` after the existing duplicate-number conflict handling.

## Verification

### Focused Jest

Command:

```powershell
npm test -- services/accounting/__tests__/invariants.test.ts services/accounting/__tests__/manual-journal.test.ts services/accounting/__tests__/posting.service.test.ts services/accounting/__tests__/periods.service.test.ts services/accounting/__tests__/accounts.service.test.ts services/payments/__tests__/payment-reconciliation-workbench.service.test.ts services/payments/__tests__/mobile-money-hmac.adapter.test.ts actions/inventory/__tests__/inventoryMovementActions.test.ts actions/_shared/__tests__/safe-action-responses.test.ts services/_shared/__tests__/action-response.test.ts services/_shared/__tests__/action-errors.test.ts --runInBand
```

Result:

- 11 test suites passed
- 34 tests passed

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
- Existing Prisma config deprecation notice remains informational.

### Lint

Command:

```powershell
npm run lint
```

Result:

- Passed
- Existing warnings remain in `EmailVerificationForm.tsx` and three `<img>` usages.

### Focused Target Scan

Command:

```powershell
rg -n "throw new Error\(|throw error|console\.error\(|console\.log\(" services\accounting services\brand services\category services\finance services\payments actions\analytics actions\dashboard actions\inventory actions\organization actions\brands actions\categories services\inventory\inventory-transfer.service.ts services\payments\adapters\mobile-money-hmac.adapter.ts
```

Result:

- No matches.

### Raw Error Boundary Gate

Report artifacts:

- `what-next/AQSTOQFLOW_PRIORITY_007_REMAINING_PASS_RAW_ERROR_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_PRIORITY_007_REMAINING_PASS_RAW_ERROR_REPORT_2026-06-17.json`

Fail-mode command:

```powershell
node scripts/raw-error-boundary-gate.js --mode fail
```

Result:

- Active unsafe raw-error findings: 0
- Allowed classified findings: 35
- Total raw-error callsites scanned: 35
- Gate status: passed

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

## Remaining Blockers

The raw-error boundary risk class is now closed at the scanner level: no active unsafe raw-error findings remain.

Remaining debt is service-boundary debt, not raw-error leakage. The service-boundary ratchet still reports legacy direct Prisma imports, direct Prisma calls outside services, action-owned mutations, and Prisma client type coupling. Those findings should be handled by the next service-boundary/domain migration priorities rather than by Priority 007.

## Final Status

Priority 007 remaining error pass is complete.

- Active raw-error findings are now zero.
- Targeted economic services use typed domain errors.
- Targeted server actions no longer log or throw unsafe raw client-boundary errors.
- Explicit raw rethrow findings were removed.
- Focused tests and static gates passed.
