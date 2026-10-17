import type { AlertProcessingDiagnostic } from "@/services/reconciliation/reconciliation-alert-processing"

export function ReconciliationAlertProcessing({ processing, locale, formatDateTime }: {
  processing: AlertProcessingDiagnostic
  locale: string
  formatDateTime: (value: string | null | undefined) => string
}) {
  const fr = locale === "fr"
  const states = fr
    ? { RECEIVED: "En attente", PROCESSING: "En cours", PROCESSED: "Traité", FAILED: "Échec", DEAD_LETTER: "Intervention requise", IGNORED: "Ignoré" }
    : { RECEIVED: "Queued", PROCESSING: "Processing", PROCESSED: "Processed", FAILED: "Failed", DEAD_LETTER: "Needs intervention", IGNORED: "Ignored" }
  const actions = fr ? {
    WAIT: "Le traitement est en attente ou en cours. Ne le relancez pas manuellement.",
    SCHEDULED_RETRY: "Une nouvelle tentative est planifiée.",
    REVIEW_PROCESSING: "Le traitement doit être vérifié par l’équipe de support.",
    ESCALATE: "Transmettez cette alerte au support avant toute nouvelle tentative.",
    NONE: "Aucune action de traitement requise.",
  } : {
    WAIT: "Processing is queued or in progress. Do not retry manually.",
    SCHEDULED_RETRY: "Another attempt is scheduled.",
    REVIEW_PROCESSING: "Support should review this processing state.",
    ESCALATE: "Escalate this alert to support before another attempt.",
    NONE: "No processing action required.",
  }
  return <div className="mt-3 space-y-1 border-t border-[var(--dash-border-subtle)] pt-2 text-xs">
    <p className="font-medium">{fr ? "Traitement de l’alerte" : "Alert processing"}: {states[processing.state]}</p>
    <p>{fr ? "Tentatives" : "Attempts"}: {processing.attempts} · {fr ? "Âge" : "Age"}: {processing.ageMinutes} min</p>
    {processing.nextAttemptAt && <p>{processing.state === "PROCESSING" ? (fr ? "Bail jusqu’au" : "Lease until") : (fr ? "Prochaine tentative" : "Next attempt")}: {formatDateTime(processing.nextAttemptAt)}</p>}
    {processing.processedAt && <p>{fr ? "Traité le" : "Processed at"}: {formatDateTime(processing.processedAt)}</p>}
    {processing.lastErrorCode && <p>{fr ? "Code de diagnostic" : "Diagnostic code"}: {processing.lastErrorCode}</p>}
    <p>{actions[processing.nextAction]}</p>
    <p className="text-[var(--dash-text-soft)]">{fr ? "Cet état concerne le traitement de l’alerte, pas le règlement du paiement." : "This state describes alert processing, not payment settlement."}</p>
  </div>
}
