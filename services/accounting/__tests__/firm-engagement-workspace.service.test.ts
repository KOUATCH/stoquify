jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {
  $transaction: jest.fn(), firmEngagement: { findMany: jest.fn(), findFirst: jest.fn() },
  user: { findMany: jest.fn() }, accountantAccessGrant: { findMany: jest.fn() },
  firmEngagementGrantLink: { findUnique: jest.fn() }, accountantClientInvite: { findMany: jest.fn() },
  businessEventOutbox: { findMany: jest.fn() },
} }))
jest.mock("../close-evidence-acceptance-authority.service", () => ({ lockFirmManagementAuthorityInTx: jest.fn() }))
jest.mock("../managed-accountant-access.service", () => ({
  accountantScopeKeys: (c: string, u: string) => [`${c}:${u}`, `managed:${c}:${u}`], assertManagedAccountantAccess: jest.fn(),
}))
import { db } from "@/prisma/db"
import { lockFirmManagementAuthorityInTx } from "../close-evidence-acceptance-authority.service"
import { getFirmEngagementWorkspace, getAccountantInvitationDelivery } from "../firm-engagement-workspace.service"
const actor = { homeOrganizationId: "firm", actorId: "manager", session: { id: "s", token: "token" } }
const revalidate = jest.fn()
const tx = db as any
beforeEach(() => {
  jest.resetAllMocks()
  tx.$transaction.mockImplementation((fn: any) => fn(tx))
  ;(lockFirmManagementAuthorityInTx as jest.Mock).mockResolvedValue({ revalidate })
  tx.firmEngagement.findMany.mockResolvedValue([])
  tx.firmEngagement.findFirst.mockResolvedValue(null)
  tx.user.findMany.mockResolvedValue([])
  tx.accountantAccessGrant.findMany.mockResolvedValue([])
  tx.accountantClientInvite.findMany.mockResolvedValue([])
  tx.businessEventOutbox.findMany.mockResolvedValue([])
})
it("binds pagination to current firm and revalidates persistent authority", async () => {
  await getFirmEngagementWorkspace(actor, { after: "foreign-cursor" })
  expect(tx.firmEngagement.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { firmOrganizationId: "firm", id: { gt: "foreign-cursor" } }, take: 21 }))
  expect(revalidate).toHaveBeenCalledTimes(1)
})
it("denies a guessed engagement without returning other metadata", async () => {
  await expect(getFirmEngagementWorkspace(actor, { engagementId: "foreign" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.firmEngagement.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign", firmOrganizationId: "firm" } }))
})
it("does not return collected data if authority is lost", async () => {
  revalidate.mockRejectedValue(Error("session expired"))
  await expect(getFirmEngagementWorkspace(actor, {})).rejects.toThrow("session expired")
})
it.each(["homeOrganizationId", "actorId", "session"])("rejects injected %s", async key => {
  await expect(getFirmEngagementWorkspace(actor, { [key]: "forged" })).rejects.toThrow()
  expect(lockFirmManagementAuthorityInTx).not.toHaveBeenCalled()
})
it("separates pending acceptance and failed delivery without secret outbox data", async () => {
  tx.accountantClientInvite.findMany.mockResolvedValue([{ id: "i", redactedEmail: "x***@example.invalid", role: "REVIEWER",
    expiresAt: new Date("2099-01-01"), outboxId: "o", states: [{ status: "PENDING" }], inviteTokenHash: "never-return" }])
  tx.businessEventOutbox.findMany.mockResolvedValue([{ id: "o", status: "FAILED", attempts: 2, maxAttempts: 5,
    availableAt: new Date("2027-01-01"), payload: { sealedEnvelope: "secret" } }])
  const r = await getAccountantInvitationDelivery(actor)
  expect(r.rows[0]).toMatchObject({ acceptance: "PENDING", delivery: "FAILED", attempts: 2 })
  expect(JSON.stringify(r)).not.toMatch(/secret|never-return|sealedEnvelope/)
  expect(tx.businessEventOutbox.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "firm", id: { in: ["o"] } } }))
})
