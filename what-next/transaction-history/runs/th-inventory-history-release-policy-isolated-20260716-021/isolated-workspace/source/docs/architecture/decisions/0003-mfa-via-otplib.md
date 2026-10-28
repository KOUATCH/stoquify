# ADR-0003: MFA via TOTP (otplib) + AES-GCM encrypted secrets + backup codes

**Status**: Accepted, 2026-05-23

## Context

Pre-funding due diligence will ask whether admin accounts have MFA. The cost of a stolen admin password to a 50-org SaaS is full data access for every tenant. Without MFA, password = the only thing between an attacker and total compromise.

## Decision

- **Algorithm**: TOTP (RFC 6238). Standards-based, no SMS surface (SMS-MFA is a worse-than-nothing choice — SIM-swap attacks).
- **Library**: `otplib@12`. Stable sync API. Pinned at v12 because v13 introduces a Promise-returning rewrite that doesn't add value for our shape. Revisit if v12 stops getting security patches.
- **Storage**: shared secret encrypted at rest with AES-256-GCM under `MFA_ENCRYPTION_KEY`. Random per-secret IV (so duplicate enrolments produce different ciphertexts). Key generated via `openssl rand -hex 32`, stored in Vercel project env.
- **Source of truth for "MFA enabled"**: `User.mfaEnabledAt !== null`. Presence of `mfaSecret` alone is not enough (mid-enrolment state).
- **Backup codes**: 10 single-use alphanumeric codes (10 chars each), shown to the user once at enrolment, persisted as Argon2id hashes only. Consumed by removing the matched hash on use.
- **UX/policy**:
  - Optional opt-in for any user.
  - Required for admin role (enforced 1-2 weeks after enrolment is shipped to give admins time to adopt).
  - Not required for end-users (yet) — re-evaluate when customer data sensitivity grows or compliance requires it.

## Consequences

- Service module (`services/auth/mfa.ts`) gets a clean separation from Auth.js — the credentials provider's `authorize` callback calls into it but the encryption + verification logic isn't tangled with framework code.
- Key rotation is hard: `MFA_ENCRYPTION_KEY` cannot be changed without re-encrypting every stored secret. The runbook documents this; tests cover the round-trip.
- Adding WebAuthn / passkeys later is purely additive — the same `services/auth/mfa.ts` will gain `generateWebAuthnRegistration`, etc., and the credentials callback will branch on which factor the user has.

## Alternatives considered

- **Speakeasy** (older TOTP library). Rejected: less maintained.
- **otplib v13**. Rejected: API churn for no real benefit.
- **WebAuthn-first.** Considered. Better long-term answer for security and UX. Deferred because TOTP works without device support, and most admin accounts already have an authenticator app installed. Layer WebAuthn on top later.
- **SMS-MFA.** Hard no.
- **Email-MFA.** Acceptable as a fallback, but the email infrastructure already exists for password reset — adding a second flow is more surface than it's worth at this scale. Backup codes cover the "lost my authenticator" recovery path.
