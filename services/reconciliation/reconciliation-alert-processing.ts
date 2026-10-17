import type { PaymentReconciliationInboxStatus } from "@prisma/client"

export type AlertProcessingDiagnostic = {
  state: PaymentReconciliationInboxStatus
  attempts: number
  nextAttemptAt: string | null
  processedAt: string | null
  ageMinutes: number
  lastErrorCode: "PAYLOAD_SUMMARY_REDACTION_REQUIRED" | "MAX_ATTEMPTS_EXCEEDED" | "PROVIDER_INBOX_WORKER_FAILED" | "REDACTED_ERROR_PRESENT" | null
  nextAction: "WAIT" | "SCHEDULED_RETRY" | "REVIEW_PROCESSING" | "ESCALATE" | "NONE"
}

/** Public operator DTO: deliberately excludes payloads, lease tokens and worker identities. */
export function projectAlertProcessing(item: {
  status: PaymentReconciliationInboxStatus
  attempts: number
  nextAttemptAt: Date | null
  processedAt: Date | null
  createdAt: Date
  lastError: string | null
}, now: Date): AlertProcessingDiagnostic {
  const safeErrors = ["PAYLOAD_SUMMARY_REDACTION_REQUIRED", "MAX_ATTEMPTS_EXCEEDED", "PROVIDER_INBOX_WORKER_FAILED"] as const
  const lastErrorCode: AlertProcessingDiagnostic["lastErrorCode"] = !item.lastError ? null
    : safeErrors.find(code => code === item.lastError) ?? "REDACTED_ERROR_PRESENT"
  const futureAttempt = Boolean(item.nextAttemptAt && item.nextAttemptAt > now)
  let nextAction: AlertProcessingDiagnostic["nextAction"] = "REVIEW_PROCESSING"
  if (item.status === "PROCESSED" || item.status === "IGNORED") nextAction = "NONE"
  else if (item.status === "DEAD_LETTER" || lastErrorCode === "PAYLOAD_SUMMARY_REDACTION_REQUIRED" || lastErrorCode === "REDACTED_ERROR_PRESENT") nextAction = "ESCALATE"
  else if (item.status === "PROCESSING" && futureAttempt) nextAction = "WAIT"
  else if (item.status === "FAILED" && futureAttempt) nextAction = "SCHEDULED_RETRY"
  else if (item.status === "RECEIVED") nextAction = "WAIT"
  return {
    state: item.status, attempts: item.attempts, nextAttemptAt: item.nextAttemptAt?.toISOString() ?? null,
    processedAt: item.processedAt?.toISOString() ?? null,
    ageMinutes: Math.max(0, Math.floor((now.getTime() - item.createdAt.getTime()) / 60000)),
    lastErrorCode, nextAction,
  }
}
