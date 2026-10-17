import "server-only"
import { Prisma } from "@prisma/client"
import { ConflictError } from "@/services/_shared/action-errors"
import { lockCloseAssessmentOrderInTx, readCloseAssessmentOrderInTx } from "./close-assessment-order.service"

export type CloseSourceRevision = { version: 1; revision: string }
export function savedCloseSourceRevision(metadata: unknown): CloseSourceRevision | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  const value = (metadata as Record<string, unknown>).sourceRevision
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  return row.version === 1 && typeof row.revision === "string" && /^(0|[1-9][0-9]*)$/.test(row.revision)
    ? { version: 1, revision: row.revision } : null
}

/** Take after the period assessment lock, before the run lock. A source writer
 * holds this same row until its source change and invalidation commit together.
 * Read Committed is mandatory: waiting must refresh the publication snapshot.
 */
export async function lockCloseSourceRevisionInTx(tx: Prisma.TransactionClient, organizationId: string): Promise<CloseSourceRevision> {
  const isolation = await tx.$queryRaw<Array<{ level: string }>>(Prisma.sql`SELECT current_setting('transaction_isolation') AS level`)
  if (isolation[0]?.level !== "read committed") throw new ConflictError("Close publication requires a fresh Read Committed source revision.")
  await tx.$executeRaw(Prisma.sql`INSERT INTO close_source_revisions ("organizationId", revision, "updatedAt") VALUES (${organizationId}, 0, clock_timestamp()) ON CONFLICT ("organizationId") DO NOTHING`)
  const rows = await tx.$queryRaw<Array<{ revision: bigint }>>(Prisma.sql`SELECT revision FROM close_source_revisions WHERE "organizationId" = ${organizationId} FOR UPDATE`)
  if (rows.length !== 1) throw new ConflictError("Close source revision is unavailable.")
  return { version: 1, revision: String(rows[0].revision) }
}

export function closeSourceRevisionMatches(metadata: unknown, current: CloseSourceRevision) {
  return savedCloseSourceRevision(metadata)?.revision === current.revision
}

export async function guardCloseAssessmentPublicationInTx(tx: Prisma.TransactionClient, input: {
  organizationId: string; periodId: string; runId: string; sourceRevision: CloseSourceRevision
}) {
  await lockCloseAssessmentOrderInTx(tx, input.organizationId, input.periodId)
  const current = await lockCloseSourceRevisionInTx(tx, input.organizationId)
  const order = await readCloseAssessmentOrderInTx(tx, input.organizationId, input.periodId)
  if (current.revision === input.sourceRevision.revision && !order.ambiguous && order.latest?.id === input.runId) return true
  // Never replace a typed source invalidation already retained by a writer.
  await tx.closeRun.updateMany({ where: { id: input.runId, organizationId: input.organizationId, status: "RUNNING" }, data: {
    status: "BLOCKED", completedAt: new Date(), metadata: { sourceRevision: input.sourceRevision,
      staleState: { status: "EVIDENCE_STALE", sourceCode: current.revision !== input.sourceRevision.revision ? "CLOSE_SOURCE_REVISION_CHANGED" : "CLOSE_ASSESSMENT_SUPERSEDED",
        staleReason: "Sources or the current assessment changed during collection. Run a new assessment." } },
  } })
  return false
}
