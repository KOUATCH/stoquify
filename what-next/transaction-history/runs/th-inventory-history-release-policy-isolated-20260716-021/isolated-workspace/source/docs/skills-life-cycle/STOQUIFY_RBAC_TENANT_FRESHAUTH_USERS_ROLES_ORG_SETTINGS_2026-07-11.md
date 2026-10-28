# Stoquify RBAC Tenant Fresh-Auth Enforcer Run

Date: 2026-07-11
Skill: stoquify-rbac-tenant-freshauth-enforcer
Scope: actions/users/*, actions/roles/*, actions/organization/organization-settings-actions.ts

## Executive Summary

The scoped enforcer pass hardened the user, role, and organization settings action surfaces around trusted server-side RBAC context, tenant-bound organization access, fresh-auth step-up for sensitive writes, and module-observe evidence. Public identity/bootstrap flows were intentionally left public or token/password-bound rather than forced behind dashboard RBAC.

## Implemented Controls

- User read actions now require `users.read` or `users.invite | users.read`, assert the requested organization against the authenticated RBAC context, and emit settings-module observe evidence.
- User sensitive writes now require fresh auth plus explicit permission checks: `users.invite`, `users.delete`, and `users.password.reset`.
- Role reads and writes now expose direct permission evidence with `roles.read`, `roles.create`, and `roles.update`; role writes require fresh auth.
- Organization settings reads and writes now require `system.organization.read` or `system.organization.update`, tenant assertion, and settings-module observe evidence; writes require fresh auth.
- Fresh-auth failures now normalize to canonical `FRESH_AUTH_REQUIRED` action responses instead of being hidden behind generic safe-action messages.
- `system.organization.read` remains compatible with existing `COMPANY_READ` navigation/settings grants, with regression coverage.

## Key Files Changed

- `actions/users/getOrgUsers.ts`
- `actions/users/getOrgInvites.ts`
- `actions/users/getUserById.ts`
- `actions/users/sendInvite.ts`
- `actions/users/deleteUser.ts`
- `actions/users/updateUserPassword.ts`
- `actions/roles/getOrgRoles.ts`
- `actions/roles/getRoleById.ts`
- `actions/roles/createRole.ts`
- `actions/roles/updateRole.ts`
- `actions/roles/role-auth.ts`
- `actions/organization/organization-settings-actions.ts`
- `actions/_shared/safe-action-responses.ts`
- `lib/error-handling/canonical.ts`
- `lib/security/rbac-permissions.ts`
- `services/organization/organization-settings.service.ts`

## Public Flow Exceptions

These files remain intentionally outside dashboard RBAC because they are public identity, invitation, reset, or OTP surfaces:

- `actions/users/createUser.ts`
- `actions/users/createInvitedUser.ts`
- `actions/users/sendResetLink.ts`
- `actions/users/verifyOtp.ts`
- `resetUserPassword` in `actions/users/updateUserPassword.ts`

## Inventory Evidence

`npm run module:surface:inventory` regenerated 306 records. The targeted protected surfaces are now mapped, including:

- `actions/organization/organization-settings-actions.ts` -> `settings`, `system.organization.read`, `requirePermission`
- `actions/roles/createRole.ts` -> `settings`, `roles.create`, `requirePermission`
- `actions/roles/updateRole.ts` -> `settings`, `roles.update`, `requirePermission`
- `actions/roles/getOrgRoles.ts` and `actions/roles/getRoleById.ts` -> `settings`, `roles.read`, `requirePermission`
- `actions/users/deleteUser.ts` -> `settings`, `users.delete`, `requirePermission`
- `actions/users/getOrgInvites.ts` -> `settings`, `users.invite | users.read`, `requireAnyPermission`
- `actions/users/getOrgUsers.ts` and `actions/users/getUserById.ts` -> `settings`, `users.read`, `requirePermission`
- `actions/users/sendInvite.ts` -> `settings`, `users.invite`, `requirePermission`
- `actions/users/updateUserPassword.ts` -> `settings`, `users.password.reset`, `requirePermission`

Remaining targeted inventory exceptions are deliberate public identity flows or non-server utility metadata, not privileged dashboard mutations.

## Verification

Passed:

- `npm test -- --runInBand actions/_shared/__tests__/safe-action-responses.test.ts lib/security/__tests__/rbac-permissions.test.ts actions/roles/__tests__/role-actions.test.ts`
- `npm run typecheck`
- `npm run module:surface:inventory`
- `npm run api:guard:inventory:fail`
- `npm run service:boundary:fail`
- `git diff --check -- <scoped RBAC enforcer paths>`

Notes:

- The full-worktree `git diff --check` still reports unrelated trailing blank-line findings in pre-existing active files outside this scoped run, including POS and security-txt changes. The scoped RBAC enforcer paths pass.
- The first `npm run typecheck` attempt timed out at two minutes with no diagnostics; the longer rerun completed successfully.

## Recommended Next Slice

Create a narrow follow-up enforcer for the remaining settings-adjacent inventory records that are not public identity flows, especially utility files that the module inventory still classifies as action surfaces. That pass should decide whether the inventory script should distinguish utility metadata from executable server actions, rather than weakening dashboard RBAC gates.
