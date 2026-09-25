import type { BIKpiState, BISeverity, BITrustState, BICommandMode } from "@/services/bi/bi-contracts"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"

// Explicit page locale, matching dashboard presentation helpers; no access or evidence inference.
export function biLocale(locale = "en"): "en" | "fr" { return locale.startsWith("fr") ? "fr" : "en" }

export const biStateCopy: Record<"en" | "fr", Record<BIKpiState, string>> = {
  en: { loading: "Loading", empty: "No data", ready: "Ready", stale: "Stale", partial: "Partial", blocked: "Blocked", redacted: "Redacted", permission_denied: "Permission denied", module_unavailable: "Module unavailable", safe_error: "Unavailable" },
  fr: { loading: "Chargement", empty: "Aucune donnée", ready: "Prêt", stale: "Périmé", partial: "Partiel", blocked: "Bloqué", redacted: "Masqué", permission_denied: "Accès refusé", module_unavailable: "Module indisponible", safe_error: "Indisponible" },
}
export const biGradeCopy: Record<"en" | "fr", Record<EvidenceGrade | BITrustState, string>> = {
  en: { raw: "Raw", operational: "Operational", posted: "Posted", reconciled: "Reconciled", certified: "Certified", blocked: "Blocked" },
  fr: { raw: "Brut", operational: "Opérationnel", posted: "Comptabilisé", reconciled: "Rapproché", certified: "Certifié", blocked: "Bloqué" },
}
export const biSeverityCopy: Record<"en" | "fr", Record<BISeverity, string>> = {
  en: { info: "info", low: "low", medium: "medium", high: "high", critical: "critical" },
  fr: { info: "information", low: "faible", medium: "moyen", high: "élevé", critical: "critique" },
}
export const biModeCopy: Record<"en" | "fr", Record<BICommandMode, string>> = {
  en: { brief: "Brief", command: "Command", investigate: "Investigate" },
  fr: { brief: "Synthèse", command: "Pilotage", investigate: "Examiner" },
}
export const biCopy = {
  en: {
    staleSource: "Source flagged as stale", sourceUpdated: "Last source update", sourceTimeMissing: "Source update time unavailable", freshnessLimit: "Source age limit", minutes: "minutes", staleGuidance: "Review the source and refresh this view. Refreshing does not resolve source blockers.",
    brief: "Command brief", period: "Period", generated: "Generated", sources: "Sources", review: "Review", noSources: "No sources", notSet: "Not set", until: "Until", from: "From", sourceHash: "Source hash", evidence: "evidence", noValue: "No value",
    proofUnavailable: "Proof-only drill-through needs a proof drawer host.",
    kpi: { redacted: "This KPI is redacted", permission_denied: "You do not have access to this KPI", module_unavailable: "This module is not available", safe_error: "This KPI is temporarily unavailable", blocked: "This KPI is blocked" },
    changes: "What changed", changeDetail: "Important business movement since the last trusted review.", change: "change", changesPlural: "changes", noChanges: "No important changes yet", noChangesDetail: "When trusted snapshots or business signals move, the command surface will show the most important changes here.", none: "none",
    radar: "Risk and opportunity radar", radarDetail: "Ranked signals that deserve attention before they become leakage, delay, or missed upside.",
    fresh: "fresh", stale: "stale", partial: "partial", unknown: "unknown", rebuilding: "rebuilding", not_started: "not_started", in_review: "in_review", reviewed: "reviewed", blocked: "blocked", now: "now", today: "today", soon: "soon",
  },
  fr: {
    staleSource: "Source signalée comme périmée", sourceUpdated: "Dernière mise à jour de la source", sourceTimeMissing: "Date de mise à jour indisponible", freshnessLimit: "Limite d’âge de la source", minutes: "minutes", staleGuidance: "Examinez la source et actualisez cette vue. L’actualisation ne résout pas les blocages de la source.",
    brief: "Synthèse de pilotage", period: "Période", generated: "Généré", sources: "Sources", review: "Revue", noSources: "Aucune source", notSet: "Non défini", until: "Jusqu’au", from: "À partir du", sourceHash: "Empreinte de la source", evidence: "preuve", noValue: "Aucune valeur",
    proofUnavailable: "La consultation de cette preuve nécessite un panneau de preuves disponible.",
    kpi: { redacted: "Cet indicateur est masqué", permission_denied: "Vous n’avez pas accès à cet indicateur", module_unavailable: "Ce module n’est pas disponible", safe_error: "Cet indicateur est temporairement indisponible", blocked: "Cet indicateur est bloqué" },
    changes: "Évolutions", changeDetail: "Évolutions importantes depuis la dernière revue des données fiables.", change: "évolution", changesPlural: "évolutions", noChanges: "Aucune évolution importante pour le moment", noChangesDetail: "Les évolutions importantes des instantanés fiables ou des signaux métier apparaîtront ici.", none: "aucune",
    radar: "Risques et opportunités", radarDetail: "Signaux classés à examiner pour prévenir les pertes, les retards ou les occasions manquées.",
    fresh: "à jour", stale: "périmé", partial: "partiel", unknown: "inconnu", rebuilding: "recalcul en cours", not_started: "non commencée", in_review: "en cours", reviewed: "examinée", blocked: "bloquée", now: "maintenant", today: "aujourd’hui", soon: "prochainement",
  },
} as const
