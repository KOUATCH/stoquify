# Authentication & authorization — enterprise-grade analysis

**Date:** 2026-05-23
**Baseline measured against:** OWASP ASVS Level 2, NIST SP 800-63B (AAL2), SOC 2 CC6 controls, common enterprise procurement requirements (Okta SSO + audit trail + session management)
**Audit scope:** all auth/authz code under `lib/auth.ts`, `lib/security/`, `lib/permissions.ts`, `services/auth/`, `services/_shared/protect.ts` + `require-org.ts`, `middleware.ts`, `lib/api/guard.ts`, plus the Prisma `User` / `Role` / `Session` / `Account` / `PasswordHistory` models.

---

## TL;DR

StockFlow's auth surface is **above the typical small-SaaS baseline** but **below the bar an enterprise customer's procurement team will set**. Six things are already strong: argon2id password hashing, account lockout on failed attempts, security-event logging, RBAC with a typed `Permission` catalog, the `protect()` server-action wrapper, and the org-scoped Prisma extension. Six things are gaps that block enterprise sales: MFA exists as code but isn't wired into sign-in, password policy doesn't enforce breach/history checks, sessions can't be revoked (JWT strategy with no blacklist), there's no step-up authentication, there's no service-account / API-key model, and there's no SSO via SAML/OIDC for corporate identity providers.

This document inventories what's there, ranks the gaps, and proposes the highest-leverage implementation order.

---

## What's already in place

### Authentication

| Capability | Status | Implementation |
|---|---|---|
| Credentials provider | ✅ | `lib/auth.ts:147-330` — argon2id verification, email-not-verified gate, account-locked gate |
| OAuth — Google | ✅ | `lib/auth.ts:103-144` — requires pre-existing user with an organization |
| OAuth — GitHub | ✅ | `lib/auth.ts:61-102` — same shape |
| Password hashing | ✅ | Argon2id via the shared `lib/password.ts` helper. Legacy hashes should be migrated through reset/migration workflows rather than verified in the login path |
| Password policy at validation | ✅ | `passwordSchema` (`lib/security/password-utils.ts:17-31`) — min 12 chars, complexity, 25-entry common-password blocklist, no 3+ consecutive repeats |
| Account lockout | ✅ | 5 failed attempts → 30-minute lockout; resets on success. Persisted on `User.isLocked / lockedUntil / failedLoginAttempts` |
| Email verification gate | ✅ | `User.isVerified` required for credentials login. OTP-driven flow at `actions/users/verifyOtp.ts` |
| Session strategy | ✅ | JWT, 8h maxAge, 1h updateAge |
| Session cookie hardening | ✅ | `__Secure-` prefix in prod, `httpOnly`, `sameSite: "strict"`, `secure: true` |
| Security event logging | ✅ | `lib/security/audit-log.ts` writes to `AuditLog` table with `userId / organizationId / ipAddress / userAgent / changes` |
| MFA service module | 🟡 | `services/auth/mfa.ts` — TOTP via otplib, AES-256-GCM encrypted secrets, Argon2id-hashed backup codes. **NOT wired into the credentials provider.** Schema fields exist (`User.mfaSecret / mfaEnabledAt / mfaBackupCodes`) but `authorize()` never consults them |
| Logout | 🟡 | Default next-auth `/api/auth/signout`. No DB-side invalidation (JWT strategy) |
| Email verification expiry | 🟡 | `verificationToken / verificationTokenExpires` fields exist but enforcement timing isn't auditable from `authorize()` |

### Authorization

