jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    chartOfAccount: {
      findFirst: jest.fn(),
    },
  },
}))

import { db } from "@/prisma/db"
import { updateChartAccount } from "../accounts.service"

const mockTx = {
  chartOfAccount: {
    update: jest.fn(),
  },
  ledgerAuditEvent: {
    create: jest.fn(),
  },
}

const mockDb = db as unknown as {
  $transaction: jest.Mock
  chartOfAccount: { findFirst: jest.Mock }
}

const usedAccount = {
  id: "acct-1",
  code: "571",
  type: "ASSET",
  normalBalance: "DEBIT",
  parentId: null,
  isControlAccount: false,
  mappingKey: "CASH_ON_HAND",
  syscohadaClass: "5",
  syscohadaReference: "571",
  currency: "XAF",
  _count: { journalLines: 2 },
}

describe("chart account immutability", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockDb.chartOfAccount.findFirst.mockResolvedValue(usedAccount)
    mockTx.chartOfAccount.update.mockResolvedValue({ ...usedAccount, nameEn: "Cash desk" })
    mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
  })

  it("locks structural fields after journal activity exists", async () => {
    await expect(updateChartAccount("org-1", "acct-1", { code: "572" }, "user-1")).rejects.toThrow(
      /cannot change structural fields/i,
    )
    expect(mockTx.chartOfAccount.update).not.toHaveBeenCalled()
  })

  it("still allows descriptive updates after journal activity exists", async () => {
    const result = await updateChartAccount("org-1", "acct-1", { nameEn: "Cash desk" }, "user-1")

    expect(result).toMatchObject({ nameEn: "Cash desk" })
    expect(mockTx.chartOfAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nameEn: "Cash desk" }),
      }),
    )
  })
})
