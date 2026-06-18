# AqStoqFlow Identity Boundary Hardening Slice Report

Generated: 2026-06-18

## Scope

Migrated the next identity-boundary slice for auth, users, invites, password workflows, OTP verification, and role CRUD away from action-owned persistence and local raw-error handling.

The runtime action boundary now keeps its legacy public shapes while delegating persistence, transactions, token state, audit writes, and Prisma error exposure risk to service-owned workflows.

## Runtime Changes

- Added `services/users/user-identity.service.ts` as the service owner for:
  - organization owner creation and registration;
  - invitation creation/reissue and invitation redemption;
  - organization user and invite reads;
  - single user reads;
  - password change, password reset request, password reset completion;
  - email OTP verification.
- Extended `services/users/user-lifecycle.service.ts` so user deactivation owns the security-event audit write instead of leaving it in the action.
- Added `services/roles/role.service.ts` as the service owner for:
  - role organization resolution;
  - role list/read;
  - role create/update;
  - role permission catalog validation, duplicate checks, scoped writes, reloads, and audit logging.
- Thinned `actions/auth.ts`, `actions/users/*`, and `actions/roles/*` so they authenticate, authorize, delegate to services, revalidate where needed, and map unexpected failures through canonical safe action helpers.
- Removed direct Prisma imports and direct `db`/`tx` calls from the targeted identity runtime actions.
- Replaced local raw `console`/`throw new Error` boundary patterns in the targeted runtime actions with `safeStatusActionErrorResult`, `safeSuccessActionErrorResult`, or typed service errors.

## Preserved Action Shapes

- Invite, user creation, password reset, password update, and OTP actions continue returning their existing status-style payloads such as `{ error, status, data }` or `{ status }`.
- Role actions continue returning success-style payloads such as `{ success, data, error }`.
- User list/read actions preserve the existing silent-denial fallback shapes: `[]` or `null`.
- Password reset request keeps anti-enumeration behavior by returning a generic 200 response for unknown accounts and unexpected email failures.

## Focused Test Coverage

Added or updated focused Jest coverage for:

- Auth action edge cases:
  - registration password mismatch;
  - terms not accepted;
  - valid registration delegation;
  - missing login credentials;
  - Better Auth email-not-verified normalization.
- Role boundaries:
  - denied action calls do not reach the role service;
  - allowed action calls preserve envelopes and revalidation;
  - role service enforces org scoping, super-user org override validation, permission catalog validation, duplicate-role prevention, scoped create/update, and audit evidence.
- User identity workflows:
  - registration conflict without organization creation;
  - expired invite redemption without user creation;
  - duplicate pending invite prevention;
  - old-password mismatch without mutation;
  - successful password update with session revocation;
  - reset-link anti-enumeration;
  - invalid reset token without mutation;
  - OTP verification token clearing and audit.
- User lifecycle:
  - self-deactivation refusal;
  - unknown-user refusal without mutation;
  - deactivation cancels pending invites, locks the account, writes audit evidence, and emits the security event.

## Verification

- `npm test -- --runInBand actions/__tests__/auth-actions.test.ts actions/roles/__tests__/role-actions.test.ts services/roles/__tests__/role.service.test.ts services/users/__tests__/user-lifecycle.service.test.ts services/users/__tests__/user-identity.service.test.ts`
  - Passed: 5 suites, 28 tests.
- Target action boundary scan:
  - `actions/users`, `actions/roles`, and `actions/auth.ts` have no runtime matches for direct Prisma imports, direct `db`/`prisma`/`tx` calls, `throw new Error`, or `console.error`.
- `npm run error:boundary:fail`
  - Passed.
  - Active unsafe raw-error findings: 0.
- `npm run service:boundary:ratchet`
  - Passed against `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.json`.
  - Baseline active violations: 283.
  - Current active violations: 73.
  - Active violation delta: -210.
  - New active findings: 0.
  - Resolved active findings: 209.
  - Worsened classifications: 0.
- `npm run prisma:validate`
  - Passed.
  - Note: Prisma emitted the existing deprecation warning for `package.json#prisma`.
- `npm run typecheck`
  - Passed.

## Remaining Boundary Backlog

The requested identity slice is clean, but the service-boundary ratchet still reports older non-identity backlog. Remaining active findings are mostly in customer, supplier, tax-rate, unit, organization settings, storage config, location, item-supplier, component Prisma type coupling, and the legacy auth invite page.

These are outside this identity-boundary slice and should be handled domain by domain so each migration can preserve its existing action result shape and tests.
