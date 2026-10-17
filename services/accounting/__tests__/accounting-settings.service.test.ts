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
  REQUIRED_READY_POSTING_SOURCES,
} from "../accounting-settings.service"

const mockTx = {
  chartOfAccount: { findMany: jest.fn() },
  journal: { findMany: jest.fn() },
  accountingPeriod: { findMany: jest.fn() },
  postingRule: { findMany: jest.fn() },
  organizationAccountingSettings: { upsert: jest.fn() },
  ledgerAuditEvent: { create: jest.fn() },
  auditLog: { create: jest.fn() },
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
    isActive: true,
    _count: { children: 0 },
  }))
}

function readyPostingRules() {
  return REQUIRED_READY_POSTING_PURPOSES.map((postingPurpose) => ({
    id: `rule-${postingPurpose}`,
    code: `RULE-${postingPurpose}`,
    sourceType: REQUIRED_READY_POSTING_SOURCES[postingPurpose],
    postingPurpose,
    lines: [
      { id: `${postingPurpose}-debit`, side: "DEBIT", accountId: null, mappingKey: "CASH_ON_HAND" },
      { id: `${postingPurpose}-credit`, side: "CREDIT", accountId: null, mappingKey: "SALES_REVENUE" },
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
    mockTx.auditLog.create.mockResolvedValue({ id: "control-audit-1" })
  })

  it("rejects readiness when required account mappings are missing", async () => {
    mockTx.chartOfAccount.findMany.mockResolvedValue([])

    await expect(markAccountingSetupReady("org-1", "user-1")).rejects.toThrow(/missing active cash on hand mapping/i)
    expect(mockTx.organizationAccountingSettings.upsert).not.toHaveBeenCalled()
  })

  it("marks setup ready only after mappings, journals, periods, and posting rules exist", async () => {
    const result = await markAccountingSetupReady("org-1", "user-1", {
      actorPermissions: ["accounting.setup.manage"],
      lastAuthAt: Date.now(),
    })

    expect(result).toMatchObject({ accountingEnabled: true, setupStatus: "READY" })
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "AccountingSetup",
          entityId: "org-1",
          action: "ACCOUNTING_SETUP_LOCK_CONTROL",
          userId: "user-1",
        }),
      }),
    )
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

  it("audits and blocks setup lock without required control permission", async () => {
    await expect(markAccountingSetupReady("org-1", "user-1")).rejects.toThrow(/not allowed/i)

    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ACCOUNTING_SETUP_LOCK_CONTROL_DENIED",
          changes: expect.objectContaining({
            reasonCode: "MISSING_PERMISSION",
            allowed: false,
          }),
        }),
      }),
    )
    expect(mockTx.organizationAccountingSettings.upsert).not.toHaveBeenCalled()
  })

  it.each(["DEBIT", "CREDIT"])("does not mark setup ready when a required rule contains only %s lines", async (side) => {
    const rules = readyPostingRules()
    rules[0].lines = rules[0].lines.map((line) => ({ ...line, side }))
    mockTx.postingRule.findMany.mockResolvedValue(rules)
    await expect(markAccountingSetupReady("org-1", "user-1", {
      actorPermissions: ["accounting.setup.manage"], lastAuthAt: Date.now(),
    })).rejects.toThrow(/must include both debit and credit lines/)
    expect(mockTx.organizationAccountingSettings.upsert).not.toHaveBeenCalled()
    expect(mockTx.ledgerAuditEvent.create).not.toHaveBeenCalled()
  })

  it("does not use a valid fallback when the selected rule is invalid", async () => {
    const rules = readyPostingRules()
    mockTx.postingRule.findMany.mockResolvedValue([
      { ...rules[0], code: "SELECTED-BAD", lines: rules[0].lines.map((line) => ({ ...line, mappingKey: "UNMAPPED" })) },
      ...rules,
    ])
    await expect(markAccountingSetupReady("org-1", "user-1", { actorPermissions: ["accounting.setup.manage"], lastAuthAt: Date.now() }))
      .rejects.toThrow(/SELECTED-BAD.*does not resolve/)
    expect(mockTx.organizationAccountingSettings.upsert).not.toHaveBeenCalled()
  })
})
