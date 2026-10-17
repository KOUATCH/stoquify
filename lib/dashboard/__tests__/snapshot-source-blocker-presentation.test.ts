import { presentSnapshotBlocker } from "../snapshot-blocker-presentation"
import type { SnapshotBlocker } from "@/services/snapshots/snapshot-contracts"

function blocker(overrides: Partial<SnapshotBlocker>): SnapshotBlocker {
  return { id: "tenant-payroll-employee-balance-open", gate: "payroll_employee_balance", severity: "high", title: "Employee balance recovery cases are open", detail: "2 active employee balance case(s) have 983421.78 outstanding.", nextAction: "Open payroll payments and settle, refund, or review employee balance recovery cases.", sourceTables: ["payroll_employee_balance_cases"], ...overrides }
}

it("translates employee recovery evidence without changing amounts, authority or source records", () => {
  const source = { ...blocker({}), sourceHash: "signed-source-hash" }
  const original = JSON.stringify(source)
  expect(presentSnapshotBlocker(source, "fr")).toEqual({ ...source,
    title: "Des dossiers de recouvrement de soldes salariés restent ouverts",
    detail: "2 dossiers actifs de soldes salariés présentent un montant restant de 983421.78.",
    nextAction: "Ouvrez les paiements de paie pour examiner les dossiers de recouvrement, les règlements ou les remboursements selon vos autorisations.",
  })
  expect(JSON.stringify(source)).toBe(original)
  expect(presentSnapshotBlocker(source, "en")).toBe(source)
  for (const detail of ["Custom note: 983421.78 remains under dispute", "2 active employee balance case(s) have NaN outstanding.", "2 active employee balance case(s) have 1,000.00 outstanding."]) {
    expect(presentSnapshotBlocker({ ...source, detail }, "fr").detail).toBe(detail)
  }
})

it.each([
  ["tenant-payroll-balance-currency-mismatch", "Employee balance currencies cannot be combined", "Les soldes salariés de devises différentes ne peuvent pas être additionnés"],
  ["tenant-payroll-settlement-currency-mismatch", "Employee settlement currencies cannot be combined", "Les règlements salariés de devises différentes ne peuvent pas être additionnés"],
])("preserves currency evidence and unavailable totals for %s", (id, title, frenchTitle) => {
  const source = blocker({ id, title, detail: "Amounts by currency: 500.00 USD; 500.00 XAF. No conversion evidence establishes a total in XAF.", nextAction: "Review payroll balances and settlements by currency; do not treat them as one converted total." })
  const before = JSON.stringify(source)
  expect(presentSnapshotBlocker(source, "fr")).toMatchObject({ title: frenchTitle, detail: "Montants par devise : 500.00 USD; 500.00 XAF. Aucune preuve de conversion ne permet d’établir un total en XAF.", nextAction: "Examinez les soldes et règlements de paie par devise ; ces montants ne constituent pas un total converti." })
  expect(presentSnapshotBlocker(source, "en")).toBe(source)
  expect(JSON.stringify(source)).toBe(before)
  const custom = { ...source, title: "Custom source title", detail: "Private reviewer note", nextAction: "Ask the reviewer" }
  expect(presentSnapshotBlocker(custom, "fr")).toEqual(custom)
  expect(presentSnapshotBlocker({ ...source, gate: "unrelated" }, "fr")).toEqual({ ...source, gate: "unrelated" })
})

it.each([
  ["2 active employee balance case(s) have 27500.00 XAF outstanding.", "2 dossiers actifs de soldes salariés présentent un montant restant de 27500.00 XAF."],
  ["2 active employee balance case(s) remain open; a combined currency total is unavailable.", "2 dossiers actifs de soldes salariés restent ouverts ; le total combiné des devises est indisponible."],
])("explains recovery amount availability: %s", (detail, french) => {
  expect(presentSnapshotBlocker(blocker({ detail }), "fr").detail).toBe(french)
})

