import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { ConflictError } from "@/services/_shared/action-errors"
import { suspenseEvidenceHash, suspenseMetadata } from "./payment-suspense-evidence"

const id = z.string().min(1)
const signedRunSchema = z.object({
  id, organizationId: id, status: z.literal("SIGNED"), runById: id, signedById: id,
  signedAt: z.coerce.date(), businessDate: z.coerce.date(), periodStart: z.coerce.date(), periodEnd: z.coerce.date(),
  providerAccountId: id, paymentRailId: id, accountingPeriodId: id,
  certificateHash: z.string().regex(/^[a-f0-9]{64}$/), certificatePayload: z.record(z.unknown()), metadata: z.unknown(),
  voidedAt: z.coerce.date().nullable().optional(),
}).passthrough()

// This verifies a historical signature envelope and its audit. It intentionally
// does not assert that later-arriving evidence was covered by that signature.
export async function retainedReconciliationSignatureInTx(tx: Prisma.TransactionClient, organizationId: string, value: unknown, now = new Date()) {
  const parsed = signedRunSchema.safeParse(value)
  const invalid = () => new ConflictError("The retained reconciliation signature requires review before reopening.")
  if (!parsed.success) throw invalid()
  const run = parsed.data, payload = run.certificatePayload, metadata = suspenseMetadata(run.metadata)
  if (run.organizationId !== organizationId || run.runById === run.signedById || run.voidedAt || run.signedAt > now
    || suspenseEvidenceHash(payload).slice(7) !== run.certificateHash || ![2, 3].includes(payload.version as number) || payload.mode !== "DURABLE_EVIDENCE_KERNEL"
    || payload.organizationId !== organizationId || payload.runId !== run.id || payload.providerAccountId !== run.providerAccountId
    || payload.paymentRailId !== run.paymentRailId || payload.accountingPeriodId !== run.accountingPeriodId
    || payload.businessDate !== run.businessDate.toISOString() || payload.periodStart !== run.periodStart.toISOString() || payload.periodEnd !== run.periodEnd.toISOString()
    || payload.signedById !== run.signedById || payload.signedAt !== run.signedAt.toISOString()
    || typeof payload.sourceVersionHash !== "string" || !/^sha256:[a-f0-9]{64}$/.test(payload.sourceVersionHash)
    || metadata.signedSourceVersionHash !== payload.sourceVersionHash || metadata.immutableAfterSignoff !== true)
    throw invalid()
  if (!await tx.ledgerAuditEvent.findFirst({ where: { organizationId, resourceType: "ReconciliationRun", resourceId: run.id,
    actorId: run.signedById, action: "PAYMENT_RECONCILIATION_RUN_SIGN", metadata: { path: ["certificateHash"], equals: run.certificateHash } }, select: { id: true } }))
    throw invalid()
  return { hash: run.certificateHash, signedById: run.signedById, signedAt: run.signedAt.toISOString() }
}
