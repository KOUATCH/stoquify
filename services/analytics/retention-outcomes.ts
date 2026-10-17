import type { BusinessEvent, POSCommitResult } from "@prisma/client"

export const RETENTION_OUTCOME_VERSION = "pos-outcome-v1" as const

// Scalar allowlists: never copy event payloads, commit envelopes or actor identities.
export type RetentionCommit = Pick<POSCommitResult,
  "id" | "organizationId" | "locationId" | "salesOrderId" | "status" | "committedAt" | "createdAt">
export type RetentionCorrection = Pick<BusinessEvent,
  "id" | "organizationId" | "locationId" | "sourceId" | "sourceType" | "eventType" |
  "eventSource" | "schemaVersion" | "status" | "occurredAt" | "recordedAt">
export type OutcomeWindow = { organizationId: string; start: Date; endExclusive: Date; asOf: Date; locationId?: string }
export type RetentionOutcome = {
  version: typeof RETENTION_OUTCOME_VERSION
  organizationId: string
  operationId: string
  sourceRecordId: string
  locationId: string
  outcome: "COMPLETED" | "REVERSED"
  correction: "REFUND" | "VOID" | null
  occurredAt: string
  recordedAt: string
  role: "UNKNOWN"
  traffic: "UNKNOWN"
  evidenceQuality: "DURABLE_COMMIT" | "DURABLE_CORRECTION"
}

const validDate = (value: unknown): value is Date => value instanceof Date && Number.isFinite(value.getTime())
export function validateOutcomeWindow(scope: OutcomeWindow) {
  if (!scope.organizationId.trim() || (scope.locationId !== undefined && !scope.locationId.trim()) ||
      !validDate(scope.start) || !validDate(scope.endExclusive) || !validDate(scope.asOf) ||
      scope.start >= scope.endExclusive || scope.endExclusive > scope.asOf ||
      scope.endExclusive.getTime() - scope.start.getTime() > 31 * 86_400_000) {
    throw new Error("Choose an elapsed outcome window of at most 31 days.")
  }
}

/** Replayable read-side projection, never called by financial writers. A receipt
 * failure leaves COMMITTED financially final; COMPLETED is not a second sale.
 * Corrections retain original history and are not a net-revenue calculation. */
export function projectRetentionOutcomes(scope: OutcomeWindow, commits: readonly RetentionCommit[], corrections: readonly RetentionCorrection[]) {
  validateOutcomeWindow(scope)
  const diagnostics = { duplicates: 0, unfinalized: 0, invalid: 0, conflictingOperations: 0 }
  const completed = new Map<string, RetentionOutcome>()
  const reversed = new Map<string, RetentionOutcome>()
  const conflicts = new Set<string>()
  const correctionConflicts = new Set<string>()
  const inWindow = (date: Date) => date >= scope.start && date < scope.endExclusive
  function assertScope(row: { organizationId: string; locationId: string | null }) {
    if (row.organizationId !== scope.organizationId || (scope.locationId && row.locationId !== scope.locationId)) {
      throw new Error("Outcome source is outside the authorized scope.")
    }
  }
  for (const row of commits) {
    assertScope(row)
    if (row.status !== "COMMITTED" && row.status !== "COMPLETED") { diagnostics.unfinalized++; continue }
    if (!row.id || !row.salesOrderId || !row.locationId || !validDate(row.committedAt) || !validDate(row.createdAt)) {
      diagnostics.invalid++; continue
    }
    if (!inWindow(row.committedAt) || row.createdAt > scope.asOf) continue
    const value: RetentionOutcome = {
      version: RETENTION_OUTCOME_VERSION, organizationId: scope.organizationId,
      operationId: row.salesOrderId, sourceRecordId: row.id, locationId: row.locationId,
      outcome: "COMPLETED", correction: null, occurredAt: row.committedAt.toISOString(), recordedAt: row.createdAt.toISOString(),
      role: "UNKNOWN", traffic: "UNKNOWN", evidenceQuality: "DURABLE_COMMIT",
    }
    const previous = completed.get(row.salesOrderId)
    if (previous) {
      diagnostics.duplicates++
      if (previous.locationId !== value.locationId || previous.occurredAt !== value.occurredAt) conflicts.add(row.salesOrderId)
      // Deterministic even when a replay supplies equivalent rows out of order.
      if (value.sourceRecordId < previous.sourceRecordId) completed.set(row.salesOrderId, value)
    } else completed.set(row.salesOrderId, value)
  }
  for (const row of corrections) {
    assertScope(row)
    const kind = row.eventType === "pos.refund.issued" && row.sourceType === "POS_REFUND" ? "REFUND"
      : row.eventType === "pos.sale.voided" && row.sourceType === "POS_VOID" ? "VOID" : null
    if (!kind || row.eventSource !== "POS" || row.schemaVersion !== 1 || !["RECORDED", "APPLIED"].includes(row.status) ||
        !row.id || !row.sourceId || !row.locationId || !validDate(row.occurredAt) || !validDate(row.recordedAt)) {
      diagnostics.invalid++; continue
    }
    if (!inWindow(row.occurredAt) || row.recordedAt > scope.asOf) continue
    const value: RetentionOutcome = {
      version: RETENTION_OUTCOME_VERSION, organizationId: scope.organizationId,
      operationId: row.sourceId, sourceRecordId: row.id, locationId: row.locationId,
      outcome: "REVERSED", correction: kind, occurredAt: row.occurredAt.toISOString(), recordedAt: row.recordedAt.toISOString(),
      role: "UNKNOWN", traffic: "UNKNOWN", evidenceQuality: "DURABLE_CORRECTION",
    }
    const previous = reversed.get(row.id)
    if (previous) {
      diagnostics.duplicates++
      if (JSON.stringify(previous) !== JSON.stringify(value)) correctionConflicts.add(row.id)
    } else reversed.set(row.id, value)
  }
  for (const id of conflicts) completed.delete(id)
  for (const id of correctionConflicts) reversed.delete(id)
  diagnostics.conflictingOperations = conflicts.size + correctionConflicts.size
  const outcomes = [...completed.values(), ...reversed.values()].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt) || a.sourceRecordId.localeCompare(b.sourceRecordId))
  return {
    version: RETENTION_OUTCOME_VERSION, organizationId: scope.organizationId,
    start: scope.start.toISOString(), endExclusive: scope.endExclusive.toISOString(), asOf: scope.asOf.toISOString(),
    outcomes, completedOperations: completed.size, correctionEvents: reversed.size, diagnostics,
    // No persisted historical role or demo/job provenance exists on these sources.
    humanAdoption: { state: "UNKNOWN" as const, eligibleCompletedOperations: null, unclassifiedCompletedOperations: completed.size },
    coverage: "SOURCE_ROWS_ONLY" as const,
  }
}
