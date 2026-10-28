import { Prisma } from "@prisma/client"

import {
  ensurePostedCustomerReceivableDocumentInTx,
} from "../customer-receivable-document.service"
import {
  assessCustomerReceivableBackfillReadiness,
  backfillCustomerReceivableDocuments,
} from "../customer-receivable-backfill.service"

jest.mock("../customer-receivable-document.service", () => ({
  CUSTOMER_RECEIVABLE_REFERENCE_TYPE: "CUSTOMER_RECEIVABLE_DOCUMENT",
  ensurePostedCustomerReceivableDocumentInTx: jest.fn(),
  receivableJson: (value: Record<string, unknown>) => value,
}))

const mockEnsurePostedReceivable = jest.mocked(
  ensurePostedCustomerReceivableDocumentInTx,
)

function readinessClient(input: {
  legacy?: number
  unlinked?: number
  missingState?: number
  hashes?: Array<{
    documentHash: string
    sourceEvidenceHash: string
    metadataHash: string
  }>
}) {
  return {
    customerLedgerEntry: {
      count: jest.fn().mockResolvedValue(input.legacy ?? 0),
    },
    customerSettlementAllocation: {
      count: jest.fn().mockResolvedValue(input.unlinked ?? 0),
    },
    customerReceivableDocument: {
      count: jest.fn().mockResolvedValue(input.missingState ?? 0),
      findMany: jest.fn().mockResolvedValue(input.hashes ?? []),
    },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEnsurePostedReceivable.mockResolvedValue({
    document: {
      id: "document-1",
      documentHash: "a".repeat(64),
    },
    state: { id: "state-1" },
    replayed: false,
  } as never)
})

describe("customer receivable legacy backfill", () => {
  it("classifies every unresolved release blocker deterministically", async () => {
    const client = readinessClient({
      legacy: 2,
      unlinked: 1,
      missingState: 1,
      hashes: [
        {
          documentHash: "not-a-hash",
          sourceEvidenceHash: "b".repeat(64),
          metadataHash: "c".repeat(64),
        },
      ],
    })

    const result = await assessCustomerReceivableBackfillReadiness(
      "org-1",
      client as never,
    )

    expect(result).toEqual({
      status: "blocked",
      legacySalesOrderLedgerReferences: 2,
      unlinkedSettlementAllocations: 1,
      documentsMissingInitialState: 1,
      malformedDocumentHashes: 1,
      blockers: [
        "legacy_sales_order_ledger_references",
        "unlinked_settlement_allocations",
        "documents_missing_initial_state",
        "malformed_document_hashes",
      ],
    })
  })

  it("reports ready only after reference, allocation, state, and hash evidence are complete", async () => {
    const client = readinessClient({
      hashes: [
        {
          documentHash: "a".repeat(64),
          sourceEvidenceHash: "b".repeat(64),
          metadataHash: "c".repeat(64),
        },
      ],
    })

    await expect(
      assessCustomerReceivableBackfillReadiness("org-1", client as never),
    ).resolves.toMatchObject({
      status: "ready",
      blockers: [],
    })
  })

  it("serializably posts documents, relinks all ledger rows, links allocations, and audits lineage", async () => {
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: "actor-1" }),
      },
      customerLedgerEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            referenceId: "sale-1",
            customerId: "customer-1",
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      customerSettlementAllocation: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }
    const ready = readinessClient({
      hashes: [
        {
          documentHash: "a".repeat(64),
          sourceEvidenceHash: "b".repeat(64),
          metadataHash: "c".repeat(64),
        },
      ],
    })
    const client = {
      ...ready,
      $transaction: jest.fn(
        async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
      ),
    }

    const result = await backfillCustomerReceivableDocuments(
      {
        organizationId: "org-1",
        actorId: "actor-1",
        limit: 25,
      },
      client as never,
    )

    expect(client.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    expect(mockEnsurePostedReceivable).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        organizationId: "org-1",
        customerId: "customer-1",
        salesOrderId: "sale-1",
        actorId: "actor-1",
        metadata: expect.objectContaining({ backfill: true }),
      }),
    )
    expect(tx.customerLedgerEntry.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        customerId: "customer-1",
        referenceType: "SALES_ORDER",
        referenceId: "sale-1",
      },
      data: {
        referenceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        referenceId: "document-1",
      },
    })
    expect(tx.customerSettlementAllocation.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        salesOrderId: "sale-1",
        customerReceivableDocumentId: null,
      },
      data: { customerReceivableDocumentId: "document-1" },
    })
    expect(result).toEqual({
      processed: [
        {
          salesOrderId: "sale-1",
          customerReceivableDocumentId: "document-1",
        },
      ],
      readiness: expect.objectContaining({ status: "ready" }),
    })
  })
})
