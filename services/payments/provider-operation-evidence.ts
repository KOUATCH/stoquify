import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { createHash } from "node:crypto"
import { ConflictError } from "@/services/_shared/action-errors"

export const providerOperationIntentSchema = z.object({
  kind: z.literal("PROVIDER_STATEMENT_REVIEW_INTENT_V1"), organizationId: z.string().min(1), actorId: z.string().min(1),
  providerAccountId: z.string().min(1), businessDate: z.string().datetime(), providerCode: z.string().min(1),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/), fileName: z.string().max(255).nullable(), idempotencyKey: z.string().uuid(),
}).strict()
export const providerOperationHash = (value: unknown) => createHash("sha256").update(JSON.stringify(providerOperationIntentSchema.parse(value))).digest("hex")
export async function loadProviderOperationIntent(tx: Prisma.TransactionClient, organizationId: string, id: string) {
  const row = await tx.paymentReconciliationInboxItem.findFirst({ where: { id, organizationId, source: "RECONCILIATION_RUN", status: "PROCESSED" } })
  const parsed = providerOperationIntentSchema.safeParse(row?.payloadSummary)
  if (!row || !parsed.success || parsed.data.organizationId !== organizationId || row.providerAccountId !== parsed.data.providerAccountId
    || row.payloadHash !== providerOperationHash(parsed.data) || row.idempotencyKey !== "provider-statement-review:" + parsed.data.idempotencyKey)
    throw new ConflictError("The retained provider operation requires review.")
  return { row, intent: parsed.data }
}
