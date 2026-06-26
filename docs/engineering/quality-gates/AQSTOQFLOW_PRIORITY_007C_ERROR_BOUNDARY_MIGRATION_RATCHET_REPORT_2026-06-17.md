# AqStoqFlow Priority 007C Error Boundary Migration Ratchet Report

Date: 2026-06-17

Skill: `priority-007c-aqstoqflow-error-boundary-migration-ratchet`

## Objective

Create, install, validate, and run the 007C skill to continue the unified error-handling migration after Priority 007B. This slice adds a raw-error boundary scanner, starts the report-mode ratchet, and migrates a focused upload/receipt API route slice plus directly related POS receipt service errors onto canonical safe responses and typed domain errors.

## Installed Skill

- Installed path: `C:\Users\J COMPUTER\.codex\skills\priority-007c-aqstoqflow-error-boundary-migration-ratchet`
- Validation: `Skill is valid!`
- References read:
  - `references/runtime-boundary.md`
  - `references/migration-order.md`
  - `references/scanner-classification.md`

## Files Inspected

- `lib/error-handling/canonical.ts`
- `lib/error-handling/route-response.ts`
- `services/_shared/action-errors.ts`
- `services/_shared/protect.ts`
- `what-next/AQSTOQFLOW_PRIORITY_007B_ERROR_NOTIFICATION_UNIFIER_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `app/api/uploads/[...path]/route.ts`
- `app/api/receipts/[receiptId]/route.ts`
- `app/api/uploadthing/core.ts`
- `services/pos/receipt.service.ts`
- `services/pos/__tests__/receipt-public.test.ts`

## Files Changed In This Slice

- `scripts/raw-error-boundary-gate.js`
- `scripts/__tests__/raw-error-boundary-gate.test.js`
- `package.json`
- `lib/error-handling/route-response.ts`
- `lib/error-handling/__tests__/route-response.test.ts`
- `app/api/uploads/[...path]/route.ts`
- `app/api/receipts/[receiptId]/route.ts`
- `app/api/uploadthing/core.ts`
- `services/pos/receipt.service.ts`
- `services/pos/__tests__/receipt-public.test.ts`
- `what-next/AQSTOQFLOW_PRIORITY_007C_RAW_ERROR_BOUNDARY_GATE_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_PRIORITY_007C_RAW_ERROR_BOUNDARY_GATE_REPORT_2026-06-17.json`
- `what-next/AQSTOQFLOW_PRIORITY_007C_ERROR_BOUNDARY_MIGRATION_RATCHET_REPORT_2026-06-17.md`

The working tree already contained many unrelated modified and untracked files before this slice. This run did not revert or normalize those unrelated changes.

## Scanner Added

Added `scripts/raw-error-boundary-gate.js` with:

- scan roots: `actions`, `app/api`, `services`, `lib/error-handling`;
- modes: `report`, `warn`, `fail`;
- optional `--baseline`, `--out`, `--json-out`, and `--include-allowed`;
- classifications:
  - `CLIENT_BOUNDARY_UNSAFE`
  - `SERVICE_RAW_DOMAIN_ERROR`
  - `NEEDS_MIGRATION`
  - `INTERNAL_LOGGING_ONLY`
  - `TEST_ONLY`
  - `ALLOWED_CONTROL_FLOW`
- future baseline ratchet support for new or worsened active findings.

Added package scripts:

- `npm run error:boundary`
- `npm run error:boundary:fail`

## Scanner Result

Saved reports:

- `what-next/AQSTOQFLOW_PRIORITY_007C_RAW_ERROR_BOUNDARY_GATE_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_PRIORITY_007C_RAW_ERROR_BOUNDARY_GATE_REPORT_2026-06-17.json`

Current report-mode result after migration:

- Active unsafe raw-error findings: 283
- Allowed classified findings: 35
- Total raw-error callsites scanned: 318
- Active classifications:
  - `CLIENT_BOUNDARY_UNSAFE`: 156
  - `SERVICE_RAW_DOMAIN_ERROR`: 125
  - `NEEDS_MIGRATION`: 2

Before the focused route/service migration, the scanner found 288 active findings. This slice removed five active findings from upload/receipt boundary paths and POS receipt service raw errors.

## Migrated Domains

### Upload API Route

`app/api/uploads/[...path]/route.ts` now uses canonical route helpers for authorization, validation, not-found, and unexpected failures:

- `jsonAuthzError`
- `jsonErrorResponse`

The route no longer uses `console.error` or a bare `Internal Server Error` response for unexpected failures.

### Public Receipt API Route

`app/api/receipts/[receiptId]/route.ts` now returns a safe correlation-aware error envelope through `jsonErrorEnvelopeResponse` while preserving the legacy `success: false` response shape.

### UploadThing Middleware

`app/api/uploadthing/core.ts` now throws `AuthRequiredError` instead of a raw `Error` for missing upload auth context.

### POS Receipt Service

`services/pos/receipt.service.ts` now uses typed service errors for the touched receipt paths:

- `NotFoundError` for unavailable receipts.
- `BusinessRuleError` for legal delivery blocker and invalid WhatsApp receipt destination failures.

## Error-Handling Helper Change

`lib/error-handling/route-response.ts` now exposes `jsonErrorEnvelopeResponse`. This keeps canonical normalization, redaction, status mapping, structured logging, and correlation metadata while allowing legacy route envelopes like `{ success: false }` to remain compatible.

## Regression Tests

Added or updated tests for:

- scanner detection of action/route raw errors;
- scanner classification of service raw domain errors;
- scanner allowlisting of test-only and canonical error-handler internals;
- scanner recognition of explicit Next.js control-flow rethrows;
- scanner baseline ratchet behavior;
- safe route envelope responses;
- typed receipt not-found errors.

## Verification

Passed:

```powershell
node --check scripts/raw-error-boundary-gate.js
npm test -- scripts/__tests__/raw-error-boundary-gate.test.js lib/error-handling/__tests__/route-response.test.ts services/pos/__tests__/receipt-public.test.ts --runInBand
node scripts/raw-error-boundary-gate.js --mode report --out what-next/AQSTOQFLOW_PRIORITY_007C_RAW_ERROR_BOUNDARY_GATE_REPORT_2026-06-17.md --json-out what-next/AQSTOQFLOW_PRIORITY_007C_RAW_ERROR_BOUNDARY_GATE_REPORT_2026-06-17.json
npm run prisma:validate
npm run service:boundary:ratchet
npm run typecheck
npm run lint
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\J COMPUTER\.codex\skills\priority-007c-aqstoqflow-error-boundary-migration-ratchet"
```

Notes:

- `npm run lint` passed with existing warnings about React hook dependencies, `<img>` usage, and the known `next lint` deprecation notice.
- `npm run service:boundary:ratchet` passed with no new service-boundary findings against the saved baseline.
- `npm run prisma:validate` passed with the existing Prisma 7 config deprecation warning.

## Remaining Unsafe Findings

The scanner must remain in report mode for now. Remaining active findings are real legacy migration debt:

- role/user/auth action boundaries;
- unit, tax-rate, location, supplier, and customer management actions;
- analytics, dashboard, inventory, organization, storage, and POS action paths;
- POS service raw domain errors;
- purchase-order service raw domain errors;
- two non-client raw patterns classified as `NEEDS_MIGRATION`.

## Next Slice

Run the same 007C skill for the next migration order item:

1. Migrate role, user, and auth action boundaries onto canonical safe action envelopes.
2. Remove local raw `console.error`, `throw new Error`, and `throw new Error(error.message)` patterns.
3. Preserve public action result shapes while adding correlation metadata.
4. Rerun `npm run error:boundary` and keep the scanner in report mode until active client-boundary leakage reaches zero or reviewed allowlist entries exist.

## Status

Priority 007C is complete for this implementation slice. The skill is installed and valid, the codebase now has a reusable raw-error boundary scanner with focused regression coverage, upload and receipt HTTP boundaries are safer, related receipt service errors are typed, and the remaining raw-error debt is inventoried for controlled follow-up migration.