it.each([
  ["inventory-negative-stock", "inventory_cash", "3 inventory level(s) are below zero and can distort stock-to-cash truth.", "3 niveau(x) de stock sont négatifs et peuvent fausser la lecture des stocks et de la trésorerie."],
  ["payment-critical-exceptions-open", "payment_truth", "4 critical payment exception(s) must be resolved before cash truth can be trusted.", "4 anomalie(s) critique(s) de paiement doivent être résolues avant de pouvoir se fier à la trésorerie affichée."],
  ["close-critical-findings-open", "close_readiness", "5 critical close finding(s) block certification-grade readiness.", "5 constat(s) critique(s) de clôture empêchent la préparation à la certification."],
  ["tenant-ledger-trust-assurance-incidents", "workflow_assurance", "6 unresolved ledger, business-event, or compliance assurance incident(s) are blocking trusted operating intelligence.", "6 incident(s) non résolu(s) de contrôle comptable, d’événements métier ou de conformité empêchent une analyse opérationnelle fiable."],
  ["inventory-loss-evidence-missing", "inventory_loss_evidence", "7 recorded loss line(s) lack source evidence. This gap does not establish causation.", "7 ligne(s) de pertes enregistrées n’ont pas de preuve source. Cette lacune ne permet pas d’établir la cause de la perte."],
  ["inventory-loss-valuation-missing", "inventory_loss_valuation", "8 recorded loss line(s) lack valuation evidence.", "8 ligne(s) de pertes enregistrées n’ont pas de preuve de valorisation."],
  ["inventory-loss-approval-attribution-missing", "inventory_loss_approval", "9 recorded loss line(s) lack an approving actor. Approval records authorization, not causation.", "9 ligne(s) de pertes enregistrées n’identifient pas d’approbateur. L’approbation atteste l’autorisation, pas la cause de la perte."],
])("retains count and limitation meaning for %s", (id, gate, detail, french) => {
  const source = blocker({ id, gate, title: "Custom observation", detail, nextAction: "Ask the assigned reviewer" })
  expect(presentSnapshotBlocker(source, "fr")).toEqual({ ...source, detail: french })
  expect(presentSnapshotBlocker({ ...source, gate: "unrelated" }, "fr")).toEqual({ ...source, gate: "unrelated" })
  expect(presentSnapshotBlocker({ ...source, detail: "Updated source wording" }, "fr").detail).toBe("Updated source wording")
  expect(presentSnapshotBlocker(source, "en")).toBe(source)
})

it.each([
  ["PAYROLL_FORECAST_PROVIDER_PROOF_MISSING", "Payroll provider proof is missing", "Les preuves du prestataire de paiement de paie sont manquantes"],
  ["PAYROLL_FORECAST_DECLARATION_PROOF_MISSING", "Payroll declaration proof is missing", "Les preuves des déclarations de paie sont manquantes"],
  ["PAYROLL_FORECAST_DECLARATION_MISSING", "Payroll declaration proof is missing", "Les preuves des déclarations de paie sont manquantes"],
  ["PAYROLL_FORECAST_LEDGER_PROOF_MISSING", "Payroll ledger proof is missing", "Les preuves comptables de la paie sont manquantes"],
  ["PAYROLL_FORECAST_CERTIFIED_HRIS_INPUT_PROOF_MISSING", "Certified HRIS payroll input proof is missing", "Les preuves des données RH certifiées pour la paie sont manquantes"],
  ["PAYROLL_FORECAST_REGISTER_LEDGER_TIEOUT_MISSING", "Payroll register-to-ledger tie-out is incomplete", "Le rapprochement du registre de paie avec la comptabilité est incomplet"],
  ["PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING", "Payroll payment proof is missing", "Les preuves de paiement de paie sont manquantes"],
  ["PAYROLL_FORECAST_PAYMENT_BATCH_MISSING", "Payroll payment proof is missing", "Les preuves de paiement de paie sont manquantes"],
])("keeps each forecast reason distinct without claiming readiness: %s", (code, title, french) => {
  const source = blocker({ id: `tenant-payroll-finance-forecast-${code.toLowerCase().replace(/_/g, "-")}`, gate: "payroll_finance_forecast", title, detail: "A reviewer added this note", nextAction: undefined, severity: "critical" })
  expect(presentSnapshotBlocker(source, "fr")).toEqual({ ...source, title: french })
  expect(presentSnapshotBlocker({ ...source, title: "Updated source title" }, "fr")).toEqual({ ...source, title: "Updated source title" })
})

it("explains forecast currencies in French without changing source evidence", () => {
  const source = blocker({ id: "tenant-payroll-finance-forecast-payroll-forecast-currency-mismatch", gate: "payroll_finance_forecast", title: "Payroll forecast currencies cannot be combined", detail: "Forecast source currencies: USD; XAF. No conversion evidence establishes a total in XAF.", nextAction: "Review payment batches and declarations by currency before relying on a combined cash forecast." })
  expect(presentSnapshotBlocker(source, "fr")).toEqual({ ...source, title: "Les devises des prévisions de paie ne peuvent pas être additionnées", detail: "Devises des sources de prévision : USD; XAF. Aucune preuve de conversion ne permet d’établir un total en XAF.", nextAction: "Examinez les lots de paiement et les déclarations par devise avant de vous fier à une prévision de trésorerie combinée." })
  expect(presentSnapshotBlocker(source, "en")).toBe(source)
  const custom = { ...source, title: "Reviewer title", detail: "Reviewer evidence", nextAction: "Reviewer action" }
  expect(presentSnapshotBlocker(custom, "fr")).toEqual(custom)
})

