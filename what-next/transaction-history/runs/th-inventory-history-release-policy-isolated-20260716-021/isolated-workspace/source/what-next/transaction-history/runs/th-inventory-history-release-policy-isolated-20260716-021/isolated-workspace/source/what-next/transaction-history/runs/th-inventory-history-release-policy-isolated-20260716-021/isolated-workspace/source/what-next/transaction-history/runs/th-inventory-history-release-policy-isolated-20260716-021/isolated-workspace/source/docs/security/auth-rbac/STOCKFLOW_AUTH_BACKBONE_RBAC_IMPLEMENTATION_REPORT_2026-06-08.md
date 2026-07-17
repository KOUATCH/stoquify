# StockFlow Authentication Backbone and RBAC Integration Report

Date: 2026-06-08

## Objective

Build an enterprise-grade authentication backbone for StockFlow/AqStoqFlow, integrate it with the existing BetterAuth and Prisma `Role.permissions[]` RBAC implementation, and improve the auth/authorization UX without replacing the platform's tenant-aware permission model.

## Architecture Decision

BetterAuth remains the authentication engine for credential sign-in, session cookies, and the `Account`/`Session` database contract.

Prisma `User`, `Organization`, `Role`, and `Role.permissions[]` remain the authorization source of truth. RBAC re-fetches active user, active organization, roles, and expanded permissions from Prisma before granting dashboard/API access.

This avoids a parallel BetterAuth organization-role model while preserving the current StockFlow role UI, seed data, permission aliases, server actions, audit logging, and tenant-specific business rules.

## Graphify Context Used

Existing `graphify-out/GRAPH_REPORT.md` was reviewed before implementation. The relevant graph communities identified `getSession()` as the main auth hub and `hasAppPermission()`/RBAC helpers as the authorization bridge.

## Implemented Controls

- Added shared credential synchronization in `lib/security/auth-credentials.ts`.
- Added verified session primitives in `lib/security/auth-session.ts`.
- Configured BetterAuth for 12-character minimum passwords, email-verification-required sign-in, and password-reset session revocation.
- Made Google OAuth conditional on complete environment configuration to avoid broken provider setup.
- Ensured organization signup creates the BetterAuth credential `Account` row with `providerId = "credential"` and `accountId = user.id`.
- Ensured password change, password reset, legacy signup, and invited signup keep `User.password`, `Account.password`, and `PasswordHistory` synchronized.
- Revoked user sessions after password changes/resets.
- Added auth audit events for registration, verification email sent, email verified, password changes, reset requests/completions, login decisions, account lock, and session revocation.
- RBAC now denies locked accounts, unverified users, stale organization sessions, inactive users, inactive organizations, and missing permissions server-side.
- Client permission checks now use the same alias-aware permission helpers as server RBAC.
- Password reset request no longer reveals whether an email address exists.
- Login failures now use generic non-enumerating messaging, with a specific recovery message only for verified-authentication email verification state.

## UX Improvements

- Active signup now sends users to the verification screen after workspace creation.
- Signup password guidance now matches the backend 12-character minimum.
- Login no longer enforces password length client-side.
- Login displays smooth states for newly registered users and unverified-email redirects.
- Authorization-denied UI was replaced with a polished protected-workspace page that explains the server-side RBAC decision and provides useful navigation.
- Verification and reset forms no longer expose user IDs, OTP submissions, or reset credentials in logs/UI text.
- Localized auth routes now render dynamically through the `[locale]` layout instead of attempting static path generation for request-aware auth pages.

## Key Files Changed

- `lib/auth.ts`
- `lib/auth-client.ts`
- `lib/auth-server.ts`
- `lib/security/auth-credentials.ts`
- `lib/security/auth-session.ts`
- `lib/security/audit-log.ts`
- `lib/security/rbac.ts`
- `actions/auth.ts`
- `actions/users/createUser.ts`
- `actions/users/createInvitedUser.ts`
- `actions/users/updateUserPassword.ts`
- `actions/users/sendResetLink.ts`
- `actions/users/verifyOtp.ts`
- `components/auth/BeautifulRegisterForm.tsx`
- `components/auth/EnhancedLoginForm.tsx`
- `components/auth/auth-copy.ts`
- `components/NotAuthorized.tsx`
- `components/Forms/VerifyForm.tsx`
- `components/Forms/ResetPasswordForm.tsx`
- `app/[locale]/layout.tsx`
- `app/[locale]/(auth)/layout.tsx`
- `app/[locale]/(auth)/login/page.tsx`
- `app/[locale]/(auth)/register/page.tsx`
- `app/[locale]/(auth)/forgot-password/page.tsx`
- `app/[locale]/(auth)/verify/[userId]/page.tsx`
- `lib/security/__tests__/auth-credentials.test.ts`

## Verification

Passed:

- `npx jest lib/security/__tests__/auth-credentials.test.ts lib/security/__tests__/rbac-permissions.test.ts services/_shared/__tests__/protect.test.ts actions/roles/__tests__/role-actions.test.ts --runInBand`
- `npm run prisma:validate`
- `npm run typecheck`
- `npm test -- --runInBand`
- `npm run lint`
- Live route checks against `http://localhost:3001`:
  - `/en/login` returned 200.
  - `/en/register` returned 200.
  - `/en/forgot-password` returned 200.
  - `/en/unauthorized` returned 200.

Notes:

- `npm run lint` passed with existing warnings in unrelated files about hook dependencies and `<img>` usage.
- `npm run build` did not reach Next compilation because `npx prisma generate` hit the existing Windows `EPERM` Prisma query-engine DLL rename lock.
- Direct `npx next build --no-lint` timed out without a TypeScript or compile error. The timed-out build parent/child Node processes were identified and stopped.
- A localized route rendering failure was fixed by making `app/[locale]/layout.tsx` explicitly dynamic and removing locale-level static path generation, which conflicted with request-aware localized auth pages.

## Remaining Next-Stage Work

- Add real resend-verification-code flow for expired or missing OTP emails.
- Add MFA enrollment and step-up for critical permissions.
- Add known-device/session-management UI for "sign out other devices".
- Add dedicated account-lock recovery copy on the forgot-password screen.
- Move password reset tokens from `User.verificationToken` to a separate one-shot reset-token table when introducing migrations.
