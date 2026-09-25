jest.mock("server-only", () => ({}))

import { resolveBusinessPulseLinks } from "../business-pulse-links"
import { composeBusinessPulseCommandData } from "../sales-analytics.service"

function data() {
  const period = { sales: 0, transactions: 0, averageTransaction: 0 }
  return composeBusinessPulseCommandData({ organizationId: "org", locationId: "loc", context: { organizationId: "org", locationId: "loc", currency: "EUR", timezone: "UTC", generatedAt: "2026-09-13T12:00:00Z", periodStart: "2026-09-13T00:00:00Z", periodEnd: "2026-09-13T23:59:59.999Z" }, summary: { today: { ...period, salesChange: -1, transactionsChange: -1 }, week: period, month: period, activeSessions: 1, lowStockItems: 1, stockCoverage: { activeItems: 1, itemsWithRecords: 1, itemsWithoutRecords: 0 }, topSellingItems: [] } })
}
it("does not grant any action or drill-through from dashboard visibility alone", () => {
  const result = resolveBusinessPulseLinks(data(), ["dashboard.read"])
  expect(result.commandBrief.primaryAction?.disabled).toBe(true)
  for (const item of [...result.cards, ...result.changes, ...result.risks]) {
    expect(item.actionLink?.disabled).toBe(true)
    expect(item.drillThrough?.available).toBe(false)
  }
  expect(result.actionsToday.every(item => item.actionLink.disabled)).toBe(true)
})
it("uses actual item and POS entry permissions and preserves French destination and period", () => {
  const result = resolveBusinessPulseLinks(data(), ["reports.read", "pos.read"], "fr")
  expect(result.cards[2].actionLink?.disabled).toBe(true)
  expect(result.cards[3].actionLink?.disabled).toBe(true)
  expect(result.cards[3].actionLink?.disabledReason).toContain("Votre rôle")
  const report = new URL(result.cards[0].actionLink!.href, "http://localhost")
  expect(report.pathname).toBe("/fr/dashboard/analytics/reports")
  expect(report.searchParams.get("report")).toBe("financial")
  expect(report.searchParams.get("reportFrom")).toBe(result.periodStart)
  expect(report.searchParams.get("reportTo")).toBe(result.periodEnd)
  expect(report.searchParams.get("locationId")).toBe("loc")
  expect(resolveBusinessPulseLinks(data(), ["inventory.read"]).cards[3].actionLink?.disabled).toBe(false)
  const permitted = resolveBusinessPulseLinks(data(), ["inventory.items.read", "OPERATE_POS"])
  expect(permitted.cards[2].actionLink?.disabled).toBe(false)
  expect(permitted.cards[3].actionLink).toMatchObject({ disabled: false, href: "/en/dashboard/inventory/items" })
})
it("fails closed without caller permissions and does not mutate the source model", () => {
  const source = data(), before = JSON.stringify(source), result = resolveBusinessPulseLinks(source)
  expect(result.cards.every(card => card.actionLink?.disabled)).toBe(true)
  expect(JSON.stringify(source)).toBe(before)
})
