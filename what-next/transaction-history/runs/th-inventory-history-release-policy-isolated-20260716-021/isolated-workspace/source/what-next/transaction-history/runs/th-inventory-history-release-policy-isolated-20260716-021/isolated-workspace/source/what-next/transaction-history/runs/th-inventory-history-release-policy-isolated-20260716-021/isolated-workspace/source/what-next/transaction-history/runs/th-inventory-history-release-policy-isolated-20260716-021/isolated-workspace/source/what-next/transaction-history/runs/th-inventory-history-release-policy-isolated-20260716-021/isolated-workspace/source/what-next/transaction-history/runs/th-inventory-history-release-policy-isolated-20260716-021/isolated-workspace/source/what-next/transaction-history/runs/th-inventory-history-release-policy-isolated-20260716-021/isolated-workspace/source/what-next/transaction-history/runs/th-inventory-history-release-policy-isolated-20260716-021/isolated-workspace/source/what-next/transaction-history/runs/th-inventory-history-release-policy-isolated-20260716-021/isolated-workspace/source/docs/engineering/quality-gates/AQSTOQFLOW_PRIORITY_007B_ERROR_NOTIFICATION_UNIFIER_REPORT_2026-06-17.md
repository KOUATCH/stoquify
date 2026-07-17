# AqStoqFlow Priority 007B Error Notification Unifier Report

Date: 2026-06-17

Skill created and run:
- `priority-007b-aqstoqflow-error-notification-unifier`
- Installed at `C:\Users\J COMPUTER\.codex\skills\priority-007b-aqstoqflow-error-notification-unifier`
- Validator result: `Skill is valid!`

## Objective

Unify the two existing AqStoqFlow error layers into one canonical enterprise error and notification foundation:

- `lib/error-handling/*` becomes the system-wide source of truth.
- `services/_shared/action-errors.ts` becomes a compatibility facade for existing service ergonomics.
- Server actions and App Router API routes return user-safe, correlation-aware envelopes instead of raw internal errors.

## Files Inspected

- `lib/error-handling/types.ts`
- `lib/error-handling/categories.ts`
- `lib/error-handling/error-handler.ts`
- `lib/error-handling/server-action-wrapper.ts`
- `lib/error-handling/notification-integration.ts`
- `lib/error-handling/hooks.ts`
- `services/_shared/action-errors.ts`
- `services/_shared/protect.ts`
- `app/api/v1/organisations/route.ts`
- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`

## Files Changed

Skill installation:
- `.codex-skill-staging/priority-007b-aqstoqflow-error-notification-unifier/SKILL.md`
- `.codex-skill-staging/priority-007b-aqstoqflow-error-notification-unifier/references/runtime-boundary.md`
- `.codex-skill-staging/priority-007b-aqstoqflow-error-notification-unifier/references/compatibility-contract.md`
- `.codex-skill-staging/priority-007b-aqstoqflow-error-notification-unifier/references/migration-checklist.md`
- Installed copy under `C:\Users\J COMPUTER\.codex\skills\priority-007b-aqstoqflow-error-notification-unifier`

Implementation:
- `lib/error-handling/canonical.ts`
- `lib/error-handling/route-response.ts`
- `lib/error-handling/types.ts`
- `lib/error-handling/categories.ts`
- `lib/error-handling/error-handler.ts`
- `lib/error-handling/server-action-wrapper.ts`
- `lib/error-handling/notification-integration.ts`
- `lib/error-handling/hooks.ts`
- `lib/error-handling/index.ts`
- `services/_shared/action-errors.ts`
- `services/_shared/protect.ts`
- `app/api/v1/organisations/route.ts`
- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`

