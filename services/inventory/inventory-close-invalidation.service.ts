import type { Prisma } from "@prisma/client"

import { recordCloseCertificationInvalidationsForSourceInTx } from "@/services/accounting/close-assurance-pack.service"

type InventoryValuationCloseInvalidationInput = {
  organizationId: string
  sourceId?: string | null
  periodId?: string | null
  occurredAt: Date
  actorId?: string | null
  documentHash?: string | null
  correlationId?: string | null
}

export async function recordInventoryValuationCloseInvalidationInTx(
  tx: Prisma.TransactionClient,
  input: InventoryValuationCloseInvalidationInput,
) {
  return recordCloseCertificationInvalidationsForSourceInTx(tx, input.organizationId, {
    sourceCode: "INVENTORY_VALUATION_WRITE",
    sourceId: input.sourceId ?? null,
    periodId: input.periodId ?? null,
    periodStart: input.occurredAt,
    periodEnd: input.occurredAt,
    staleReason: "Inventory valuation write changed certified close evidence.",
    newEvidenceHash: input.documentHash ?? null,
    correlationId: input.correlationId ?? null,
  }, {
    actorId: input.actorId ?? null,
  })
}