| Capability | Status | Implementation |
|---|---|---|
| RBAC model | ✅ | `Role.permissions String[]` + `User.roles Role[]` many-to-many. Per-org roles enforced by `@@unique([organizationId, code])` |
| Permission catalog | ✅ | `lib/permissions.ts` — typed `Permission` union covering ~50 strings; canonical dot-style (`users.read`, `pos.create`, etc.) |
| `can()` helper | ✅ | Direct `Array.includes` check. Wildcard `*` and role-code `admin` short-circuit. No string normalisation (the buggy pluraliser was removed). Tests: 9 vitest cases |
| Server-action wrapper | ✅ | `services/_shared/protect.ts` — resolves session, runs `can()`, logs `PERMISSION_DENIED` on miss, wraps handler in try/catch with Sentry context |
| Org-scoped Prisma extension | ✅ | `lib/prisma/extensions/org-scope.ts` — auto-injects `organizationId = ctx.orgId` into every `findMany / findFirst / count / update / delete / create` for 35 tenant-scoped models, inside `withRequestContext()`. `dbUnscoped` escape hatch for legitimate cross-tenant queries |
| Middleware route gating | ✅ | `middleware.ts` — permission-based route map (`routePermissions`); unauth users redirected to `/auth/login` with `next` param |
| API route guard | ✅ | `lib/api/guard.ts` — `requireApiSession()` and `requireApiSessionForOrg(orgId)`; cross-org attempts log `PERMISSION_DENIED` |
| Audit log on auth events | ✅ | Every `LOGIN_*`, `PERMISSION_DENIED`, `ACCOUNT_LOCKED` event lands in `AuditLog` |

### Tenant boundary

