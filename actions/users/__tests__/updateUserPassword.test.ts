import { updateUserPassword } from "../updateUserPassword"
import { requireSession, requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { stepUpSessionWithPassword } from "@/services/security/step-up-auth.service"
import { changeUserPasswordWorkflow } from "@/services/users/user-identity.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn(), requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/security/step-up-auth.service", () => ({ stepUpSessionWithPassword: jest.fn() }))
jest.mock("@/services/users/user-identity.service", () => ({ changeUserPasswordWorkflow: jest.fn(), completePasswordResetWorkflow: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/lib/security/public-request-context", () => ({ getPublicIdentityRequestContext: jest.fn() }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("next/navigation", () => ({ redirect: jest.fn(() => { throw new Error("NEXT_REDIRECT") }) }))
jest.mock("next-intl/server", () => ({ getLocale: jest.fn(async () => "fr") }))
jest.mock("next-intl/routing", () => ({ defineRouting: (value: unknown) => value }))
jest.mock("@/actions/_shared/safe-action-responses", () => ({ logSafeActionWarning: jest.fn(), safeStatusActionErrorResult: jest.fn((error: Error) => ({ status: 403, code: error.name === "FreshAuthRequiredError" ? "FRESH_AUTH_REQUIRED" : "FORBIDDEN", data: null, error: "Unavailable" })) }))
const fields = { oldPassword: "Old!LocalCredential-57", newPassword: "New!LocalCredential-86" }
const ctx = { userId: "actor", orgId: "org", user: { id: "actor", organizationId: "org" }, permissions: ["profile.password.update", "users.password.reset"] }
const verified = { ctx, claims: { sessionId: "session", sessionToken: "private-session", userId: "actor", tenantId: "org" } }
beforeEach(() => {
  jest.clearAllMocks()
  ;(requireSession as jest.Mock).mockResolvedValue(verified)
  ;(requireFreshAuth as jest.Mock).mockResolvedValue(verified)
  ;(requirePermission as jest.Mock).mockResolvedValue(ctx)
  ;(stepUpSessionWithPassword as jest.Mock).mockResolvedValue({ status: "verified" })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue(undefined)
  ;(changeUserPasswordWorkflow as jest.Mock).mockResolvedValue({ status: 200, code: null, error: null, data: { selfService: true, sessionsRevoked: true } })
})
it("uses server identity/session/permissions and real current-password assurance for a self change", async () => {
  await expect(updateUserPassword("actor", { ...fields, actor: "forged", organizationId: "other", session: "forged" } as typeof fields)).rejects.toThrow("NEXT_REDIRECT")
  expect(redirect).toHaveBeenCalledWith("/fr/login-v2?notice=password-change")
  expect(requirePermission).toHaveBeenCalledWith("profile.password.update", expect.any(Object))
  expect(stepUpSessionWithPassword).toHaveBeenCalledWith({ sessionId: "session", sessionToken: "private-session", userId: "actor", organizationId: "org", password: fields.oldPassword })
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(changeUserPasswordWorkflow).toHaveBeenCalledWith({ ...fields, targetUserId: "actor", actor: ctx.user, actorPermissions: ctx.permissions, session: { id: "session", token: "private-session" } })
  expect(revalidatePath).not.toHaveBeenCalled()
})
it.each([{ state: "invalid_password", status: 403, code: "INVALID_CREDENTIALS" }, { state: "locked", status: 429, code: "RATE_LIMITED" }, { state: "session_invalid", status: 401, code: "AUTH_REQUIRED" }])("does not prepare a password after $state", async ({ state, status, code }) => {
  ;(stepUpSessionWithPassword as jest.Mock).mockResolvedValue({ status: state })
  expect(await updateUserPassword("actor", fields)).toMatchObject({ status, code })
  expect(requireFreshAuth).not.toHaveBeenCalled(); expect(changeUserPasswordWorkflow).not.toHaveBeenCalled()
})
it("retains the administrative permission/fresh-auth gate and invalidates only the users view", async () => {
  ;(changeUserPasswordWorkflow as jest.Mock).mockResolvedValue({ status: 200, data: { selfService: false, sessionsRevoked: true } })
  expect(await updateUserPassword("target", { ...fields, oldPassword: "" })).toMatchObject({ status: 200 })
  expect(requirePermission).toHaveBeenCalledWith("users.password.reset", expect.objectContaining({ resourceId: "target" }))
  expect(stepUpSessionWithPassword).not.toHaveBeenCalled(); expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(revalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/settings/users", "page")
})
it("denies before assurance or mutation when permission is missing", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new Error("denied"))
  expect(await updateUserPassword("target", fields)).toMatchObject({ status: 403 })
  expect(stepUpSessionWithPassword).not.toHaveBeenCalled(); expect(changeUserPasswordWorkflow).not.toHaveBeenCalled()
})
it("does not mutate with expired administrative assurance", async () => {
  const error = new Error("expired"); error.name = "FreshAuthRequiredError"
  ;(requireFreshAuth as jest.Mock).mockRejectedValue(error)
  expect(await updateUserPassword("target", fields)).toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  expect(changeUserPasswordWorkflow).not.toHaveBeenCalled()
})
it.each(["initial", "fresh"])("rejects an organization change at the %s context", async phase => {
  if (phase === "initial") (requirePermission as jest.Mock).mockResolvedValue({ ...ctx, orgId: "other" })
  else (requireFreshAuth as jest.Mock).mockResolvedValue({ ...verified, ctx: { ...ctx, orgId: "other" } })
  expect(await updateUserPassword("actor", fields)).toMatchObject({ status: 401 })
  expect(changeUserPasswordWorkflow).not.toHaveBeenCalled()
})
it("returns service conflicts unchanged without success invalidation", async () => {
  const result = { status: 409, code: "CREDENTIAL_CHANGED", data: null, error: "changed" }
  ;(changeUserPasswordWorkflow as jest.Mock).mockResolvedValue(result)
  expect(await updateUserPassword("target", fields)).toEqual(result)
  expect(revalidatePath).not.toHaveBeenCalled()
})
it("bounds untrusted inputs before assurance or hashing", async () => {
  expect(await updateUserPassword("actor", { ...fields, oldPassword: "x".repeat(1025) })).toMatchObject({ status: 400 })
  expect(requireSession).not.toHaveBeenCalled(); expect(changeUserPasswordWorkflow).not.toHaveBeenCalled()
})
