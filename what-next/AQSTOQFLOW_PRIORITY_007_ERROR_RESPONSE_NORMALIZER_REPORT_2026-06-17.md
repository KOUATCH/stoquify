# AqStoqFlow Priority/Exam 007 Error Response Normalizer Report

Date: 2026-06-17

## Skills Run

- `priority-007-error-response-normalizer`
- `exam-007-aqstoqflow-error-response-normalizer`

## Objective

Harmonize the Priority 007 and Exam 007 guidance by normalizing legacy client-boundary error responses without replacing the existing enterprise error stack. The implementation keeps the canonical error taxonomy in `lib/error-handling` and `services/_shared/action-errors.ts`, then adds a small compatibility bridge for legacy actions that still require historical response shapes.

## Completed Scope

- Added a shared legacy action bridge in `actions/_shared/safe-action-responses.ts`.
- Added regression tests in `actions/_shared/__tests__/safe-action-responses.test.ts`.
- Migrated the first high-priority legacy action boundary group:
  - `actions/auth.ts`
  - `actions/roles/createRole.ts`
  - `actions/roles/getOrgRoles.ts`
  - `actions/roles/getRoleById.ts`
  - `actions/roles/role-auth.ts`
  - `actions/roles/updateRole.ts`
  - `actions/users/createUser.ts`
  - `actions/users/createInvitedUser.ts`
  - `actions/users/deleteUser.ts`
  - `actions/users/getOrgInvites.ts`
  - `actions/users/getOrgUsers.ts`
  - `actions/users/getUserById.ts`
  - `actions/users/sendInvite.ts`
  - `actions/users/sendResetLink.ts`
  - `actions/users/updateUserPassword.ts`
- Extended `AuthResponse` metadata in `types/types.ts` so auth actions can return canonical status, code, category, severity, retryability, field errors, and correlation IDs.

## Controls Added

- Legacy action failures now flow through `toSafeActionError`.
- Unsafe `console.error` / `console.log` usage in the touched auth, role, and user actions was replaced with safe structured logging.
- Raw role/auth errors were replaced with typed domain errors such as `ForbiddenError`, `NotFoundError`, `ConflictError`, and `BusinessRuleError`.
- Registration duplicate-key handling now emits user-safe conflict messages for email, slug, and phone conflicts instead of leaking implementation detail.
- Legacy success-style and status-style action shapes are preserved while carrying canonical error metadata.

## Scan Result

The raw-error boundary report was regenerated:

- `what-next/AQSTOQFLOW_PRIORITY_007_ERROR_RESPONSE_NORMALIZER_RAW_ERROR_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_PRIORITY_007_ERROR_RESPONSE_NORMALIZER_RAW_ERROR_REPORT_2026-06-17.json`

Current active findings:

- `CLIENT_BOUNDARY_UNSAFE`: 127
- `SERVICE_RAW_DOMAIN_ERROR`: 125
- `NEEDS_MIGRATION`: 2
- Total active findings: 254

The touched auth, role, and user action paths no longer match the focused raw-error pattern scan:

```powershell
rg -n "throw new Error\(|throw error|console\.error\(|console\.log\(" actions\auth.ts actions\roles actions\users
```

## Verification

Passed:

```powershell
npm test -- actions/_shared/__tests__/safe-action-responses.test.ts actions/roles/__tests__/role-actions.test.ts services/_shared/__tests__/action-errors.test.ts --runInBand
npm run typecheck
npm run prisma:validate
npm run service:boundary:ratchet
npm run lint
```

Lint exits successfully with pre-existing warnings in:

- `components/auth/EmailVerificationForm.tsx`
- `components/dashboard/items/ModernItemFormForEditing.tsx`
- `components/frontend/custom-carousel.tsx`
- `components/ui/groups/inventory/ItemManagement.tsx`

## Remaining Work

The full 007 gate remains in report mode because active findings still exist. Recommended next migration order:

1. Customer, supplier, location, unit, and tax-rate management actions.
2. Remaining App Router API routes, especially upload and receipt boundaries.
3. POS and legacy purchase-order services that still raise raw domain errors.
4. Report-mode raw-error scanner ratchet once client-boundary active findings reach zero.
5. Final service-domain raw-error cleanup, then ratchet the service error gate.

## Close Position

This slice harmonizes the two 007 skills around one system-wide normalization direction: canonical typed errors at the source, safe envelopes at client boundaries, structured logging with correlation metadata, and compatibility helpers only where legacy response shapes still exist. The codebase is improved, but the broader error-normalization program is not complete until the remaining 254 active raw-error findings are migrated and ratcheted.
