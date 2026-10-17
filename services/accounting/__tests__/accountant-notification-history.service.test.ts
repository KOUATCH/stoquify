jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), organization: { findFirst: jest.fn() }, closeEvidenceNotification: { findMany: jest.fn() }, accountantComment: { findMany: jest.fn() }, accountingPeriod: { findMany: jest.fn() } } }))
jest.mock("../accountant-work-desk.service", () => ({ assertAccountantWorkClient: jest.fn() }))
import { db } from "@/prisma/db"
import { assertAccountantWorkClient } from "../accountant-work-desk.service"
import { getAccountantNotificationHistory } from "../accountant-notification-history.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
const actor = { homeOrganizationId: "firm", actorId: "reviewer", actorPermissions: ["accounting.close.accountant.review"] }
const access = assertAccountantWorkClient as jest.Mock, read = db.closeEvidenceNotification.findMany as jest.Mock
const eventName = "close.assurance.missing_evidence.response_accepted"
const row = { id: "publication", organizationId: "client", periodId: "period", findingId: "finding", requestId: "request", eventName, payloadHash: "hash", publishedAt: new Date("2026-10-04T08:00:00Z"), outbox: { eventName, payloadHash: "hash" } }
beforeEach(() => {
  jest.resetAllMocks(); access.mockResolvedValue(undefined)
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(db))
  ;(db.organization.findFirst as jest.Mock).mockResolvedValue({ name: "Client" })
  read.mockResolvedValue([row])
  ;(db.accountantComment.findMany as jest.Mock).mockResolvedValue([{ id: "request", organizationId: "client", periodId: "period", findingId: "finding" }])
  ;(db.accountingPeriod.findMany as jest.Mock).mockResolvedValue([{ id: "period", name: "October" }])
})
it("retains accepted publications without requiring open findings or exposing evidence bodies", async () => {
  const result = await getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })
  expect(result.items).toEqual([{ id: "publication", requestId: "request", periodId: "period", periodName: "October", eventName, publishedAt: row.publishedAt.toISOString() }])
  expect(access).toHaveBeenCalledTimes(2)
  expect(read).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "client" }, take: 51 }))
  expect(db.accountantComment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "client", id: { in: ["request"] }, visibility: "CLIENT_ACTION_REQUIRED" }, select: { id: true, organizationId: true, periodId: true, findingId: true } }))
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
})
it("does not query records when current client access is denied", async () => {
  access.mockRejectedValue(new ForbiddenError())
  await expect(getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })).rejects.toThrow()
  expect(db.$transaction).not.toHaveBeenCalled()
})
it("discards the whole page if authority is revoked during its read", async () => {
  access.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new ForbiddenError())
  await expect(getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })).rejects.toThrow()
  expect(read).toHaveBeenCalledTimes(1)
})
it("propagates a database failure instead of reporting zero publications", async () => {
  read.mockRejectedValue(new Error("storage unavailable"))
  await expect(getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })).rejects.toThrow("storage unavailable")
})
it.each(["periodId", "findingId", "organizationId"])("omits a publication whose request has a different %s", async field => {
  ;(db.accountantComment.findMany as jest.Mock).mockResolvedValue([{ id: "request", organizationId: "client", periodId: "period", findingId: "finding", [field]: "other" }])
  expect(await getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })).toMatchObject({ items: [], incomplete: true })
})
it.each(["eventName", "payloadHash"])("omits a publication whose outbox has a different %s", async field => {
  read.mockResolvedValue([{ ...row, outbox: { ...row.outbox, [field]: "wrong" } }])
  expect(await getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })).toMatchObject({ items: [], incomplete: true })
})
it("marks missing source records incomplete", async () => {
  ;(db.accountantComment.findMany as jest.Mock).mockResolvedValue([])
  expect(await getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })).toMatchObject({ items: [], incomplete: true })
})
it("advances past a full invalid page using the scanned position", async () => {
  read.mockResolvedValue(Array.from({ length: 51 }, (_, i) => ({ ...row, id: `publication-${i}` })))
  ;(db.accountantComment.findMany as jest.Mock).mockResolvedValue([])
  const first = await getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })
  expect(first).toMatchObject({ items: [], incomplete: true, nextCursor: expect.any(String) })
  read.mockResolvedValue([])
  await getAccountantNotificationHistory(actor, { clientOrganizationId: "client", cursor: first.nextCursor! })
  expect(read).toHaveBeenLastCalledWith(expect.objectContaining({ where: { organizationId: "client", OR: [{ publishedAt: { lt: row.publishedAt } }, { publishedAt: row.publishedAt, id: { lt: "publication-49" } }] } }))
})
it.each(["homeOrganizationId", "clientOrganizationId", "actorId", "version"])("rejects a cursor from a different %s before reading", async field => {
  const cursor = Buffer.from(JSON.stringify({ version: 1, ...actor, actorPermissions: undefined, clientOrganizationId: "client", id: "last", publishedAt: row.publishedAt.toISOString(), [field]: "other" })).toString("base64url")
  await expect(getAccountantNotificationHistory(actor, { clientOrganizationId: "client", cursor })).rejects.toThrow("no longer valid")
  expect(read).not.toHaveBeenCalled()
})
it("returns a truthful empty page with no source queries", async () => {
  read.mockResolvedValue([])
  expect(await getAccountantNotificationHistory(actor, { clientOrganizationId: "client" })).toMatchObject({ items: [], incomplete: false, nextCursor: null })
  expect(db.accountantComment.findMany).not.toHaveBeenCalled()
})
