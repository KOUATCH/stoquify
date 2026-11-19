/** @jest-environment node */
import { requireSession } from "@/lib/security/auth-session"
import { ApplicationError } from "@/services/_shared/action-errors"
import { getSelfProfile, updateSelfProfile } from "../self-profile.service"
import { readSelfProfileHttp, updateSelfProfileHttp } from "../self-profile-http.service"
jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("../self-profile.service", () => ({ getSelfProfile: jest.fn(), updateSelfProfile: jest.fn() }))
jest.mock("@/services/_shared/action-errors", () => {
  class ApplicationError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } }
  return { ApplicationError, toSafeActionError: (error: any) => ({ code: error.code ?? "INTERNAL_ERROR", status: error.status ?? 500, correlationId: "correlation" }) }
})
const command = { requestId: "6e80a55c-a67c-490c-b9e7-47390223ba73", expectedHash: "a".repeat(64), fields: { firstName: "Alex", lastName: "", jobTitle: "" } }
const request = (body: unknown = command, headers: Record<string, string> = {}) => new Request("http://localhost:3000/api/auth/update-user", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) })
beforeEach(() => { jest.resetAllMocks(); (requireSession as jest.Mock).mockResolvedValue({ ctx: { userId: "actor", orgId: "org" }, claims: { sessionId: "session", sessionToken: "private-token" } }); (getSelfProfile as jest.Mock).mockResolvedValue({ actorId: "actor" }); (updateSelfProfile as jest.Mock).mockResolvedValue({ id: "receipt" }) })
it("returns private no-store reads and only server-owned scope", async () => {
  const response = await readSelfProfileHttp()
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(getSelfProfile).toHaveBeenCalledWith({ actorId: "actor", organizationId: "org", sessionId: "session", sessionToken: "private-token" })
})
it("accepts a reviewed JSON command through the same service", async () => {
  const response = await updateSelfProfileHttp(request())
  expect(await response.json()).toEqual({ status: true, receipt: { id: "receipt" } })
  expect(updateSelfProfile).toHaveBeenCalledWith(expect.objectContaining({ actorId: "actor", organizationId: "org" }), command)
})
it.each([{ origin: "https://foreign.example" }, { origin: "" }, { "sec-fetch-site": "cross-site" }])("rejects cross-site requests before authentication or writing", async headers => {
  expect((await updateSelfProfileHttp(request(command, headers))).status).toBe(403)
  expect(requireSession).not.toHaveBeenCalled(); expect(updateSelfProfile).not.toHaveBeenCalled()
})
it.each(["text/plain", "application/json-unsafe"])("rejects unsupported media type %s", async type => {
  expect((await updateSelfProfileHttp(request(command, { "content-type": type }))).status).toBe(400)
  expect(updateSelfProfile).not.toHaveBeenCalled()
})
it("gives legacy callers review guidance without updating their account", async () => {
  const response = await updateSelfProfileHttp(request({ name: "Legacy name" }))
  expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ error: "PROFILE_REVIEW_REQUIRED", profile: "/api/me/profile" })
  expect(updateSelfProfile).not.toHaveBeenCalled()
})
it.each(["{bad", "x".repeat(8193)])("rejects malformed or oversized bodies", async body => {
  expect((await updateSelfProfileHttp(request(body))).status).toBe(400)
  expect(updateSelfProfile).not.toHaveBeenCalled()
})
it("keeps permission failures private and distinct from success", async () => {
  ;(updateSelfProfile as jest.Mock).mockRejectedValue(new ApplicationError("FORBIDDEN", "private diagnostic", 403))
  const response = await updateSelfProfileHttp(request())
  expect(response.status).toBe(403); expect(JSON.stringify(await response.json())).not.toContain("private diagnostic")
})
