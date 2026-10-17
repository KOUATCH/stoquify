jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), accountingPeriod: { findMany: jest.fn() }, closeRun: { findMany: jest.fn() } } }))
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { JournalReversalSnapshotChangedError } from "@/services/accounting/journal-reversal-order.service"
import { lockReconciliationCloseCatalogInTx, lockReconciliationClosePeriodsInTx, withReconciliationCloseRetry } from "../reconciliation-close-order.service"

function fixture() {
  const calls: string[] = []
  const value = { $queryRaw: jest.fn(async (query: Prisma.Sql) => { calls.push(query.text); return query.text.includes("current_setting") ? [{ isolationLevel: "serializable" }] : [] }),
    accountingPeriod: { findMany: jest.fn().mockResolvedValue([{ id: "old" }, { id: "current" }]) }, closeRun: { findMany: jest.fn().mockResolvedValue([]) } }
  return { value, tx: value as unknown as Prisma.TransactionClient, calls }
}
beforeEach(() => { jest.resetAllMocks(); (db.accountingPeriod.findMany as jest.Mock).mockResolvedValue([{ id: "old" }, { id: "current" }]); (db.closeRun.findMany as jest.Mock).mockResolvedValue([]) })
it("locks complete sorted tenant periods including earlier dates before comparing publication eligibility", async () => {
  const { value, tx } = fixture()
  await lockReconciliationCloseCatalogInTx(tx, "org")
  expect(await lockReconciliationClosePeriodsInTx(tx, "org")).toEqual(["current", "old"])
  const queries = value.$queryRaw.mock.calls.filter(([sql]) => sql.text.includes("pg_advisory_xact_lock("))
  expect(queries.map(([sql]) => sql.values[0])).toEqual(['["close-assessment-order","org","current"]', '["close-assessment-order","org","old"]'])
  expect(value.$queryRaw.mock.invocationCallOrder.at(-1)).toBeLessThan(value.closeRun.findMany.mock.invocationCallOrder[0])
  expect(db.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", periodId: { in: ["current", "old"] }, OR: expect.arrayContaining([{ packExports: { some: { isCertified: true } } }]) } }))
})
it("allows creation before any accounting periods exist without inventing an accounting period", async () => {
  const { value, tx } = fixture(); value.accountingPeriod.findMany.mockResolvedValue([]); (db.accountingPeriod.findMany as jest.Mock).mockResolvedValue([])
  await lockReconciliationCloseCatalogInTx(tx, "org")
  expect(await lockReconciliationClosePeriodsInTx(tx, "org")).toEqual([])
  expect(value.$queryRaw.mock.calls.filter(([sql]) => sql.text.includes("pg_advisory_xact_lock("))).toHaveLength(0)
})
it("rejects a newly committed calendar or Close target outside the Serializable snapshot", async () => {
  const { tx } = fixture(); (db.accountingPeriod.findMany as jest.Mock).mockResolvedValue([{ id: "new" }])
  await expect(lockReconciliationCloseCatalogInTx(tx, "org")).rejects.toBeInstanceOf(JournalReversalSnapshotChangedError)
  ;(db.closeRun.findMany as jest.Mock).mockResolvedValue([{ id: "new-assessment" }])
  await expect(lockReconciliationClosePeriodsInTx(tx, "org")).rejects.toBeInstanceOf(JournalReversalSnapshotChangedError)
})
it("propagates unavailable evidence reads without reporting empty success", async () => {
  const { tx } = fixture(), failure = Error("database unavailable"); (db.closeRun.findMany as jest.Mock).mockRejectedValue(failure)
  await expect(lockReconciliationClosePeriodsInTx(tx, "org")).rejects.toBe(failure)
})
it("restarts whole transactions for membership changes, bounded at three attempts", async () => {
  const work = jest.fn().mockRejectedValueOnce(new JournalReversalSnapshotChangedError()).mockResolvedValue("committed")
  expect(await withReconciliationCloseRetry(work)).toBe("committed"); expect(work).toHaveBeenCalledTimes(2)
  work.mockReset().mockRejectedValue(new JournalReversalSnapshotChangedError())
  await expect(withReconciliationCloseRetry(work)).rejects.toMatchObject({ code: "CONFLICT" }); expect(work).toHaveBeenCalledTimes(3)
})
it("does not retry business or infrastructure failures", async () => {
  const failure = Error("provider unavailable"), work = jest.fn().mockRejectedValue(failure)
  await expect(withReconciliationCloseRetry(work)).rejects.toBe(failure); expect(work).toHaveBeenCalledTimes(1)
})
