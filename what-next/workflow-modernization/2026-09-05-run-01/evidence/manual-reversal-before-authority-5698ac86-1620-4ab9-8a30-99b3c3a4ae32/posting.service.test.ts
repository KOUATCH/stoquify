import { AccountingSourceType, Prisma } from "@prisma/client"

import { postJournalEntry, reverseJournalEntry } from "../posting.service"
import { assertModuleNewWorkInTx } from "@/services/modules/module-admission.service"
import { evaluateModuleAccessInTx, evaluateModuleEntitlement } from "@/services/modules/module-entitlement.service"
import type { TenantModuleEntitlement } from "@/services/modules/module-control-contracts"
import {
  lockJournalReversalCatalogInTx,
  lockJournalReversalClosePeriodsInTx,
} from "../journal-reversal-order.service"
import {
  lockJournalPostingCatalogInTx,
  lockJournalPostingClosePeriodsInTx,
} from "../journal-posting-order.service"

jest.mock("../journal-reversal-order.service", () => ({
  lockJournalReversalCatalogInTx: jest.fn(),
  lockJournalReversalClosePeriodsInTx: jest.fn(),
}))
jest.mock("../journal-posting-order.service", () => ({
  lockJournalPostingCatalogInTx: jest.fn(),
  lockJournalPostingClosePeriodsInTx: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  ...jest.requireActual("@/services/modules/module-entitlement.service"),
  evaluateModuleAccessInTx: jest.fn(),
}))

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

import { db } from "@/prisma/db"

