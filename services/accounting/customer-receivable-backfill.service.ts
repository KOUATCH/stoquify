import { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  NotFoundError,
} from "@/services/_shared/action-errors"

import {
  CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
  ensurePostedCustomerReceivableDocumentInTx,
  receivableJson,
} from "./customer-receivable-document.service"

type ReceivableClient = typeof db

export type CustomerReceivableBackfillInput = {
  organizationId: string
  actorId: string
  limit?: number
}

export type CustomerReceivableBackfillReadiness = {
  status: "ready" | "blocked"
  legacySalesOrderLedgerReferences: number
  unlinkedSettlementAllocations: number
  documentsMissingInitialState: number
  malformedDocumentHashes: number
  blockers: string[]
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

function isSha256(value: string | null | undefined) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value)
}

export async function assessCustomerReceivableBackfillReadiness(
  organizationIdInput: string,
  client: ReceivableClient = db,
): Promise<CustomerReceivableBackfillReadiness> {
  const organizationId = requiredText(organizationIdInput, "Organization")
  const [
    legacySalesOrderLedgerReferences,
    unlinkedSettlementAllocations,
    documentsMissingInitialState,
    documents,
  ] = await Promise.all([
    client.customerLedgerEntry.count({
      where: { organizationId, referenceType: "SALES_ORDER" },
    }),
    client.customerSettlementAllocation.count({
      where: { organizationId, customerReceivableDocumentId: null },
    }),
    client.customerReceivableDocument.count({
      where: {
        organizationId,
        lifecycleStates: { none: {} },
      },
    }),
    client.customerReceivableDocument.findMany({
      where: { organizationId },
      select: {
        documentHash: true,
        sourceEvidenceHash: true,
        metadataHash: true,
      },
    }),
  ])

  const malformedDocumentHashes = documents.filter(
    (document) =>
      !isSha256(document.documentHash) ||
      !isSha256(document.sourceEvidenceHash) ||
      !isSha256(document.metadataHash),
  ).length
  const blockers: string[] = []
  if (legacySalesOrderLedgerReferences > 0) {
    blockers.push("legacy_sales_order_ledger_references")
  }
  if (unlinkedSettlementAllocations > 0) {
    blockers.push("unlinked_settlement_allocations")
  }
  if (documentsMissingInitialState > 0) {
    blockers.push("documents_missing_initial_state")
  }
  if (malformedDocumentHashes > 0) {
    blockers.push("malformed_document_hashes")
  }

  return {
    status: blockers.length === 0 ? "ready" : "blocked",
    legacySalesOrderLedgerReferences,
    unlinkedSettlementAllocations,
    documentsMissingInitialState,
    malformedDocumentHashes,
    blockers,
  }
}

export async function backfillCustomerReceivableDocuments(
  input: CustomerReceivableBackfillInput,
  client: ReceivableClient = db,
) {
  const organizationId = requiredText(input.organizationId, "Organization")
  const actorId = requiredText(input.actorId, "Actor")
  const limit = Math.max(1, Math.min(input.limit ?? 100, 500))

  const result = await client.$transaction(
    async (tx) => {
      const actor = await tx.user.findFirst({
        where: { id: actorId, organizationId, isActive: true },
        select: { id: true },
      })
      if (!actor) {
        throw new NotFoundError("Active receivable backfill actor not found")
      }

      const legacyEntries = await tx.customerLedgerEntry.findMany({
        where: {
          organizationId,
          referenceType: "SALES_ORDER",
          referenceId: { not: null },
        },
        select: { referenceId: true, customerId: true },
        orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        distinct: ["referenceId"],
        take: limit,
      })
      const processed: Array<{
        salesOrderId: string
        customerReceivableDocumentId: string
      }> = []

      for (const entry of legacyEntries) {
        if (!entry.referenceId) continue
        const ensured = await ensurePostedCustomerReceivableDocumentInTx(tx, {
          organizationId,
          customerId: entry.customerId,
          salesOrderId: entry.referenceId,
          actorId: actor.id,
          metadata: {
            backfill: true,
            migration:
              "20260809100000_customer_receivable_document_foundation",
          },
        })
        await tx.customerLedgerEntry.updateMany({
          where: {
            organizationId,
            customerId: entry.customerId,
            referenceType: "SALES_ORDER",
            referenceId: entry.referenceId,
          },
          data: {
            referenceType: CUSTOMER_RECEIVABLE_REFERENCE_TYPE,
            referenceId: ensured.document.id,
          },
        })
        await tx.customerSettlementAllocation.updateMany({
          where: {
            organizationId,
            salesOrderId: entry.referenceId,
            customerReceivableDocumentId: null,
          },
          data: {
            customerReceivableDocumentId: ensured.document.id,
          },
        })
        await tx.auditLog.create({
          data: {
            organizationId,
            entityType: "CustomerReceivableDocument",
            entityId: ensured.document.id,
            action: "CUSTOMER_RECEIVABLE_LEGACY_SOURCE_LINKED",
            userId: actor.id,
            changes: receivableJson({
              after: {
                salesOrderId: entry.referenceId,
                customerReceivableDocumentId: ensured.document.id,
                documentHash: ensured.document.documentHash,
              },
            }),
          },
        })
        processed.push({
          salesOrderId: entry.referenceId,
          customerReceivableDocumentId: ensured.document.id,
        })
      }
      return { processed }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )

  const readiness = await assessCustomerReceivableBackfillReadiness(
    organizationId,
    client,
  )
  return { ...result, readiness }
}
