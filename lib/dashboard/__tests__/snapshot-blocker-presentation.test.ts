import { presentSnapshotBlocker } from "../snapshot-blocker-presentation"

it("explains unverified partial payroll settlement in French without changing its control identity", () => {
  const blocker = { id: "tenant-payroll-finance-forecast-payroll-forecast-settlement-balance-unverified", severity: "high" as const, gate: "payroll_finance_forecast", title: "Remaining payroll payment balance is unverified", detail: "A partially settled payroll batch has no verified remaining balance. Its original amount cannot be used as upcoming cash.", nextAction: "Review payroll settlement evidence and establish the remaining obligation before relying on this forecast.", sourceTables: ["payroll_payment_batches"] }
  expect(presentSnapshotBlocker(blocker, "fr")).toEqual({ ...blocker, title: "Le solde restant du paiement de paie n’est pas vérifié", detail: "Un lot de paie partiellement réglé ne dispose pas d’un solde restant vérifié. Son montant initial ne peut pas servir de prévision de trésorerie.", nextAction: "Examinez les preuves de règlement de la paie et établissez l’obligation restante avant de vous fier à cette prévision." })
  expect(presentSnapshotBlocker(blocker, "en")).toBe(blocker)
})
import type { SnapshotBlocker } from "@/services/snapshots/snapshot-contracts"

