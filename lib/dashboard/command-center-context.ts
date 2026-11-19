export type CommandDateKind = "deadline" | "evidence_expiry" | "detected" | "submitted" | "generated" | "period_end"

export const stableIdentityOrder = (left: {id: string}, right: {id: string}) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0

export function commandDateLabel(value: string, kind: CommandDateKind = "deadline", locale: "en" | "fr" = "en") {
  const labels = locale === "fr"
    ? {deadline: "Échéance", evidence_expiry: "Expiration des preuves", detected: "Détecté", submitted: "Soumis", generated: "Vue générée", period_end: "Fin de période"}
    : {deadline: "Due", evidence_expiry: "Evidence expiry", detected: "Detected", submitted: "Submitted", generated: "View generated", period_end: "Period end"}
  const date = new Date(value)
  return `${labels[kind]} (UTC): ${Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale, {timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"}).format(date) : locale === "fr" ? "indisponible" : "unavailable"}`
}

export function priorityExplanation(item: {title: string; severity: string; severityScore: number; blockers: readonly unknown[]} | undefined, policy: "severity_deadline_score" | "score", locale: "en" | "fr" = "en") {
  if (!item) return locale === "fr" ? "Aucune action autorisée n’est disponible dans ce périmètre." : "No permitted action is available in this scope."
  const severity = locale === "fr" ? ({critical: "critique", high: "élevée", medium: "moyenne", low: "faible", info: "information"}[item.severity] ?? item.severity) : item.severity
  const reason = policy === "score"
    ? locale === "fr" ? `score de risque prioritaire (${item.severityScore})` : `leading risk score (${item.severityScore})`
    : locale === "fr" ? `gravité ${severity} ; ordre par gravité, échéance source, puis score` : `${severity} severity; ordered by severity, source deadline, then score`
  return `${locale === "fr" ? "À examiner en premier" : "Review first"}: ${item.title} — ${reason}.${item.blockers.length ? locale === "fr" ? " Examinez les blocages avant d’agir." : " Review blockers before acting." : ""}`
}
