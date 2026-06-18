jest.mock("@/prisma/db", () => ({
  db: {
    organizationAccountingSettings: { findUnique: jest.fn() },
    chartOfAccount: { findMany: jest.fn() },
    journal: { findMany: jest.fn() },
    postingRule: { findMany: jest.fn() },
    accountingPeriod: { findMany: jest.fn() },
    ledgerAuditEvent: { findMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
  },
}))

import {
  AccountingSourceType,
  PostingRuleAmountSource,
  PostingRuleLineSide,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  REQUIRED_ACCOUNTING_MAPPINGS,
  REQUIRED_DEFAULT_JOURNAL_TYPES,
  REQUIRED_READY_POSTING_PURPOSES,
} from "../accounting-settings.service"
import { getAccountingControlCenterData } from "../control-center.service"

const mockDb = db as unknown as {
  organizationAccountingSettings: { findUnique: jest.Mock }
  chartOfAccount: { findMany: jest.Mock }
  journal: { findMany: jest.Mock }
  postingRule: { findMany: jest.Mock }
  accountingPeriod: { findMany: jest.Mock }
  ledgerAuditEvent: { findMany: jest.Mock }
  auditLog: { findMany: jest.Mock }
}

const now = new Date("2026-06-11T12:00:00.000Z")

function readySettings() {
  return {
    id: "settings-1",
    organizationId: "org-1",
    accountingEnabled: false,
    setupStatus: "IN_PROGRESS",
    countryPack: "CM-OHADA",
    baseCurrency: "XAF",
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
    setupCompletedAt: null,
  }
}

function lockedSettings() {
  return {
    ...readySettings(),
    accountingEnabled: true,
    setupStatus: "READY",
    setupCompletedAt: new Date("2026-06-11T10:00:00.000Z"),
  }
}

function readyMappedAccounts() {
  return REQUIRED_ACCOUNTING_MAPPINGS.map((mapping, index) => ({
    id: `acct-${index}`,
    code: `${mapping.syscohadaClass}${String(index).padStart(2, "0")}`,
    nameEn: mapping.label,
    nameFr: mapping.label,
    mappingKey: mapping.key,
    type: mapping.type,
    normalBalance: mapping.normalBalance,
    syscohadaClass: mapping.syscohadaClass,
    syscohadaReference: `${mapping.syscohadaClass}-${mapping.key}`,
    isActive: true,
    _count: { children: 0 },
  }))
}

function readyDefaultJournals() {
  return REQUIRED_DEFAULT_JOURNAL_TYPES.map((type, index) => ({
    id: `journal-${index}`,
    code: type.slice(0, 3),
    nameEn: `${type} journal`,
    nameFr: `${type} journal`,
    type,
    isDefault: true,
    isActive: true,
    allowManualEntries: true,
  }))
}

function readyPostingRules() {
  return REQUIRED_READY_POSTING_PURPOSES.map((postingPurpose, index) => ({
    id: `rule-${index}`,
    code: `RULE-${postingPurpose}`,
    nameEn: `${postingPurpose} rule`,
    nameFr: `${postingPurpose} rule`,
    sourceType: AccountingSourceType.MANUAL,
    postingPurpose,
    isActive: true,
    priority: 10,
    effectiveFrom: null,
    effectiveTo: null,
    lines: [
      {
        id: `${postingPurpose}-debit`,
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        accountId: null,
        mappingKey: "CASH_ON_HAND",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
      },
      {
        id: `${postingPurpose}-credit`,
        lineNumber: 2,
        side: PostingRuleLineSide.CREDIT,
        accountId: null,
        mappingKey: "SALES_REVENUE",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
      },
    ],
  }))
}

function readyPeriods() {
  return [
    {
      id: "period-1",
      name: "June 2026",
      status: "OPEN",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T23:59:59.999Z"),
      fiscalYear: { name: "FY 2026" },
    },
  ]
}

describe("accounting control center read model", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue(readySettings())
    mockDb.chartOfAccount.findMany.mockResolvedValue(readyMappedAccounts())
    mockDb.journal.findMany.mockResolvedValue(readyDefaultJournals())
    mockDb.postingRule.findMany.mockResolvedValue(readyPostingRules())
    mockDb.accountingPeriod.findMany.mockResolvedValue(readyPeriods())
    mockDb.ledgerAuditEvent.findMany.mockResolvedValue([
      {
        id: "ledger-event-1",
        action: "ACCOUNTING_SETUP_READY",
        actorId: "user-1",
        resourceType: "OrganizationAccountingSettings",
        resourceId: "org-1",
        message: "Accounting setup marked ready",
        createdAt: new Date("2026-06-11T10:00:00.000Z"),
      },
    ])
    mockDb.auditLog.findMany.mockResolvedValue([
      {
        id: "control-event-1",
        entityType: "AccountingSetup",
        entityId: "org-1",
        action: "ACCOUNTING_SETUP_LOCK_CONTROL",
        userId: "user-1",
        changes: {
          allowed: true,
          riskTier: "critical",
          reasonCode: "ALLOWED",
        },
        createdAt: new Date("2026-06-11T09:59:59.000Z"),
      },
    ])
  })

  it("reports ready-to-lock when setup gates and control permission pass", async () => {
    const result = await getAccountingControlCenterData(
      "org-1",
      { actorPermissions: ["accounting.setup.manage"] },
      now,
    )

    expect(result.status).toBe("ready_to_lock")
    expect(result.summary.blockerCount).toBe(0)
    expect(result.setupLock.canLock).toBe(true)
    expect(result.summary.mappingReadyCount).toBe(REQUIRED_ACCOUNTING_MAPPINGS.length)
    expect(result.summary.postingRuleReadyCount).toBe(REQUIRED_READY_POSTING_PURPOSES.length)
    expect(result.controlEvents.latest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ledger-event-1",
          source: "ledger",
          category: "accounting",
        }),
        expect.objectContaining({
          id: "control-event-1",
          source: "control",
          status: "allowed",
          riskTier: "critical",
        }),
      ]),
    )
  })

  it("reports locked/setup-ready state without enabling another setup lock", async () => {
    mockDb.organizationAccountingSettings.findUnique.mockResolvedValue(lockedSettings())

    const result = await getAccountingControlCenterData(
      "org-1",
      { actorPermissions: ["accounting.setup.manage"] },
      now,
    )

    expect(result.status).toBe("ready")
    expect(result.settings.accountingEnabled).toBe(true)
    expect(result.setupLock.locked).toBe(true)
    expect(result.setupLock.canLock).toBe(false)
    expect(result.setupLock.disabledReasonEn).toMatch(/already marked ready/i)
  })

  it("classifies missing setup-lock permission as a permission blocker", async () => {
    mockDb.auditLog.findMany.mockResolvedValue([
      {
        id: "control-denied-1",
        entityType: "AccountingSetup",
        entityId: "org-1",
        action: "ACCOUNTING_SETUP_LOCK_CONTROL_DENIED",
        userId: "user-1",
        changes: {
          allowed: false,
          riskTier: "critical",
          reasonCode: "MISSING_PERMISSION",
        },
        createdAt: new Date("2026-06-11T09:59:59.000Z"),
      },
    ])

    const result = await getAccountingControlCenterData("org-1", { actorPermissions: [] }, now)

    expect(result.status).toBe("blocked")
    expect(result.setupLock.canLock).toBe(false)
    expect(result.controlEvents.deniedControlEventCount).toBe(1)
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "permission",
          id: "permission-setup-lock-missing",
        }),
      ]),
    )
  })

  it("classifies invalid SYSCOHADA mapping evidence as regulatory blockers", async () => {
    const accounts = readyMappedAccounts()
    accounts[0].syscohadaReference = ""
    mockDb.chartOfAccount.findMany.mockResolvedValue(accounts)

    const result = await getAccountingControlCenterData(
      "org-1",
      { actorPermissions: ["accounting.setup.manage"] },
      now,
    )

    expect(result.status).toBe("blocked")
    expect(result.accountMappings[0].blockerCategories).toContain("regulatory")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "regulatory",
        }),
      ]),
    )
  })
})
