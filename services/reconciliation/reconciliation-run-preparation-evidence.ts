import { retainedReconciliationSignatureInTx } from "./reconciliation-retained-signature"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { ConflictError, ForbiddenError } from "@/services/_shared/action-errors"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"

export const preparationJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
export const preparationHash = (value: unknown) => suspenseEvidenceHash(preparationJson(value))

// The pointer is excluded to avoid a circular digest; all other run/setup fields remain bound.
export function preparedRunHash(run: { metadata: unknown }) {
  const metadata = { ...suspenseMetadata(run.metadata) }
  delete metadata.preparationReceiptId
  return preparationHash({ ...run, metadata })
}
const digest = z.string().regex(/^sha256:[a-f0-9]{64}$/)
const receiptSchema = z.object({
  kind: z.literal("RECONCILIATION_RUN_PREPARED_V1"), organizationId: z.string().min(1), runId: z.string().min(1),
  preparedById: z.string().min(1), preparedAt: z.string().datetime(), reason: z.string().min(5).max(2000),
  requestHash: digest, reviewedRevision: digest, afterRunHash: digest,
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/), beforeRun: z.record(z.unknown()),
}).strict()

export async function loadRunPreparationReceiptInTx(tx: Prisma.TransactionClient, organizationId: string, runId: string, receiptId: string) {
  const row = await tx.paymentReconciliationInboxItem.findFirst({ where: {
    id: receiptId, organizationId, externalId: runId, source: "RECONCILIATION_RUN", status: "PROCESSED",
  } })
  const parsed = receiptSchema.safeParse(row?.payloadSummary)
  if (!row || !parsed.success || row.payloadHash !== preparationHash(row.payloadSummary).slice(7)
    || !row.idempotencyKey.startsWith("reconciliation-run-preparation:") || parsed.data.organizationId !== organizationId || parsed.data.runId !== runId
    || row.processedAt?.toISOString() !== parsed.data.preparedAt) throw new ConflictError("Run preparation evidence requires review.")
  const audit = await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceType: "ReconciliationRun", resourceId: runId,
    actorId: parsed.data.preparedById, action: "RECONCILIATION_RUN_PREPARE", metadata: { path: ["receiptId"], equals: row.id } } })
  if (!audit) throw new ConflictError("The retained run preparation audit is missing.")
  return { row, data: parsed.data }
}

const additionalReceiptSchema = z.object({
  kind: z.literal("RECONCILIATION_ADDITIONAL_SOURCES_V1"), organizationId: z.string().min(1), runId: z.string().min(1),
  actorId: z.string().min(1), incorporatedAt: z.string().datetime(), reason: z.string().min(5).max(2000),
  requestHash: digest, reviewedRevision: digest, beforeRun: z.record(z.unknown()),
}).passthrough()

export async function loadAdditionalSourcesReceiptInTx(tx: Prisma.TransactionClient, organizationId: string, runId: string, receiptId: string) {
  const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id: receiptId, organizationId,
    externalId: runId, source: "RECONCILIATION_RUN", status: "PROCESSED" } })
  const parsed = additionalReceiptSchema.safeParse(row?.payloadSummary)
  if (!row || !parsed.success || parsed.data.organizationId !== organizationId || parsed.data.runId !== runId
    || !row.idempotencyKey.startsWith("reconciliation-additional-sources:") || row.payloadHash !== preparationHash(row.payloadSummary).slice(7)
    || row.processedAt?.toISOString() !== parsed.data.incorporatedAt
    || !await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceType: "ReconciliationRun", resourceId: runId,
      actorId: parsed.data.actorId, action: "RECONCILIATION_ADDITIONAL_SOURCES", metadata: { path: ["receiptId"], equals: row.id } } }))
    throw new ConflictError("Additional-source history requires review.")
  if (parsed.data.beforeRun.status === "SIGNED") await retainedReconciliationSignatureInTx(tx, organizationId, parsed.data.beforeRun)
  return { row, data: parsed.data }
}

export async function assertCurrentRunPreparationInTx(tx: Prisma.TransactionClient,
  run: { id: string; organizationId: string; metadata: unknown }, sourceHash: string, signerId: string) {
  let addition = suspenseMetadata(run.metadata).additionalSourcesReceiptId
  const visited = new Set<string>()
  while (addition !== undefined) {
    if (typeof addition !== "string" || !addition || visited.has(addition)) throw new ConflictError("Additional-source history requires review.")
    visited.add(addition)
    const { data: evidence } = await loadAdditionalSourcesReceiptInTx(tx, run.organizationId, run.id, addition)
    if (evidence.actorId === signerId) throw new ForbiddenError("An independent signer must review the additional sources.")
    const before = suspenseMetadata(evidence.beforeRun)
    addition = suspenseMetadata(before.metadata).additionalSourcesReceiptId
  }
  const pointer = suspenseMetadata(run.metadata).preparationReceiptId
  if (pointer === undefined && suspenseMetadata(run.metadata).additionalSourcesReceiptId === undefined) return // Original zero-exception runs already support direct independent sign-off.
  if (typeof pointer !== "string" || !pointer.trim()) throw new ConflictError("Run preparation reference requires review.")
  const { data } = await loadRunPreparationReceiptInTx(tx, run.organizationId, run.id, pointer)
  if (data.preparedById === signerId) throw new ForbiddenError("An independent signer must review the prepared run.")
  if (data.afterRunHash !== preparedRunHash(run) || data.sourceHash !== sourceHash)
    throw new ConflictError("Run evidence or setup changed after preparation. Review and prepare the run again.")
}
