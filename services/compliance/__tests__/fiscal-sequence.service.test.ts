import {
  FiscalDocumentType,
  FiscalSequenceStatus,
  Prisma,
} from "@prisma/client"

import { ConflictError } from "@/services/_shared/action-errors"

import { allocateFiscalSequenceNumber } from "../fiscal-document.service"

function createTx() {
  return {
    fiscalSequence: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  }
}

const sequence = {
  id: "sequence-1",
  organizationId: "org-1",
  countryCode: "CM",
  documentType: FiscalDocumentType.POS_RECEIPT,
  fiscalYear: "2026",
  fiscalPeriodKey: "ANNUAL",
  scopeKey: "POS:branch-1:terminal-1",
  prefix: "CM-",
  status: FiscalSequenceStatus.ACTIVE,
  nextNumber: 7,
  lastIssuedNumber: 6,
}

describe("fiscal legal sequence allocation", () => {
  it("allocates a tenant-scoped number through a serializable compare-and-swap transition", async () => {
    const tx = createTx()
    const dbLike = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    }
    tx.fiscalSequence.upsert.mockResolvedValue(sequence)
    tx.fiscalSequence.updateMany.mockResolvedValue({ count: 1 })
    tx.fiscalSequence.findFirstOrThrow.mockResolvedValue({
      ...sequence,
      nextNumber: 8,
      lastIssuedNumber: 7,
    })

    const result = await allocateFiscalSequenceNumber(
      {
        organizationId: "org-1",
        countryCode: "CM",
        documentType: FiscalDocumentType.POS_RECEIPT,
        fiscalYear: "2026",
        scopeKey: "POS:branch-1:terminal-1",
        prefix: "CM-",
        actorId: "user-1",
      },
      dbLike as never,
    )

    expect(result.issuedNumber).toBe(7)
    expect(result.legalNumber).toBe("CM-00000007")
    expect(dbLike.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    expect(tx.fiscalSequence.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: FiscalSequenceStatus.ACTIVE,
          nextNumber: 7,
        }),
      }),
    )
  })

  it("retries one serialization conflict before allocating", async () => {
    const tx = createTx()
    const dbLike = {
      $transaction: jest
        .fn()
        .mockRejectedValueOnce({ code: "P2034" })
        .mockImplementationOnce(async (callback) => callback(tx)),
    }
    tx.fiscalSequence.upsert.mockResolvedValue(sequence)
    tx.fiscalSequence.updateMany.mockResolvedValue({ count: 1 })
    tx.fiscalSequence.findFirstOrThrow.mockResolvedValue({
      ...sequence,
      nextNumber: 8,
      lastIssuedNumber: 7,
    })

    await expect(
      allocateFiscalSequenceNumber(
        {
          organizationId: "org-1",
          countryCode: "CM",
          documentType: FiscalDocumentType.POS_RECEIPT,
          fiscalYear: "2026",
        },
        dbLike as never,
      ),
    ).resolves.toMatchObject({ issuedNumber: 7 })

    expect(dbLike.$transaction).toHaveBeenCalledTimes(2)
  })

  it("fails closed when an enclosing transaction loses the sequence transition", async () => {
    const tx = createTx()
    tx.fiscalSequence.upsert.mockResolvedValue(sequence)
    tx.fiscalSequence.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      allocateFiscalSequenceNumber(
        {
          organizationId: "org-1",
          countryCode: "CM",
          documentType: FiscalDocumentType.POS_RECEIPT,
          fiscalYear: "2026",
        },
        tx as never,
      ),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })
})
