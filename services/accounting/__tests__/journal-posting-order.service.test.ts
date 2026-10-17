import type { Prisma } from "@prisma/client"
import { lockAccountingPeriodCatalogInTx } from "../accounting-period-catalog.service"
import { lockCloseAssessmentPeriodsInTx } from "../close-assessment-order.service"
import { lockJournalPostingCatalogInTx, lockJournalPostingClosePeriodsInTx } from "../journal-posting-order.service"

jest.mock("../accounting-period-catalog.service", () => ({ lockAccountingPeriodCatalogInTx: jest.fn() }))
jest.mock("../close-assessment-order.service", () => ({ lockCloseAssessmentPeriodsInTx: jest.fn() }))
const catalog = lockAccountingPeriodCatalogInTx as jest.Mock, locks = lockCloseAssessmentPeriodsInTx as jest.Mock

// These cover the currently applied date/class-3 helper. The broader retained
// Close hash dependency is deliberately still asserted by the runtime verifier;
// its all-period proposal requires approval and is not certified by these tests.
describe("current manual posting period preparation", () => {
  const query = jest.fn(), periods = jest.fn()
  const tx = { $queryRaw: query, accountingPeriod: { findMany: periods } } as unknown as Prisma.TransactionClient
  const entryDate = new Date("2026-10-01T12:00:00Z")
  beforeEach(() => {
    jest.resetAllMocks()
    query.mockResolvedValue([{ isolationLevel: "read committed" }])
    periods.mockResolvedValue([{ id: "current" }])
    catalog.mockResolvedValue(undefined)
    locks.mockResolvedValue(undefined)
  })
  it.each(["serializable", "repeatable read", "unrecognized"])("refuses %s before catalog and period effects", async isolationLevel => {
    query.mockResolvedValue([{ isolationLevel }])
    await expect(lockJournalPostingCatalogInTx(tx, "org")).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(lockJournalPostingClosePeriodsInTx(tx, "org", { periodId: "current", entryDate, includeLaterPeriods: true })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(catalog).not.toHaveBeenCalled()
    expect(periods).not.toHaveBeenCalled()
    expect(locks).not.toHaveBeenCalled()
  })
  it("uses the established shared catalog lock", async () => {
    await lockJournalPostingCatalogInTx(tx, "org")
    expect(catalog).toHaveBeenCalledWith(tx, "org", "shared")
  })
  it.each([false, true])("tenant-scopes the date/explicit-period query with cumulative=%s", async includeLaterPeriods => {
    periods.mockResolvedValue([{ id: "later" }, { id: "current" }, { id: "overlap" }, { id: "current" }])
    await expect(lockJournalPostingClosePeriodsInTx(tx, "org", { periodId: "current", entryDate, includeLaterPeriods })).resolves.toEqual(["current", "later", "overlap"])
    expect(periods).toHaveBeenCalledWith({ where: { organizationId: "org", OR: [
      { id: "current" }, { startDate: { lte: entryDate }, endDate: { gte: entryDate } },
      ...(includeLaterPeriods ? [{ endDate: { gte: entryDate } }] : []),
    ] }, select: { id: true }, orderBy: { id: "asc" } })
    expect(locks).toHaveBeenCalledWith(tx, "org", ["current", "later", "overlap"])
  })
  it("refuses a missing or foreign explicit period before locks", async () => {
    periods.mockResolvedValue([{ id: "other" }])
    await expect(lockJournalPostingClosePeriodsInTx(tx, "org", { periodId: "foreign", entryDate, includeLaterPeriods: true })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(locks).not.toHaveBeenCalled()
  })
  it("rejects an invalid source date before querying scope", async () => {
    await expect(lockJournalPostingClosePeriodsInTx(tx, "org", { periodId: "current", entryDate: new Date("invalid"), includeLaterPeriods: false })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(periods).not.toHaveBeenCalled()
    expect(locks).not.toHaveBeenCalled()
  })
})