it("retains an unrecognized forecast blocker code and custom future evidence", () => {
  const code = "PAYROLL_FORECAST_FUTURE_CONTROL"
  const source = blocker({ id: "tenant-payroll-finance-forecast-payroll-forecast-future-control", gate: "payroll_finance_forecast", title: "Payroll finance forecast is blocked", detail: `Payroll forecast proof failed closed with blocker ${code}.`, nextAction: "Open payroll finance evidence and clear the forecast blocker." })
  expect(presentSnapshotBlocker(source, "fr")).toMatchObject({ detail: `Les preuves de prévision de paie sont insuffisantes ; le blocage ${code} reste actif.`, severity: "high" })
  expect(presentSnapshotBlocker({ ...source, detail: "Future custom evidence" }, "fr").detail).toBe("Future custom evidence")
  expect(presentSnapshotBlocker({ ...source, id: "different" }, "fr")).toEqual({ ...source, id: "different" })
})

it.each([
  ["inventory-levels-missing", "inventory_cash", "Items are configured for stock tracking, but no inventory level rows are available for the selected scope.", "aucun niveau de stock"],
  ["tenant-ledger-source-link-gap", "ledger_evidence", "Posted entries exist in the period, but source-link evidence coverage is zero.", "aucune n’est couverte"],
  ["inventory-loss-source-truncated", "inventory_loss_source", "The source line cap was reached, so recorded loss totals are incomplete.", "totaux des pertes enregistrées sont donc incomplets"],
  ["payment-location-scope-unsupported", "payment_truth_scope", "Payment Truth currently reconciles tenant-wide provider evidence and cannot safely claim location-level results.", "ne permet pas d’établir des résultats fiables par site"],
  ["close-location-scope-unsupported", "close_readiness_scope", "Close Readiness currently certifies tenant-wide accounting and evidence controls and cannot safely claim location-level results.", "ne permettent pas d’établir des résultats fiables par site"],
  ["tenant-operating-location-scope-unsupported", "tenant_operating_scope", "Tenant operating sources cannot yet prove a complete location allocation, so no tenant-wide values are returned for this location.", "aucune valeur globale de l’organisation"],
])("preserves unavailable, incomplete and source-scope qualifications for %s", (id, gate, detail, qualification) => {
  const source = blocker({ id, gate, detail })
  expect(presentSnapshotBlocker(source, "fr").detail).toContain(qualification)
  expect(presentSnapshotBlocker({ ...source, detail: "Custom exception" }, "fr").detail).toBe("Custom exception")
})

it.each([
  ["close-assessment-order-ambiguous", "Current close assessment is ambiguous", "1 accounting period(s) have multiple latest assessments with the same creation time.", "Review the competing assessments and run Close Assurance again before relying on certification.", "L’évaluation de clôture actuelle est ambiguë", "1 période(s) comptable(s) ont plusieurs dernières évaluations créées au même instant.", "Examinez les évaluations concurrentes et relancez les contrôles de clôture avant de vous fier à la certification."],
  ["close-assessment-not-current", "Close assessment is historical", "This assessment is not the latest assessment for its accounting period.", "Open the latest close assessment before relying on certification.", "L’évaluation de clôture est historique", "Cette évaluation n’est pas la dernière évaluation de sa période comptable.", "Ouvrez la dernière évaluation de clôture avant de vous fier à la certification."],
  ["close-assessment-voided", "Close assessment is voided", "This assessment has been voided and cannot establish current certification.", "Run a new close assessment and resolve its controls before requesting certification.", "L’évaluation de clôture est annulée", "Cette évaluation a été annulée et ne peut pas établir la certification actuelle.", "Lancez une nouvelle évaluation de clôture et résolvez ses contrôles avant de demander la certification."],
])("localizes the canonical selection blocker while retaining custom and unrelated evidence: %s", (id, title, detail, nextAction, frTitle, frDetail, frNextAction) => {
  const source = blocker({ id, gate: "close_readiness", title, detail, nextAction, sourceTables: ["close_runs"] })
  const before = JSON.stringify(source)
  expect(presentSnapshotBlocker(source, "fr")).toEqual({ ...source, title: frTitle, detail: frDetail, nextAction: frNextAction })
  expect(presentSnapshotBlocker(source, "en")).toBe(source)
  expect(JSON.stringify(source)).toBe(before)
  const custom = { ...source, title: "Reviewer title", detail: "Reviewer evidence", nextAction: "Reviewer next action" }
  expect(presentSnapshotBlocker(custom, "fr")).toEqual(custom)
  expect(presentSnapshotBlocker({ ...source, gate: "unrelated" }, "fr")).toEqual({ ...source, gate: "unrelated" })
})