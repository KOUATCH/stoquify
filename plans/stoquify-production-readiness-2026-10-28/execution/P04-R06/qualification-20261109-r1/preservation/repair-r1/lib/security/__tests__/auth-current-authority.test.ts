jest.mock("better-auth", () => ({ betterAuth: (options: unknown) => ({ options }) }))
jest.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: jest.fn() }))
jest.mock("better-auth/api", () => ({
  getSessionFromCtx: jest.fn(),
  APIError: class extends Error {
    constructor(public status: string, public body: { message: string; code: string }) { super(body.message) }
  },
}))
jest.mock("@/prisma/db", () => ({ db: { user: { findUnique: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() } } }))
jest.mock("@/lib/security/audit-log", () => ({ logSecurityEvent: jest.fn(), SecurityEventType: {} }))

import { auth } from "@/lib/auth"
import { getSessionFromCtx } from "better-auth/api"
import { db } from "@/prisma/db"

const options = (auth as any).options
const lookup = getSessionFromCtx as jest.Mock
const currentUser = db.user.findUnique as jest.Mock
const protectedPaths = [
  "/list-accounts", "/link-social", "/unlink-account", "/get-access-token",
  "/refresh-token", "/account-info", "/verify-password", "/list-sessions",
  "/revoke-session", "/revoke-sessions", "/revoke-other-sessions", "/update-session",
  "/update-user", "/change-password", "/delete-user", "/delete-user/callback", "/change-email",
  undefined, "/future-protected-operation",
]

beforeEach(() => {
  jest.clearAllMocks()
  lookup.mockResolvedValue({ session: { id: "current-session" }, user: { id: "current-user" } })
  currentUser.mockResolvedValue({ isActive: true, isLocked: false, lockedUntil: null })
})

it("disables authority from previously issued signed cookie caches", () => {
  expect(options.session.cookieCache.enabled).toBe(false)
})

it.each(protectedPaths)("denies missing current session for %s before user lookup or writes", async path => {
  lookup.mockResolvedValue(null)
  await expect(options.hooks.before({ path })).rejects.toMatchObject({ status: "UNAUTHORIZED", body: { code: "CURRENT_SESSION_UNAVAILABLE" } })
  expect(currentUser).not.toHaveBeenCalled()
  expect(db.user.updateMany).not.toHaveBeenCalled()
})

it.each([...protectedPaths, "/get-session"])("admits an eligible current subject for %s", async path => {
  await expect(options.hooks.before({ path })).resolves.toBeUndefined()
  expect(currentUser).toHaveBeenCalledWith({ where: { id: "current-user" }, select: { isActive: true, isLocked: true, lockedUntil: true } })
  expect(db.user.updateMany).not.toHaveBeenCalled()
})

it("ignores cached context identity, caller refresh/cache flags and supplied foreign identifiers", async () => {
  const ctx = {
    path: "/unlink-account", query: { disableCookieCache: false, disableRefresh: false },
    context: { session: { user: { id: "foreign-user" } }, marker: "retained" },
    body: { userId: "foreign-user", organizationId: "foreign-org" },
  }
  await options.hooks.before(ctx)
  expect(lookup).toHaveBeenCalledWith(expect.objectContaining({
    query: { disableCookieCache: true, disableRefresh: true },
    context: { session: null, marker: "retained" },
  }))
  expect(currentUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "current-user" } }))
  expect(ctx.context.session.user.id).toBe("foreign-user")
  expect(ctx.query.disableCookieCache).toBe(false)
})

it.each([
  ["missing", null],
  ["inactive", { isActive: false, isLocked: false, lockedUntil: null }],
  ["indefinite lock", { isActive: true, isLocked: true, lockedUntil: null }],
  ["future lock", { isActive: true, isLocked: true, lockedUntil: new Date(Date.now() + 3600000) }],
])("denies %s account for session read and mutation without writes", async (_label, user) => {
  currentUser.mockResolvedValue(user)
  for (const path of ["/get-session", "/unlink-account"]) {
    await expect(options.hooks.before({ path })).rejects.toMatchObject({ status: "UNAUTHORIZED", message: "Authentication required" })
  }
  expect(db.user.updateMany).not.toHaveBeenCalled()
})

it("admits an expired temporary lock without unlocking or requiring tenant/role fields", async () => {
  currentUser.mockResolvedValue({ isActive: true, isLocked: true, lockedUntil: new Date(0) })
  await expect(options.hooks.before({ path: "/list-accounts" })).resolves.toBeUndefined()
  expect(db.user.updateMany).not.toHaveBeenCalled()
})

it("preserves the native anonymous get-session path", async () => {
  lookup.mockResolvedValue(null)
  await expect(options.hooks.before({ path: "/get-session" })).resolves.toBeUndefined()
  expect(currentUser).not.toHaveBeenCalled()
})

it.each([
  "/sign-in/email", "/sign-in/social", "/sign-up/email", "/callback/:id",
  "/send-verification-email", "/verify-email", "/request-password-reset",
  "/reset-password/:token", "/reset-password", "/ok", "/error", "/sign-out",
])("leaves native public/cleanup proof in place for %s", async path => {
  await expect(options.hooks.before({ path })).resolves.toBeUndefined()
  expect(lookup).not.toHaveBeenCalled()
  expect(currentUser).not.toHaveBeenCalled()
  expect(db.user.updateMany).not.toHaveBeenCalled()
})

it("propagates unexpected account lookup failures without admitting the operation", async () => {
  currentUser.mockRejectedValue(new Error("synthetic store failure"))
  await expect(options.hooks.before({ path: "/unlink-account" })).rejects.toThrow("synthetic store failure")
  expect(db.user.updateMany).not.toHaveBeenCalled()
})
