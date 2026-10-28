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
  topSellingItems: [],
  ...overrides,
})

describe("business pulse command read-model composition", () => {
  it("composes BI command data from analytics service summary values", () => {
    const data = composeBusinessPulseCommandData({
      organizationId: "org-1",
      locationId: "loc-1",
      summary: summary(),
      now: new Date("2026-06-24T10:00:00.000Z"),
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
