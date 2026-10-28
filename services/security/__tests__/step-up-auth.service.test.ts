import { logSecurityEvent } from "@/lib/security/audit-log"
import { verifyUserCredentialPassword } from "@/lib/security/auth-credentials"
import { db } from "@/prisma/db"
import {
  STEP_UP_LOCK_DURATION_MS,
  STEP_UP_MAX_FAILURES,
  stepUpSessionWithPassword,
} from "../step-up-auth.service"

jest.mock("@/lib/security/audit-log", () => ({
  SecurityEventType: {
    AUTH_STEP_UP_FAILED: "AUTH_STEP_UP_FAILED",
    AUTH_STEP_UP_LOCKED: "AUTH_STEP_UP_LOCKED",
    AUTH_STEP_UP_SUCCEEDED: "AUTH_STEP_UP_SUCCEEDED",
  },
  logSecurityEvent: jest.fn(),
}))

jest.mock("@/lib/security/auth-credentials", () => ({
  verifyUserCredentialPassword: jest.fn(),
}))

jest.mock("@/lib/security/auth-session", () => ({
  SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 },
}))

jest.mock("@/prisma/db", () => ({
  db: {
    session: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

const NOW = new Date("2026-07-14T20:30:00.000Z")
const input = {
  sessionId: "session-1",
  sessionToken: "token-1",
  userId: "user-1",
  organizationId: "org-1",
  password: "correct horse battery staple",
}

const mockFindSession = db.session.findFirst as jest.Mock
const mockUpdateSession = db.session.updateMany as jest.Mock
const mockVerifyPassword = verifyUserCredentialPassword as jest.Mock
const mockLogSecurityEvent = logSecurityEvent as jest.Mock

function state(overrides: Partial<{
  assuranceFailureCount: number
  assuranceLockedUntil: Date | null
}> = {}) {
  return {
    id: input.sessionId,
    assuranceFailureCount: overrides.assuranceFailureCount ?? 0,
    assuranceLockedUntil: overrides.assuranceLockedUntil ?? null,
  }
}

describe("password session step-up", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    jest.clearAllMocks()
    mockFindSession.mockResolvedValue(state())
    mockUpdateSession.mockResolvedValue({ count: 1 })
    mockLogSecurityEvent.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("verifies the credential and atomically updates only the exact current unexpired session", async () => {
    mockFindSession.mockResolvedValue(state({ assuranceFailureCount: 2 }))
    mockVerifyPassword.mockResolvedValue(true)

    const result = await stepUpSessionWithPassword(input)

    expect(mockVerifyPassword).toHaveBeenCalledWith(input.userId, input.password)
    expect(mockUpdateSession).toHaveBeenCalledWith({
      where: {
        id: input.sessionId,
        token: input.sessionToken,
        userId: input.userId,
        expiresAt: { gt: NOW },
        assuranceFailureCount: 2,
        assuranceLockedUntil: null,
      },
      data: {
        assuranceVerifiedAt: NOW,
        assuranceMethod: "password",
        assuranceOrganizationId: input.organizationId,
        assuranceLevel: 1,
        assuranceFailureCount: 0,
        assuranceLockedUntil: null,
      },
    })
    expect(result).toEqual({
      status: "verified",
      verifiedAt: NOW,
      method: "password",
      assuranceLevel: 1,
    })
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "AUTH_STEP_UP_SUCCEEDED",
      resource: input.sessionId,
      organizationId: input.organizationId,
    }))
  })

  it("records an invalid password against only the current session", async () => {
    mockVerifyPassword.mockResolvedValue(false)

    const result = await stepUpSessionWithPassword(input)

    expect(result).toEqual({
      status: "invalid_password",
      failureCount: 1,
      attemptsRemaining: STEP_UP_MAX_FAILURES - 1,
    })
    expect(mockUpdateSession).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: input.sessionId,
        token: input.sessionToken,
        userId: input.userId,
        assuranceFailureCount: 0,
        assuranceLockedUntil: null,
      }),
      data: {
        assuranceFailureCount: 1,
        assuranceLockedUntil: null,
      },
    }))
    expect(mockLogSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "AUTH_STEP_UP_FAILED",
      details: expect.objectContaining({ failureCount: 1 }),
    }))
  })

  it("locks the current session when repeated failures reach the threshold", async () => {
    mockFindSession.mockResolvedValue(state({ assuranceFailureCount: STEP_UP_MAX_FAILURES - 1 }))
    mockVerifyPassword.mockResolvedValue(false)

    const result = await stepUpSessionWithPassword(input)
    const expectedLock = new Date(NOW.getTime() + STEP_UP_LOCK_DURATION_MS)

    expect(result).toEqual({
      status: "locked",
      failureCount: STEP_UP_MAX_FAILURES,
      lockedUntil: expectedLock,
    })
    expect(mockUpdateSession).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        assuranceFailureCount: STEP_UP_MAX_FAILURES,
        assuranceLockedUntil: expectedLock,
      },
    }))
    expect(mockLogSecurityEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: "AUTH_STEP_UP_FAILED",
    }))
    expect(mockLogSecurityEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      type: "AUTH_STEP_UP_LOCKED",
      details: expect.objectContaining({ reason: "threshold_reached" }),
    }))
  })

  it("blocks an already locked session before password verification", async () => {
    const lockedUntil = new Date(NOW.getTime() + STEP_UP_LOCK_DURATION_MS)
    mockFindSession.mockResolvedValue(state({
      assuranceFailureCount: STEP_UP_MAX_FAILURES,
      assuranceLockedUntil: lockedUntil,
    }))

    await expect(stepUpSessionWithPassword(input)).resolves.toEqual({
      status: "locked",
      failureCount: STEP_UP_MAX_FAILURES,
      lockedUntil,
    })
    expect(mockVerifyPassword).not.toHaveBeenCalled()
    expect(mockUpdateSession).not.toHaveBeenCalled()
  })

  it("fails closed when the exact session is no longer current", async () => {
    mockFindSession.mockResolvedValue(null)

    await expect(stepUpSessionWithPassword(input)).resolves.toEqual({
      status: "session_invalid",
    })
    expect(mockVerifyPassword).not.toHaveBeenCalled()
  })
})
