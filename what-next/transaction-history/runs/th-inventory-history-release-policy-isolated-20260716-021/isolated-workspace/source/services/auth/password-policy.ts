/**
 * Centralised password-policy enforcement.
 *
 * Combines four checks into one call so password-change / signup / reset
 * flows all enforce the same bar:
 *
 *   1. Zod schema — length, common-password blocklist, and no 3+
 *      consecutive repeats (already in `lib/security/password-utils.ts`).
 *   2. HaveIBeenPwned k-anonymity breach check (`lib/security/hibp.ts`).
 *      Rejects passwords that have appeared in known credential dumps.
 *      Fails open on network errors (logged warning).
 *   3. Password history — rejects re-use of any of the last N passwords
 *      for this user. The `PasswordHistory` Prisma model was already in
 *      schema but unused until now.
 *   4. Optional username/email substring check — rejects "password
 *      contains your email local part" weakness.
 *
 * Returns a structured result the caller can render as a form-validation
 * error or surface via the audit log on a forced rotation.
 */
import { db } from "@/prisma/db"
import { logger } from "@/lib/logger"
import { isPasswordBreached } from "@/lib/security/hibp"
import {
  hashPassword,
  passwordSchema,
  verifyPassword,
} from "@/lib/security/password-utils"

export const PASSWORD_HISTORY_DEPTH = 12

export type PasswordPolicyResult =
  | { ok: true }
  | {
      ok: false
      code:
        | "WEAK"
        | "BREACHED"
        | "RECENTLY_USED"
        | "CONTAINS_EMAIL"
      message: string
      // Field-level errors mirror the Zod flatten shape for forms.
      issues?: string[]
    }

export interface CheckPasswordPolicyInput {
  password: string
  userId?: string
  email?: string
  /**
   * Skip the HIBP call. Useful in tests / when offline. Production code
   * should NOT pass this unless there's a specific reason (e.g. an
   * organization-level config that disables it).
   */
  skipBreachCheck?: boolean
}

/**
 * Validates a NEW password against all policy rules. Call this from:
 *   - account creation
 *   - password reset
 *   - password change (authenticated)
 *   - admin "force user to set a new password"
 *
 * Does NOT actually hash or persist anything. Pair with
 * `recordPasswordChange(userId, newHash)` once the user record updates
 * to keep the history table populated.
 */
export async function checkPasswordPolicy(
  input: CheckPasswordPolicyInput,
): Promise<PasswordPolicyResult> {
  // Step 1: Zod (length + complexity + common-password + repeat-chars).
  const parsed = passwordSchema.safeParse(input.password)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message)
    return {
      ok: false,
      code: "WEAK",
      message: issues[0] ?? "Password does not meet policy",
      issues,
    }
  }

  // Step 2: username/email substring guard (cheap, before any I/O).
  if (input.email) {
    const localPart = input.email.split("@")[0]?.toLowerCase()
    if (localPart && localPart.length >= 3 && input.password.toLowerCase().includes(localPart)) {
      return {
        ok: false,
        code: "CONTAINS_EMAIL",
        message: "Password must not contain your email address",
      }
    }
  }

  // Step 3: HIBP breach check (skippable for tests).
  if (!input.skipBreachCheck) {
    const breached = await isPasswordBreached(input.password)
    if (breached) {
      return {
        ok: false,
        code: "BREACHED",
        message:
          "This password has appeared in a public credential breach. Choose a different one.",
      }
    }
  }

  // Step 4: history check (only meaningful for existing users).
  if (input.userId) {
    const history = await db.passwordHistory.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      take: PASSWORD_HISTORY_DEPTH,
      select: { passwordHash: true },
    })

    for (const entry of history) {
      try {
        if (await verifyPassword(input.password, entry.passwordHash)) {
          return {
            ok: false,
            code: "RECENTLY_USED",
            message: `Password matches one of your last ${PASSWORD_HISTORY_DEPTH} passwords`,
          }
        }
      } catch (err) {
        // A malformed historical hash shouldn't block a password change;
        // log it and move on.
        logger.warn("password-policy.history.verify_failed", {
          err: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  return { ok: true }
}

/**
 * Records a new password hash in the history table AND prunes anything
 * past `PASSWORD_HISTORY_DEPTH`. Call this from the same transaction
 * that updates `User.password` so history and current hash stay
 * consistent.
 */
export async function recordPasswordChange(
  tx: typeof db,
  userId: string,
  newHash: string,
): Promise<void> {
  await tx.passwordHistory.create({
    data: { userId, passwordHash: newHash },
  })

  // Prune older entries — keep only the most recent N.
  const overflow = await tx.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: PASSWORD_HISTORY_DEPTH,
    select: { id: true },
  })
  if (overflow.length > 0) {
    await tx.passwordHistory.deleteMany({
      where: { id: { in: overflow.map((r) => r.id) } },
    })
  }
}

/**
 * Convenience: validate + hash + record, returning the new hash. Use this
 * when the caller already has a transaction context for the User update.
 */
export async function adoptNewPassword(
  tx: typeof db,
  input: CheckPasswordPolicyInput,
): Promise<{ ok: true; hash: string } | (Exclude<PasswordPolicyResult, { ok: true }>)> {
  const result = await checkPasswordPolicy(input)
  if (!result.ok) return result
  const hash = await hashPassword(input.password)
  if (input.userId) {
    await recordPasswordChange(tx, input.userId, hash)
  }
  return { ok: true, hash }
}