| Capability | Status | Implementation |
|---|---|---|
| Single-org per user | ✅ | `User.organizationId` FK (NOT NULL). Cascade on org delete |
| Per-org role uniqueness | ✅ | `@@unique([organizationId, code])` on `Role` |
| Query-layer org scoping | ✅ | Prisma extension (defense in depth) |
| API route org scoping | ✅ | `requireApiSessionForOrg(urlOrgId)` compares session org to URL org |
| Invitation token model | ✅ | `Invite` model — token-based redemption, single-use, expiry. orgId + roleId server-side resolved (ticket #001) |

---

## Gaps against enterprise baseline

### Critical — blocks enterprise procurement

#### G1. MFA isn't wired into the credentials provider
**Status:** Code-ready, not deployed.
**Evidence:** `lib/auth.ts:147-330` performs password check, lockout check, verified-email check, then returns the user. `user.mfaEnabledAt` is never read. `services/auth/mfa.ts` is unreferenced from `authorize()`.
**Impact:** An MFA-enrolled user can sign in with password alone. The MFA "is on" state is cosmetic.
**Severity:** P0 — enterprise procurement will reject a SaaS that claims MFA support but doesn't enforce it.

#### G2. No SSO via SAML or generic OIDC
**Status:** Absent.
**Evidence:** Auth.js providers in `lib/auth.ts` are Google + GitHub only — consumer-oriented OAuth, not enterprise IdP integration (Okta, Azure AD, Google Workspace SAML, OneLogin, Ping).
**Impact:** Enterprise IT teams cannot offer SSO to their employees. This is the #1 procurement question after MFA.
**Severity:** P0 for enterprise-only; P1 if focusing on SMB.

#### G3. No session revocation
**Status:** Absent.
**Evidence:** `session.strategy = "jwt"` — sessions are stateless. The `Session` Prisma model exists but isn't used (it's for the `database` strategy which isn't active). A compromised JWT is valid until its 8h expiry, with no way to force-logout.
**Impact:** Cannot offer "Sign out of all devices" or "Revoke this session". Required for SOC 2 Trust Service Criteria CC6.6 (logical access removal). Cannot react fast to a compromise.
**Severity:** P0.

#### G4. No step-up authentication
**Status:** Absent.
**Evidence:** No `lastAuthAt` claim on the JWT, no `requireFreshSession()` helper. High-risk operations (role changes, payroll approvals, large refunds, mass deletes) execute on the same 8-hour token as a benign listing call.
**Impact:** A user who steps away from an unlocked laptop has an 8-hour window where anyone can perform any action they have permission for. SOC 2 CC6.3.
**Severity:** P1.

### High — blocks SOC 2 / shifts procurement timeline

#### G5. Password policy doesn't check against breached credentials or password history
**Status:** Partial.
**Evidence:** `passwordSchema` enforces length + complexity + a 25-entry blocklist. But:
  - No HaveIBeenPwned (HIBP) k-anonymity API check. A user can reuse a password that has appeared in known breaches.
  - The `PasswordHistory` model exists in the Prisma schema (`prisma/schema.prisma:1927-`) but **nothing writes to it** — there is no enforcement of "don't reuse last N passwords".
**Impact:** NIST 800-63B § 5.1.1.2 explicitly calls for both checks. Auditors will flag this.
**Severity:** P1.

#### G6. No tenant integrity check on JWT refresh
**Status:** Partial.
**Evidence:** `lib/auth.ts:393-405` re-fetches user roles/permissions on every JWT refresh, but does not verify that the user still belongs to the `organizationId` claimed in the token. If an admin removes a user from an org, the user keeps their session for up to 8 hours with old org access.
**Impact:** Removed users retain access. Defence in depth gap.
**Severity:** P1.

#### G7. No service accounts / API keys
**Status:** Absent.
**Evidence:** All authenticated identities are `User` rows with a password or OAuth account. No way to provision a programmatic identity with restricted scopes for integrations (Zapier, custom webhooks, CI deployments).
**Impact:** Customers integrating StockFlow with their own systems either share a real user's credentials (terrible) or run unauthenticated proxies (worse). Required for any "integrations" or "API" marketing claim.
**Severity:** P1.

### Medium — quality-of-life + risk reduction

#### G8. No risk-based authentication (RBA)
**Status:** Absent.
**Evidence:** No tracking of last-known-IP / device fingerprint / impossible-travel detection. Every sign-in from any geo is accepted.
**Impact:** Credential stuffing succeeds silently if the password is leaked. ASVS L2 § 2.2.5.
**Severity:** P2.

#### G9. JWT permissions are stale up to 1 hour
**Status:** Partial.
**Evidence:** `updateAge: 60 * 60` — JWT refreshes its claims every hour. A permission removal takes effect on the next refresh. Acceptable for most cases but not for break-glass.
**Severity:** P2.

#### G10. Email enumeration via timing
**Status:** Partial.
**Evidence:** `authorize()` throws `INVALID_CREDENTIALS` for both "no user" and "wrong password" cases ✓. But the time-to-respond differs (no DB compare for non-existent users vs. argon2 compare for real users). Timing attack possible.
**Severity:** P3.

#### G11. No row-level (ABAC) authorization
**Status:** Absent.
**Evidence:** `can(user, "items.delete")` is purely role-based. There's no `can(user, "items.delete", { item })` for "can only delete items you created" semantics.
**Impact:** Multi-tenant org-scoping is enforced (good), but within an org all members with the role can act on all rows. SOC 2 CC6.3 ("logical access by individual to specific objects").
**Severity:** P2 for most workflows; P1 for regulated industries (pharmacy).

#### G12. CSRF on non-server-action POSTs
**Status:** Partial.
**Evidence:** Server actions get framework-level CSRF protection from Next.js. Custom `app/api/*` POST/PUT/DELETE routes accepting browser fetches don't have explicit verification (some use `requireApiSession` which gives the user identity but not CSRF).
**Severity:** P2.

#### G13. Audit log not tamper-evident
**Status:** Partial.
**Evidence:** `AuditLog` rows are append-only by convention but the table is mutable by any process with DB write access (including any future admin tool, a compromised application server, etc.). No hash chain, no signed entries, no off-host immutable mirror.
**Impact:** SOC 2 auditors increasingly ask about log integrity, especially for financial / payroll mutations.
**Severity:** P2.

### Low — cosmetic / nice-to-have

#### G14. No "active sessions" view for users / admins
**Status:** Absent. Depends on G3.

#### G15. No multi-org membership
**Status:** Absent — `User.organizationId` is a single FK. Users supporting multiple tenants need a more complex model.
**Severity:** P3 unless multi-tenant support is a stated requirement.

#### G16. Logout doesn't propagate
**Status:** Default next-auth signout clears the cookie on one device. Doesn't terminate sessions elsewhere (depends on G3).

#### G17. No password expiry / forced rotation
**Status:** Absent.
**Note:** NIST 800-63B § 5.1.1.2 explicitly recommends against forced expiry. Modern guidance is to rotate only on suspected compromise. So this is **not a gap** — leave it.

---

## Implementation roadmap

Prioritised by what closes the most audit/procurement gaps per unit effort. P0 items first; P1/P2 grouped after.

### Phase A — close the P0 items (this work)

| Order | Item | Files |
|---|---|---|
| A1 | **Wire MFA into credentials provider** + step-up helper | `lib/auth.ts`, new `lib/security/step-up.ts` |
| A2 | **Password breach check (HIBP)** + password history enforcement (PasswordHistory model) | `lib/security/password-utils.ts`, new `lib/security/hibp.ts`, new `services/auth/password-policy.ts` |
| A3 | **Tenant integrity check** on JWT refresh — verify user still in claimed org | `lib/auth.ts` |
| A4 | **DB-backed session tracking + revocation** — new `AuthSession` model checked on every JWT refresh | new Prisma model + middleware change |

### Phase B — close the P1 items (follow-up)

| Order | Item | Notes |
|---|---|---|
| B1 | **Service accounts + API keys** | New `ServiceAccount` + `ApiKey` schema + key-hashing utility + middleware token check |
| B2 | **SSO via generic OIDC** | Add a configurable OIDC provider to Auth.js. SAML requires a different adapter (e.g. `@boxyhq/saml-jackson`); leave for B3 |
| B3 | **SAML SSO via BoxyHQ SAML-Jackson or similar** | Enterprise IT integration |
| B4 | **Risk-based authentication** | Track last-seen IP + UA per user; alert on unusual changes via Sentry |
| B5 | **Tamper-evident audit log** | Hash-chain integrity verification, signed off-host mirror via Inngest cron |

### Phase C — quality + UX polish

| Order | Item |
|---|---|
| C1 | Admin UI: active sessions per user + revoke |
| C2 | User UI: "Sign out of all devices" |
| C3 | Per-resource ABAC layer (`can(user, action, resource)`) |
| C4 | CSRF guard helper for non-server-action POST routes |
| C5 | Multi-org membership (requires breaking schema change) |

---

## Acceptance bar for "enterprise-grade"

The post-implementation bar should be:

1. **MFA**: TOTP enrolled accounts cannot sign in with password alone. Backup codes single-use. Admin role requires MFA.
2. **Session revocation**: Admin can terminate a user's sessions; user "sign out everywhere" works within 60 seconds.
3. **Password policy**: New passwords checked against HIBP (k-anonymity, no plaintext sent) AND against last 12 passwords for the user.
4. **Step-up**: High-risk surgeries (`users.delete`, `roles.update`, `payroll.approve`, refunds > $500) require re-auth within last 5 minutes.
5. **Tenant integrity**: Removing a user from an org invalidates their session within 1 minute.
6. **API authentication**: Service accounts with scoped API keys; key prefix + hashed storage; revocation via admin UI.
7. **Audit completeness**: Every `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `MFA_ENROLLED`, `MFA_DISABLED`, `ROLE_CHANGED`, `PERMISSION_DENIED`, `SESSION_REVOKED`, `PASSWORD_CHANGED` records (already partially in place — extend coverage).
8. **SSO**: At minimum a generic OIDC provider configurable per-organization (so each customer can point at their own Okta tenant).
