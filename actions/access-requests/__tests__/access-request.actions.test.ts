jest.mock("@/lib/security/rbac", () => ({ requireRbacContext: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/services/access-requests/access-request.service", () => ({
  submitAccessRequest: jest.fn(), listAccessRequests: jest.fn(), withdrawAccessRequest: jest.fn(), previewAccessRequest: jest.fn(), decideAccessRequest: jest.fn(), applyAccessRequest: jest.fn(), accessRequestReturnPath: jest.fn(), readAccessRequestHistory: jest.fn(), AccessRequestModuleUnavailable: class extends Error {},
}))
import { requireRbacContext } from "@/lib/security/rbac"
import { requireFreshAuth } from "@/lib/security/auth-session"
import * as service from "@/services/access-requests/access-request.service"
import * as actions from "../access-request.actions"
import { ApplicationError, ConflictError, ForbiddenError } from "@/services/_shared/action-errors"
const ctx = { orgId: "org", userId: "actor", permissions: ["users.read"] }
beforeEach(() => {
  jest.clearAllMocks()
  ;(requireRbacContext as jest.Mock).mockResolvedValue(ctx)
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { tenantId: "org", userId: "actor", sessionId: "session", sessionToken: "test-only" } })
  for (const method of Object.values(service)) if (jest.isMockFunction(method)) method.mockResolvedValue({ id: "request" })
})
it("derives the actor from the current session and forwards the untrusted command separately", async () => {
  const command = { id: "request", orgId: "other", requesterId: "other" }
  await actions.submitAccessRequestAction(command)
  expect(service.submitAccessRequest).toHaveBeenCalledWith(ctx, command)
})
it.each(["userId", "tenantId"])("rejects fresh-auth %s identity mismatch before applying", async key => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { tenantId: "org", userId: "actor", [key]: "other" } })
  expect(await actions.applyAccessRequestAction({})).toEqual({ success: false, reason: "restricted" })
  expect(service.applyAccessRequest).not.toHaveBeenCalled()
})
it("passes fresh session proof only to the grant application service", async () => {
  await actions.applyAccessRequestAction({ id: "request", revision: 2 })
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(service.applyAccessRequest).toHaveBeenCalledWith(ctx, { id: "request", revision: 2 }, { id: "session", token: "test-only" })
})
it.each([
  [new ApplicationError("FRESH_AUTH_REQUIRED", "private", 403), "fresh-auth"],
  [new ConflictError("private"), "stale"],
  [new ForbiddenError("private"), "restricted"],
  [new Error("database private payload"), "unavailable"],
])("returns fixed safe error classifications", async (error, reason) => {
  ;(service.listAccessRequests as jest.Mock).mockRejectedValue(error)
  expect(await actions.listAccessRequestsAction({})).toEqual({ success: false, reason })
})
it("never trusts a client-supplied return URL", async () => {
  ;(service.accessRequestReturnPath as jest.Mock).mockResolvedValue("/dashboard/inventory/items")
  expect(await actions.accessRequestReturnPathAction("request")).toEqual({ success: true, data: "/dashboard/inventory/items" })
  expect(service.accessRequestReturnPath).toHaveBeenCalledWith(ctx, "request")
})
it.each(["withdrawAccessRequestAction", "previewAccessRequestAction", "decideAccessRequestAction"] as const)("authenticates %s", async method => {
  ;(requireRbacContext as jest.Mock).mockRejectedValue(new Error("expired session"))
  expect(await actions[method]({})).toEqual({ success: false, reason: "unavailable" })
})
it.each([["UNAUTHENTICATED", "session"], ["NO_ACTIVE_ORG", "organization"]])("distinguishes %s from a permission request", async (code, reason) => {
  ;(requireRbacContext as jest.Mock).mockRejectedValue(Object.assign(new Error("private"), { code }))
  expect(await actions.listAccessRequestsAction({})).toEqual({ success: false, reason })
})
