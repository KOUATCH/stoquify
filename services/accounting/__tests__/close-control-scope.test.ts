import { createCloseControlScope } from "../close-control-scope"
import { closeRunWhere, closeStatementLineWhere, closeSuspenseWhere } from "@/services/reconciliation/payment-close-scope"

const period = { id: "sep", startDate: new Date("2026-09-01T00:00:00Z"), endDate: new Date("2026-09-30T23:59:59.999Z") }
const cutoff = new Date("2026-10-05T12:00:00Z")
it("binds tenant, stored UTC endpoints, currencies and the separate observation cutoff", () => {
  const scope = createCloseControlScope("org-a", period, cutoff)
  expect(scope).toMatchObject({ version: 1, organizationId: "org-a", periodId: "sep", recordedThrough: cutoff.toISOString(), currencyScope: "ALL_CURRENCIES" })
  expect(createCloseControlScope("org-a", period, cutoff)).toEqual(scope)
  expect(createCloseControlScope("org-b", period, cutoff).scopeHash).not.toBe(scope.scopeHash)
  expect(createCloseControlScope("org-a", period, new Date(cutoff.getTime() + 1)).scopeHash).not.toBe(scope.scopeHash)
})
it.each([{ startDate: "2026-10-01" }, { endDate: "2026-09-30" }, { startDate: "invalid" }])("rejects contradictory or invalid dates: %j", dates => {
  expect(() => createCloseControlScope("org-a", period, cutoff, dates)).toThrow("conflict")
})
it("does not round stored endpoints or use import month as economic month", () => {
  const scope = createCloseControlScope("org-a", period, cutoff)
  const where = closeStatementLineWhere(scope)
  expect(where.occurredAt).toEqual({ gte: period.startDate, lte: period.endDate })
  expect(where.createdAt).toEqual({ lte: cutoff })
  expect(where.statementFile).toMatchObject({ importedAt: { lte: cutoff } })
  expect(closeRunWhere(scope)).toMatchObject({ organizationId: "org-a", createdAt: { lte: cutoff } })
})
it("carries prior unresolved run obligations without treating them as new period evidence", () => {
  const scope = createCloseControlScope("org-a", period, cutoff)
  expect(closeSuspenseWhere(scope).OR).toEqual(expect.arrayContaining([
    expect.objectContaining({ reconciliationRun: expect.objectContaining({ OR: [{ accountingPeriodId: "sep" }, { businessDate: { lte: period.endDate } }] }) }),
  ]))
})
