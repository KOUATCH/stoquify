jest.mock("better-auth", () => ({ betterAuth: (options: unknown) => ({ options }) }))
jest.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: jest.fn() }))
jest.mock("better-auth/api", () => ({
  formCsrfMiddleware: jest.fn(),
  APIError: class extends Error {
    constructor(public status: string, public body: { message: string }) { super(body.message) }
  },
}))
jest.mock("@/prisma/db", () => ({ db: { user: { findFirst: jest.fn(), updateMany: jest.fn() } } }))
jest.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: jest.fn(),
  SecurityEventType: { ACCOUNT_LOCKED: "ACCOUNT_LOCKED", LOGIN_SUCCESS: "LOGIN_SUCCESS", LOGIN_FAILED: "LOGIN_FAILED" },
}))

import { auth } from "@/lib/auth"
import { formCsrfMiddleware } from "better-auth/api"
import { db } from "@/prisma/db"
import { logSecurityEvent } from "@/lib/security/audit-log"

const hooks = (auth as any).options.hooks
const currentTime = new Date("2026-11-10T12:00:00.000Z")
const account = { id: "synthetic", organizationId: "org-1", isActive: true, isLocked: false, lockedUntil: null, failedLoginAttempts: 0 }
const invalidCredentials = { name: "APIError", statusCode: 401, body: { code: "INVALID_EMAIL_OR_PASSWORD" } }
const success = { token: "synthetic-token", user: { id: account.id } }
const context = (returned?: unknown) => ({
  path: "/sign-in/email", body: { email: "synthetic@example.invalid", password: "synthetic-password" },
  context: { returned },
})

beforeEach(() => {
  jest.resetAllMocks()
  jest.useFakeTimers().setSystemTime(currentTime)
  ;(formCsrfMiddleware as jest.Mock).mockResolvedValue(undefined)
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...account })
  ;(db.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
})
afterEach(() => jest.useRealTimers())

it.each([
  { isLocked: false, lockedUntil: null, failedLoginAttempts: 4 },
  { isLocked: true, lockedUntil: new Date(0), failedLoginAttempts: 5 },
  { isLocked: true, lockedUntil: new Date("2026-11-10T13:00:00Z"), failedLoginAttempts: 5 },
])("rejects cross-site requests before any account lookup, unlock or lock audit: %j", async state => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...account, ...state })
  const rejection = new Error("synthetic native origin rejection")
  ;(formCsrfMiddleware as jest.Mock).mockRejectedValue(rejection)
  for (let repeat = 0; repeat < 6; repeat++) {
    await expect(hooks.before(context())).rejects.toBe(rejection)
  }
  expect(db.user.findFirst).not.toHaveBeenCalled()
  expect(db.user.updateMany).not.toHaveBeenCalled()
  expect(logSecurityEvent).not.toHaveBeenCalled()
})

it("passes the original context through native request admission before account checks", async () => {
  const ctx = context()
  await hooks.before(ctx)
  expect(formCsrfMiddleware).toHaveBeenCalledWith(ctx)
  expect((formCsrfMiddleware as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((db.user.findFirst as jest.Mock).mock.invocationCallOrder[0])
  expect(db.user.updateMany).not.toHaveBeenCalled()
})

it.each([
  [403, "INVALID_ORIGIN"], [403, "CROSS_SITE_NAVIGATION_LOGIN_BLOCKED"],
  [403, "MISSING_OR_NULL_ORIGIN"], [403, "INVALID_CALLBACK_URL"],
  [400, "VALIDATION_ERROR"], [403, "EMAIL_NOT_VERIFIED"],
  [401, "FAILED_TO_CREATE_SESSION"], [500, "INTERNAL_SERVER_ERROR"],
])("leaves even an expired lock unchanged after a rejected %s/%s result", async (statusCode, code) => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...account, isLocked: true, lockedUntil: new Date(0), failedLoginAttempts: 5 })
  await hooks.before(context())
  ;(db.user.findFirst as jest.Mock).mockClear()
  await expect(hooks.after(context({ name: "APIError", statusCode, body: { code } }))).resolves.toEqual({})
  expect(db.user.findFirst).not.toHaveBeenCalled()
  expect(db.user.updateMany).not.toHaveBeenCalled()
  expect(logSecurityEvent).not.toHaveBeenCalled()
})

it("does not count an absent result as a credential failure", async () => {
  await expect(hooks.after(context())).resolves.toEqual({})
  expect(db.user.findFirst).not.toHaveBeenCalled()
  expect(db.user.updateMany).not.toHaveBeenCalled()
  expect(logSecurityEvent).not.toHaveBeenCalled()
})

it("increments a genuine wrong-password attempt and preserves unrelated login state", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...account, failedLoginAttempts: 2 })
  await hooks.after(context(invalidCredentials))
  expect(db.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ id: account.id, isActive: true }),
    data: { failedLoginAttempts: 3, lastFailedLogin: currentTime },
  }))
  expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "LOGIN_FAILED", userId: account.id, details: { provider: "credential", failures: 3 } }))
})

it("still locks on the fifth genuine wrong-password attempt", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...account, failedLoginAttempts: 4 })
  await hooks.after(context(invalidCredentials))
  expect(db.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
    failedLoginAttempts: 5, lastFailedLogin: currentTime,
    isLocked: true, lockedUntil: new Date(currentTime.getTime() + 30 * 60 * 1000),
  } }))
  expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "ACCOUNT_LOCKED" }))
})

it("resets an expired lock only after a genuine bad password, counting the new attempt as one", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...account, isLocked: true, lockedUntil: new Date(0), failedLoginAttempts: 5 })
  await hooks.before(context())
  expect(db.user.updateMany).not.toHaveBeenCalled()
  await hooks.after(context(invalidCredentials))
  expect(db.user.updateMany).toHaveBeenCalledTimes(1)
  expect(db.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
    failedLoginAttempts: 1, lastFailedLogin: currentTime, isLocked: false, lockedUntil: null,
  } }))
  expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "LOGIN_FAILED", details: { provider: "credential", failures: 1 } }))
})

it("preserves successful sign-in bookkeeping and unlocks an expired temporary lock", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...account, isLocked: true, lockedUntil: new Date(0), failedLoginAttempts: 5 })
  await hooks.after(context(success))
  expect(db.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: {
    failedLoginAttempts: 0, isLocked: false, lockedUntil: null, lastLogin: currentTime,
  } }))
  expect(logSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "LOGIN_SUCCESS", userId: account.id }))
})
