import { presentSnapshotBlocker } from "../snapshot-blocker-presentation"
import type { SnapshotBlocker } from "@/services/snapshots/snapshot-contracts"

const cases = [
  ["payment-provider-account-missing", "payment_truth", "No active provider account", "Aucun compte de prestataire actif"],
  ["payment-reconciliation-run-missing", "payment_truth", "No reconciliation run in period", "Aucun rapprochement sur la période"],
  ["close-periods-missing", "close_readiness", "No accounting period covers this snapshot", "Aucune période comptable ne couvre cet instantané"],
  ["tenant-active-location-missing", "tenant_operating_snapshot", "No active location is configured", "Aucun site actif n’est configuré"],
]
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
