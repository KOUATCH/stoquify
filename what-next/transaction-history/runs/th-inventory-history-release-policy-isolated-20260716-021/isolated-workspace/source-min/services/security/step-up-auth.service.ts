import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log"
import { verifyUserCredentialPassword } from "@/lib/security/auth-credentials"
import { SESSION_ASSURANCE_LEVEL } from "@/lib/security/auth-session"
import { db } from "@/prisma/db"

export const STEP_UP_AUTH_METHOD = "password" as const
export const STEP_UP_MAX_FAILURES = 5
export const STEP_UP_LOCK_DURATION_MS = 15 * 60 * 1000

const MAX_STATE_UPDATE_ATTEMPTS = 4

export type PasswordStepUpInput = {
  sessionId: string
  sessionToken: string
  userId: string
  organizationId: string
  password: string
}

export type PasswordStepUpResult =
  | {
      status: "verified"
      verifiedAt: Date
      method: typeof STEP_UP_AUTH_METHOD
      assuranceLevel: number
    }
  | {
      status: "invalid_password"
      failureCount: number
      attemptsRemaining: number
    }
  | {
      status: "locked"
      failureCount: number
      lockedUntil: Date
    }
  | { status: "session_invalid" }

type SessionAssuranceState = {
  id: string
  assuranceFailureCount: number
  assuranceLockedUntil: Date | null
}

function currentSessionWhere(input: PasswordStepUpInput, now: Date) {
  return {
    id: input.sessionId,
    token: input.sessionToken,
    userId: input.userId,
    expiresAt: { gt: now },
  }
}

async function loadCurrentSession(
  input: PasswordStepUpInput,
  now: Date,
): Promise<SessionAssuranceState | null> {
  return db.session.findFirst({
    where: currentSessionWhere(input, now),
    select: {
      id: true,
      assuranceFailureCount: true,
      assuranceLockedUntil: true,
    },
  })
}

function isActivelyLocked(state: SessionAssuranceState, now: Date) {
  return Boolean(state.assuranceLockedUntil && state.assuranceLockedUntil > now)
}

async function lockedResult(
  input: PasswordStepUpInput,
  state: SessionAssuranceState,
  reason: "active_lock" | "threshold_reached",
): Promise<PasswordStepUpResult> {
  const lockedUntil = state.assuranceLockedUntil
  if (!lockedUntil) return { status: "session_invalid" }

  await logSecurityEvent({
    type: SecurityEventType.AUTH_STEP_UP_LOCKED,
    userId: input.userId,
    organizationId: input.organizationId,
    resource: input.sessionId,
    details: {
      method: STEP_UP_AUTH_METHOD,
      failureCount: state.assuranceFailureCount,
      lockedUntil: lockedUntil.toISOString(),
      reason,
    },
  })

  return {
    status: "locked",
    failureCount: state.assuranceFailureCount,
    lockedUntil,
  }
}

async function persistSuccessfulStepUp(
  input: PasswordStepUpInput,
  initialState: SessionAssuranceState,
): Promise<PasswordStepUpResult> {
  let state: SessionAssuranceState | null = initialState

  for (let attempt = 0; attempt < MAX_STATE_UPDATE_ATTEMPTS && state; attempt += 1) {
    const verifiedAt = new Date()
    if (isActivelyLocked(state, verifiedAt)) {
      return lockedResult(input, state, "active_lock")
    }

    const updated = await db.session.updateMany({
      where: {
        ...currentSessionWhere(input, verifiedAt),
        assuranceFailureCount: state.assuranceFailureCount,
        assuranceLockedUntil: state.assuranceLockedUntil,
      },
      data: {
        assuranceVerifiedAt: verifiedAt,
        assuranceMethod: STEP_UP_AUTH_METHOD,
        assuranceOrganizationId: input.organizationId,
        assuranceLevel: SESSION_ASSURANCE_LEVEL.PASSWORD,
        assuranceFailureCount: 0,
        assuranceLockedUntil: null,
      },
    })

    if (updated.count === 1) {
      await logSecurityEvent({
        type: SecurityEventType.AUTH_STEP_UP_SUCCEEDED,
        userId: input.userId,
        organizationId: input.organizationId,
        resource: input.sessionId,
        details: {
          method: STEP_UP_AUTH_METHOD,
          assuranceLevel: SESSION_ASSURANCE_LEVEL.PASSWORD,
          verifiedAt: verifiedAt.toISOString(),
        },
      })

      return {
        status: "verified",
        verifiedAt,
        method: STEP_UP_AUTH_METHOD,
        assuranceLevel: SESSION_ASSURANCE_LEVEL.PASSWORD,
      }
    }

    state = await loadCurrentSession(input, new Date())
  }

  return { status: "session_invalid" }
}

async function persistFailedStepUp(
  input: PasswordStepUpInput,
  initialState: SessionAssuranceState,
): Promise<PasswordStepUpResult> {
  let state: SessionAssuranceState | null = initialState

  for (let attempt = 0; attempt < MAX_STATE_UPDATE_ATTEMPTS && state; attempt += 1) {
    const failedAt = new Date()
    if (isActivelyLocked(state, failedAt)) {
      return lockedResult(input, state, "active_lock")
    }

    const previousFailureCount = state.assuranceLockedUntil ? 0 : state.assuranceFailureCount
    const failureCount = previousFailureCount + 1
    const lockedUntil = failureCount >= STEP_UP_MAX_FAILURES
      ? new Date(failedAt.getTime() + STEP_UP_LOCK_DURATION_MS)
      : null

    const updated = await db.session.updateMany({
      where: {
        ...currentSessionWhere(input, failedAt),
        assuranceFailureCount: state.assuranceFailureCount,
        assuranceLockedUntil: state.assuranceLockedUntil,
      },
      data: {
        assuranceFailureCount: failureCount,
        assuranceLockedUntil: lockedUntil,
      },
    })

    if (updated.count === 1) {
      const attemptsRemaining = Math.max(0, STEP_UP_MAX_FAILURES - failureCount)
      await logSecurityEvent({
        type: SecurityEventType.AUTH_STEP_UP_FAILED,
        userId: input.userId,
        organizationId: input.organizationId,
        resource: input.sessionId,
        details: {
          method: STEP_UP_AUTH_METHOD,
          failureCount,
          attemptsRemaining,
        },
      })

      if (lockedUntil) {
        return lockedResult(
          input,
          { ...state, assuranceFailureCount: failureCount, assuranceLockedUntil: lockedUntil },
          "threshold_reached",
        )
      }

      return { status: "invalid_password", failureCount, attemptsRemaining }
    }

    state = await loadCurrentSession(input, new Date())
  }

  return { status: "session_invalid" }
}

export async function stepUpSessionWithPassword(
  input: PasswordStepUpInput,
): Promise<PasswordStepUpResult> {
  const state = await loadCurrentSession(input, new Date())
  if (!state) return { status: "session_invalid" }

  const checkedAt = new Date()
  if (isActivelyLocked(state, checkedAt)) {
    return lockedResult(input, state, "active_lock")
  }

  const passwordIsValid = await verifyUserCredentialPassword(input.userId, input.password)
  return passwordIsValid
    ? persistSuccessfulStepUp(input, state)
    : persistFailedStepUp(input, state)
}
