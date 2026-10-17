import { projectAlertProcessing } from "../reconciliation-alert-processing"
const now = new Date("2026-10-04T10:00:00Z")
const item = { status: "PROCESSING" as const, attempts: 2, nextAttemptAt: new Date("2026-10-04T10:01:00Z"), processedAt: null, createdAt: new Date("2026-10-04T09:00:00Z"), lastError: null }

it("distinguishes a live processing lease from an expired lease needing review", () => {
  expect(projectAlertProcessing(item, now)).toMatchObject({ nextAction: "WAIT", ageMinutes: 60, attempts: 2 })
  expect(projectAlertProcessing({ ...item, nextAttemptAt: now }, now).nextAction).toBe("REVIEW_PROCESSING")
})
it("distinguishes a scheduled retry from an eligible time for operator review", () => {
  expect(projectAlertProcessing({ ...item, status: "FAILED" }, now).nextAction).toBe("SCHEDULED_RETRY")
  expect(projectAlertProcessing({ ...item, status: "FAILED", nextAttemptAt: null }, now).nextAction).toBe("REVIEW_PROCESSING")
})
it("requires escalation for dead letters and payload redaction failures", () => {
  expect(projectAlertProcessing({ ...item, status: "DEAD_LETTER" }, now).nextAction).toBe("ESCALATE")
  expect(projectAlertProcessing({ ...item, lastError: "PAYLOAD_SUMMARY_REDACTION_REQUIRED" }, now).nextAction).toBe("ESCALATE")
})
it("does not expose arbitrary stored errors even if they look like uppercase error codes", () => {
  const result = projectAlertProcessing({ ...item, lastError: "SECRET_CUSTOMER_TOKEN_123", leaseToken: "private", leasedBy: "private-worker", payloadSummary: { secret: true } } as typeof item, now)
  expect(result.lastErrorCode).toBe("REDACTED_ERROR_PRESENT")
  expect(JSON.stringify(result)).not.toMatch(/SECRET_CUSTOMER|private|leaseToken|payloadSummary|leasedBy/)
})
it("does not interpret processed or ignored alerts as payment settlement", () => {
  expect(projectAlertProcessing({ ...item, status: "PROCESSED", processedAt: now }, now)).toMatchObject({ nextAction: "NONE", processedAt: now.toISOString() })
  expect(projectAlertProcessing({ ...item, status: "IGNORED" }, now).nextAction).toBe("NONE")
})
