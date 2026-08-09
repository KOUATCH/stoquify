import {
  CustomerReceivableDocumentStatus,
  Prisma,
} from "@prisma/client"

import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  appendCustomerReceivableLifecycleStateInTx,
} from "../customer-receivable-lifecycle.service"

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
  markBusinessEventAppliedInTx: jest.fn(),
}))

const mockHashBusinessPayload = jest.mocked(hashBusinessPayload)
const mockRecordBusinessEventInTx = jest.mocked(recordBusinessEventInTx)
const mockMarkBusinessEventAppliedInTx = jest.mocked(
  markBusinessEventAppliedInTx,
)

function decimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value)
}

function lifecycleHarness(options: {
  replay?: Record<string, unknown> | null
  latestStatus?: CustomerReceivableDocumentStatus
} = {}) {
  const latestState = {
    id: "state-1",
    organizationId: "org-1",
    documentId: "document-1",
    version: 1,
    status:
      options.latestStatus ?? CustomerReceivableDocumentStatus.ISSUED,
    paidAmount: decimal("0.00"),
    unpaidAmount: decimal("100.00"),
    stateHash: "a".repeat(64),
    createdAt: new Date("2026-08-08T09:00:00.000Z"),
  }
  const findFirst = jest
    .fn()
    .mockResolvedValueOnce(options.replay ?? null)
    .mockResolvedValueOnce(latestState)
  const tx = {
    customerReceivableDocument: {
      findFirst: jest.fn().mockResolvedValue({
        id: "document-1",
        organizationId: "org-1",
        documentNumber: "AR-SO-001",
        totalAmount: decimal("100.00"),
        documentHash: "b".repeat(64),
      }),
    },
    customerReceivableDocumentState: {
      findFirst,
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: "state-2",
        ...data,
      })),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
  }
  return { tx, latestState }
}

const BASE_INPUT = {
  organizationId: "org-1",
  documentId: "document-1",
  actorId: "actor-1",
  status: CustomerReceivableDocumentStatus.PARTIALLY_PAID,
  paidAmount: "40.00",
  unpaidAmount: "60.00",
  effectiveAt: new Date("2026-08-08T10:00:00.000Z"),
  sourceType: "CUSTOMER_SETTLEMENT",
  sourceId: "allocation-1",
  evidenceHash: "c".repeat(64),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHashBusinessPayload.mockReturnValue("d".repeat(64))
  mockRecordBusinessEventInTx.mockResolvedValue({
    event: { id: "event-2" },
    created: true,
  } as never)
  mockMarkBusinessEventAppliedInTx.mockResolvedValue({
    id: "event-2",
  } as never)
})

describe("appendCustomerReceivableLifecycleStateInTx", () => {
  it("appends a conserved hash-chained state and linked event without mutating prior evidence", async () => {
    const { tx, latestState } = lifecycleHarness()

    const result = await appendCustomerReceivableLifecycleStateInTx(
      tx as never,
      BASE_INPUT,
    )

    expect(result.replayed).toBe(false)
    expect(mockHashBusinessPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "document-1",
        version: 2,
        previousStateHash: latestState.stateHash,
        documentHash: "b".repeat(64),
        evidenceHash: "c".repeat(64),
      }),
    )
    expect(mockRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "customer.receivable.lifecycle.changed",
        sourceType: "CUSTOMER_RECEIVABLE_DOCUMENT",
        sourceId: "document-1",
        documentHash: "b".repeat(64),
      }),
    )
    const stateData =
      tx.customerReceivableDocumentState.create.mock.calls[0][0].data
    expect(stateData).toMatchObject({
      version: 2,
      status: CustomerReceivableDocumentStatus.PARTIALLY_PAID,
      previousStateHash: "a".repeat(64),
      stateHash: "d".repeat(64),
      businessEventId: "event-2",
      evidenceHash: "c".repeat(64),
    })
    expect(stateData.paidAmount.eq("40.00")).toBe(true)
    expect(stateData.unpaidAmount.eq("60.00")).toBe(true)
    expect(mockMarkBusinessEventAppliedInTx).toHaveBeenCalledWith(
      tx,
      "org-1",
      "event-2",
    )
  })

  it("returns exact source replay without appending duplicate evidence", async () => {
    const replay = {
      id: "state-replay",
      status: CustomerReceivableDocumentStatus.PARTIALLY_PAID,
      paidAmount: decimal("40.00"),
      unpaidAmount: decimal("60.00"),
    }
    const { tx } = lifecycleHarness({ replay })

    const result = await appendCustomerReceivableLifecycleStateInTx(
      tx as never,
      BASE_INPUT,
    )

    expect(result).toEqual({ state: replay, replayed: true })
    expect(tx.customerReceivableDocument.findFirst).not.toHaveBeenCalled()
    expect(tx.customerReceivableDocumentState.create).not.toHaveBeenCalled()
    expect(mockRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects terminal-state transitions before writing new evidence", async () => {
    const { tx } = lifecycleHarness({
      latestStatus: CustomerReceivableDocumentStatus.VOIDED,
    })

    await expect(
      appendCustomerReceivableLifecycleStateInTx(tx as never, BASE_INPUT),
    ).rejects.toThrow("cannot transition from VOIDED")
    expect(tx.customerReceivableDocumentState.create).not.toHaveBeenCalled()
  })

  it("requires a bounded reason for cancellation and void lineage", async () => {
    const { tx } = lifecycleHarness()

    await expect(
      appendCustomerReceivableLifecycleStateInTx(tx as never, {
        ...BASE_INPUT,
        status: CustomerReceivableDocumentStatus.CANCELLED,
        paidAmount: "0.00",
        unpaidAmount: "0.00",
        reason: " ",
      }),
    ).rejects.toThrow(
      "Cancelled or voided receivables require a bounded reason",
    )
    expect(tx.customerReceivableDocumentState.findFirst).not.toHaveBeenCalled()
  })

  it("rejects non-terminal monetary states that do not conserve the document total", async () => {
    const { tx } = lifecycleHarness()

    await expect(
      appendCustomerReceivableLifecycleStateInTx(tx as never, {
        ...BASE_INPUT,
        paidAmount: "40.00",
        unpaidAmount: "59.99",
      }),
    ).rejects.toThrow(
      "paid and unpaid amounts must conserve the document total",
    )
    expect(tx.customerReceivableDocumentState.create).not.toHaveBeenCalled()
  })
})