const mockTx = {
  paymentReconciliationInboxItem: { findFirst: jest.fn().mockResolvedValue(null) },
  $queryRaw: jest.fn(),
  chartOfAccount: {
    findMany: jest.fn(),
  },
  journalEntry: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  ledgerPostingBatch: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  accountingSourceLink: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  ledgerAuditEvent: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  accountingPeriod: {
    findFirst: jest.fn(),
  },
  businessEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  closeRun: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  closePackExport: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockLockCatalog = jest.mocked(lockJournalReversalCatalogInTx)
const mockLockClosePeriods = jest.mocked(lockJournalReversalClosePeriodsInTx)
const mockLockPostingCatalog = jest.mocked(lockJournalPostingCatalogInTx)
const mockLockPostingClosePeriods = jest.mocked(lockJournalPostingClosePeriodsInTx)
const mockModuleAccess = jest.mocked(evaluateModuleAccessInTx)

const writableAccounting: TenantModuleEntitlement = {
  moduleSlug: "accounting", status: "active", source: "manual_override",
  startsAt: null, endsAt: null, readOnly: false, trial: false,
}

const openPeriod = {
  id: "period-1",
  organizationId: "org-1",
  name: "June 2026",
  startDate: new Date("2026-06-01T00:00:00.000Z"),
  endDate: new Date("2026-06-30T23:59:59.999Z"),
  status: "OPEN",
}

function arrangeCertifiedCloseTarget() {
  mockTx.closeRun.findMany.mockResolvedValue([{ id: "close-run-1", packExports: [{ id: "close-pack-export-1" }] }])
  mockTx.closeRun.findFirst.mockResolvedValue({
    id: "close-run-1",
    organizationId: "org-1",
    status: "CERTIFIED",
    metadata: null,
  })
  mockTx.closePackExport.findFirst.mockResolvedValue({ id: "close-pack-export-1", metadata: { mode: "CERTIFIED" } })
}

function arrangeManualReversal(syscohadaClass = "5", isActive = true) {
  const original = {
    id: "manual-1", organizationId: "org-1", sourceType: AccountingSourceType.MANUAL,
    status: "POSTED", journalId: "journal-1", periodId: openPeriod.id, period: openPeriod,
    entryDate: new Date("2026-06-09T12:00:00.000Z"), entryNumber: "JE-MANUAL-1",
    postedById: "maker", currency: "XAF", reversedByEntries: [],
    lines: [
      { accountId: "cash", account: { syscohadaClass, isActive }, debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF", exchangeRate: new Prisma.Decimal(1), baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0) },
      { accountId: "sales", account: { syscohadaClass: "7", isActive: true }, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), currency: "XAF", exchangeRate: new Prisma.Decimal(1), baseDebit: new Prisma.Decimal(0), baseCredit: new Prisma.Decimal(100) },
    ],
  }
  mockTx.journalEntry.findFirst.mockResolvedValue(original)
  mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  mockTx.ledgerPostingBatch.create.mockResolvedValue({ id: "batch-manual" })
  mockTx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-manual", status: "POSTED" })
  return original
}

function arrangeManualPosting(syscohadaClass = "5") {
  const draft = {
    id: "draft-1", organizationId: "org-1", sourceType: AccountingSourceType.MANUAL,
    status: "DRAFT", periodId: openPeriod.id, period: openPeriod,
    entryDate: new Date("2026-06-09T12:00:00.000Z"), entryNumber: "JE-DRAFT-1",
    createdById: "maker", currency: "XAF",
    lines: [
      { accountId: "cash", account: { syscohadaClass }, debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF", exchangeRate: new Prisma.Decimal(1), baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0) },
      { accountId: "sales", account: { syscohadaClass: "7" }, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), currency: "XAF", exchangeRate: new Prisma.Decimal(1), baseDebit: new Prisma.Decimal(0), baseCredit: new Prisma.Decimal(100) },
    ],
  }
  mockTx.journalEntry.findFirst.mockResolvedValue(draft)
  mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
  mockTx.ledgerPostingBatch.create.mockResolvedValue({ id: "batch-draft" })
  mockTx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-draft", status: "POSTED" })
  mockTx.journalEntry.update.mockResolvedValue({ ...draft, status: "POSTED" })
  return draft
}

function expectNoPostingEffects() {
  expect(mockTx.ledgerPostingBatch.findFirst).not.toHaveBeenCalled()
  expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  expect(mockTx.ledgerPostingBatch.update).not.toHaveBeenCalled()
  expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
  expect(mockTx.accountingSourceLink.create).not.toHaveBeenCalled()
  expect(mockTx.ledgerAuditEvent.create).not.toHaveBeenCalled()
  expect(mockTx.businessEvent.create).not.toHaveBeenCalled()
  expect(mockTx.closeRun.update).not.toHaveBeenCalled()
  expect(mockTx.closePackExport.update).not.toHaveBeenCalled()
}

const postableAccounts = [
  {
    id: "cash",
    code: "571",
    organizationId: "org-1",
    isActive: true,
    currency: "XAF",
    _count: { children: 0 },
  },
  {
    id: "sales",
    code: "701",
    organizationId: "org-1",
    isActive: true,
    currency: "XAF",
    _count: { children: 0 },
  },
]

describe("posting service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLockCatalog.mockReset().mockResolvedValue(undefined)
    mockLockClosePeriods.mockReset().mockResolvedValue([openPeriod.id])
    mockLockPostingCatalog.mockReset().mockResolvedValue(undefined)
    mockLockPostingClosePeriods.mockReset().mockResolvedValue([openPeriod.id])
    mockModuleAccess.mockReset().mockImplementation(async (_tx, input) => evaluateModuleEntitlement({
      ...input, requestedModules: ["accounting"],
    }))
    mockTx.paymentReconciliationInboxItem.findFirst.mockResolvedValue(null)
    mockTx.$queryRaw.mockImplementation(async (query: { sql: string } | TemplateStringsArray) => {
      const sql = "sql" in query ? query.sql : query.join("")
      return sql.includes("accounting_periods") ? [openPeriod] : sql.includes('"organizations"') ? [{ id: "org-1" }] : [{ newWorkStoppedModules: ["accounting"], newWorkStoppedAt: { accounting: "2026-09-05T12:00:00.000Z" } }]
    })
    mockDb.$transaction.mockImplementation(async (handler: (tx: typeof mockTx) => Promise<unknown>) => handler(mockTx))
    mockTx.chartOfAccount.findMany.mockResolvedValue(postableAccounts)
    mockTx.accountingSourceLink.findFirst.mockResolvedValue(null)
    mockTx.accountingSourceLink.create.mockResolvedValue({ id: "link-1" })
    mockTx.ledgerAuditEvent.create.mockResolvedValue({ id: "audit-1" })
    mockTx.auditLog.create.mockResolvedValue({ id: "control-audit-1" })
    mockTx.accountingPeriod.findFirst.mockResolvedValue(openPeriod)
    mockTx.journalEntry.count.mockResolvedValue(0)
    mockTx.journalEntry.create.mockResolvedValue({ id: "rv-1", entryNumber: "RV-20260610-0001", status: "POSTED" })
    mockTx.businessEvent.findUnique.mockResolvedValue(null)
    mockTx.businessEvent.create.mockImplementation(async (args) => ({
      id: "business-event-1",
      ...args.data,
      outboxMessages: args.data.outboxMessages.create,
    }))
    mockTx.businessEvent.update.mockResolvedValue({ id: "business-event-1", status: "APPLIED" })
    mockTx.closeRun.findMany.mockResolvedValue([])
    mockTx.closeRun.findFirst.mockResolvedValue(null)
    mockTx.closeRun.update.mockResolvedValue({ id: "close-run-1" })
    mockTx.closePackExport.findFirst.mockResolvedValue(null)
    mockTx.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("acquires the catalog boundary before the original journal row and refuses a failed boundary without effects", async () => {
    arrangeManualReversal()
    mockLockCatalog.mockImplementationOnce(async () => {
      expect(mockTx.$queryRaw).not.toHaveBeenCalled()
      expect(mockTx.journalEntry.findFirst).not.toHaveBeenCalled()
      throw new Error("catalog boundary unavailable")
    })
    await expect(reverseJournalEntry("org-1", "manual-1", "reviewer", "correction", new Date(), {
      actorPermissions: ["accounting.journal.reverse"], lastAuthAt: Date.now(),
    })).rejects.toThrow("catalog boundary unavailable")
    expect(mockLockCatalog).toHaveBeenCalledWith(mockTx, "org-1")
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    expect(mockTx.$queryRaw).not.toHaveBeenCalled()
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
  })

  it("awaits the complete period boundary before financial writes and uses that exact scope for invalidation", async () => {
    const original = arrangeManualReversal()
    original.periodId = "original-period"
    original.period = { ...openPeriod, id: original.periodId }
    const reversalDate = new Date("2026-06-10T12:00:00.000Z")
    const affectedPeriodIds = [original.periodId, "overlapping-period", openPeriod.id]
    let release!: (ids: string[]) => void
    let signalEntered!: () => void
    const held = new Promise<string[]>((resolve) => { release = resolve })
    const entered = new Promise<void>((resolve) => { signalEntered = resolve })
    mockLockClosePeriods.mockImplementationOnce(() => {
      signalEntered()
      return held
    })
    const execution = reverseJournalEntry("org-1", "manual-1", "reviewer", "correction", reversalDate, {
      actorPermissions: ["accounting.journal.reverse"], lastAuthAt: Date.now(),
    })
    await entered
    expect(mockLockCatalog.mock.invocationCallOrder[0]).toBeLessThan(mockTx.$queryRaw.mock.invocationCallOrder[0])
    expect(mockTx.$queryRaw.mock.calls.some(([query]) => ("sql" in query ? query.sql : query.join("")).includes("accounting_periods"))).toBe(true)
    expect(mockTx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "JOURNAL_REVERSE_CONTROL" }) })
    expect(mockLockClosePeriods).toHaveBeenCalledWith(mockTx, "org-1", {
      originalPeriodId: original.periodId, reversalPeriodId: openPeriod.id,
      originalEntryDate: original.entryDate, reversalDate, includeLaterPeriods: false,
    })
    expect(mockTx.ledgerPostingBatch.findFirst).not.toHaveBeenCalled()
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    release(affectedPeriodIds)
    await expect(execution).resolves.toMatchObject({ id: "rv-1" })
    expect(mockTx.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organizationId: "org-1", AND: expect.arrayContaining([{ OR: [{ periodId: { in: affectedPeriodIds } }] }]),
    }) }))
    expect(mockTx.closeRun.findMany).toHaveBeenCalledTimes(1)
    expect(mockTx.auditLog.create.mock.calls.filter(([args]) => args.data.action === "JOURNAL_REVERSE_CONTROL")).toHaveLength(1)
  })

  it.each<[string, boolean, boolean]>([
    ["3", true, true],
    ["31", false, true],
    ["5", true, false],
  ])("uses class %s (active %s) to select cumulative inventory evidence: %s", async (syscohadaClass, isActive, includeLaterPeriods) => {
    arrangeManualReversal(syscohadaClass, isActive)
    await reverseJournalEntry("org-1", "manual-1", "reviewer", "correction", new Date("2026-06-10T12:00:00.000Z"), {
      actorPermissions: ["accounting.journal.reverse"], lastAuthAt: Date.now(),
    })
    expect(mockLockClosePeriods).toHaveBeenCalledWith(mockTx, "org-1", expect.objectContaining({ includeLaterPeriods }))
  })

  it.each([
    ["catalog", "injected"], ["periods", "injected"], ["periods", "current"],
  ])("audits expired authentication after the %s wait with the %s clock without financial effects", async (boundary, clockMode) => {
    arrangeManualReversal()
    const wallStart = new Date("2026-10-01T12:00:00Z").getTime()
    const clock = jest.spyOn(Date, "now").mockReturnValue(wallStart)
    const injectedNow = new Date("2026-06-10T12:00:00Z")
    const expire = () => { clock.mockReturnValue(new Date("2026-10-01T12:05:01Z").getTime()) }
    if (boundary === "catalog") mockLockCatalog.mockImplementationOnce(async () => { expire() })
    else mockLockClosePeriods.mockImplementationOnce(async () => { expire(); return [openPeriod.id] })
    await expect(reverseJournalEntry("org-1", "manual-1", "reviewer", "correction", injectedNow, {
      actorPermissions: ["accounting.journal.reverse"],
      lastAuthAt: clockMode === "injected" ? injectedNow : wallStart,
      ...(clockMode === "injected" ? { now: injectedNow } : {}),
    })).rejects.toThrow(/fresh authentication required/i)
    expect(mockTx.auditLog.create.mock.calls.map(([args]) => args.data.action)).toEqual([
      "JOURNAL_REVERSE_CONTROL", "JOURNAL_REVERSE_CONTROL_DENIED",
    ])
    expect(mockTx.auditLog.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ changes: expect.objectContaining({
      allowed: false, reasonCode: "FRESH_AUTH_REQUIRED",
    }) }) })
    expect(mockTx.ledgerPostingBatch.findFirst).not.toHaveBeenCalled()
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
    expect(mockTx.accountingSourceLink.create).not.toHaveBeenCalled()
    expect(mockTx.businessEvent.create).not.toHaveBeenCalled()
    expect(mockTx.closeRun.update).not.toHaveBeenCalled()
  })

  it("advances an injected clock without substituting the wall-clock date for fresh authentication", async () => {
    arrangeManualReversal()
    const wallStart = new Date("2026-10-01T12:00:00Z").getTime()
    const clock = jest.spyOn(Date, "now").mockReturnValue(wallStart)
    const injectedNow = new Date("2026-06-10T12:00:00Z")
    mockLockClosePeriods.mockImplementationOnce(async () => { clock.mockReturnValue(wallStart + 299_000); return [openPeriod.id] })
    await expect(reverseJournalEntry("org-1", "manual-1", "reviewer", "correction", injectedNow, {
      actorPermissions: ["accounting.journal.reverse"], lastAuthAt: injectedNow, now: injectedNow,
    })).resolves.toMatchObject({ id: "rv-1" })
    expect(mockTx.auditLog.create.mock.calls.filter(([args]) => args.data.action === "JOURNAL_REVERSE_CONTROL_DENIED")).toHaveLength(0)
  })

  it("refuses a repeated completed reversal before another batch or Close effect", async () => {
    const original = arrangeManualReversal()
    const control = { actorPermissions: ["accounting.journal.reverse"], lastAuthAt: Date.now() }
    const reversalDate = new Date("2026-06-10T12:00:00.000Z")
    await reverseJournalEntry("org-1", "manual-1", "reviewer", "correction", reversalDate, control)
    mockTx.journalEntry.findFirst.mockResolvedValue({ ...original, status: "REVERSED", reversedByEntries: [{ id: "rv-1" }] })
    await expect(reverseJournalEntry("org-1", "manual-1", "reviewer", "correction", reversalDate, control))
      .rejects.toThrow(/only posted journal entries can be reversed/i)
    expect(mockTx.ledgerPostingBatch.create).toHaveBeenCalledTimes(1)
    expect(mockTx.journalEntry.create).toHaveBeenCalledTimes(1)
    expect(mockTx.journalEntry.update).toHaveBeenCalledTimes(1)
    expect(mockTx.accountingSourceLink.create).toHaveBeenCalledTimes(1)
    expect(mockLockClosePeriods).toHaveBeenCalledTimes(1)
  })

  it("refuses generic reversal of a journal reserved as final suspense clearing evidence", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({ id: "clearing-1", sourceType: "MANUAL", sourceId: "clearing-1", entryNumber: "JE-1", periodId: "period-1", currency: "XAF",
      createdById: "maker-1", postedById: "poster-1", lines: [{ debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" }] })
    mockTx.paymentReconciliationInboxItem.findFirst.mockResolvedValue({ id: "allocation-1" })
    await expect(reverseJournalEntry("org-1", "clearing-1", "reviewer-1", "Reviewed recovery request", new Date(), { actorPermissions: ["accounting.journal.reverse"], lastAuthAt: new Date() }))
      .rejects.toThrow(/source-owned recovery/i)
    expect(mockTx.paymentReconciliationInboxItem.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", source: "SUSPENSE_POST", idempotencyKey: "suspense-resolution-clearing:clearing-1" }, select: { id: true } })
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })

  it("loads batch provenance and refuses generic reversal of a source recovery journal", async () => {
    mockTx.journalEntry.findFirst.mockImplementation(async (args: { include: { postingBatch?: boolean } }) => ({ id: "recovery-1", sourceType: "MANUAL", sourceId: "clearing-1", entryNumber: "SR-1", periodId: "period-1", currency: "XAF",
      createdById: "maker-1", postedById: "poster-1", status: "POSTED", lines: [{ debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" }],
      ...(args.include.postingBatch ? { postingBatch: { metadata: { resolutionRecoveryReceiptId: "receipt-1" } } } : {}) }))
    await expect(reverseJournalEntry("org-1", "recovery-1", "reviewer-1", "Reviewed correction request", new Date(), { actorPermissions: ["accounting.journal.reverse"], lastAuthAt: new Date() }))
      .rejects.toThrow(/preserves a suspense recovery/i)
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })

  it("rejects posting anything other than a draft journal entry", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      organizationId: "org-1",
      status: "POSTED",
      period: openPeriod,
      lines: [],
    })

    await expect(postJournalEntry("org-1", "je-1", "user-1")).rejects.toThrow(/only draft/i)
  })

  it("takes accounting catalog locks after module authority and before journal locks, stopping on catalog failure", async () => {
    arrangeManualPosting()
    mockLockPostingCatalog.mockImplementationOnce(async () => {
      expect(mockTx.$queryRaw).not.toHaveBeenCalled()
      expect(mockTx.journalEntry.findFirst).not.toHaveBeenCalled()
      throw new Error("catalog unavailable")
    })
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(),
    })).rejects.toThrow("catalog unavailable")
    expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    expect(mockLockPostingCatalog).toHaveBeenCalledWith(mockTx, "org-1")
    expect(mockModuleAccess.mock.invocationCallOrder[0]).toBeLessThan(mockLockPostingCatalog.mock.invocationCallOrder[0])
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
    expectNoPostingEffects()
  })

  it.each(["POSTED", "REVERSED"])("reads the fresh %s state after waiting for the tenant journal lock", async (status) => {
    const draft = arrangeManualPosting()
    let release!: () => void
    let signalEntered!: () => void
    const held = new Promise<void>((resolve) => { release = resolve })
    const entered = new Promise<void>((resolve) => { signalEntered = resolve })
    mockTx.$queryRaw.mockImplementationOnce(async (query: TemplateStringsArray, ...values: unknown[]) => {
      expect(query.join("")).toContain('FROM journal_entries WHERE id =  AND "organizationId" =  FOR UPDATE')
      expect(values).toEqual([draft.id, "org-1"])
      signalEntered()
      await held
      return [{ id: draft.id }]
    })
    const execution = postJournalEntry("org-1", draft.id, "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(),
    })
    await entered
    expect(mockLockPostingCatalog.mock.invocationCallOrder[0]).toBeLessThan(mockTx.$queryRaw.mock.invocationCallOrder[0])
    expect(mockTx.journalEntry.findFirst).not.toHaveBeenCalled()
    mockTx.journalEntry.findFirst.mockResolvedValue({ ...draft, status })
    release()
    await expect(execution).rejects.toThrow(/only draft/i)
    expect(mockTx.journalEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: draft.id, organizationId: "org-1" } }))
    expect(mockLockPostingClosePeriods).not.toHaveBeenCalled()
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
    expectNoPostingEffects()
  })

  it("waits for the complete posting scope before authority, allow audit or financial effects", async () => {
    const draft = arrangeManualPosting()
    const affectedPeriodIds = ["earlier-period", "later-period", "overlap-period", openPeriod.id]
    let release!: (ids: string[]) => void
    let signalEntered!: () => void
    const held = new Promise<string[]>((resolve) => { release = resolve })
    const entered = new Promise<void>((resolve) => { signalEntered = resolve })
    mockLockPostingClosePeriods.mockImplementationOnce(() => { signalEntered(); return held })
    const assertCurrentAuthority = jest.fn(async () => {
      expect(mockTx.auditLog.create).not.toHaveBeenCalled()
      expectNoPostingEffects()
    })
    const execution = postJournalEntry("org-1", draft.id, "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(), assertCurrentAuthority,
    })
    await entered
    expect(assertCurrentAuthority).not.toHaveBeenCalled()
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
    expectNoPostingEffects()
    release(affectedPeriodIds)
    await expect(execution).resolves.toMatchObject({ id: draft.id, status: "POSTED" })
    expect(assertCurrentAuthority).toHaveBeenCalledTimes(1)
    expect(assertCurrentAuthority.mock.invocationCallOrder[0]).toBeLessThan(mockTx.auditLog.create.mock.invocationCallOrder[0])
    expect(mockTx.auditLog.create.mock.calls.filter(([args]) => args.data.action === "JOURNAL_POST_CONTROL")).toHaveLength(1)
    expect(mockTx.closeRun.findMany).toHaveBeenCalledTimes(1)
    expect(mockTx.closeRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organizationId: "org-1", AND: expect.arrayContaining([{ OR: [{ periodId: { in: affectedPeriodIds } }] }]),
    }) }))
  })

  it("stops before allow audit or effects when the complete period boundary fails", async () => {
    arrangeManualPosting()
    mockLockPostingClosePeriods.mockRejectedValueOnce(new Error("period scope unavailable"))
    const assertCurrentAuthority = jest.fn().mockResolvedValue(undefined)
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(), assertCurrentAuthority,
    })).rejects.toThrow("period scope unavailable")
    expect(assertCurrentAuthority).not.toHaveBeenCalled()
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
    expectNoPostingEffects()
  })

  it("rejects current authority loss after locks before the allow audit or posting writes", async () => {
    arrangeManualPosting()
    const assertCurrentAuthority = jest.fn().mockRejectedValue(new Error("permission revoked"))
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(), assertCurrentAuthority,
    })).rejects.toThrow("permission revoked")
    expect(mockLockPostingClosePeriods.mock.invocationCallOrder[0]).toBeLessThan(assertCurrentAuthority.mock.invocationCallOrder[0])
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
    expectNoPostingEffects()
  })

  it.each([
    ["catalog", "injected"], ["journal", "injected"], ["periods", "injected"],
    ["authority", "injected"], ["periods", "current"],
  ])("preserves only denial audit when authentication expires at the %s boundary using the %s clock", async (boundary, clockMode) => {
    arrangeManualPosting()
    const wallStart = new Date("2026-10-01T12:00:00Z").getTime()
    const clock = jest.spyOn(Date, "now").mockReturnValue(wallStart)
    const injectedNow = new Date("2026-06-10T12:00:00Z")
    const expire = () => { clock.mockReturnValue(wallStart + 301_000) }
    const assertCurrentAuthority = jest.fn(async () => { if (boundary === "authority") expire() })
    if (boundary === "catalog") mockLockPostingCatalog.mockImplementationOnce(async () => { expire() })
    if (boundary === "journal") mockTx.$queryRaw.mockImplementationOnce(async () => { expire(); return [{ id: "draft-1" }] })
    if (boundary === "periods") mockLockPostingClosePeriods.mockImplementationOnce(async () => { expire(); return [openPeriod.id] })
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"],
      lastAuthAt: clockMode === "injected" ? injectedNow : wallStart,
      ...(clockMode === "injected" ? { now: injectedNow } : {}),
      assertCurrentAuthority,
    })).rejects.toThrow(/fresh authentication required/i)
    expect(mockTx.auditLog.create.mock.calls.map(([args]) => args.data.action)).toEqual(["JOURNAL_POST_CONTROL_DENIED"])
    expect(mockTx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ changes: expect.objectContaining({
      allowed: false, reasonCode: "FRESH_AUTH_REQUIRED",
    }) }) })
    if (boundary === "authority") expect(assertCurrentAuthority).toHaveBeenCalledTimes(1)
    else expect(assertCurrentAuthority).not.toHaveBeenCalled()
    expectNoPostingEffects()
  })

  it("advances the injected posting clock by elapsed time without replacing its date", async () => {
    arrangeManualPosting()
    const wallStart = new Date("2026-10-01T12:00:00Z").getTime()
    const clock = jest.spyOn(Date, "now").mockReturnValue(wallStart)
    const injectedNow = new Date("2026-06-10T12:00:00Z")
    mockLockPostingClosePeriods.mockImplementationOnce(async () => { clock.mockReturnValue(wallStart + 299_000); return [openPeriod.id] })
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: injectedNow, now: injectedNow,
    })).resolves.toMatchObject({ id: "draft-1", status: "POSTED" })
    expect(mockTx.auditLog.create.mock.calls.map(([args]) => args.data.action)).toEqual(["JOURNAL_POST_CONTROL"])
  })

  it("does not find or post a journal outside the requested organization", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue(null)
    await expect(postJournalEntry("org-other", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(),
    })).rejects.toThrow("Journal entry not found")
    expect(mockTx.journalEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "draft-1", organizationId: "org-other" } }))
    expectNoPostingEffects()
  })

  it("refuses a duplicate completed post without another batch, link or invalidation", async () => {
    const draft = arrangeManualPosting()
    const control = { actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now() }
    await postJournalEntry("org-1", draft.id, "reviewer", control)
    mockTx.journalEntry.findFirst.mockResolvedValue({ ...draft, status: "POSTED" })
    await expect(postJournalEntry("org-1", draft.id, "reviewer", control)).rejects.toThrow(/only draft/i)
    expect(mockTx.ledgerPostingBatch.create).toHaveBeenCalledTimes(1)
    expect(mockTx.journalEntry.update).toHaveBeenCalledTimes(1)
    expect(mockTx.accountingSourceLink.create).toHaveBeenCalledTimes(1)
    expect(mockLockPostingClosePeriods).toHaveBeenCalledTimes(1)
    expect(mockTx.closeRun.findMany).toHaveBeenCalledTimes(1)
  })

  it("retains the batch idempotency conflict boundary after the posting locks", async () => {
    arrangeManualPosting()
    mockTx.ledgerPostingBatch.findFirst.mockResolvedValueOnce({
      organizationId: "org-1", sourceType: AccountingSourceType.MANUAL, sourceId: "another-source",
      postingPurpose: "MANUAL_JOURNAL", sourceVersion: 1, postingCycle: 1, periodId: openPeriod.id,
    })
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(),
    })).rejects.toThrow(/different source, version or period evidence/i)
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.ledgerPostingBatch.update).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
    expect(mockTx.accountingSourceLink.create).not.toHaveBeenCalled()
    expect(mockTx.closeRun.update).not.toHaveBeenCalled()
  })

  it("does not apply the manual-posting authority hook to reversal", async () => {
    arrangeManualReversal()
    const assertCurrentAuthority = jest.fn().mockRejectedValue(new Error("manual posting hook"))
    await expect(reverseJournalEntry("org-1", "manual-1", "reviewer", "correction", new Date("2026-06-10T12:00:00Z"), {
      actorPermissions: ["accounting.journal.reverse"], lastAuthAt: Date.now(), assertCurrentAuthority,
    })).resolves.toMatchObject({ id: "rv-1" })
    expect(assertCurrentAuthority).not.toHaveBeenCalled()
    expect(mockModuleAccess).not.toHaveBeenCalled()
  })

  it.each<[string, TenantModuleEntitlement[]]>([
    ["managed empty grants", []],
    ["missing accounting", [{ ...writableAccounting, moduleSlug: "finance" }]],
    ["expired grant", [{ ...writableAccounting, endsAt: "2026-09-30T00:00:00Z" }]],
    ["future grant", [{ ...writableAccounting, startsAt: "2026-10-02T00:00:00Z" }]],
    ["suspended grant", [{ ...writableAccounting, status: "suspended" }]],
    ["read-only status", [{ ...writableAccounting, status: "read_only" }]],
    ["read-only flag", [{ ...writableAccounting, readOnly: true }]],
  ])("commits module denial for %s before accounting locks even with wildcard RBAC", async (_label, grants) => {
    arrangeManualPosting()
    mockModuleAccess.mockImplementation(async (_tx, input) => evaluateModuleEntitlement({
      ...input, explicitEntitlements: grants, now: new Date("2026-10-01T12:00:00Z"),
    }))
    let transactionCompleted = false
    mockDb.$transaction.mockImplementationOnce(async (work: (tx: typeof mockTx) => Promise<unknown>) => {
      const result = await work(mockTx)
      transactionCompleted = true
      return result
    })
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["*"], lastAuthAt: Date.now(),
    })).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 })
    expect(transactionCompleted).toBe(true)
    expect(mockModuleAccess).toHaveBeenCalledWith(mockTx, {
      organizationId: "org-1", userId: "reviewer", actorPermissions: ["*"],
      moduleSlug: "accounting", surfaceType: "action", surface: "services/accounting/posting.service.ts:postJournalEntry",
      accessIntent: "write", mode: "enforce",
    })
    expect(mockTx.auditLog.create).toHaveBeenCalledTimes(1)
    expect(mockTx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "MODULE_ENTITLEMENT_ENFORCED", organizationId: "org-1", userId: "reviewer",
      changes: expect.objectContaining({ moduleSlug: "accounting", accessIntent: "write", allowed: false, result: "deny", rbacWildcardPresent: true, rbacWildcardBypassedEntitlement: false }),
    }) })
    expect(mockLockPostingCatalog).not.toHaveBeenCalled()
    expect(mockTx.$queryRaw).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.findFirst).not.toHaveBeenCalled()
    expectNoPostingEffects()
  })

  it.each(["catalog", "periods", "authority"])("rechecks grant expiry after the %s wait before allow audit or effects", async boundary => {
    arrangeManualPosting()
    let moduleNow = new Date("2026-10-01T12:00:00Z")
    const grants = [{ ...writableAccounting, endsAt: "2026-10-01T12:00:01Z" }]
    mockModuleAccess.mockImplementation(async (_tx, input) => evaluateModuleEntitlement({ ...input, explicitEntitlements: grants, now: moduleNow }))
    const expire = () => { moduleNow = new Date("2026-10-01T12:00:02Z") }
    if (boundary === "catalog") mockLockPostingCatalog.mockImplementationOnce(async () => { expire() })
    if (boundary === "periods") mockLockPostingClosePeriods.mockImplementationOnce(async () => { expire(); return [openPeriod.id] })
    const assertCurrentAuthority = jest.fn(async () => { if (boundary === "authority") expire() })
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(), assertCurrentAuthority,
    })).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 })
    expect(mockModuleAccess).toHaveBeenCalledTimes(2)
    expect(assertCurrentAuthority.mock.invocationCallOrder[0]).toBeLessThan(mockModuleAccess.mock.invocationCallOrder[1])
    expect(mockTx.auditLog.create).toHaveBeenCalledTimes(1)
    expect(mockTx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "MODULE_ENTITLEMENT_ENFORCED", changes: expect.objectContaining({ allowed: false, reason: "Tenant module grant has expired." }),
    }) })
    expectNoPostingEffects()
  })

  it.each(["initial", "final"])("fails closed on the %s persisted module-authority read failure", async boundary => {
    arrangeManualPosting()
    if (boundary === "initial") mockModuleAccess.mockRejectedValueOnce(new Error("grant read failed"))
    else mockModuleAccess.mockImplementationOnce(async (_tx, input) => evaluateModuleEntitlement({ ...input, explicitEntitlements: [writableAccounting] }))
      .mockRejectedValueOnce(new Error("grant read failed"))
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: Date.now(),
    })).rejects.toThrow("grant read failed")
    expect(mockTx.auditLog.create).not.toHaveBeenCalled()
    expectNoPostingEffects()
  })

  it("preserves unconfigured legacy access without using an injected clock for module grants", async () => {
    arrangeManualPosting()
    mockModuleAccess.mockImplementation(async (_tx, input) => {
      expect(input).not.toHaveProperty("now")
      return evaluateModuleEntitlement({ ...input, requestedModules: [] })
    })
    const now = new Date("2026-06-10T12:00:00Z")
    await expect(postJournalEntry("org-1", "draft-1", "reviewer", {
      actorPermissions: ["accounting.journal.post"], lastAuthAt: now, now,
    })).resolves.toMatchObject({ status: "POSTED" })
    expect(mockModuleAccess).toHaveBeenCalledTimes(2)
  })

  it("uses the locked period state rather than a stale journal relation", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({ id: "je-1", organizationId: "org-1", status: "DRAFT", periodId: openPeriod.id, period: openPeriod, entryDate: new Date("2026-06-15T12:00:00Z") })
    mockTx.$queryRaw.mockResolvedValueOnce([{ id: "je-1" }]).mockResolvedValueOnce([{ ...openPeriod, status: "CLOSED" }])
    await expect(postJournalEntry("org-1", "je-1", "reviewer")).rejects.toThrow(/not open/)
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
  })

  it("rejects a journal assigned to a different accounting period before posting", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({ id: "je-1", organizationId: "org-1", status: "DRAFT", periodId: "other-period", period: openPeriod, entryDate: new Date("2026-06-15T12:00:00Z") })
    await expect(postJournalEntry("org-1", "je-1", "reviewer")).rejects.toThrow(/period changed/)
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
  })

  it("posts an existing balanced draft through an idempotent batch while new manual journals are stopped", async () => {
    await expect(assertModuleNewWorkInTx(mockTx as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", moduleSlug: "accounting", operation: "accounting.manual-journal.create",
    })).rejects.toMatchObject({ metadata: { reason: "MODULE_NEW_WORK_STOPPED" } })
    arrangeCertifiedCloseTarget()
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      organizationId: "org-1",
      status: "DRAFT",
      sourceType: AccountingSourceType.MANUAL,
      periodId: "period-1",
      period: openPeriod,
      entryDate: new Date("2026-06-09T12:00:00.000Z"),
      entryNumber: "JE-20260609-0001",
      lines: [
        {
          accountId: "cash",
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
          baseDebit: new Prisma.Decimal(100),
          baseCredit: new Prisma.Decimal(0),
          exchangeRate: new Prisma.Decimal(1),
          currency: "XAF",
        },
        {
          accountId: "sales",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(100),
          baseDebit: new Prisma.Decimal(0),
          baseCredit: new Prisma.Decimal(100),
          exchangeRate: new Prisma.Decimal(1),
          currency: "XAF",
        },
      ],
    })
    mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
    mockTx.ledgerPostingBatch.create.mockResolvedValue({ id: "batch-1" })
    mockTx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-1", status: "POSTED" })
    mockTx.journalEntry.update.mockResolvedValue({
      id: "je-1",
      entryNumber: "JE-20260609-0001",
      status: "POSTED",
    })
    const result = await postJournalEntry("org-1", "je-1", "user-1", {
      actorPermissions: ["accounting.journal.post"],
      lastAuthAt: Date.now(),
    })

    expect(result).toMatchObject({ id: "je-1", status: "POSTED" })
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "JournalEntry",
          entityId: "je-1",
          action: "JOURNAL_POST_CONTROL",
          userId: "user-1",
        }),
      }),
    )
    expect(mockTx.ledgerPostingBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          sourceId: "je-1",
          postingPurpose: "MANUAL_JOURNAL",
        }),
      }),
    )
    expect(mockTx.journalEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "POSTED",
          postingBatchId: "batch-1",
          postedById: "user-1",
        }),
      }),
    )
    expect(mockTx.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-run-1" },
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceCode: "LEDGER_JOURNAL_POSTED",
              sourceId: "je-1",
            }),
          }),
        }),
      }),
    )
  })

  it("preserves controlled reversal and close invalidation while new manual journals are stopped", async () => {
    await expect(assertModuleNewWorkInTx(mockTx as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", moduleSlug: "accounting", operation: "accounting.manual-journal.create",
    })).rejects.toMatchObject({ metadata: { reason: "MODULE_NEW_WORK_STOPPED" } })
    arrangeCertifiedCloseTarget()
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      organizationId: "org-1",
      status: "POSTED",
      periodId: "period-1",
      period: openPeriod,
      journalId: "journal-1",
      entryDate: new Date("2026-06-09T12:00:00.000Z"),
      entryNumber: "JE-20260609-0001",
      postedById: "poster-1",
      createdById: "maker-1",
      currency: "XAF",
      reference: "MANUAL-1",
      sourceType: AccountingSourceType.MANUAL,
      lines: [
        {
          accountId: "cash",
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
          baseDebit: new Prisma.Decimal(100),
          baseCredit: new Prisma.Decimal(0),
          currency: "XAF",
          exchangeRate: new Prisma.Decimal(1),
        },
        {
          accountId: "sales",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(100),
          baseDebit: new Prisma.Decimal(0),
          baseCredit: new Prisma.Decimal(100),
          currency: "XAF",
          exchangeRate: new Prisma.Decimal(1),
        },
      ],
      reversedByEntries: [],
    })
    mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
    mockTx.ledgerPostingBatch.create.mockResolvedValue({ id: "batch-rv-1" })
    mockTx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-rv-1", status: "POSTED" })
    mockTx.journalEntry.create.mockResolvedValue({
      id: "rv-1",
      entryNumber: "RV-20260610-0001",
      status: "POSTED",
    })

    const result = await reverseJournalEntry(
      "org-1",
      "je-1",
      "user-2",
      "Correct close-period posting",
      new Date("2026-06-10T12:00:00.000Z"),
      {
        actorPermissions: ["accounting.journal.reverse"],
        lastAuthAt: Date.now(),
      },
    )

    expect(result).toMatchObject({ id: "rv-1", status: "POSTED" })
    expect(mockTx.closeRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "close-run-1" },
        data: expect.objectContaining({
          status: "BLOCKED",
          metadata: expect.objectContaining({
            staleState: expect.objectContaining({
              sourceCode: "LEDGER_JOURNAL_REVERSED",
              sourceId: "je-1",
              newEvidenceHash: "rv-1",
            }),
          }),
        }),
      }),
    )
  })

  it.each([
    ["CUSTOMER_SETTLEMENT", "customer settlement source command"],
    ["PAYMENT_SUSPENSE", "Payment suspense correction requires a linked source workflow"],
  ])("durably audits and blocks generic reversal of a %s journal", async (sourceType, error) => {
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "settlement-journal-1",
      organizationId: "org-1",
      status: "POSTED",
      periodId: "period-1",
      period: openPeriod,
      journalId: "journal-1",
      entryDate: new Date("2026-06-09T12:00:00.000Z"),
      entryNumber: "AR-SETTLEMENT-1",
      postedById: "collector-1",
      createdById: "collector-1",
      currency: "XAF",
      reference: "CSET-1",
      sourceType,
      sourceId: "settlement-1",
      lines: [
        {
          accountId: "cash",
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
          baseDebit: new Prisma.Decimal(100),
          baseCredit: new Prisma.Decimal(0),
          exchangeRate: new Prisma.Decimal(1),
          currency: "XAF",
        },
        {
          accountId: "sales",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(100),
          baseDebit: new Prisma.Decimal(0),
          baseCredit: new Prisma.Decimal(100),
          exchangeRate: new Prisma.Decimal(1),
          currency: "XAF",
        },
      ],
      reversedByEntries: [],
    })

    await expect(
      reverseJournalEntry("org-1", "settlement-journal-1", "reviewer-1", "private reason", new Date(), {
        actorPermissions: ["accounting.journal.reverse"],
        lastAuthAt: Date.now(),
      }),
    ).rejects.toThrow(error)

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "JOURNAL_ENTRY_SOURCE_OWNED_REVERSAL_BLOCKED",
        changes: expect.objectContaining({ reasonProvided: true }),
      }),
    })
    expect(JSON.stringify(mockTx.auditLog.create.mock.calls)).not.toContain(
      "private reason",
    )
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
  })

  it.each([...Object.values(AccountingSourceType).filter((source) => source !== AccountingSourceType.MANUAL), null])(
    "never lets generic reversal take ownership of %s",
    async (sourceType) => {
      mockTx.journalEntry.findFirst.mockResolvedValue({
        id: "source-entry", sourceType, sourceId: "source-1", entryNumber: "SRC-1", periodId: "period-1",
        status: "POSTED", postedById: "maker", currency: "XAF", lines: [
          { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "XAF" },
          { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), currency: "XAF" },
        ],
      })
      await expect(reverseJournalEntry("org-1", "source-entry", "reviewer", "correction", new Date(), {
        actorPermissions: ["accounting.journal.reverse"], lastAuthAt: Date.now(),
      })).rejects.toThrow(/source|settlement/i)
      expect(mockTx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "JOURNAL_ENTRY_SOURCE_OWNED_REVERSAL_BLOCKED" }) })
      expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
      expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
      expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    },
  )

  it.each(["baseDebit", "baseCredit"])("rejects manual reversal with absent original %s before creating financial effects", async (missingField) => {
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "historical-manual", organizationId: "org-1", sourceType: "MANUAL", status: "POSTED",
      entryNumber: "JE-FX-1", periodId: "period-1", postedById: "maker", currency: "EUR", reversedByEntries: [],
      lines: [
        { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "EUR", baseDebit: new Prisma.Decimal("65595.70"), baseCredit: new Prisma.Decimal(0), [missingField]: null },
        { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), currency: "EUR", baseDebit: new Prisma.Decimal(0), baseCredit: new Prisma.Decimal("65595.70") },
      ],
    })
    await expect(reverseJournalEntry("org-1", "historical-manual", "reviewer", "correction", new Date(), {
      actorPermissions: ["accounting.journal.reverse"], lastAuthAt: Date.now(),
    })).rejects.toThrow(/functional-currency evidence is missing.*original journal/i)
    expect(mockTx.journalEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "historical-manual", organizationId: "org-1" } }))
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
  })

  it("preserves retained foreign-currency base decimals when creating a manual reversal", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "manual-fx", organizationId: "org-1", sourceType: "MANUAL", status: "POSTED", journalId: "journal-1",
      entryNumber: "JE-FX-2", periodId: "period-1", postedById: "maker", currency: "EUR", reversedByEntries: [],
      entryDate: new Date("2026-06-09T12:00:00.000Z"),
      lines: [
        { accountId: "cash", debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), currency: "EUR", exchangeRate: new Prisma.Decimal("655.957"), baseDebit: new Prisma.Decimal("65595.70"), baseCredit: new Prisma.Decimal(0) },
        { accountId: "sales", debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), currency: "EUR", exchangeRate: new Prisma.Decimal("655.957"), baseDebit: new Prisma.Decimal(0), baseCredit: new Prisma.Decimal("65595.70") },
      ],
    })
    mockTx.ledgerPostingBatch.findFirst.mockResolvedValue(null)
    mockTx.ledgerPostingBatch.create.mockResolvedValue({ id: "batch-fx" })
    mockTx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-fx", status: "POSTED" })
    await reverseJournalEntry("org-1", "manual-fx", "reviewer", "correction", new Date("2026-06-10T12:00:00.000Z"), {
      actorPermissions: ["accounting.journal.reverse"], lastAuthAt: Date.now(),
    })
    const lines = mockTx.journalEntry.create.mock.calls[0][0].data.lines.create
    expect(lines.map((line: { debit: Prisma.Decimal; credit: Prisma.Decimal; baseDebit: Prisma.Decimal; baseCredit: Prisma.Decimal }) => [line.debit.toFixed(2), line.credit.toFixed(2), line.baseDebit.toFixed(2), line.baseCredit.toFixed(2)]))
      .toEqual([["0.00", "100.00", "0.00", "65595.70"], ["100.00", "0.00", "65595.70", "0.00"]])
  })

  it("cannot reverse an original journal outside the requested tenant", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue(null)
    await expect(reverseJournalEntry("org-other", "manual-fx", "reviewer")).rejects.toThrow("Journal entry not found")
    expect(mockTx.journalEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "manual-fx", organizationId: "org-other" } }))
    expect(mockTx.journalEntry.create).not.toHaveBeenCalled()
  })

  it("audits and blocks self-posting of a manual journal", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({
      id: "je-1",
      organizationId: "org-1",
      status: "DRAFT",
      sourceType: AccountingSourceType.MANUAL,
      periodId: "period-1",
      period: openPeriod,
      entryDate: new Date("2026-06-09T12:00:00.000Z"),
      entryNumber: "JE-20260609-0001",
      createdById: "user-1",
      currency: "XAF",
      lines: [
        {
          accountId: "cash",
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
          baseDebit: new Prisma.Decimal(100),
          baseCredit: new Prisma.Decimal(0),
          exchangeRate: new Prisma.Decimal(1),
          currency: "XAF",
        },
        {
          accountId: "sales",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(100),
          baseDebit: new Prisma.Decimal(0),
          baseCredit: new Prisma.Decimal(100),
          exchangeRate: new Prisma.Decimal(1),
          currency: "XAF",
        },
      ],
    })

    await expect(
      postJournalEntry("org-1", "je-1", "user-1", {
        actorPermissions: ["accounting.journal.post"],
        lastAuthAt: Date.now(),
      }),
    ).rejects.toThrow(/independent approval/i)

    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "JOURNAL_POST_CONTROL_DENIED",
          changes: expect.objectContaining({
            reasonCode: "SELF_APPROVAL_BLOCKED",
            allowed: false,
          }),
        }),
      }),
    )
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
  })

  it("blocks a historical draft whose stored base amounts merely copied the foreign nominal amounts", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({ id: "old-fx", organizationId: "org-1", status: "DRAFT", sourceType: "MANUAL",
      periodId: "period-1", entryDate: new Date("2026-06-15"), currency: "EUR", lines: [
        { debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0), baseDebit: new Prisma.Decimal(100), baseCredit: new Prisma.Decimal(0), exchangeRate: new Prisma.Decimal("655.957") },
        { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100), baseDebit: new Prisma.Decimal(0), baseCredit: new Prisma.Decimal(100), exchangeRate: new Prisma.Decimal("655.957") },
      ] })
    await expect(postJournalEntry("org-1", "old-fx", "reviewer")).rejects.toThrow(/base amounts.*exchange rate/i)
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })

  it("does not relabel a source-owned draft as a manual journal", async () => {
    mockTx.journalEntry.findFirst.mockResolvedValue({ id: "source-draft", status: "DRAFT", sourceType: "POS_SALE", periodId: "period-1", entryDate: new Date("2026-06-15") })
    await expect(postJournalEntry("org-1", "source-draft", "reviewer")).rejects.toThrow(/source workflow/i)
    expect(mockTx.journalEntry.update).not.toHaveBeenCalled()
    expect(mockTx.ledgerPostingBatch.create).not.toHaveBeenCalled()
  })
})
