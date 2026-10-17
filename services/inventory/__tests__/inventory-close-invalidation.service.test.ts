jest.mock("server-only", () => ({}))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ recordCloseCertificationInvalidationsForSourceInTx: jest.fn() }))

import type { Prisma } from "@prisma/client"
import { lockPhysicalCountCloseAssessmentPeriodsInTx, lockPhysicalCountPeriodCatalogInTx, recordInventoryValuationCloseInvalidationInTx } from "../inventory-close-invalidation.service"
import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"

const occurredAt = new Date("2026-06-15T09:00:00.000Z")
const input = { organizationId: "org-1", periodId: "posting-period", occurredAt }
function fixture() {
  const value = {
    $queryRaw: jest.fn(async (query: { text: string }) => query.text.includes("current_setting") ? [{ isolationLevel: "read committed" }] : []),
    accountingPeriod: { findMany: jest.fn().mockResolvedValue([{ id: "posting-period" }]) },
  }
  return { value, tx: value as unknown as Prisma.TransactionClient }
}
const locks = (mock: jest.Mock) => mock.mock.calls.filter(([query]) => query.text.includes("pg_advisory_xact_lock"))

it("resolves all affected existing tenant periods independently of run existence or period status", async () => {
  const { value, tx } = fixture()
  value.accountingPeriod.findMany.mockResolvedValue([{ id: "z-future-no-run" }, { id: "posting-period" }, { id: "a-closed" }, { id: "posting-period" }])
  await lockPhysicalCountCloseAssessmentPeriodsInTx(tx, input)
  expect(value.$queryRaw.mock.calls[0][0].text).toContain("current_setting('transaction_isolation')")
  expect(value.accountingPeriod.findMany).toHaveBeenCalledWith({
    where: { organizationId: "org-1", OR: [{ id: "posting-period" }, { endDate: { gte: occurredAt } }] },
    select: { id: true }, orderBy: { id: "asc" },
  })
  expect(value.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(value.accountingPeriod.findMany.mock.invocationCallOrder[0])
  expect(locks(value.$queryRaw).map(([query]) => query.values)).toEqual([
    [JSON.stringify(["close-assessment-order", "org-1", "a-closed"])],
    [JSON.stringify(["close-assessment-order", "org-1", "posting-period"])],
    [JSON.stringify(["close-assessment-order", "org-1", "z-future-no-run"])],
  ])
})

it("does not finish until every period lock is acquired in the shared order", async () => {
  const { value, tx } = fixture()
  value.accountingPeriod.findMany.mockResolvedValue([{ id: "posting-period" }, { id: "a-earlier-id" }])
  let release!: () => void, entered!: () => void
  const waiting = new Promise<void>(resolve => { entered = resolve })
  const held = new Promise<never[]>(resolve => { release = () => resolve([]) })
  value.$queryRaw.mockImplementation(async query => {
    if (query.text.includes("current_setting")) return [{ isolationLevel: "read committed" }]
    if (locks(value.$queryRaw).length === 1) { entered(); return held }
    return []
  })
  let complete = false
  const pending = lockPhysicalCountCloseAssessmentPeriodsInTx(tx, input).then(() => { complete = true })
  await waiting
  expect(complete).toBe(false)
  expect(locks(value.$queryRaw)).toHaveLength(1)
  release()
  await pending
  expect(complete).toBe(true)
  expect(locks(value.$queryRaw)).toHaveLength(2)
})

it.each(["repeatable read", "serializable", "read uncommitted", null])("rejects incompatible or unavailable transaction isolation %s before scope or locks", async isolationLevel => {
  const { value, tx } = fixture()
  value.$queryRaw.mockResolvedValue(isolationLevel === null ? [] : [{ isolationLevel }])
  await expect(lockPhysicalCountCloseAssessmentPeriodsInTx(tx, input)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(value.accountingPeriod.findMany).not.toHaveBeenCalled()
  expect(locks(value.$queryRaw)).toHaveLength(0)
})

it("rejects a missing or foreign explicit posting period before taking any locks", async () => {
  const { value, tx } = fixture()
  value.accountingPeriod.findMany.mockResolvedValue([{ id: "other-tenant-local-period" }])
  await expect(lockPhysicalCountCloseAssessmentPeriodsInTx(tx, input)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(locks(value.$queryRaw)).toHaveLength(0)
})

it("propagates scope lookup failure without taking an incomplete lock set", async () => {
  const { value, tx } = fixture()
  const failure = new Error("Period scope unavailable")
  value.accountingPeriod.findMany.mockRejectedValue(failure)
  await expect(lockPhysicalCountCloseAssessmentPeriodsInTx(tx, input)).rejects.toBe(failure)
  expect(locks(value.$queryRaw)).toHaveLength(0)
})

it("validates isolation before waiting on the tenant's shared catalog lock", async () => {
  const { value, tx } = fixture()
  let release!: () => void, entered!: () => void
  const waiting = new Promise<void>(resolve => { entered = resolve })
  const held = new Promise<never[]>(resolve => { release = () => resolve([]) })
  value.$queryRaw.mockImplementation(async query => {
    if (query.text.includes("current_setting")) return [{ isolationLevel: "read committed" }]
    entered(); return held
  })
  let complete = false
  const pending = lockPhysicalCountPeriodCatalogInTx(tx, "org-1").then(() => { complete = true })
  await waiting
  expect(complete).toBe(false)
  expect(value.$queryRaw.mock.calls[0][0].text).toContain("current_setting('transaction_isolation')")
  expect(value.$queryRaw.mock.calls[1][0]).toMatchObject({ text: expect.stringContaining("pg_advisory_xact_lock_shared"), values: [JSON.stringify(["accounting-period-catalog", "org-1"])] })
  expect(value.accountingPeriod.findMany).not.toHaveBeenCalled()
  release()
  await pending
  expect(complete).toBe(true)
})

it.each(["repeatable read", "serializable", null])("rejects %s before attempting the shared catalog lock", async isolationLevel => {
  const { value, tx } = fixture()
  value.$queryRaw.mockResolvedValue(isolationLevel === null ? [] : [{ isolationLevel }])
  await expect(lockPhysicalCountPeriodCatalogInTx(tx, "org-1")).rejects.toMatchObject({ code: "CONFLICT" })
  expect(value.$queryRaw).toHaveBeenCalledTimes(1)
  expect(locks(value.$queryRaw)).toHaveLength(0)
  expect(value.accountingPeriod.findMany).not.toHaveBeenCalled()
})

it("propagates catalog acquisition failure without continuing to scope discovery", async () => {
  const { value, tx } = fixture()
  const failure = new Error("Catalog lock unavailable")
  value.$queryRaw.mockResolvedValueOnce([{ isolationLevel: "read committed" }]).mockRejectedValueOnce(failure)
  await expect(lockPhysicalCountPeriodCatalogInTx(tx, "org-1")).rejects.toBe(failure)
  expect(value.$queryRaw).toHaveBeenCalledTimes(2)
  expect(value.accountingPeriod.findMany).not.toHaveBeenCalled()
})

it("uses only the complete prepared union without expanding it through an unlocked date range", async () => {
  const { tx } = fixture()
  const invalidator = jest.mocked(recordCloseCertificationInvalidationsForSourceInTx)
  invalidator.mockClear()
  await recordInventoryValuationCloseInvalidationInTx(tx, {
    ...input, sourceId: "correction-event", documentHash: "retained-hash", includeLaterPeriods: true,
    affectedPeriodIds: ["z-later", "posting-period", "a-earlier", "posting-period"], actorId: "actor-1",
  })
  expect(invalidator).toHaveBeenCalledWith(tx, "org-1", {
    sourceCode: "INVENTORY_VALUATION_WRITE", sourceId: "correction-event",
    periodIds: ["a-earlier", "posting-period", "z-later"],
    staleReason: "Inventory valuation write changed certified close evidence.",
    newEvidenceHash: "retained-hash", correlationId: null,
  }, { actorId: "actor-1" })
})

it.each([{ affectedPeriodIds: [] }, { affectedPeriodIds: ["other-period"] }])("rejects an incomplete prepared period union $affectedPeriodIds before run discovery", async ({ affectedPeriodIds }) => {
  const { tx } = fixture(), invalidator = jest.mocked(recordCloseCertificationInvalidationsForSourceInTx)
  invalidator.mockClear()
  await expect(recordInventoryValuationCloseInvalidationInTx(tx, { ...input, affectedPeriodIds })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(invalidator).not.toHaveBeenCalled()
})

it.each([false, true])("preserves date-based scope for existing callers without a prepared union (cumulative=%s)", async includeLaterPeriods => {
  const { tx } = fixture(), invalidator = jest.mocked(recordCloseCertificationInvalidationsForSourceInTx)
  invalidator.mockClear()
  await recordInventoryValuationCloseInvalidationInTx(tx, { ...input, includeLaterPeriods })
  expect(invalidator).toHaveBeenCalledWith(tx, "org-1", expect.objectContaining({
    periodId: input.periodId, periodStart: occurredAt, periodEnd: includeLaterPeriods ? null : occurredAt,
  }), { actorId: null })
  expect(invalidator.mock.calls[0][2]).not.toHaveProperty("periodIds")
})
