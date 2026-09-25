jest.mock("better-auth", () => ({ betterAuth: (options: unknown) => ({ options }) }))
jest.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: jest.fn() }))
jest.mock("better-auth/api", () => ({ APIError: class extends Error { constructor(public status: string, body: { message: string }) { super(body.message) } } }))
jest.mock("@/prisma/db", () => ({ db: { user: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() } } }))
jest.mock("@/lib/security/audit-log", () => ({ logSecurityEvent: jest.fn(), SecurityEventType: { ACCOUNT_LOCKED: "ACCOUNT_LOCKED", LOGIN_SUCCESS: "LOGIN_SUCCESS", LOGIN_FAILED: "LOGIN_FAILED" } }))
jest.mock("@/lib/security/credential-sign-in-outcome", () => ({ credentialSignInSucceeded: jest.fn(() => true) }))

import { auth } from "@/lib/auth"
import { db } from "@/prisma/db"
const options = (auth as any).options, ctx = { path: "/sign-in/email", body: { email: "synthetic@example.invalid" } }
beforeEach(() => { jest.clearAllMocks(); (db.user.findFirst as jest.Mock).mockResolvedValue({ id: "synthetic", organizationId: "org-1", isActive: true, isLocked: false, lockedUntil: null, failedLoginAttempts: 0 }) })
it.each([{ isActive: false, isLocked: false, lockedUntil: null }, { isActive: true, isLocked: true, lockedUntil: null }])("rejects a disabled or permanently locked account before password sign-in", async state => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ id: "synthetic", ...state })
  await expect(options.hooks.before(ctx)).rejects.toMatchObject({ status: "FORBIDDEN", message: "Account unavailable" })
  expect(db.user.update).not.toHaveBeenCalled(); expect(db.user.updateMany).not.toHaveBeenCalled()
})
it("does not treat a late successful outcome as permission to unlock a disabled account", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ id: "synthetic", isActive: false, isLocked: true, lockedUntil: null })
  await options.hooks.after(ctx)
  expect(db.user.update).not.toHaveBeenCalled(); expect(db.user.updateMany).not.toHaveBeenCalled()
})
it("clears only the observed expired login throttle on an active account", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ id: "synthetic", isActive: true, isLocked: true, lockedUntil: new Date(0) })
  await options.hooks.before(ctx)
  expect(db.user.updateMany).toHaveBeenCalledWith({ where: { id: "synthetic", isActive: true, isLocked: true, lockedUntil: { lte: expect.any(Date) } }, data: { isLocked: false, lockedUntil: null, failedLoginAttempts: 0 } })
})
it("conditions successful login bookkeeping on the account still being active", async () => {
  await options.hooks.after(ctx)
  expect(db.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "synthetic", isActive: true, OR: expect.any(Array) }) }))
})
