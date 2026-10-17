jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn(), SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
import { requireSession } from "@/lib/security/auth-session"
import { closeEvidenceWorkControl } from "../close-evidence-acceptance-context"
import type { ProtectedActionContext } from "@/services/_shared/protect"
const ctx = { userId: "actor", orgId: "org", permissions: ["accounting.close.evidence.request"] } as ProtectedActionContext
beforeEach(() => jest.clearAllMocks())
test("passes only authenticated server session proof", async () => {
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { userId: "actor", tenantId: "org", sessionId: "persisted", sessionToken: "private" } })
  await expect(closeEvidenceWorkControl(ctx)).resolves.toEqual({ actorId: "actor", actorPermissions: ctx.permissions, session: { id: "persisted", token: "private" } })
})
test.each([{ userId: "foreign", tenantId: "org" }, { userId: "actor", tenantId: "foreign" }, { userId: "actor", tenantId: "org", sessionToken: "" }])("rejects mismatched/missing server session", async claims => {
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { sessionId: "persisted", sessionToken: "private", ...claims } })
  await expect(closeEvidenceWorkControl(ctx)).rejects.toMatchObject({ code: "AUTH_REQUIRED" })
})