const cases = [
  ["payment-provider-account-missing", "payment_truth", "No active provider account", "Aucun compte de prestataire actif"],
  ["payment-reconciliation-run-missing", "payment_truth", "No reconciliation run in period", "Aucun rapprochement sur la période"],
  ["close-periods-missing", "close_readiness", "No accounting period covers this snapshot", "Aucune période comptable ne couvre cet instantané"],
  ["tenant-active-location-missing", "tenant_operating_snapshot", "No active location is configured", "Aucun site actif n’est configuré"],
]
it.each([
  ["close-assessment-order-ambiguous", "Current close assessment is ambiguous", "2 accounting period(s) have multiple latest assessments with the same creation time.", "Review the competing assessments and run Close Assurance again before relying on certification."],
  ["close-evidence-stale", "Close evidence has been invalidated", "2 close run(s) require fresh evidence after a source change.", "Reevaluate Close Assurance and obtain current certification evidence."],
  ["close-certified-export-missing", "Close certification evidence is missing", "2 certified close run(s) lack a current certified export.", "Review and retain a current certified close pack before relying on certification."],
  ["close-findings-open", "Close findings remain open", "2 finding(s) remain unresolved in the selected close runs.", "Resolve or formally waive close findings through Close Assurance."],
  ["close-checklist-incomplete", "Close controls failed or are unavailable", "2 checklist control(s) failed or are unavailable in the selected close runs.", "Review failed controls and restore their evidence before certification."],
  ["close-evidence-unavailable", "Close evidence is unavailable", "2 close evidence item(s) are unavailable for this organization.", "Regenerate or attach the missing close evidence."],
  ["close-periods-unreviewed", "Accounting periods need close review", "2 accounting period(s) have no close run in the selected scope.", "Run Close Assurance for each uncovered accounting period."],
])("localizes current close condition %s without rewriting custom evidence", (id, title, detail, nextAction) => {
  const blocker: SnapshotBlocker = { id, title, detail, nextAction, gate: "close_readiness", severity: "high", sourceTables: ["close_runs"] }
  const fr = presentSnapshotBlocker(blocker, "fr")
  expect(fr.title).not.toBe(title)
  expect(fr.detail).not.toBe(detail)
  expect(fr.detail).toMatch(/^2 /)
  expect(fr.nextAction).not.toBe(nextAction)
  expect({ ...fr, title, detail, nextAction }).toEqual(blocker)
  expect(presentSnapshotBlocker(blocker, "en")).toBe(blocker)
  const custom = { ...blocker, title: "Custom", detail: "Private note", nextAction: "Assigned action" }
  expect(presentSnapshotBlocker(custom, "fr")).toEqual(custom)
  expect(presentSnapshotBlocker({ ...blocker, gate: "accounting.close.evidence" }, "fr")).toEqual({ ...blocker, gate: "accounting.close.evidence" })
})
it("localizes currency evidence without converting amounts or overwriting custom notes", () => {
  const blocker: SnapshotBlocker = { id: "payment-suspense-currency-mismatch", gate: "payment_truth", severity: "high", sourceTables: ["suspense_items"], title: "Suspense currencies cannot be combined", detail: "Open suspense by currency: 20.00 USD; 100.00 XAF. No conversion evidence establishes a total in XAF.", nextAction: "Review suspense by currency in reconciliation; do not treat these amounts as one converted total." }
  expect(presentSnapshotBlocker(blocker, "fr")).toEqual({ ...blocker, title: "Les suspens de devises différentes ne peuvent pas être additionnés", detail: "Suspens ouverts par devise : 20.00 USD; 100.00 XAF. Aucune preuve de conversion ne permet d’établir un total en XAF.", nextAction: "Examinez les suspens par devise dans le rapprochement ; ces montants ne constituent pas un total converti." })
  expect(presentSnapshotBlocker({ ...blocker, detail: "Custom source note" }, "fr").detail).toBe("Custom source note")
  expect(presentSnapshotBlocker(blocker, "en")).toBe(blocker)
})
it.each([
  ["2 suspense item(s) remain open; a combined currency total is unavailable.", "2 suspens de paiement restent ouverts ; le total combiné des devises est indisponible."],
  ["2 suspense item(s) remain open with 100.00 XAF in unresolved value.", "2 suspens de paiement restent ouverts pour 100.00 XAF."],
])("retains the suspense amount scope for %s", (detail, french) => {
  const blocker: SnapshotBlocker = { id: "payment-suspense-open", gate: "payment_truth", severity: "high", sourceTables: ["suspense_items"], title: "Payment suspense queue is not empty", detail }
  expect(presentSnapshotBlocker(blocker, "fr").detail).toBe(french)
})
it.each([1, 2])("localizes %s blocked close runs while retaining source identity and custom notes", count => {
  const blocker: SnapshotBlocker = { id: "close-runs-blocked", gate: "close_readiness", title: "Close runs are blocked", detail: `${count} close run(s) are blocked in the selected period.`, nextAction: "Use Close Assurance to clear blockers before certification.", severity: "high", sourceTables: ["close_runs"] }
  const before = JSON.stringify(blocker)
  expect(presentSnapshotBlocker(blocker, "fr")).toEqual({ ...blocker, title: "Clôtures bloquées", detail: count === 1 ? "1 exécution de clôture est bloquée sur la période sélectionnée." : "2 exécutions de clôture sont bloquées sur la période sélectionnée.", nextAction: "Examinez les blocages dans le centre de clôture avant toute certification." })
  const custom = { ...blocker, title: "Custom title", detail: "Custom count and context", nextAction: "Contact assigned reviewer" }
  expect(presentSnapshotBlocker(custom, "fr")).toEqual(custom)
  expect(presentSnapshotBlocker(blocker, "en")).toBe(blocker)
  expect(presentSnapshotBlocker({ ...blocker, gate: "different" }, "fr")).toEqual({ ...blocker, gate: "different" })
  expect(JSON.stringify(blocker)).toBe(before)
})
it.each(cases)("preserves controls and custom detail for %s", (id, gate, title, french) => {
  const blocker: SnapshotBlocker = { id: id!, gate: gate!, title: title!, detail: "Custom detail: 42 records", nextAction: "Contact the assigned operator", severity: "high", sourceTables: ["owned_source"] }
  const before = JSON.stringify(blocker), localized = presentSnapshotBlocker(blocker, "fr")
  expect(localized).toEqual({ ...blocker, title: french })
  expect(presentSnapshotBlocker(blocker, "en")).toBe(blocker)
  expect(presentSnapshotBlocker({ ...blocker, gate: "different" }, "fr")).toEqual({ ...blocker, gate: "different" })
  expect(presentSnapshotBlocker({ ...blocker, title: "Updated source title" }, "fr").title).toBe("Updated source title")
  expect(JSON.stringify(blocker)).toBe(before)
})
it("retains unknown blockers and absent next steps", () => {
  const blocker: SnapshotBlocker = { id: "future", gate: "future", title: "Future condition", detail: "No translation registered", severity: "critical", sourceTables: [] }
  expect(presentSnapshotBlocker(blocker, "fr")).toBe(blocker)
  expect(presentSnapshotBlocker({ ...blocker, id: "close-periods-missing", gate: "close_readiness" }, "fr").nextAction).toBeUndefined()
})
