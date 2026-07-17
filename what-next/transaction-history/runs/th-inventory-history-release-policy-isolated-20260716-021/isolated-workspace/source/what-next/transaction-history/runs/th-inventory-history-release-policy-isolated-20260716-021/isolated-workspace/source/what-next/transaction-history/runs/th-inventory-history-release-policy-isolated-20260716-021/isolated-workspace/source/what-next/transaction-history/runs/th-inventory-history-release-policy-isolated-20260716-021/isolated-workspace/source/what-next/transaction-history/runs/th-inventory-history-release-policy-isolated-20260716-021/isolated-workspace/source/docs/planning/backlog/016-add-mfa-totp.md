---
id: 016
title: Add MFA / TOTP — env scaffolding exists, implementation does not
area: authentication
priority: P1
effort: M
phase: foundations
status: code-ready
---

# Add MFA / TOTP — env scaffolding exists, implementation does not

## Problem
`.env.example` declares `TWO_FACTOR_ISSUER="StockFlow"` and `ENABLE_TWO_FACTOR=true`, suggesting MFA was planned. A grep of the codebase does not find an actual implementation. For a multi-tenant SaaS with admin accounts that can delete data, MFA is the difference between a stolen password being a hassle and being a catastrophe. Pre-funding due-diligence will ask about MFA.

## Acceptance criteria
- [ ] `User` Prisma model gains `mfaSecret String?` (encrypted), `mfaEnabledAt DateTime?`, `mfaBackupCodes String[]` (hashed)
- [ ] `services/auth/mfa.ts` exports:
  - `generateMfaSecret(userId)` — creates a TOTP secret, stores encrypted, returns the otpauth:// URL + QR data URI
  - `verifyMfaCode(userId, code)` — checks the code against the stored secret with a ±1 step window
  - `confirmMfaEnrollment(userId, code)` — verifies first code, then sets `mfaEnabledAt = now()`
  - `disableMfa(userId, password)` — requires re-auth, clears the secret
  - `generateBackupCodes(userId, count = 10)` — single-use, hashed; show plaintext once
- [ ] Auth.js credentials provider: after password verifies, if `user.mfaEnabledAt` is set, require a `mfaCode` field on the credentials before issuing the session
- [ ] Settings UI at `/dashboard/settings/security/mfa` for enroll / disable / regenerate backup codes
- [ ] Admin-role users have MFA *required* (block sign-in if `role.code === "admin"` and `mfaEnabledAt` is null)
- [ ] `recordAuditEvent` for every MFA enroll / disable / backup-code-use
- [ ] **Test:** sign-in with correct password + missing MFA code → fails for MFA-enabled user
- [ ] **Test:** sign-in with correct password + wrong MFA code → fails, increments failed-attempt counter
- [ ] **Test:** sign-in with correct password + valid MFA code → succeeds
- [ ] **Test:** backup code is single-use (second attempt with same code fails)
- [ ] **Test:** admin user without MFA enabled cannot complete sign-in (forced to enroll first)

## Implementation notes
- Library: `otplib` (lightweight, no dependencies, well-maintained). Avoid `speakeasy` (less maintained).
- Encryption: store `mfaSecret` encrypted with a key from env (`MFA_ENCRYPTION_KEY` — 32-byte hex). Use `crypto.createCipheriv("aes-256-gcm", ...)`. Decrypt only at verification time.
- TOTP step: 30 seconds, ±1 window (so a code valid for 60-90s)
- Backup codes: 10 codes, 8 chars each (alphanumeric), hashed with Argon2id before storing
- For the future, `@simplewebauthn/server` adds WebAuthn/passkeys as a step up — note the path but don't build it in this ticket
- UI: use the QR rendering library `qrcode` (server-side render to data URL) — no client lib needed

## Out of scope (separate tickets)
- SMS-based MFA — strongly discouraged, don't add
- WebAuthn / passkeys — separate ticket; can land later
- Risk-based authentication (require MFA only on suspicious sign-ins) — defer until you have signal on actual attack patterns
- MFA recovery via email — backup codes are enough at this scale

## Resolution
**Code-ready** 2026-05-23. Service module + schema + tests are in. Runbook covers the deploy + Auth.js wiring at `docs/runbooks/016-mfa-rollout.md`.

**Done:**
- `prisma/schema.prisma`: `User` gains `mfaSecret String?`, `mfaEnabledAt DateTime?`, `mfaBackupCodes String[]`.
- `lib/env.ts` + `.env.example`: `MFA_ENCRYPTION_KEY` (32-byte hex) declared.
- `services/auth/mfa.ts`:
  - `encryptSecret` / `decryptSecret` — AES-256-GCM. Random IV per call; round-trip verified.
  - `generateMfaEnrollment` — returns plaintext secret + otpauth URL + QR data URL.
  - `verifyTotpCode` — wraps `otplib`'s constant-time verify; ±1 step (60-90s tolerance); rejects non-6-digit input.
  - `generateBackupCodes` — 10 codes x 10 alphanumeric chars; Argon2id-hashed for storage.
  - `consumeBackupCode` — single-use; returns the shortened hash list or null.
- `services/auth/mfa.test.ts`: 12 vitest cases covering encrypt round-trip, IV randomness, malformed payload, missing key, enrolment shape, verify accept/reject, backup-code generation + single-use guarantee. 12/12 pass.
- `otplib@12` installed (v13 has a Promise-returning API incompatible with the planned shape).

**Pending user action (per runbook):**
1. Apply migration (`prisma migrate dev --name add_user_mfa_fields`).
2. Generate + set `MFA_ENCRYPTION_KEY` in Vercel.
3. Extend Auth.js `authorize()` to require an `mfaCode` when `user.mfaEnabledAt` is set (snippet in runbook).
4. Build enrolment / disable / regenerate-backup-codes UI under `/dashboard/settings/security/mfa`.
5. Once stable, force-enable for admin role users with a 1-2 week notice.
