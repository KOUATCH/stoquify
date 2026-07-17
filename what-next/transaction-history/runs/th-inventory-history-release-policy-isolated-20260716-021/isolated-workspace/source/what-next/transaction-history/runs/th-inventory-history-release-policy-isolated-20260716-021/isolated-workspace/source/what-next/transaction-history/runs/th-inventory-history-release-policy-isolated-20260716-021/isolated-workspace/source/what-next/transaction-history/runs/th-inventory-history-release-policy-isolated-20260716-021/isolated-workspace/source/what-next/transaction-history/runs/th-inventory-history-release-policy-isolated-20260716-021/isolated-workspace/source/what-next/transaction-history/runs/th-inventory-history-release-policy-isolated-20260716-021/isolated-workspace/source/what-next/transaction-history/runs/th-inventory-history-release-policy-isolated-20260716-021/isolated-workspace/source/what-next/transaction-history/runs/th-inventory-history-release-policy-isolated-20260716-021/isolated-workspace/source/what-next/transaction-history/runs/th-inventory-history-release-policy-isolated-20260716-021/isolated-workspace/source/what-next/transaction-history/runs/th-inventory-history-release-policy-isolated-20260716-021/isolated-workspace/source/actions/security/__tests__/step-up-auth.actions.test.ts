import { logger } from "@/lib/logger"
import { requireSession } from "@/lib/security/auth-session"
import { stepUpSessionWithPassword } from "@/services/security/step-up-auth.service"
import { stepUpWithPasswordAction } from "../step-up-auth.actions"

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}))

jest.mock("@/lib/security/auth-session", () => ({
  requireSession: jest.fn(),
}))

jest.mock("@/services/security/step-up-auth.service", () => ({
  stepUpSessionWithPassword: jest.fn(),
}))

const NOW = new Date("2026-07-14T20:30:00.000Z")
const mockRequireSession = requireSession as jest.Mock
const mockStepUpSessionWithPassword = stepUpSessionWithPassword as jest.Mock
const mockLoggerError = logger.error as jest.Mock

const session = {
  claims: {
    sessionId: "session-1",
    sessionToken: "token-1",
    userId: "user-1",
    tenantId: "org-1",
  },
}

describe("password step-up server action", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    jest.clearAllMocks()
    mockRequireSession.mockResolvedValue(session)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("uses the current session boundary and returns a safe success payload", async () => {
    mockStepUpSessionWithPassword.mockResolvedValue({
      status: "verified",
      verifiedAt: NOW,
      method: "password",
      assuranceLevel: 1,
    })

    const result = await stepUpWithPasswordAction({ password: "valid password" })

    expect(mockRequireSession).toHaveBeenCalledTimes(1)
    expect(mockStepUpSessionWithPassword).toHaveBeenCalledWith({
      sessionId: "session-1",
      sessionToken: "token-1",
      userId: "user-1",
      organizationId: "org-1",
      password: "valid password",
    })
    expect(result).toEqual({
      success: true,
      data: {
        verifiedAt: NOW.toISOString(),
        method: "password",
        assuranceLevel: 1,
      },
      error: null,
      code: null,
      retryAfterSeconds: null,
    })
  })

  it("returns a generic invalid-credential result", async () => {
    mockStepUpSessionWithPassword.mockResolvedValue({
      status: "invalid_password",
      failureCount: 1,
      attemptsRemaining: 4,
    })

    await expect(stepUpWithPasswordAction({ password: "wrong" })).resolves.toEqual({
      success: false,
      data: null,
      error: "Authentication could not be verified",
      code: "INVALID_CREDENTIALS",
      retryAfterSeconds: null,
    })
  })

  it("returns a bounded retry delay for a locked session", async () => {
    mockStepUpSessionWithPassword.mockResolvedValue({
      status: "locked",
      failureCount: 5,
      lockedUntil: new Date(NOW.getTime() + 90_000),
    })

    await expect(stepUpWithPasswordAction({ password: "wrong" })).resolves.toEqual({
      success: false,
      data: null,
      error: "Too many attempts. Try again later.",
      code: "RATE_LIMITED",
      retryAfterSeconds: 90,
    })
  })

  it("rejects invalid input without calling the credential service", async () => {
    await expect(stepUpWithPasswordAction({ password: "" })).resolves.toEqual({
      success: false,
      data: null,
      error: "Password is required",
      code: "VALIDATION_ERROR",
      retryAfterSeconds: null,
    })
    expect(mockRequireSession).toHaveBeenCalledTimes(1)
    expect(mockStepUpSessionWithPassword).not.toHaveBeenCalled()
  })

  it("maps a revoked session to a safe authentication result", async () => {
    mockRequireSession.mockRejectedValue(Object.assign(new Error("raw session detail"), {
      code: "UNAUTHENTICATED",
    }))

    await expect(stepUpWithPasswordAction({ password: "valid password" })).resolves.toEqual({
      success: false,
      data: null,
      error: "Authentication is required",
      code: "AUTH_REQUIRED",
      retryAfterSeconds: null,
    })
    expect(mockStepUpSessionWithPassword).not.toHaveBeenCalled()
    expect(mockLoggerError).not.toHaveBeenCalled()
  })

  it("does not expose unexpected backend errors", async () => {
    mockStepUpSessionWithPassword.mockRejectedValue(new Error("database topology secret"))

    await expect(stepUpWithPasswordAction({ password: "valid password" })).resolves.toEqual({
      success: false,
      data: null,
      error: "Unable to verify authentication",
      code: "INTERNAL_ERROR",
      retryAfterSeconds: null,
    })
    expect(mockLoggerError).toHaveBeenCalled()
  })
})
