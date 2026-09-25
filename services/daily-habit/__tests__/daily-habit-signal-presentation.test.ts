jest.mock("server-only", () => ({}))
import { buildBusinessSignalsFromFacts } from "@/services/signals/business-signal-rules.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import { presentDailyAction, presentDailySignal } from "../daily-habit-signal-presentation"

it.each([1, 2])("localizes %i recorded inventory loss lines without attributing causation or changing authority", count => {
  const now = "2026-09-19T08:00:00Z"
  const detail = `${count} recorded inventory loss line(s) totaling 45000 XAF require evidence review. Approval attribution records authorization and does not identify who caused the loss.`
  const signal = buildBusinessSignalsFromFacts([{ organizationId: "org", signalType: "inventory_loss_review", moduleSlug: "inventory", sourceModule: "inventory", subjectType: "inventory.loss", subjectId: "loss", title: "Recorded inventory loss needs review", detail, sourceHash: "loss-hash", payload: { lossLineCount: count, totalLossValue: 45000, currency: "XAF" } }], { now })[0]
  const original = JSON.stringify(signal), french = presentDailySignal(signal, "fr")
  expect(french.title).toBe("Des pertes de stock enregistrées doivent être examinées")
  expect(french.detail).toContain(count === 1 ? "1 ligne de perte enregistrée" : "2 lignes de pertes enregistrées")
  expect(french.detail).toContain("45\u202f000 XAF")
  expect(french.detail).toContain("L’attribution de l’approbation atteste l’autorisation et n’identifie pas la personne à l’origine de la perte.")
  expect(french).toMatchObject({ sourceHash: "loss-hash", requiredPermission: "inventory.levels.read", actionPath: "/dashboard/inventory/losses", payload: signal.payload })
  const action = buildActionQueue({ organizationId: "org", signals: [signal], actorPermissions: ["inventory.levels.read"], now }).actionItems[0]
  expect(presentDailyAction(action, "fr")).toMatchObject({ title: french.title, nextStep: "Examinez les preuves d’ajustement, la valorisation et l’attribution de l’approbation avant de vous fier aux totaux des pertes enregistrées." })
  expect(presentDailySignal({ ...signal, detail: "Custom evidence note" }, "fr").detail).toBe("Custom evidence note")
  expect(presentDailySignal({ ...signal, payload: { ...signal.payload, totalLossValue: null } }, "fr").detail).toBe(detail)
  expect(presentDailySignal(signal, "en")).toBe(signal)
  expect(JSON.stringify(signal)).toBe(original)
})

it("localizes payroll review guidance while preserving evidence, all read requirements and custom wording", () => {
  const now = "2026-09-19T08:00:00Z"
  const signal = buildBusinessSignalsFromFacts([{ organizationId: "org", signalType: "payroll_exposure", moduleSlug: "payroll", sourceModule: "payroll", subjectType: "payroll.employee_balance", subjectId: "balance", requiredPermission: "payments.reconciliation.read", sourceHash: "payroll-hash", actionPath: "/dashboard/payroll/payments", payload: {} }], { now })[0]
  const original = JSON.stringify(signal)
  const french = presentDailySignal(signal, "fr")
  expect(french).toMatchObject({ title: "Exposition liée à la paie", requiredPermission: "payments.reconciliation.read", additionalRequiredPermissions: ["payroll.command.read"], sourceHash: "payroll-hash", actionPath: signal.actionPath, payload: signal.payload })
  expect(french.suggestedAction).toBe("Examinez les preuves de paiement et de comptabilisation de la paie sans exposer les montants individuels.")
  const action = buildActionQueue({ organizationId: "org", signals: [signal], actorPermissions: ["payments.reconciliation.read", "payroll.command.read"], now }).actionItems[0]
  expect(presentDailyAction(action, "fr")).toMatchObject({ title: french.title, nextStep: french.suggestedAction, additionalRequiredPermissions: ["payroll.command.read"] })
  const custom = { ...signal, title: "Observation", detail: "Source detail", suggestedAction: "Ask reviewer", businessImpact: "Source consequence" }
  expect(presentDailySignal(custom, "fr")).toEqual(custom)
  expect(JSON.stringify(signal)).toBe(original)
})

it("localizes stockout guidance while retaining the exact source and item authority", () => {
  const now = "2026-09-19T08:00:00Z"
  const signal = buildBusinessSignalsFromFacts([{ organizationId: "org", signalType: "stockout_risk", moduleSlug: "inventory", sourceModule: "inventory", subjectType: "inventory.level", subjectId: "stock", sourceHash: "inventory-hash", payload: { zeroStockLevelCount: 1 } }], { now })[0]
  const french = presentDailySignal(signal, "fr")
  expect(french).toMatchObject({ title: "Risque de rupture de stock", sourceHash: "inventory-hash", requiredPermission: "inventory.items.read", actionPath: "/dashboard/inventory/items" })
  expect(french.payload).toEqual(signal.payload)
  expect(french.detail).toBe("Des niveaux de stock disponibles nuls ou négatifs doivent être examinés.")
  const action = buildActionQueue({ organizationId: "org", signals: [signal], actorPermissions: ["inventory.items.read"], now }).actionItems[0]
  expect(presentDailyAction(action, "fr")).toMatchObject({ title: french.title, nextStep: french.suggestedAction })
  const custom = { ...signal, title: "Custom stock alert", detail: "Recorded observation", suggestedAction: "Ask assigned operator", businessImpact: "Specific order affected" }
  expect(presentDailySignal(custom, "fr")).toEqual(custom)
  expect(presentDailySignal(signal, "en")).toBe(signal)
})

it("localizes canonical close guidance without modifying evidence, authority or custom text", () => {
  const now = "2026-09-15T08:00:00.000Z"
  const signal = buildBusinessSignalsFromFacts([{
    organizationId: "org", signalType: "close_blocker", moduleSlug: "close_assurance",
    sourceModule: "close", subjectType: "close.run", subjectId: "latest",
    sourceHash: "source-close-hash", severity: "critical", evidenceGrade: "blocked",
    payload: { openFindingCount: 2 },
  }], { now })[0]!
  const before = JSON.stringify(signal)
  const french = presentDailySignal(signal, "fr")
  expect(french).toEqual({
    ...signal, title: "Blocage de clôture", detail: "Un signal de blocage de clôture doit être examiné.",
    suggestedAction: "Examinez les blocages de clôture et joignez les preuves manquantes avant toute certification.",
    businessImpact: "Les blocages de clôture retardent la production de rapports fiables et la revue comptable.",
  })
  expect(french.actionPath).toBe("/dashboard/accounting/close")
  expect(presentDailySignal(signal, "en")).toBe(signal)
  const custom = { ...signal, title: "Assigned review", detail: "Custom evidence note", suggestedAction: "Contact assigned reviewer", businessImpact: "Period-specific impact" }
  expect(presentDailySignal(custom, "fr")).toEqual(custom)
  const action = buildActionQueue({ organizationId: "org", signals: [signal], actorPermissions: ["accounting.close.read"], now }).actionItems[0]!
  expect(presentDailyAction(action, "fr")).toEqual({ ...action, title: french.title, nextStep: french.suggestedAction })
  expect(presentDailyAction({ ...action, title: custom.title, nextStep: custom.suggestedAction }, "fr")).toEqual({ ...action, title: custom.title, nextStep: custom.suggestedAction })
  expect(JSON.stringify(signal)).toBe(before)
})
