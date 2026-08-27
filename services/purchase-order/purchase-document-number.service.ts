import type { Prisma } from "@prisma/client"

import { BusinessRuleError } from "@/services/_shared/action-errors"

export const PURCHASE_DOCUMENT_TYPE = {
  PURCHASE_ORDER: "PURCHASE_ORDER",
  GOODS_RECEIPT: "GOODS_RECEIPT",
  PURCHASE_RETURN: "PURCHASE_RETURN",
} as const

type PurchaseDocumentType = typeof PURCHASE_DOCUMENT_TYPE[keyof typeof PURCHASE_DOCUMENT_TYPE]

const DOCUMENT_PREFIX: Record<PurchaseDocumentType, string> = {
  PURCHASE_ORDER: "PO",
  GOODS_RECEIPT: "GR",
  PURCHASE_RETURN: "PR",
}

export async function allocatePurchaseDocumentNumber(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string
    documentType: PurchaseDocumentType
    scopeKey?: string
  },
): Promise<string> {
  const scopeKey = input.scopeKey ?? "GLOBAL"
  const sequence = await tx.documentSequence.upsert({
    where: {
      organizationId_documentType_scopeKey: {
        organizationId: input.organizationId,
        documentType: input.documentType,
        scopeKey,
      },
    },
    create: {
      organizationId: input.organizationId,
      documentType: input.documentType,
      scopeKey,
      nextValue: 2,
    },
    update: {
      nextValue: { increment: 1 },
    },
    select: {
      nextValue: true,
    },
  })

  const issuedValue = sequence.nextValue - 1
  if (!Number.isSafeInteger(issuedValue) || issuedValue < 1) {
    throw new BusinessRuleError("Purchase document sequence returned an invalid value.")
  }

  return `${DOCUMENT_PREFIX[input.documentType]}-${String(issuedValue).padStart(6, "0")}`
}
