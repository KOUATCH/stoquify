# AqStoqFlow Codebase Review Remediation Report

Date: 2026-06-08

This report closes the review findings documented in `docs/CODEBASE_REVIEW_REPORT_2026-06-08.md`.
The remediation work focused on removing release blockers, hardening authorization boundaries, restoring test coverage, and leaving a clean baseline for the next stage of development.

## Executive Summary

All critical findings from the graphify-assisted codebase review were remediated.

- The production build blocker caused by BetterAuth/Kysely bundling was fixed.
- Role management server actions now enforce authenticated organization scope and role permissions.
- Organization-scoped list actions no longer trust arbitrary client-provided organization ids.
- Public receipt access no longer exposes customer email or phone details.
- A Jest test baseline was added and the full test command now passes.
- The deleted test API route no longer appears in the production route table.

## Remediated Findings

### 1. Production Build Blocker

Status: fixed

The build previously failed when Next.js attempted to bundle BetterAuth adapter internals that referenced Kysely migration exports unavailable in the installed Kysely version.

Change made:

- Added BetterAuth server-only packages to `serverExternalPackages` in `next.config.mjs`.

Result:

- `npm run build` now completes successfully.

### 2. Role Management Authorization Bypass

Status: fixed

The role actions previously allowed direct role lookup and update by id without consistently enforcing authenticated organization scope or role-management permissions.

Changes made:

- Added `actions/roles/role-auth.ts` for shared role-action authorization.
- Required `roles.read` for role reads.
- Required `roles.create` for role creation.
- Required `roles.update` for role updates.
- Required `roles.permissions.assign` when assigning permissions the actor does not already hold.
- Scoped role reads and writes by the active organization.
- Replaced direct `update` by id with organization-scoped `updateMany` plus a scoped reload.

Result:

- Role reads, creates, and updates are constrained to the authenticated actor's organization and permissions.
- Cross-tenant role mutation by id is blocked.

### 3. Client-Provided Organization ID Trust

Status: fixed

Some organization-scoped actions accepted an `organizationId` from the client and used it directly after only checking that a user session existed.

Changes made:

- Added `services/_shared/resolve-action-organization.ts`.
- Defaulted organization-scoped reads to the authenticated organization.
- Allowed cross-organization reads only for wildcard-authorized users.
- Validated explicitly requested organizations as active and not deleted.
- Applied this resolver to:
  - `actions/locations/getOrgLocations.ts`
  - `actions/units/getOrgUnits.ts`
  - `actions/suppliers/itemSupplierActions.ts`

Result:

- Regular users cannot query another organization's locations, units, or item suppliers by changing a client-side id.

### 4. Public Receipt PII Exposure

Status: fixed

The public receipt endpoint used a public receipt service that returned customer contact fields.

Change made:

- Updated `services/pos/receipt.service.ts#getPublicSalesReceipt` to redact `customerEmail` and `customerPhone`.

Result:

- Public receipt views keep receipt content available while suppressing customer contact details.
- Authenticated receipt retrieval still preserves contact details for authorized internal workflows.

### 5. Missing Test Baseline

Status: fixed

The project had Jest configured but no executable tests, so `npm test -- --runInBand` failed with "No tests found."

Tests added:

- `actions/roles/__tests__/role-actions.test.ts`
- `actions/locations/__tests__/org-list-actions.test.ts`
- `services/pos/__tests__/receipt-public.test.ts`

Result:

- The full Jest command now passes with 3 suites and 11 tests.

## Files Changed

- `next.config.mjs`
- `actions/roles/role-auth.ts`
- `actions/roles/getOrgRoles.ts`
- `actions/roles/getRoleById.ts`
- `actions/roles/createRole.ts`
- `actions/roles/updateRole.ts`
- `services/_shared/resolve-action-organization.ts`
- `actions/locations/getOrgLocations.ts`
- `actions/units/getOrgUnits.ts`
- `actions/suppliers/itemSupplierActions.ts`
- `hooks/useAllLocationsQueries.ts`
- `services/pos/receipt.service.ts`
- `app/api/test/route.ts` deleted
- `actions/roles/__tests__/role-actions.test.ts`
- `actions/locations/__tests__/org-list-actions.test.ts`
- `services/pos/__tests__/receipt-public.test.ts`

## Verification

The following commands were run after remediation:

- `npx jest actions/roles/__tests__/role-actions.test.ts actions/locations/__tests__/org-list-actions.test.ts services/pos/__tests__/receipt-public.test.ts --runInBand`
  - Passed: 3 test suites, 11 tests.
- `npm test -- --runInBand`
  - Passed: 3 test suites, 11 tests.
- `npm run prisma:validate`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run lint`
  - Passed with existing warnings.
- `npm run build`
  - Passed.

## Remaining Warnings

These items did not block the cleaned baseline, but should be handled in the next stage:

- Prisma warns that `package.json#prisma` configuration is deprecated and should move to a Prisma config file before Prisma 7.
- BetterAuth warns that the base URL is not configured in the current build environment.
- BetterAuth warns that Google provider credentials are missing in the current build environment.
- The build script uses `next build --no-lint`, so linting remains a separate command.
- Existing lint warnings remain around one async client component, hook dependency arrays, and `<img>` usage.
- Public receipt access is now privacy-safe for contact fields, but a stronger future design would use signed expiring receipt tokens.

## Recommended Next Stage

1. Move Prisma configuration out of `package.json` before upgrading to Prisma 7.
2. Set required BetterAuth environment variables in deployment environments.
3. Decide whether public receipt URLs should require signed expiring tokens.
4. Add audit logging for role create/update events.
5. Expand tests around role assignment UI flows and organization-scoped server actions.

## Closure

The review blockers are closed. The codebase now has a passing build, passing typecheck, passing lint command, a working Jest baseline, scoped authorization for the reviewed server actions, and a safer public receipt surface.
