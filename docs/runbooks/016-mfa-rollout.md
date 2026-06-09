# Runbook — MFA / TOTP rollout (ticket #016)

This runbook covers the schema migration + Auth.js callback wiring needed before the MFA service module in `services/auth/mfa.ts` is reachable from production sign-in.

## Step 1 — Schema migration

Three columns added to `User`:
- `mfaSecret String?` — AES-256-GCM-encrypted TOTP shared secret. Null when MFA disabled.
- `mfaEnabledAt DateTime?` — source of truth for "MFA on". Presence of `mfaSecret` alone is not enough (mid-enrolment state).
- `mfaBackupCodes String[]` — Argon2id-hashed single-use codes (10 by default at enrolment).

Generate locally:
```bash
DATABASE_URL="<dev-url>" npx prisma migrate dev --name add_user_mfa_fields
```

Smoke-test on staging then deploy. `vercel-build` runs `prisma migrate deploy` automatically.

## Step 2 — Generate the encryption key + set in Vercel

```bash
openssl rand -hex 32
```

Set `MFA_ENCRYPTION_KEY` in Vercel (Production + Preview). Without it, encrypt/decrypt throw — MFA enrol/sign-in routes will 500 if a code path actually touches it.

## Step 3 — Auth.js credentials provider wiring

In `lib/auth.ts`, extend the credentials provider's `authorize()`:

```ts
async authorize(credentials) {
  // ... existing email/password check ...
  if (!user.isVerified) throw new Error("EMAIL_NOT_VERIFIED")
  if (!user.password || !(await verifyPassword(credentials.password, user.password))) {
    throw new Error("INVALID_CREDENTIALS")
  }

  // NEW: if MFA is enabled, require an mfaCode.
  if (user.mfaEnabledAt) {
    const code = credentials.mfaCode?.trim()
    if (!code) throw new Error("MFA_REQUIRED")

    // Backup code (10-char alphanumeric) — try first; rotate the array.
    if (code.length === 10 && /^[A-Z0-9]+$/.test(code)) {
      const remaining = await consumeBackupCode(code, user.mfaBackupCodes)
      if (remaining === null) throw new Error("MFA_INVALID")
      await db.user.update({
        where: { id: user.id },
        data: { mfaBackupCodes: remaining },
      })
    } else {
      // TOTP — 6 digits.
      const secret = decryptSecret(user.mfaSecret!)
      if (!verifyTotpCode(secret, code)) throw new Error("MFA_INVALID")
    }
  }

  return { /* ... */ }
}
```

The sign-in form needs an `mfaCode` field that's shown after the email/password step (or in the same form, hidden until needed). The form posts the same way; only the `authorize` callback changes.

## Step 4 — Enrolment + disable UI

Routes to add:

- `GET /dashboard/settings/security/mfa` — shows current state; if not enrolled, "Enable MFA" button.
- `POST` server action `startMfaEnrollment` — calls `generateMfaEnrollment({ userEmail })`. Persists `encryptSecret(secret)` to `user.mfaSecret`. DOES NOT set `mfaEnabledAt` yet. Returns the `qrDataUrl` for display.
- `POST` server action `confirmMfaEnrollment({ code })` — decrypts `mfaSecret`, calls `verifyTotpCode`, on success sets `mfaEnabledAt = now()`, generates backup codes via `generateBackupCodes()`, stores hashes in `mfaBackupCodes`, returns plaintext codes (show once, then never).
- `POST` server action `disableMfa({ password })` — re-verifies password, then sets `mfaSecret = null`, `mfaEnabledAt = null`, `mfaBackupCodes = []`. Audit-log via `recordAuditEvent`.
- `POST` server action `regenerateBackupCodes({ password })` — same shape as disable but only rotates codes.

## Step 5 — Force MFA for admin role

Once enrolment is shipped, gate sign-in for admin users:

```ts
if (user.roles.some((r) => r.code === "admin") && !user.mfaEnabledAt) {
  // Redirect to /dashboard/settings/security/mfa with a banner
  // "Admin accounts require MFA. Enrol now to continue."
  throw new Error("ADMIN_MFA_REQUIRED")
}
```

Communicate this 1-2 weeks before turning it on so existing admins enrol smoothly.

## Step 6 — Audit-log events

Every MFA action records:
- `MFA_ENROLLED` (after confirm)
- `MFA_DISABLED`
- `MFA_BACKUP_CODE_USED`
- `MFA_BACKUP_CODES_REGENERATED`

Use `recordAuditEvent` with `entityType: "User"`, `entityId: userId`, `action: "UPDATE"`, and `changes: { kind: "<event>" }`.
