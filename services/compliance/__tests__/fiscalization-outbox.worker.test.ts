jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    businessEventOutbox: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    salesOrder: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("../country-pack-hooks", () => ({
  resolveEInvoicingMetadata: jest.fn(),
}))

jest.mock("../fiscal-document.service", () => ({
  createFiscalDocumentFromPostedSource: jest.fn(),
}))

import { BusinessOutboxStatus, Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { RegulatoryPackError } from "@/services/regulatory/country-packs/validation"

import { resolveEInvoicingMetadata } from "../country-pack-hooks"
import {
  claimFiscalizationRequests,
  processFiscalizationRequest,
  sourceFingerprint,
} from "../fiscalization-outbox.service"

const mockDb = db as unknown as {
  businessEventOutbox: {
    findMany: jest.Mock
    findFirst: jest.Mock
    updateMany: jest.Mock
  }
  salesOrder: {
    findFirst: jest.Mock
  }
}
const mockResolveEInvoicingMetadata = resolveEInvoicingMetadata as jest.Mock

function requestPayload() {
  const issueAt = "2026-07-26T10:00:00.000Z"
  return {
    organizationId: "org-1",
    salesOrderId: "sale-1",
    orderNumber: "POS-001",
    actorId: "user-1",
    locationId: "location-1",
    terminalId: "terminal-1",
    postingBatchId: "batch-1",
    issueAt,
    sourcePayloadHash: sourceFingerprint({
      salesOrderId: "sale-1",
      orderNumber: "POS-001",
      total: new Prisma.Decimal("119.25"),
      postingBatchId: "batch-1",
      issueAt,
    }),
  }
}

describe("fiscalization outbox worker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("claims only requests whose compare-and-set lease succeeds", async () => {
    mockDb.businessEventOutbox.findMany.mockResolvedValue([
      { id: "request-1" },
      { id: "request-2" },
    ])
    mockDb.businessEventOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })

    await expect(
      claimFiscalizationRequests({
        organizationId: "org-1",
        workerId: "worker-1",
        now: new Date("2026-07-26T10:05:00.000Z"),
      }),
    ).resolves.toEqual(["request-1"])

    expect(mockDb.businessEventOutbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          channel: "FISCALIZATION",
        }),
      }),
    )
  })

  it("moves a claimed request to deferred without consuming a sale when the pack is pending", async () => {
    const payload = requestPayload()
    mockDb.businessEventOutbox.findFirst.mockResolvedValue({
      id: "request-1",
      organizationId: "org-1",
      payload,
      attempts: 1,
      maxAttempts: 10,
    })
    mockDb.salesOrder.findFirst.mockResolvedValue({
      id: "sale-1",
      orderNumber: "POS-001",
      subtotal: new Prisma.Decimal("100"),
      taxAmount: new Prisma.Decimal("19.25"),
      discount: new Prisma.Decimal("0"),
      total: new Prisma.Decimal("119.25"),
      organization: { country: "CM", currency: "XAF" },
      lines: [],
    })
    mockResolveEInvoicingMetadata.mockImplementation(() => {
      throw new RegulatoryPackError(
        "PACK_NOT_PUBLISHED",
        "Country pack awaits expert approval.",
      )
    })
    mockDb.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })

    await expect(
      processFiscalizationRequest({
        requestId: "request-1",
        workerId: "worker-1",
        now: new Date("2026-07-26T10:05:00.000Z"),
      }),
    ).resolves.toEqual({
      requestId: "request-1",
      status: "DEFERRED",
    })

    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "request-1",
          status: BusinessOutboxStatus.LOCKED,
          lockedBy: "worker-1",
        }),
        data: expect.objectContaining({
          status: "DEFERRED",
          lastErrorCode: "COUNTRY_PACK_PENDING",
        }),
      }),
    )
  })

  it("fails a request whose tenant payload does not match the outbox tenant", async () => {
    mockDb.businessEventOutbox.findFirst.mockResolvedValue({
      id: "request-1",
      organizationId: "org-1",
      payload: {
        ...requestPayload(),
        organizationId: "org-2",
      },
      attempts: 1,
      maxAttempts: 10,
    })
    mockDb.businessEventOutbox.updateMany.mockResolvedValue({ count: 1 })

    await expect(
      processFiscalizationRequest({
        requestId: "request-1",
        workerId: "worker-1",
      }),
    ).rejects.toThrow(/tenant/i)

    expect(mockDb.salesOrder.findFirst).not.toHaveBeenCalled()
    expect(mockDb.businessEventOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BusinessOutboxStatus.FAILED,
        }),
      }),
    )
  })
})
