jest.mock("server-only", () => ({}))

import { composeBusinessPulseCommandData, type DashboardSummaryReadModel } from "../sales-analytics.service"

const summary = (overrides: Partial<DashboardSummaryReadModel> = {}): DashboardSummaryReadModel => ({
  today: {
    sales: 125000,
    transactions: 25,
    averageTransaction: 5000,
    salesChange: -20000,
    transactionsChange: -3,
  },
  week: {
    sales: 520000,
    transactions: 104,
    averageTransaction: 5000,
  },
  month: {
    sales: 2100000,
    transactions: 420,
    averageTransaction: 5000,
  },
  activeSessions: 2,
  lowStockItems: 6,
  stockCoverage: { activeItems: 6, itemsWithRecords: 6, itemsWithoutRecords: 0 },
  topSellingItems: [],
  ...overrides,
})

describe("business pulse command read-model composition", () => {
  it.each(["XAF", "EUR", "USD"])("does not manufacture scores, loss, urgency or assignments for %s", currency => {
    const data = composeBusinessPulseCommandData({ organizationId: "org", locationId: "loc", context: { organizationId: "org", locationId: "loc", currency, timezone: "UTC", generatedAt: "2026-09-13T12:00:00Z", periodStart: "2026-09-13T00:00:00Z", periodEnd: "2026-09-13T23:59:59Z" }, summary: summary({ today: { sales: 0, transactions: 0, averageTransaction: 0, salesChange: -200000, transactionsChange: -10 }, lowStockItems: 50 }) })
    expect(data.risks).toHaveLength(2)
    for (const risk of data.risks) expect(risk).toMatchObject({ severity: "info", severityScore: null, urgency: null, moneyImpact: null })
    for (const action of data.actionsToday) expect(action).toMatchObject({ severity: "info", dueLabel: null, ownerLabel: null })
    expect(data.risks.some(risk => risk.id === "business-pulse-risk-no-transactions")).toBe(false)
    expect(data.changes.every(change => change.severity === "info" && change.direction === "changed")).toBe(true)
    expect(data.commandBrief.conclusion).toContain("have not been assessed")
    expect(data.commandBrief.freshness.sourceMaxUpdatedAt).toBeNull()
    expect(data.changes[0].businessImpact).toContain("yesterday’s full day")
  })
  it("shows genuine zero activity without inferring a risk or claiming healthy operations", () => {
    const data = composeBusinessPulseCommandData({ organizationId: "org", locationId: "loc", context: { organizationId: "org", locationId: "loc", currency: "XAF", timezone: "UTC", generatedAt: "2026-09-13T12:00:00Z", periodStart: "2026-09-13T00:00:00Z", periodEnd: "2026-09-13T23:59:59Z" }, summary: summary({ today: { sales: 0, transactions: 0, averageTransaction: 0, salesChange: 0, transactionsChange: 0 }, lowStockItems: 0 }) })
    expect(data.risks).toEqual([]); expect(data.actionsToday).toEqual([])
    expect(data.commandBrief.conclusion).toContain("not a health or completeness assessment")
    expect(data.changes.every(change => change.direction === "unchanged")).toBe(true)
  })
  it("composes BI command data from analytics service summary values", () => {
    const data = composeBusinessPulseCommandData({
      organizationId: "org-1",
      locationId: "loc-1",
      summary: summary(),
      context: { organizationId: "org-1", locationId: "loc-1", currency: "XAF", timezone: "UTC", generatedAt: "2026-06-24T10:00:00.000Z", periodStart: "2026-06-24T00:00:00.000Z", periodEnd: "2026-06-24T23:59:59.999Z" },
    })

    expect(data.commandBrief).toMatchObject({
      organizationId: "org-1",
      state: "ready",
      evidenceGrade: "operational",
      trustState: "operational",
      sourceModules: ["sales", "pos", "inventory"],
    })
    expect(data.cards.map((card) => [card.id, card.value])).toEqual([
      ["business-pulse-today-sales", 125000],
      ["business-pulse-transactions", 25],
      ["business-pulse-active-sessions", 2],
      ["business-pulse-low-stock", 6],
    ])
    expect(data.actionsToday).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "business-pulse-action-revenue-drop" }),
        expect.objectContaining({ id: "business-pulse-action-low-stock" }),
      ]),
    )
    expect(data.risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "business-pulse-risk-revenue-drop" }),
        expect.objectContaining({ id: "business-pulse-risk-low-stock" }),
      ]),
    )
  })
})
