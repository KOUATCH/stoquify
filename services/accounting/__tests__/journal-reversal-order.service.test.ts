jest.mock("server-only", () => ({}))

import type { Prisma } from "@prisma/client"
import {
  JournalReversalSnapshotChangedError, lockJournalReversalCatalogInTx, lockJournalReversalClosePeriodsInTx,
  type JournalReversalFreshReader,
} from "../journal-reversal-order.service"

const input = { originalPeriodId: "period-z", reversalPeriodId: "period-a", originalEntryDate: new Date("2026-06-10"), reversalDate: new Date("2026-07-10"), includeLaterPeriods: false }
function fixture(isolation = "read committed") {
  const value = { $queryRaw: jest.fn(async (sql: { text: string }) => sql.text.includes("current_setting") ? [{ isolationLevel: isolation }] : []), accountingPeriod: { findMany: jest.fn().mockResolvedValue([{ id: "period-z" }, { id: "period-a" }]) }, closeRun: { findMany: jest.fn().mockResolvedValue([]) } }
  const reader = { $transaction: jest.fn(), accountingPeriod: { findMany: jest.fn().mockResolvedValue([{ id: "period-z" }, { id: "period-a" }]) }, closeRun: { findMany: jest.fn().mockResolvedValue([]) } }
  return { value, tx: value as unknown as Prisma.TransactionClient, reader, fresh: reader as unknown as JournalReversalFreshReader }
}

it("resolves both explicit periods and date overlaps without narrowing to current runs or statuses", async () => {
  const { value, tx } = fixture()
  value.accountingPeriod.findMany.mockResolvedValue([{ id: "period-z" }, { id: "overlap" }, { id: "original-overlap" }, { id: "period-a" }, { id: "period-z" }])
  expect(await lockJournalReversalClosePeriodsInTx(tx, "org-1", input)).toEqual(["original-overlap", "overlap", "period-a", "period-z"])
  expect(value.accountingPeriod.findMany).toHaveBeenCalledWith({
    where: { organizationId: "org-1", OR: [{ id: { in: ["period-z", "period-a"] } }, { startDate: { lte: input.originalEntryDate }, endDate: { gte: input.originalEntryDate } }, { startDate: { lte: input.reversalDate }, endDate: { gte: input.reversalDate } }] },
    select: { id: true }, orderBy: { id: "asc" },
  })
  expect(value.$queryRaw.mock.calls.slice(1).map(([sql]) => (sql as unknown as { values: string[] }).values)).toEqual(
    ["original-overlap", "overlap", "period-a", "period-z"].map(id => [JSON.stringify(["close-assessment-order", "org-1", id])]),
  )
})

it.each([false, true])("includes cumulative periods from the earlier source date when class-3 is affected (earlier reversal=%s)", async earlier => {
  const { value, tx } = fixture(), reversalDate = earlier ? new Date("2026-05-10") : input.reversalDate
  await lockJournalReversalClosePeriodsInTx(tx, "org-1", { ...input, reversalDate, includeLaterPeriods: true })
  expect(value.accountingPeriod.findMany.mock.calls[0][0].where.OR).toContainEqual({ endDate: { gte: earlier ? reversalDate : input.originalEntryDate } })
})

