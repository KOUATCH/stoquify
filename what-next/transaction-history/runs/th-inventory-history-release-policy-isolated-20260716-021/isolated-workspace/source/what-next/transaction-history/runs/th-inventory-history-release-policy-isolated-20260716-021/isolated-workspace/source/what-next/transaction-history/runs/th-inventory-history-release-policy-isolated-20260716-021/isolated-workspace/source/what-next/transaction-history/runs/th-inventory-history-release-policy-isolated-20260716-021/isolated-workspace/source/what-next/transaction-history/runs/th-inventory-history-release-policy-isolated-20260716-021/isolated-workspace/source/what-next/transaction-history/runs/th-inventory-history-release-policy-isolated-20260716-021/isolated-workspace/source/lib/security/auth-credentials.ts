import type { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hashPassword, verifyPassword } from "@/lib/password"
import { checkPasswordPolicy, PASSWORD_HISTORY_DEPTH } from "@/services/auth/password-policy"

export const CREDENTIAL_PROVIDER_ID = "credential"

export const AUTH_MESSAGES = {
  invalidSignIn:
    "We could not sign you in with those credentials. Check your email and password, then try again.",
  emailNotVerified:
    "Please verify your email address before signing in. Check your inbox for the verification code.",
  registrationUnavailable:
    "We could not complete registration with the provided details. Check your information or sign in if you already have an account.",
} as const

type CredentialTx = Prisma.TransactionClient

export async function hashPolicyCompliantPassword(input: {
  password: string
  userId?: string
  email?: string
}) {
  const policy = await checkPasswordPolicy(input)
  if (!policy.ok) return policy

  return {
    ok: true as const,
    hash: await hashPassword(input.password),
  }
}

export async function upsertCredentialAccount(
  tx: CredentialTx,
  input: { userId: string; passwordHash: string },
) {
  return tx.account.upsert({
    where: {
      providerId_accountId: {
        providerId: CREDENTIAL_PROVIDER_ID,
        accountId: input.userId,
      },
    },
    update: {
      userId: input.userId,
      password: input.passwordHash,
    },
    create: {
      accountId: input.userId,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId: input.userId,
      password: input.passwordHash,
    },
  })
}

export async function syncUserCredentialPassword(
  tx: CredentialTx,
  input: {
    userId: string
    passwordHash: string
    recordHistory?: boolean
    revokeSessions?: boolean
    exceptSessionToken?: string | null
  },
) {
  await tx.user.update({
    where: { id: input.userId },
    data: { password: input.passwordHash },
  })

  await upsertCredentialAccount(tx, {
    userId: input.userId,
    passwordHash: input.passwordHash,
  })

  if (input.recordHistory !== false) {
    await tx.passwordHistory.create({
      data: {
        userId: input.userId,
        passwordHash: input.passwordHash,
      },
    })

    const overflow = await tx.passwordHistory.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      skip: PASSWORD_HISTORY_DEPTH,
      select: { id: true },
    })

    if (overflow.length > 0) {
      await tx.passwordHistory.deleteMany({
        where: { id: { in: overflow.map((entry) => entry.id) } },
      })
    }
  }

  if (input.revokeSessions) {
    await tx.session.deleteMany({
      where: {
        userId: input.userId,
        ...(input.exceptSessionToken
          ? { token: { not: input.exceptSessionToken } }
          : {}),
      },
    })
  }
}

export async function verifyUserCredentialPassword(
  userId: string,
  password: string,
) {
  const [credentialAccount, user] = await Promise.all([
    db.account.findFirst({
      where: { userId, providerId: CREDENTIAL_PROVIDER_ID },
      select: { password: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { password: true },
    }),
  ])

  const storedHash = credentialAccount?.password ?? user?.password
  if (!storedHash) return false

  return verifyPassword(password, storedHash)
}

export async function revokeUserSessions(
  tx: CredentialTx,
  input: { userId: string; exceptSessionToken?: string | null },
) {
  return tx.session.deleteMany({
    where: {
      userId: input.userId,
      ...(input.exceptSessionToken
        ? { token: { not: input.exceptSessionToken } }
        : {}),
    },
  })
}
