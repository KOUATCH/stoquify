/** @jest-environment node */
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))

import { Prisma, type CashDrawerTransaction } from "@prisma/client"
import { db } from "@/prisma/db"
import { classifyReportCashMovement, elapsedShiftHours, reportCashSessions, reportSessionCount } from "../cash-report-evidence"
import { completedReportScope } from "../completed-sales-evidence"
import { getCashFlowReportReadModel, getCashierPerformanceReportReadModel } from "../financial-reports.service"

const d = (value: number) => new Prisma.Decimal(value)
const date = (hour: number) => new Date(Date.UTC(2026, 8, 10, hour))
const input = { organizationId: "org", locationId: "loc", startDate: date(12), endDate: date(12) }
const scope = { organizationId: "org", locationId: "loc", currency: "XAF", timezone: "UTC", start: date(0), end: new Date(date(24).getTime() - 1), endExclusive: date(24), previousStart: date(-24), calendarDays: 1 }
const move = (type: CashDrawerTransaction["type"], amount: number, before: number, after: number) => ({ id: type, type, amount: d(amount), balanceBefore: d(before), balanceAfter: d(after), sessionId: "shift", createdAt: date(12), cashDrawerId: "drawer" })
const shift = (variance = 0) => ({
  id: "shift", sessionNumber: "SHIFT", userId: "cashier", terminalId: "terminal", locationId: "loc", organizationId: "org", status: "CLOSED",
  startTime: date(-2), endTime: date(18), expectedBalance: d(100), closingBalance: d(100 + variance), variance: d(variance), openingBalance: d(0),
  transactionCount: 99, cashTotal: d(999), user: { id: "cashier", firstName: "Owned", lastName: "Cashier" }, terminal: { name: "Till", terminalNumber: "T", organizationId: "org", locationId: "loc" },
  salesOrders: [{ id: "sale", total: d(100) }], cashDrawerTransactions: [{ ...move("CLOSING_BALANCE", 100 + variance, 100, 100 + variance), cashDrawer: { terminalId: "terminal", locationId: "loc" } }],
})
type Session = Awaited<ReturnType<typeof reportCashSessions>>[number]
function client(sessions: ReturnType<typeof shift>[] = [], movements: ReturnType<typeof move>[] = []) {
  const tx = { organization: { findFirst: jest.fn().mockResolvedValue({ id: "org", currency: "XAF", timezone: "UTC" }) }, location: { findFirst: jest.fn().mockResolvedValue({ id: "loc" }) }, pOSSession: { findMany: jest.fn().mockResolvedValue(sessions) }, cashDrawerTransaction: { findMany: jest.fn().mockResolvedValue(movements) } }
  jest.mocked(db.$transaction).mockImplementation((async (fn: (value: unknown) => unknown) => fn(tx)) as typeof db.$transaction)
  return tx
}
describe("cash report evidence", () => {
  it.each([
    ["SALE", 100, 0, 100, "INFLOW"], ["RETURN", 100, 100, 0, "OUTFLOW"], ["REFUND", 100, 100, 0, "OUTFLOW"],
    ["PAYOUT", 10, 100, 90, "OUTFLOW"], ["CASH_OUT", 10, 100, 90, "OUTFLOW"], ["CASH_IN", 10, 100, 110, "INFLOW"],
    ["OPENING_BALANCE", 50, 0, 50, "OPENING_COUNT"], ["CLOSING_BALANCE", 90, 100, 90, "CLOSING_COUNT"],
    ["RECONCILIATION", 10, 100, 90, "RECONCILIATION"], ["RETURN", 100, 0, 100, "INCONSISTENT"], ["SALE", -100, 100, 0, "INCONSISTENT"],
  ])("classifies %s with coherent balance evidence", (type, amount, before, after, expected) => {
    expect(classifyReportCashMovement(move(type as CashDrawerTransaction["type"], amount as number, before as number, after as number)).kind).toBe(expected)
  })
  it("does not count floats or closing counts as cash flow and treats void cash as outflow", async () => {
    client([shift()], [move("OPENING_BALANCE", 50, 0, 50), move("SALE", 100, 50, 150), move("RETURN", 100, 150, 50), move("CLOSING_BALANCE", 50, 50, 50)])
    const report = await getCashFlowReportReadModel(input)
    expect(report).toMatchObject({ totalCashIn: 100, totalCashOut: 100, netCashFlow: 0, cashReturns: 100, excludedCounts: { opening: 1, closing: 1, reconciliation: 0 } })
    expect(report.dailyBreakdown[0]).toMatchObject({ cumulativeNetMovement: 0, cashIn: 100, cashOut: 100 })
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  })
  it("keeps incomplete cash totals unavailable, including subsequent cumulative movement", async () => {
    client([], [move("SALE", 100, 0, 99), { ...move("SALE", 20, 0, 20), createdAt: date(25) }])
    const report = await getCashFlowReportReadModel(input)
    expect(report.totalCashIn).toBeNull(); expect(report.netCashFlow).toBeNull(); expect(report.inconsistentMovements).toBe(1)
    expect(report.dailyBreakdown.map(day => day.cumulativeNetMovement)).toEqual([null, null])
  })
  it("does not rank uncounted shifts or fabricate zero differences", async () => {
    const open = { ...shift(), status: "ACTIVE", endTime: null, closingBalance: null, variance: null, cashDrawerTransactions: [] }
    client([open as unknown as ReturnType<typeof shift>])
    const [report] = await getCashierPerformanceReportReadModel(input)
    expect(report).toMatchObject({ performanceScore: null, cashVariance: null, absoluteVariance: null, openCountSessions: 1, recordedCountSessions: 0, totalTransactions: 1 })
    expect(report.sessions[0].countStatus).toBe("OPEN")
  })
  it("exposes opposing count differences instead of hiding shortages in a net zero", async () => {
    client([shift(10), { ...shift(-10), id: "second" }])
    const [report] = await getCashierPerformanceReportReadModel(input)
    expect(report).toMatchObject({ cashVariance: 0, absoluteVariance: 20, recordedCountSessions: 2, totalSales: 200, totalTransactions: 2 })
  })
  it("requires a coherent recorded closing row and preserves unknown expected cash", () => {
    expect(reportSessionCount({ ...shift(), cashDrawerTransactions: [] } as unknown as Session, scope).status).toBe("INCONSISTENT")
    expect(reportSessionCount({ ...shift(), expectedBalance: null } as unknown as Session, scope)).toMatchObject({ status: "INCONSISTENT", expected: null, variance: null })
    expect(reportSessionCount({ ...shift(), endTime: date(25) } as unknown as Session, scope).status).toBe("OUTSIDE_PERIOD")
    expect(reportSessionCount(shift(-10) as unknown as Session, scope)).toMatchObject({ status: "RECORDED", variance: -10 })
  })
  it("clips elapsed shifts to the period and uses period-filtered orders rather than lifetime counters", async () => {
    expect(elapsedShiftHours({ startTime: date(-2), endTime: date(25) }, scope, date(30))).toBe(24)
    const tx = client([shift()]); const [report] = await getCashierPerformanceReportReadModel(input)
    expect(report.totalTransactions).toBe(1); expect(report.elapsedShiftHours).toBe(18)
    expect(tx.pOSSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", locationId: "loc", startTime: { lt: date(24) } }), include: expect.objectContaining({ salesOrders: expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", orderDate: { gte: date(0), lt: date(24) } }) }) }) }))
  })
  it("rejects a foreign location and a failed query without returning successful zero rows", async () => {
    const tx = client(); tx.location.findFirst.mockResolvedValue(null)
    await expect(getCashFlowReportReadModel(input)).rejects.toThrow("location")
    expect(tx.cashDrawerTransaction.findMany).not.toHaveBeenCalled()
    tx.location.findFirst.mockResolvedValue({ id: "loc" }); tx.cashDrawerTransaction.findMany.mockRejectedValue(new Error("database unavailable"))
    await expect(getCashFlowReportReadModel(input)).rejects.toThrow("database unavailable")
    await expect(getCashierPerformanceReportReadModel(input)).rejects.toThrow("database unavailable")
  })
  it("scopes the drawer and local midnight, and distinguishes a genuine empty report", async () => {
    const tx = client(); tx.organization.findFirst.mockResolvedValue({ id: "org", currency: "XAF", timezone: "Africa/Douala" })
    const resolved = await completedReportScope(tx as unknown as Prisma.TransactionClient, input)
    expect(resolved.start.toISOString()).toBe("2026-09-09T23:00:00.000Z")
    const report = await getCashFlowReportReadModel(input)
    expect(report).toMatchObject({ totalCashIn: 0, totalCashOut: 0, netCashFlow: 0, dailyBreakdown: [] })
    expect(tx.cashDrawerTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { createdAt: { gte: resolved.start, lt: resolved.endExclusive }, cashDrawer: { locationId: "loc", location: { organizationId: "org" }, terminal: { organizationId: "org" } } } }))
  })
})
