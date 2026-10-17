import { parseOpenItemsActivity, canOpenItemsHistory, openItemsHref, openItemsHistoryHref, openItemsWorkflowLinks, parseOpenItemsScope, safeOpenItemsReturn } from "@/lib/finance/open-items-navigation"
import type { OpenItemsRow } from "../open-items-dashboard.contract"
const row = { id: "invoice & 1", counterpartyId: "party/2" } as OpenItemsRow
it("round-trips invoice scope without trusting URL identity", () => {
  const scope = { view: "payables" as const, locationId: "branch", currency: "XAF", queue: "overdue" as const, search: "A & B", page: 2, revision: "a".repeat(64) }
  const href = openItemsHref("fr", scope)
  const parsed = parseOpenItemsScope(new URLSearchParams(href.split("?")[1] + "&organizationId=foreign"), "payables")
  expect(parsed).toMatchObject(scope)
  expect(parsed).not.toHaveProperty("organizationId")
})
it.each(["https://evil.test", "//evil.test", "/fr/dashboard/finance/payables", "/en/dashboard/finance/payables/../other", "javascript:alert(1)"])("rejects unsafe return %s", href => expect(safeOpenItemsReturn(href, "en")).toBeUndefined())
it("drops unsupported return query and invalid filters", () => {
  expect(safeOpenItemsReturn("/en/dashboard/finance/payables?redirect=evil&page=-1", "en")).toBe("/en/dashboard/finance/payables")
})
it("links exact AP invoices and AR customer evidence in the same locale", () => {
  const ap = new URL(openItemsHistoryHref("fr", { view: "payables", queue: "overdue" }, row), "https://local")
  expect(ap.searchParams.get("selected")).toBe("supplier-invoice:invoice & 1")
  expect(ap.searchParams.get("invoiceId")).toBe(row.id)
  expect(ap.searchParams.get("supplierId")).toBe(row.counterpartyId)
  expect(ap.searchParams.get("lane")).toBe("invoice")
  const ar = new URL(openItemsHistoryHref("en", { view: "receivables" }, row), "https://local")
  expect(ar.searchParams.get("customerId")).toBe(row.counterpartyId)
  expect(ar.searchParams.get("selected")).toBe(row.id)
})
it.each(["request", "approve", "release"])("shows only the %s role's payment workflows", role => {
  const links = openItemsWorkflowLinks("en", "payables", [`purchasing.ap.payment.${role}`])
  expect(links.map(link => link.href)).toEqual(role === "release" ? ["/en/dashboard/purchases/payables/payments/record", "/en/dashboard/purchases/payables/payments/recovery"] : [`/en/dashboard/purchases/payables/payments/${role}`])
})
it("requires both reconciliation permissions and hides privileged follow-up from readers", () => {
  expect(openItemsWorkflowLinks("en", "payables", ["payments.reconciliation.read"])).toEqual([])
  expect(openItemsWorkflowLinks("en", "payables", ["payments.reconciliation.read", "accounting.journal.read"])).toHaveLength(1)
  expect(openItemsWorkflowLinks("en", "receivables", ["customers.read"], row)).toEqual([])
  expect(openItemsWorkflowLinks("fr", "receivables", ["customers.read", "accounting.exports.create"], row)[0].href).toContain("party%2F2/statement")
  expect(canOpenItemsHistory("payables", ["finance.read"])).toBe(false)
  expect(canOpenItemsHistory("payables", ["finance.payables.read"])).toBe(true)
})

it("preserves a separate valid activity period in safe return navigation", () => {
  const period = { start: "2026-09-01", end: "2026-10-12" }
  const href = openItemsHref("en", { view: "receivables" }, period)
  expect(parseOpenItemsActivity(new URLSearchParams(href.split("?")[1]))).toEqual(period)
  expect(safeOpenItemsReturn(href, "en")).toContain("activityStart=2026-09-01&activityEnd=2026-10-12")
  expect(parseOpenItemsActivity(new URLSearchParams("activityStart=2026-02-31&activityEnd=2026-03-15"))).toBeUndefined()
})