it("refuses a missing/foreign explicit period before any assessment lock", async () => {
  const { value, tx } = fixture(); value.accountingPeriod.findMany.mockResolvedValue([{ id: input.reversalPeriodId }])
  await expect(lockJournalReversalClosePeriodsInTx(tx, "org-1", input)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(value.$queryRaw).toHaveBeenCalledTimes(1)
})

it.each(["repeatable read", "unknown", "serializable"])("refuses unsupported %s without a proper fresh root reader", async isolation => {
  const { value, tx } = fixture(isolation)
  await expect(lockJournalReversalCatalogInTx(tx, "org-1")).rejects.toMatchObject({ code: "CONFLICT" })
  expect(value.$queryRaw).toHaveBeenCalledTimes(1)
  expect(value.accountingPeriod.findMany).not.toHaveBeenCalled()
})

it("checks committed catalog membership only after the shared catalog lock and rejects a stale Serializable scope", async () => {
  const { value, tx, reader, fresh } = fixture("serializable")
  reader.accountingPeriod.findMany.mockResolvedValue([{ id: "period-z" }, { id: "period-a" }, { id: "new-period" }])
  await expect(lockJournalReversalCatalogInTx(tx, "org-1", fresh)).rejects.toBeInstanceOf(JournalReversalSnapshotChangedError)
  expect(value.$queryRaw.mock.calls[1][0].text).toContain("pg_advisory_xact_lock_shared")
  expect(value.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(value.accountingPeriod.findMany.mock.invocationCallOrder[0])
  expect(reader.accountingPeriod.findMany).toHaveBeenCalledWith(value.accountingPeriod.findMany.mock.calls[0][0])
})

it("detects a changed period boundary even when catalog IDs are unchanged", async () => {
  const { value, tx, reader, fresh } = fixture("serializable")
  value.accountingPeriod.findMany.mockResolvedValue([{ id: "period-a", startDate: new Date("2026-06-01"), endDate: input.reversalDate }])
  reader.accountingPeriod.findMany.mockResolvedValue([{ id: "period-a", startDate: new Date("2026-06-02"), endDate: input.reversalDate }])
  await expect(lockJournalReversalCatalogInTx(tx, "org-1", fresh)).rejects.toBeInstanceOf(JournalReversalSnapshotChangedError)
})

it("checks target eligibility after every period lock and detects a newly visible publication/export", async () => {
  const { value, tx, reader, fresh } = fixture("serializable")
  reader.closeRun.findMany.mockResolvedValue([{ id: "newly-eligible" }])
  await expect(lockJournalReversalClosePeriodsInTx(tx, "org-1", input, fresh)).rejects.toBeInstanceOf(JournalReversalSnapshotChangedError)
  expect(value.$queryRaw.mock.invocationCallOrder.at(-1)).toBeLessThan(value.closeRun.findMany.mock.invocationCallOrder[0])
  expect(reader.closeRun.findMany).toHaveBeenCalledWith(value.closeRun.findMany.mock.calls[0][0])
  expect(reader.closeRun.findMany.mock.calls[0][0]).toMatchObject({ where: { organizationId: "org-1", periodId: { in: ["period-a", "period-z"] }, OR: expect.arrayContaining([{ packExports: { some: { isCertified: true } } }]) }, orderBy: { id: "asc" } })
})

it("accepts a matching Serializable catalog and target population without changing isolation", async () => {
  const { tx, reader, fresh } = fixture("serializable")
  await lockJournalReversalCatalogInTx(tx, "org-1", fresh)
  expect(await lockJournalReversalClosePeriodsInTx(tx, "org-1", input, fresh)).toEqual(["period-a", "period-z"])
  expect(reader.$transaction).not.toHaveBeenCalled()
})

it("propagates fresh-read failure instead of treating it as an empty matching target set", async () => {
  const { tx, reader, fresh } = fixture("serializable"), failure = new Error("Fresh evidence read unavailable")
  reader.closeRun.findMany.mockRejectedValue(failure)
  await expect(lockJournalReversalClosePeriodsInTx(tx, "org-1", input, fresh)).rejects.toBe(failure)
})

it("locks business-date overlaps and a retained unposted batch period without inventing a journal period", async () => {
  const { value, tx } = fixture()
  const businessDate = new Date("2026-04-10"), batchPeriodId = "failed-batch-period"
  value.accountingPeriod.findMany.mockResolvedValue([{ id: input.reversalPeriodId }, { id: batchPeriodId }, { id: "business-overlap" }])
  expect(await lockJournalReversalClosePeriodsInTx(tx, "org-1", {
    ...input, originalPeriodId: null, additionalEvidenceDates: [businessDate], additionalPeriodIds: [batchPeriodId],
  })).toEqual(["business-overlap", batchPeriodId, input.reversalPeriodId])
  expect(value.accountingPeriod.findMany.mock.calls[0][0].where.OR).toEqual([
    { id: { in: [input.reversalPeriodId, batchPeriodId] } },
    ...[input.originalEntryDate, input.reversalDate, businessDate].map(date => ({ startDate: { lte: date }, endDate: { gte: date } })),
  ])
})

it("starts cumulative stock scope at the earliest retained source date", async () => {
  const { value, tx } = fixture(), sourceDate = new Date("2026-01-10")
  await lockJournalReversalClosePeriodsInTx(tx, "org-1", { ...input, includeLaterPeriods: true, additionalEvidenceDates: [sourceDate] })
  expect(value.accountingPeriod.findMany.mock.calls[0][0].where.OR).toContainEqual({ endDate: { gte: sourceDate } })
})

it("rejects a missing retained batch period instead of quietly omitting its Close dependency", async () => {
  const { value, tx } = fixture()
  await expect(lockJournalReversalClosePeriodsInTx(tx, "org-1", {
    ...input, originalPeriodId: null, additionalPeriodIds: ["foreign-period"],
  })).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(value.$queryRaw).toHaveBeenCalledTimes(1)
})

it("rejects an invalid supplementary evidence date before resolving any partial scope", async () => {
  const { value, tx } = fixture()
  await expect(lockJournalReversalClosePeriodsInTx(tx, "org-1", {
    ...input, additionalEvidenceDates: [new Date(NaN)],
  })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(value.accountingPeriod.findMany).not.toHaveBeenCalled()
  expect(value.$queryRaw).toHaveBeenCalledTimes(1)
})

it("covers every tenant period when a changed source feeds organization-wide Close evidence", async () => {
  const { value, tx } = fixture()
  value.accountingPeriod.findMany.mockResolvedValue([{ id: "period-z" }, { id: "older-no-run" }, { id: "period-a" }])
  expect(await lockJournalReversalClosePeriodsInTx(tx, "org-1", { ...input, includeAllPeriods: true })).toEqual(["older-no-run", "period-a", "period-z"])
  expect(value.accountingPeriod.findMany).toHaveBeenCalledWith({ where: { organizationId: "org-1" }, select: { id: true }, orderBy: { id: "asc" } })
})
