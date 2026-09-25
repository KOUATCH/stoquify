import type { SnapshotBlocker, SnapshotResult } from "@/services/snapshots/snapshot-contracts"

// Sanitize the service-owned read model before any card, brief or signal is composed.
// Retain source status and severity: restricted evidence must not imply readiness.
export function restrictPayrollSnapshotDetails<T>(source: SnapshotResult<T>, allowed: boolean, locale: "en" | "fr"): SnapshotResult<T> {
  return restrictSnapshotDetails(source, allowed, locale, isPayrollBlocker, "digest-restricted-source")
}

export function restrictPaymentSnapshotDetails<T>(source: SnapshotResult<T>, allowed: boolean, locale: "en" | "fr"): SnapshotResult<T> {
  return restrictSnapshotDetails(source, allowed, locale, value =>
    /^payment_truth(?:_|$)/.test(value.gate) || value.sourceTables.some(table =>
      ["suspense_items", "payment_exceptions", "provider_accounts", "reconciliation_runs", "payment_transactions"].includes(table)), "digest-restricted-payment-source")
}

export function restrictCloseSnapshotDetails<T>(source: SnapshotResult<T>, allowed: boolean, locale: "en" | "fr"): SnapshotResult<T> {
  return restrictSnapshotDetails(source, allowed, locale, value =>
    /^close_readiness(?:_|$)/.test(value.gate) || value.sourceTables.some(table =>
      ["close_runs", "close_assurance_findings", "close_evidence_items"].includes(table)), "digest-restricted-close-source")
}

export function restrictInventorySnapshotDetails<T>(source: SnapshotResult<T>, allowed: boolean, locale: "en" | "fr"): SnapshotResult<T> {
  return restrictSnapshotDetails(source, allowed, locale, value =>
    /^inventory_(?:cash|loss)(?:_|$)/.test(value.gate) || value.sourceTables.some(table =>
      ["inventory_levels", "inventory_transactions", "stock_adjustments", "stock_adjustment_items"].includes(table)), "digest-restricted-inventory-source")
}

function restrictSnapshotDetails<T>(source: SnapshotResult<T>, allowed: boolean, locale: "en" | "fr", restrictedBlocker: (value: SnapshotBlocker) => boolean, id: string): SnapshotResult<T> {
  if (allowed) return source
  const restricted = source.blockers.filter(restrictedBlocker)
  if (!restricted.length) return source
  const severityOrder: SnapshotBlocker["severity"][] = ["low", "medium", "high", "critical"]
  const severity = restricted.reduce((highest, value) => severityOrder.indexOf(value.severity) > severityOrder.indexOf(highest) ? value.severity : highest, "low" as SnapshotBlocker["severity"])
  return { ...source, blockers: [
    ...source.blockers.filter(value => !restrictedBlocker(value)),
    { id, gate: "restricted_source", severity, sourceTables: [],
      title: locale === "fr" ? "Détails de source restreints" : "Restricted source details",
      detail: locale === "fr" ? "Certaines preuves ne sont pas accessibles avec vos autorisations actuelles. Leur restriction ne lève pas les limites de cette synthèse." : "Some evidence is unavailable with your current access. Restricting its details does not clear this summary's limitations.",
      nextAction: locale === "fr" ? "Demandez à un responsable autorisé d’examiner les preuves sources." : "Ask an authorized reviewer to inspect the source evidence.",
    },
  ] }
}

function isPayrollBlocker(value: SnapshotBlocker) {
  return /(^|_)payroll(_|$)/.test(value.gate) || value.sourceTables.some(table => table.startsWith("payroll_"))
}
