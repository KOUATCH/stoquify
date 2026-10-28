# StockFlow Security Hardening Report - 2026-06-02

## Scope

This pass focused on the most exploitable application-layer risks found in the current Next.js/Prisma codebase: authentication, authorization, invite onboarding, user management, public API routes, upload/file access, security headers, and sensitive logging.

The repository already had a large dirty worktree and project-wide TypeScript failures before this pass. Changes were kept to the security-critical surfaces touched below.

## Critical Findings Fixed

### 1. Invite token tampering and invite data leakage

Risk: Invite acceptance previously trusted client-supplied organization and role identifiers, and invite links exposed organization, role, and email values in URLs. An attacker with a valid token could attempt role or tenant substitution.

Fix:
- Invite redemption now trusts only the server-side invite record.
- Client no longer submits organization or role IDs for invite acceptance.
- Invite links contain only the token.
- Invite roles are validated against the authenticated inviter's organization.
- Invite tokens are no longer returned from organization invite listings.
- Invite create/redeem events are audit logged.

Touched files:
- `actions/users/sendInvite.ts`
- `actions/users/createInvitedUser.ts`
- `components/Forms/InvitedUserRegistration.tsx`
- `app/(auth)/user-invite/[organisationId]/page.tsx`
- `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx`

### 2. Cross-tenant user and role access

Risk: Several user-management actions accepted organization/user/role IDs without consistently proving the caller belonged to that organization and had the required permission. This could allow user enumeration, deletion, password changes, or role assignment across tenants.

Fix:
- Added centralized safe user selection and permission helpers.
- User list/read/delete/role/password actions now scope database access to the authenticated user's organization.
- Role assignment validates both target user and target role belong to the caller's organization.
- Self-delete is blocked.
- User table UI now consumes a safe DTO instead of raw Prisma `User` records.

Touched files:
- `lib/security/server-authz.ts`
- `lib/permissions.ts`
- `actions/users/getAllUsers.ts`
- `actions/users/getOrgUsers.ts`
- `actions/users/getUserById.ts`
- `actions/users/deleteUser.ts`
- `actions/users/getOrgInvites.ts`
- `actions/users/updateUserPassword.ts`
- `actions/roles/updateUserRole.ts`
- `actions/users.ts`
- `app/[locale]/(dashboard)/dashboard/settings/users/page.tsx`
- `app/[locale]/(dashboard)/dashboard/settings/users/columns.tsx`

### 3. Weak password lifecycle

Risk: Password creation/reset paths allowed weak or reused passwords, and some flows did not populate password history.

Fix:
- Added shared password policy utilities.
- Enforced password policy for registration, invited user creation, user creation, password change, and reset flows.
- Password history is written on account creation and password update paths.
- Added optional Have I Been Pwned k-anonymity check helper for breached-password detection.

Touched files:
- `lib/security/password-utils.ts`
- `lib/security/hibp.ts`
- `services/auth/password-policy.ts`
- `actions/auth.ts`
- `actions/users/createUser.ts`
- `actions/users/createInvitedUser.ts`
- `actions/users/updateUserPassword.ts`
- `actions/users.ts`

### 4. Authentication hardening gaps

Risk: Credentials login lacked lockout behavior, leaked sensitive details to logs, and Google account linking was permissive.

Fix:
- Credentials login now normalizes email lookup.
- Failed login attempts are persisted and accounts lock temporarily after repeated failures.
- Inactive, unverified, and locked accounts are rejected.
- Successful login resets failed-attempt state and updates last login.
- Google sign-in requires an existing active verified account and no longer enables dangerous email account linking.
- Session lifetime reduced to 8 hours.
- Production trust-host behavior is no longer enabled by default.
- Credential payload and auth result logging was removed.

Touched files:
- `auth.ts`
- `actions/auth.ts`
- `components/Forms/LoginForm.tsx`

### 5. Public API route exposure

Risk: Organization API routes exposed organization/item data based on path parameters without a session/org check, and one route allowed organization creation through a public API surface.

Fix:
- Organization-scoped API routes now require an authenticated session and matching organization.
- List endpoints cap page size.
- Public organization creation endpoint now returns `405`.
- The duplicate credential-verification API route was removed.

Touched files:
- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- `app/api/v1/organisations/route.ts`
- `app/api/auth/verify-credentials/route.ts`

### 6. Upload and local-file access risks

Risk: Upload routes and local upload serving/deletion paths were vulnerable to tenant bypass, unsafe filename/path handling, and SVG/script content risks.

Fix:
- Uploadthing routes now require authenticated users.
- Upload metadata records user and organization context.
- Local upload serving requires session org match and exact safe path shape.
- Upload storage and deletion enforce organization match, safe filename checks, resolved path containment, and MIME-to-extension mapping.
- SVG serving is rejected from the local upload API.

Touched files:
- `app/api/uploadthing/core.ts`
- `app/api/uploads/[...path]/route.ts`
- `actions/storage/photo-upload-actions.ts`
- `actions/storage/storage-config-actions.ts`
- `lib/storage/photo-storage.ts`

### 7. Security headers and CORS

Risk: Redirect responses skipped security headers, CSP allowed broader script sources than necessary, and CORS reflected trusted-looking headers too broadly.

Fix:
- Security headers now apply to normal responses, redirects, and rate-limit responses.
- CSP now includes stricter script handling, object-src none, and frame/base constraints.
- Legacy `X-XSS-Protection` is disabled correctly.
- Added cross-origin isolation headers in Next config.
- CORS only allows same-origin requests and emits `Vary: Origin`.

Touched files:
- `middleware.ts`
- `next.config.mjs`

## Verification

Commands run:
- `npx tsc --noEmit --pretty false`
- Targeted TypeScript scan over security-related touched files

Result:
- The full project typecheck still fails because of many existing unrelated errors in tests, hooks, services, Prisma scripts, and missing test/runtime dependencies.
- The targeted TypeScript scan no longer reports errors for the security files changed in this pass. The only remaining targeted-pattern matches are from the unrelated script `scripts/update-image-uploads.ts`.

Dependency/CVE audit:
- `npm audit` could not be completed in this environment without sending the private dependency graph to the npm registry. Approval for the networked audit was not granted, so current CVE exposure remains unverified.

## Remaining High-Priority Work

1. Replace the middleware in-memory rate limiter with a distributed Redis/Upstash limiter before production scale-out.
2. Continue the authorization rollout across all inventory, POS, finance, supplier, payroll, and reporting server actions; many broad action files existed before this pass and still require endpoint-by-endpoint tenant and permission review.
3. Add CSRF intent validation or server-action origin checks for high-risk mutations that can be triggered from browser contexts.
4. Move toward nonce-based CSP and remove any remaining need for inline styles/scripts.
5. Add MFA enforcement to privileged roles and session revocation on password/role changes.
6. Run an approved `npm audit`/SCA scan and remove unused risky packages once external registry access is allowed.
7. Add security regression tests for invite redemption, cross-tenant user access, upload path traversal, and public API authorization.
