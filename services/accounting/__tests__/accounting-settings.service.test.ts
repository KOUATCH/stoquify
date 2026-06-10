jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

import { db } from "@/prisma/db"
import {
  markAccountingSetupReady,
  REQUIRED_ACCOUNTING_MAPPINGS,
  REQUIRED_DEFAULT_JOURNAL_TYPES,
  REQUIRED_READY_POSTING_PURPOSES,
} from "../accounting-settings.service"

const mockTx = {
  chartOfAccount: { findMany: jest.fn() },
  journal: { findMany: jest.fn() },
  accountingPeriod: { findMany: jest.fn() },
  postingRule: { findMany: jest.fn() },
  organizationAccountingSettings: { upsert: jest.fn() },
  ledgerAuditEvent: { create: jest.fn() },
}

const mockDb = db as unknown as { $transaction: jest.Mock }

function readyMappedAccounts() {
  return REQUIRED_ACCOUNTING_MAPPINGS.map((mapping, index) => ({
    id: `acct-${index}`,
    code: `${index + 1}00`,
    mappingKey: mapping.key,
    type: mapping.type,
    normalBalance: mapping.normalBalance,
    syscohadaClass: mapping.syscohadaClass,
    syscohadaReference: `${mapping.syscohadaClass}${index}`,
    _count: { children: 0 },
  }))
}

function readyPostingRules() {
  return REQUIRED_READY_POSTING_PURPOSES.map((postingPurpose) => ({
    postingPurpose,
    lines: [
      { id: `${postingPurpose}-debit`, accountId: null, mappingKey: "CASH_ON_HAND" },
      { id: `${postingPurpose}-credit`, accountId: null, mappingKey: "SALES_REVENUE" },
    ],
  }))
}

describe("accounting setup readiness gates", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockTx.chartOfAccount.findMany.mockResolvedValue(readyMappedAccounts())
    mockTx.journal.findMany.mockResolvedValue(
      REQUIRED_DEFAULT_JOURNAL_TYPES.map((type) => ({ type, code: type.slice(0, 2) })),
    )
    mockTx.accountingPeriod.findMany.mockResolvedValue([{ id: "period-1", name: "June 2026" }])
    mockTx.postingRule.findMany.mockResolvedValue(readyPostingRules())
    mockTx.organizationAccountingSettings.upsert.mockResolvedValue({
      id: "settings-1",
      organizationId: "org-1",
      accountingEnabled: true,
      setupStatus: "READY",
    })
    mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
  })

  it("rejects readiness when required account mappings are missing", async () => {
    mockTx.chartOfAccount.findMany.mockResolvedValue([])

    await expect(markAccountingSetupReady("org-1", "user-1")).rejects.toThrow(/missing active cash on hand mapping/i)
    expect(mockTx.organizationAccountingSettings.upsert).not.toHaveBeenCalled()
  })

  it("marks setup ready only after mappings, journals, periods, and posting rules exist", async () => {
    const result = await markAccountingSetupReady("org-1", "user-1")

    expect(result).toMatchObject({ accountingEnabled: true, setupStatus: "READY" })
    expect(mockTx.organizationAccountingSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          accountingEnabled: true,
          setupStatus: "READY",
          setupCompletedById: "user-1",
        }),
      }),
    )
    expect(mockTx.ledgerAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_SETUP_READY",
          metadata: expect.objectContaining({
            requiredMappings: expect.arrayContaining(["CASH_ON_HAND", "BANK"]),
          }),
        }),
      }),
    )
  })
})
