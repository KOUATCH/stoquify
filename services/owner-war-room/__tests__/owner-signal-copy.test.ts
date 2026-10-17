import { buildBusinessSignalsFromFacts } from "@/services/signals/business-signal-rules.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import type { BusinessSignalType } from "@/services/signals/business-signal-contracts"
import { presentOwnerActionQueue, presentOwnerForecastMessage } from "../owner-signal-copy"
import { existsSync } from "node:fs"
import { join } from "node:path"

it.each([
  "finance/cash-drawer", "finance/reconciliation", "inventory/items", "inventory/loss-control", "purchase-orders",
  "payroll", "payroll/payments", "payroll/register", "payroll/declarations",
  "accounting/close", "settings/modules", "owner-war-room",
])("has an implemented owner destination: %s", route => {
  expect(existsSync(join(process.cwd(), "app/[locale]/(dashboard)/dashboard", route, "page.tsx"))).toBe(true)
})

jest.mock("@/services/_shared/action-errors", () => ({ BusinessRuleError: class extends Error {} }))

const types: BusinessSignalType[] = ["cash_drawer_variance", "open_payment_suspense", "duplicate_provider_reference", "refund_void_spike", "stockout_risk", "dead_stock_cash_exposure", "inventory_loss_review", "purchase_order_receiving_delay", "payroll_exposure", "close_blocker"]
const now = "2026-10-13T10:00:00Z"

function queue(type: BusinessSignalType) {
  const signals = buildBusinessSignalsFromFacts([{ organizationId: "org-1", signalType: type, moduleSlug: "dashboard", sourceModule: "dashboard", subjectType: "test", subjectId: "fixture", generatedAt: now }])
  return buildActionQueue({ organizationId: "org-1", actorPermissions: [signals[0].requiredPermission, ...(signals[0].additionalRequiredPermissions ?? [])], now,
    signals,
  })
}

it.each(types)("localizes canonical %s copy without changing action authority or provenance", type => {
  const en = queue(type)
  const fr = presentOwnerActionQueue(en, "fr")
  expect(fr.actionItems[0].title).not.toBe(en.actionItems[0].title)
  expect(fr.actionItems[0].nextStep).not.toBe(en.actionItems[0].nextStep)
  expect(fr.signals[0].businessImpact).not.toBe(en.signals[0].businessImpact)
  const { title, nextStep, ...frAction } = fr.actionItems[0]
  expect({ ...frAction, title: en.actionItems[0].title, nextStep: en.actionItems[0].nextStep }).toEqual(en.actionItems[0])
  expect(presentOwnerActionQueue(en, "en")).toBe(en)
})

it("preserves custom source language and notes", () => {
  const en = queue("open_payment_suspense")
  en.actionItems[0].title = "Customer wording remains authoritative"
  en.actionItems[0].nextStep = "Call our reviewer about document 42"
  en.signals[0].businessImpact = "User note: awaiting evidence"
  const fr = presentOwnerActionQueue(en, "fr")
  expect(fr.actionItems).toEqual(en.actionItems)
  expect(fr.signals[0].businessImpact).toBe(en.signals[0].businessImpact)
})

it("preserves custom payroll wording that matches an object property name", () => {
  const en = queue("payroll_exposure")
  en.actionItems[0].nextStep = "constructor"
  expect(presentOwnerActionQueue(en, "fr").actionItems[0].nextStep).toBe("constructor")
})

it("translates forecast messages only when both source reason and canonical wording match", () => {
  const source = { reasonCode: "PAYROLL_FORECAST_PROOF_INCOMPLETE", message: "Upcoming payroll finance forecasts are withheld because currency, provider, declaration, payment, or ledger proof is incomplete." }
  expect(presentOwnerForecastMessage(source, "fr")).toContain("sont masquées")
  expect(presentOwnerForecastMessage(source, "en")).toBe(source.message)
  expect(presentOwnerForecastMessage({ ...source, message: "Review custom evidence" }, "fr")).toBe("Review custom evidence")
  expect(presentOwnerForecastMessage({ ...source, reasonCode: "CUSTOM" }, "fr")).toBe(source.message)
})

const cashFact = { organizationId: "org-1", signalType: "cash_drawer_variance", moduleSlug: "cash_drawer", sourceModule: "pos", subjectType: "cash.drawer", subjectId: "drawer-1", generatedAt: now, sourceHash: "sha256:cash-source" } as const
it.each([
  [["pos.cash.drawer.open"], 0],
  [["finance.cash-drawer.read"], 0],
  [["pos.cash.drawer.open", "finance.cash-drawer.read"], 1],
])("requires both existing signal access and destination read access (%s)", (actorPermissions, count) => {
  const before = JSON.stringify(cashFact)
  const signals = buildBusinessSignalsFromFacts([cashFact])
  expect(signals[0]).toMatchObject({ actionPath: "/dashboard/finance/cash-drawer", requiredPermission: "pos.cash.drawer.open", additionalRequiredPermissions: ["finance.cash-drawer.read"], sourceHash: cashFact.sourceHash })
  const result = buildActionQueue({organizationId:"org-1",signals,actorPermissions:actorPermissions as string[],now})
  expect(result.actionItems).toHaveLength(count as number)
  expect(JSON.stringify(cashFact)).toBe(before)
})
it("preserves an explicitly supplied cash action and its controls", () => {
  const [signal] = buildBusinessSignalsFromFacts([{...cashFact,actionPath:"/dashboard/review/custom?drawer=one#evidence",requiredPermission:"custom.review",additionalRequiredPermissions:["custom.proof"]}])
  expect(signal).toMatchObject({actionPath:"/dashboard/review/custom?drawer=one#evidence",requiredPermission:"custom.review",additionalRequiredPermissions:["custom.proof"]})
})
