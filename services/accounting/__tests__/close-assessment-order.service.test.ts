jest.mock("server-only", () => ({}))

import { CloseRunStatus, type Prisma } from "@prisma/client"
import {
  assertCloseAssessmentCurrent, closeAssessmentSelectionBlocker, deriveCloseAssessmentSelection,
  lockCloseAssessmentOrderInTx, lockCloseAssessmentPeriodsInTx, readCloseAssessmentOrderInTx, readCloseAssessmentPublicationTimeInTx,
} from "../close-assessment-order.service"

const createdAt = new Date("2026-10-01T10:00:00.123Z")
const run = { id: "current-private", createdAt, status: CloseRunStatus.READY, voidedAt: null }
const client = () => {
  const value = { $queryRaw: jest.fn(), closeRun: { findMany: jest.fn() } }
  return { value, tx: value as unknown as Prisma.TransactionClient }
}

it("uses an unambiguous tenant-and-period advisory key and waits for acquisition", async () => {
  const { value, tx } = client()
  let release!: () => void
  value.$queryRaw.mockReturnValue(new Promise(resolve => { release = () => resolve([]) }))
  let acquired = false
  const pending = lockCloseAssessmentOrderInTx(tx, "org:one", "period/two").then(() => { acquired = true })
  await Promise.resolve()
  expect(acquired).toBe(false)
  expect(value.$queryRaw.mock.calls[0][0]).toMatchObject({
    text: expect.stringContaining("pg_advisory_xact_lock"),
    values: [JSON.stringify(["close-assessment-order", "org:one", "period/two"])],
  })
  release()
  await pending
  expect(acquired).toBe(true)
})

it("reads all statuses with deterministic display ordering and treats a timestamp tie as ambiguous", async () => {
  const { value, tx } = client()
  value.closeRun.findMany.mockResolvedValue([run, { ...run, id: "second-private", status: CloseRunStatus.BLOCKED }])
  expect(await readCloseAssessmentOrderInTx(tx, "org-1", "period-1")).toEqual({ latest: run, ambiguous: true })
  expect(value.closeRun.findMany).toHaveBeenCalledWith({
    where: { organizationId: "org-1", periodId: "period-1" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2,
    select: { id: true, createdAt: true, status: true, voidedAt: true },
  })
})

it("uses the database wall clock at millisecond precision without a client-time fallback", async () => {
  const { value, tx } = client()
  value.$queryRaw.mockResolvedValue([{ createdAt }])
  expect(await readCloseAssessmentPublicationTimeInTx(tx)).toBe(createdAt)
  expect(value.$queryRaw.mock.calls[0][0].text).toContain("date_trunc('milliseconds', clock_timestamp())")
  value.$queryRaw.mockResolvedValue([])
  await expect(readCloseAssessmentPublicationTimeInTx(tx)).rejects.toMatchObject({ code: "CONFLICT" })
})

it.each([
  { requested: run, order: { latest: run, ambiguous: false }, state: "CURRENT", code: null },
  { requested: { ...run, id: "historical-private" }, order: { latest: run, ambiguous: false }, state: "HISTORICAL", code: "CONFLICT" },
  { requested: run, order: { latest: run, ambiguous: true }, state: "AMBIGUOUS", code: "CONFLICT" },
  { requested: { ...run, voidedAt: createdAt }, order: { latest: run, ambiguous: true }, state: "VOIDED", code: "INVALID_TRANSITION" },
  { requested: { ...run, status: CloseRunStatus.VOIDED }, order: { latest: run, ambiguous: false }, state: "VOIDED", code: "INVALID_TRANSITION" },
])("derives $state without discarding recorded history", ({ requested, order, state, code }) => {
  const before = JSON.stringify({ requested, order })
  const selection = deriveCloseAssessmentSelection(order, requested)
  expect(selection).toMatchObject({ state, latestRunId: run.id, latestCreatedAt: createdAt })
  if (code) {
    expect(() => assertCloseAssessmentCurrent(selection)).toThrow(expect.objectContaining({ code }))
    const blocker = closeAssessmentSelectionBlocker(selection)
    expect(blocker).toMatchObject({ severity: "high", gate: "close_readiness", sourceTables: ["close_runs"] })
    expect(JSON.stringify(blocker)).not.toContain("private")
  } else {
    expect(() => assertCloseAssessmentCurrent(selection)).not.toThrow()
    expect(closeAssessmentSelectionBlocker(selection)).toBeNull()
  }
  expect(JSON.stringify({ requested, order })).toBe(before)
})

it("propagates an order read failure", async () => {
  const { value, tx } = client(), failure = new Error("owned order query failed")
  value.closeRun.findMany.mockRejectedValue(failure)
  await expect(readCloseAssessmentOrderInTx(tx, "org-1", "period-1")).rejects.toBe(failure)
})

it("acquires overlapping period sets in one deterministic order without changing caller input", async () => {
  const { value, tx } = client()
  value.$queryRaw.mockResolvedValue([])
  const periods = ["period-z", "period-a", "period-z", "period-m"]
  await lockCloseAssessmentPeriodsInTx(tx, "org-1", periods)
  expect(value.$queryRaw.mock.calls.map(([sql]) => sql.values)).toEqual([
    [JSON.stringify(["close-assessment-order", "org-1", "period-a"])],
    [JSON.stringify(["close-assessment-order", "org-1", "period-m"])],
    [JSON.stringify(["close-assessment-order", "org-1", "period-z"])],
  ])
  expect(periods).toEqual(["period-z", "period-a", "period-z", "period-m"])
  value.$queryRaw.mockClear()
  await lockCloseAssessmentPeriodsInTx(tx, "org-1", ["period-m", "period-a"])
  expect(value.$queryRaw.mock.calls.map(([sql]) => sql.values)).toEqual([
    [JSON.stringify(["close-assessment-order", "org-1", "period-a"])],
    [JSON.stringify(["close-assessment-order", "org-1", "period-m"])],
  ])
})

it("waits for each period before requesting the next or reporting the set acquired", async () => {
  const { value, tx } = client()
  let release!: () => void
  value.$queryRaw.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve([]) })).mockResolvedValue([])
  let acquired = false
  const pending = lockCloseAssessmentPeriodsInTx(tx, "org-1", ["b", "a"]).then(() => { acquired = true })
  await Promise.resolve()
  expect(value.$queryRaw).toHaveBeenCalledTimes(1)
  expect(acquired).toBe(false)
  release()
  await pending
  expect(value.$queryRaw).toHaveBeenCalledTimes(2)
  expect(acquired).toBe(true)
})

it("propagates period lock failure without requesting later locks", async () => {
  const { value, tx } = client(), failure = new Error("period lock unavailable")
  value.$queryRaw.mockResolvedValueOnce([]).mockRejectedValueOnce(failure)
  await expect(lockCloseAssessmentPeriodsInTx(tx, "org-1", ["c", "a", "b"])).rejects.toBe(failure)
  expect(value.$queryRaw).toHaveBeenCalledTimes(2)
})

it("does not request a broad lock when there are no affected period IDs", async () => {
  const { value, tx } = client()
  await lockCloseAssessmentPeriodsInTx(tx, "org-1", [])
  expect(value.$queryRaw).not.toHaveBeenCalled()
})
