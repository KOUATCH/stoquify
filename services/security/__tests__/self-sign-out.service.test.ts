import { db } from "@/prisma/db"
import { revokePresentedSession } from "../self-sign-out.service"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
let tx: any
const session = { id: "current", userId: "actor", user: { organizationId: "org" } }
beforeEach(() => {
  jest.resetAllMocks()
  tx = { $queryRaw: jest.fn(), session: { findUnique: jest.fn().mockResolvedValue(session), deleteMany: jest.fn().mockResolvedValue({ count: 1 }) }, auditLog: { create: jest.fn() } }
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(tx))
})
it("does not report confirmation when the mandatory audit fails", async () => {
  tx.auditLog.create.mockRejectedValue(new Error("audit failed"))
  await expect(revokePresentedSession("private-token")).rejects.toThrow("audit failed")
})
it.each([{ ...session, id: "replacement" }, { ...session, userId: "another" }, { ...session, user: { organizationId: "other-org" } }])("rejects changed session ownership after waiting for locks", async changed => {
  tx.session.findUnique.mockResolvedValueOnce(session).mockResolvedValueOnce(changed)
  await expect(revokePresentedSession("private-token")).rejects.toMatchObject({ code: "CONFLICT" })
  expect(tx.session.deleteMany).not.toHaveBeenCalled()
  expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("treats a concurrent deletion as an already absent session without duplicate evidence", async () => {
  tx.session.findUnique.mockResolvedValueOnce(session).mockResolvedValueOnce(null)
  await expect(revokePresentedSession("private-token")).resolves.toEqual({ serverSession: "absent" })
  expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("rejects a deletion count conflict before writing success evidence", async () => {
  tx.session.deleteMany.mockResolvedValue({ count: 0 })
  await expect(revokePresentedSession("private-token")).rejects.toMatchObject({ code: "CONFLICT" })
  expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("stores minimal evidence without retaining the session credential", async () => {
  await expect(revokePresentedSession("private-token")).resolves.toMatchObject({ serverSession: "revoked" })
  expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { id: "current", userId: "actor", token: "private-token" } })
  expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "auth.session.signed_out", userId: "actor", organizationId: "org" })
  expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("private-token")
})