Tests:
- `lib/error-handling/__tests__/canonical.test.ts`
- `lib/error-handling/__tests__/route-response.test.ts`
- `services/_shared/__tests__/action-errors.test.ts`
- `services/_shared/__tests__/protect.test.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `actions/purchasing/__tests__/ap-control.actions.test.ts`
- `actions/accounting/__tests__/settings.actions.test.ts`

## Canonical Error Architecture

Added `lib/error-handling/canonical.ts` as the canonical mapper. It now provides:

- stable error codes;
- category and severity;
- HTTP/action status;
- retryability and recoverability;
- user-safe message;
- redacted operator message;
- correlation/request ID;
- safe metadata;
- validation field errors;
- notification intent.

It classifies:

- Zod validation errors;
- RBAC denial shapes;
- existing service `ApplicationError` shapes;
- Prisma known request errors;
- unknown exceptions;
- Next.js redirect/not-found control-flow errors, which are rethrown instead of normalized.

## Compatibility Strategy

`services/_shared/action-errors.ts` now delegates to the canonical mapper while preserving existing ergonomics:

- `ApplicationError`
- `BusinessRuleError`
- `NotFoundError`
- `ConflictError`
- `toSafeActionError`
- old action fields: `error`, `status`, `code`

It also adds safe fields:

- `correlationId`
- `category`
- `severity`
- `retryable`
- `fieldErrors`
- safe metadata

Existing service tests can continue to assert `instanceof BusinessRuleError`, `NotFoundError`, and `ConflictError`.

## Boundary Migration

### Protected Actions

`services/_shared/protect.ts` now returns correlation-aware safe failure envelopes for:

- RBAC denial;
- fresh-auth requirement;
- domain/service errors;
- unexpected internal errors.

Existing client-facing fields are preserved while adding `code`, `correlationId`, `category`, `severity`, and `retryable`.

### App Router API Routes

Added `lib/error-handling/route-response.ts` and migrated:

- `GET/POST /api/v1/organisations`
- `GET/POST /api/v1/organisations/[id]/items`
- `GET/POST /api/v1/organisations/[id]/briefItems`

The migrated routes now use service/read-model methods, safe auth responses, safe route error JSON, method-not-allowed mapping, and structured redacted operator logging.

Confirmed no `console.error`, raw `{ error: "Internal Server Error" }`, or raw `throw error` pattern remains in these migrated organisation API routes.

## Notification And Category Unification

Extended `ErrorCategory` and the notification maps for:

- `external`
- `accounting`
- `payment`
- `payroll`
- `compliance`

Updated category prefixes, notification integration, and client hook maps so the canonical taxonomy remains type-safe and exhaustive.

## Tests Added Or Updated

Added:

- canonical Zod, Prisma, and redaction tests;
- action compatibility facade tests;
- safe route response tests.

Updated:

- protected-action tests to assert the old fields plus new safe metadata;
- AP, payroll, and accounting action tests to accept the richer protected-action failure envelope.

## Verification Results

Command:

```powershell
python C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\J COMPUTER\.codex\skills\priority-007b-aqstoqflow-error-notification-unifier
```

Result:
- Passed: `Skill is valid!`

Command:

```powershell
npm test -- lib/error-handling services/_shared actions app/api --runInBand
```

Result:
- Passed.
- Test suites: 16 passed.
- Tests: 62 passed.

Command:

```powershell
npm run prisma:validate
```

Result:
- Passed.
- Existing warning remains: `package.json#prisma` configuration is deprecated for Prisma 7.

Command:

```powershell
npm run service:boundary:ratchet
```

Result:
- Passed.
- Active findings: 187.
- Baseline active findings: 283.
- New active findings: 0.
- Resolved active findings: 95.

Command:

```powershell
npm run typecheck
```

Result:
- Passed.

Command:

```powershell
npm run lint
```

Result:
- Passed with existing warnings:
  - `components/auth/EmailVerificationForm.tsx` hook dependency warning.
  - existing `<img>` warnings in item/form/carousel/inventory components.
  - Next.js `next lint` deprecation warning.

Command:

```powershell
git diff --check
```

Result:
- No whitespace errors in this slice.
- Existing CRLF warnings remain for unrelated files: `app/globals.css`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.json`, and `graphify-out/manifest.json`.

## Remaining Raw-Error Surfaces

This slice intentionally did not rewrite every legacy raw error. The statutory scan still shows many remaining `throw new Error`, `throw error`, and `console.error` patterns in older actions/services, especially:

- analytics and dashboard actions;
- role and user legacy actions;
- unit, tax-rate, location, supplier management actions;
- POS service/action paths;
- legacy purchase-order service paths;
- upload and receipt API routes.

Those should now migrate into the canonical mapper instead of creating local error handling variants.

## Next Migration Slices

Recommended order:

1. Migrate role/user/auth legacy actions onto canonical safe action envelopes.
2. Migrate unit, tax-rate, location, supplier, and customer management actions to remove local `getActionErrorMessage` duplication.
3. Migrate remaining App Router API routes, especially uploads and receipts.
4. Replace raw errors in POS and purchase-order legacy services with typed domain errors.
5. Add a report-mode raw-error scanner, then ratchet it once active client-boundary leakage reaches zero.

## Completion Status

Priority 007B is complete for this implementation slice. AqStoqFlow now has a canonical error mapper, a compatibility facade for newer service errors, safe protected-action envelopes, safe representative API route envelopes, correlation metadata, notification taxonomy alignment, and focused regression coverage.
