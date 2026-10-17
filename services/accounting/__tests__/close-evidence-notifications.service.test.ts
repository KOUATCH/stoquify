import { db } from "@/prisma/db"
import { getCloseEvidenceNotifications } from "../close-evidence-notifications.service"
import { assertCloseEvidenceActor } from "../close-evidence-workflow.service"
import { readCloseEvidenceRecipient } from "../close-evidence-recipient.service"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../close-evidence-workflow.service", () => ({ assertCloseEvidenceActor: jest.fn() }))
jest.mock("../close-evidence-recipient.service", () => ({ readCloseEvidenceRecipient: jest.fn() }))
const actor = { organizationId: "org", actorId: "recipient" }, input = { periodId: "period" }
const row = { id: "publication", requestId: "request", findingId: "finding", eventName: "close.assurance.missing_evidence.requested", publishedAt: new Date("2026-10-04T09:00:00Z") }
const tx = { accountingPeriod: { findFirst: jest.fn() }, closeEvidenceNotification: { findMany: jest.fn() }, accountantComment: { findFirst: jest.fn() } }
beforeEach(() => {
  jest.clearAllMocks()
  ;(db.$transaction as jest.Mock).mockImplementation(fn => fn(tx))
  ;(assertCloseEvidenceActor as jest.Mock).mockResolvedValue({ permissions: ["accounting.close.read"], writable: false })
  ;(readCloseEvidenceRecipient as jest.Mock).mockResolvedValue({ recipientId: "recipient" })
  tx.accountingPeriod.findFirst.mockResolvedValue({ id: "period" }); tx.closeEvidenceNotification.findMany.mockResolvedValue([row]); tx.accountantComment.findFirst.mockResolvedValue({ id: "request" })
})
it("allows read-only current recipients and returns no private body or actor metadata", async () => {
  const result = await getCloseEvidenceNotifications(actor, input)
  expect(result.items).toEqual([{ id: "publication", requestId: "request", eventName: row.eventName, publishedAt: row.publishedAt.toISOString() }])
  expect(assertCloseEvidenceActor).toHaveBeenCalledTimes(2)
  expect(tx.closeEvidenceNotification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", periodId: "period" }, take: 51 }))
})
it("removes former recipients", async () => {
  ;(readCloseEvidenceRecipient as jest.Mock).mockResolvedValue({ recipientId: "replacement" })
  expect((await getCloseEvidenceNotifications(actor, input)).items).toEqual([])
})
it("routes responses to current reviewers rather than the original requester", async () => {
  tx.closeEvidenceNotification.findMany.mockResolvedValue([{ ...row, eventName: "close.assurance.missing_evidence.response_submitted" }])
  expect((await getCloseEvidenceNotifications(actor, input)).items).toEqual([])
  ;(assertCloseEvidenceActor as jest.Mock).mockResolvedValue({ permissions: ["accounting.close.read", "accounting.close.accountant.review"], writable: true })
  expect((await getCloseEvidenceNotifications({ ...actor, actorId: "current-reviewer" }, input)).items).toHaveLength(1)
})
it("rejects a reviewer permission revoked during the read", async () => {
  ;(assertCloseEvidenceActor as jest.Mock).mockResolvedValueOnce({ permissions: ["accounting.close.read", "accounting.close.accountant.review"] }).mockResolvedValueOnce({ permissions: ["accounting.close.read"] })
  await expect(getCloseEvidenceNotifications(actor, input)).rejects.toThrow()
})
it("does not read inbox rows when current authority fails", async () => {
  ;(assertCloseEvidenceActor as jest.Mock).mockRejectedValueOnce(new Error("denied"))
  await expect(getCloseEvidenceNotifications(actor, input)).rejects.toThrow("denied")
  expect(tx.closeEvidenceNotification.findMany).not.toHaveBeenCalled()
})
it("does not turn a database failure into an empty success", async () => {
  tx.closeEvidenceNotification.findMany.mockRejectedValueOnce(new Error("unavailable"))
  await expect(getCloseEvidenceNotifications(actor, input)).rejects.toThrow("unavailable")
})
it("rejects a foreign or missing accounting period", async () => {
  tx.accountingPeriod.findFirst.mockResolvedValue(null)
  await expect(getCloseEvidenceNotifications(actor, input)).rejects.toThrow()
  expect(tx.closeEvidenceNotification.findMany).not.toHaveBeenCalled()
})
it("marks missing source records as incomplete", async () => {
  tx.accountantComment.findFirst.mockResolvedValue(null)
  expect(await getCloseEvidenceNotifications(actor, input)).toMatchObject({ items: [], evidenceIssue: true })
})
it("continues bounded pages even when the current audience sees no rows", async () => {
  tx.closeEvidenceNotification.findMany.mockResolvedValue(Array.from({ length: 51 }, (_, i) => ({ ...row, id: `row-${i}` })))
  ;(readCloseEvidenceRecipient as jest.Mock).mockResolvedValue({ recipientId: "other" })
  const result = await getCloseEvidenceNotifications(actor, input)
  expect(result.items).toEqual([]); expect(result.next).toEqual({ id: "row-49", publishedAt: row.publishedAt.toISOString() })
  await getCloseEvidenceNotifications(actor, { ...input, before: result.next! })
  expect(tx.closeEvidenceNotification.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", periodId: "period", OR: expect.any(Array) }) }))
})
