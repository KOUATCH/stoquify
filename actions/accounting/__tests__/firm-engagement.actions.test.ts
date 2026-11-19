jest.mock("server-only", () => ({}))
jest.mock("@/services/accounting/firm-engagement-workspace.service", () => ({ getFirmEngagementWorkspace: jest.fn(), getAccountantInvitationDelivery: jest.fn() }))
jest.mock("@/services/accounting/accountant-work-desk.service", () => ({ getAccountantHandoverSummary: jest.fn() }))
jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((options, handler) => async input => {
    const ctx = (globalThis as any).__af04Context
    if (!ctx || !ctx.permissions.includes(options.permission)) throw Error("Forbidden")
    if (options.freshAuth && !ctx.freshAuth) throw Error("Fresh authentication required")
    return handler(input, ctx)
  }),
}))
jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class extends Error {}, SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 },
  requireSession: jest.fn(async () => ({ claims: (globalThis as any).__af04Context.freshAuth.claims })),
}))
jest.mock("@/services/accounting/firm-engagement.service", () => ({
  executeFirmEngagementCommand: jest.fn(async (_actor, input) => {
    require("@/services/accounting/firm-engagement.schemas").firmEngagementCommandSchema.parse(input)
    return { engagementId: "owned", status: "DRAFT", version: 0 }
  }),
  getFirmEngagement: jest.fn(async () => ({ id: "owned" })),
}))
import { executeFirmEngagementCommandAction, getFirmEngagementAction, getFirmEngagementWorkspaceAction, getAccountantInvitationDeliveryAction, getFirmHandoverSummaryAction } from "../firm-engagement.actions"
import { getFirmEngagementWorkspace, getAccountantInvitationDelivery } from "@/services/accounting/firm-engagement-workspace.service"
import { getAccountantHandoverSummary } from "@/services/accounting/accountant-work-desk.service"
import { executeFirmEngagementCommand } from "@/services/accounting/firm-engagement.service"
import { protect } from "@/services/_shared/protect"
const command = { command: "CREATE", clientOrganizationId: "client", ownerUserId: "actor", scope: "READ_ONLY",
  effectiveFrom: "2026-01-01", expiresAt: "2027-01-01", idempotencyKey: "create-command" }
beforeEach(() => {
  jest.clearAllMocks()
  const now = new Date()
  ;(globalThis as any).__af04Context = { orgId: "firm", userId: "actor", permissions: ["accounting.close.accountant.invite"],
    freshAuth: { lastAuthAt: now, claims: { userId: "actor", tenantId: "firm", assuranceOrganizationId: "firm",
      assuranceLevel: 1, lastAuthAt: now.getTime(), sessionId: "persisted-session", sessionToken: "synthetic-token" } } }
})
afterAll(() => { delete (globalThis as any).__af04Context })
it("derives home/actor/session from authenticated context", async () => {
  await executeFirmEngagementCommandAction(command)
  expect(executeFirmEngagementCommand).toHaveBeenCalledWith({ homeOrganizationId: "firm", actorId: "actor",
    session: { id: "persisted-session", token: "synthetic-token" } }, command)
})
it.each(["homeOrganizationId", "actorId", "session", "restrictOnly"])("rejects injected %s on direct calls", async key => {
  await expect(executeFirmEngagementCommandAction({ ...command, [key]: "forged" })).rejects.toThrow()
})
it.each(["no-permission", "no-fresh-auth", "cross-tenant-session", "no-session-token"])("denies %s before the service", async kind => {
  const ctx = (globalThis as any).__af04Context
  if (kind === "no-permission") ctx.permissions = []
  if (kind === "no-fresh-auth") ctx.freshAuth = undefined
  if (kind === "cross-tenant-session") ctx.freshAuth.claims.tenantId = "other"
  if (kind === "no-session-token") ctx.freshAuth.claims.sessionToken = ""
  await expect(executeFirmEngagementCommandAction(command)).rejects.toThrow()
  expect(executeFirmEngagementCommand).not.toHaveBeenCalled()
})
it("reads retained management metadata using current session identity", async () => {
  await expect(getFirmEngagementAction({ engagementId: "owned" })).resolves.toEqual({ id: "owned" })
})
it("binds workspace and redacted delivery reads to trusted home/session", async () => {
  await getFirmEngagementWorkspaceAction({ engagementId: "owned" })
  await getAccountantInvitationDeliveryAction()
  const actor = { homeOrganizationId: "firm", actorId: "actor", session: { id: "persisted-session", token: "synthetic-token" } }
  expect(getFirmEngagementWorkspace).toHaveBeenCalledWith(actor, { engagementId: "owned" })
  expect(getAccountantInvitationDelivery).toHaveBeenCalledWith(actor)
})
it("rejects invalid handover summary payload rather than accepting UI authority", async () => {
  await expect(getFirmHandoverSummaryAction({ clientOrganizationId: "client", actorId: "other" })).rejects.toThrow()
  expect(getAccountantHandoverSummary).not.toHaveBeenCalled()
})
it("propagates domain denial for a manager without a review mandate", async () => {
  ;(getAccountantHandoverSummary as jest.Mock).mockRejectedValueOnce(Error("No review mandate"))
  await expect(getFirmHandoverSummaryAction({ clientOrganizationId: "client" })).rejects.toThrow("No review mandate")
})
