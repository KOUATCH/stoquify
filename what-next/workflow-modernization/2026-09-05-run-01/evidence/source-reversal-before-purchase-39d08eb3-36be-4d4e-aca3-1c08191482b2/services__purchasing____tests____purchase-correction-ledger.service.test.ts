import {
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  Prisma,
} from "@prisma/client"

import { recordReversedJournalCloseInvalidationsInTx } from "@/services/accounting/journal-close-invalidation.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { createLedgerPostingBatch, linkAccountingSource } from "@/services/accounting/posting.service"
import { reversePurchaseCorrectionLedgerInTx } from "../purchase-correction-ledger.service"

jest.mock("@/services/accounting/journal-close-invalidation.service", () => ({
  recordReversedJournalCloseInvalidationsInTx: jest.fn(),
}))
jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn() }))
jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
  linkAccountingSource: jest.fn(),
}))

const mockPeriod = getOpenPeriodForDate as jest.Mock
const mockCreateBatch = createLedgerPostingBatch as jest.Mock
const mockLinkSource = linkAccountingSource as jest.Mock
const mockInvalidation = recordReversedJournalCloseInvalidationsInTx as jest.Mock

beforeEach(() => { jest.resetAllMocks() })

const reversalInput = {
  organizationId: "org-1", sourceType: AccountingSourceType.PURCHASE_RETURN,
  sourceId: "reversal-1", originalSourceId: "return-1", sourceNumber: "PR-2",
  sourceDate: new Date("2026-09-08T12:00:00Z"), originalJournalEntryId: null,
  originalPostingBatchId: "batch-1", supplierId: "supplier-1",
  documentHash: "sha256:owned", reason: "Correction", metadata: {},
}

it.each([AccountingSourceType.PURCHASE_RETURN, AccountingSourceType.SUPPLIER_CREDIT_NOTE])(
  "rejects %s reversal in a closed period even without an original journal", async (sourceType) => {
    const tx = { ledgerPostingBatch: { updateMany: jest.fn() } } as unknown as Prisma.TransactionClient
    mockPeriod.mockRejectedValue(new Error("Accounting period is closed"))
    await expect(reversePurchaseCorrectionLedgerInTx(tx, { ...reversalInput, sourceType })).rejects.toThrow("Accounting period is closed")
    expect(tx.ledgerPostingBatch.updateMany).not.toHaveBeenCalled()
    expect(mockCreateBatch).not.toHaveBeenCalled()
  },
)

it("requires an open period even if both original ledger references are absent", async () => {
  mockPeriod.mockRejectedValue(new Error("No accounting period"))
  await expect(reversePurchaseCorrectionLedgerInTx({} as Prisma.TransactionClient, { ...reversalInput, originalPostingBatchId: null })).rejects.toThrow("No accounting period")
})

function unpostedTx() {
  mockPeriod.mockResolvedValue({ id: "period-reversal" })
  return {
    journalEntry: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    ledgerPostingBatch: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue(null) },
    ledgerAuditEvent: { create: jest.fn().mockResolvedValue({}) },
  }
}

it.each([AccountingSourceType.PURCHASE_RETURN, AccountingSourceType.SUPPLIER_CREDIT_NOTE])(
  "retires only the original unposted %s batch and records no invented journal", async sourceType => {
    const tx = unpostedTx()
    await expect(reversePurchaseCorrectionLedgerInTx(tx as unknown as Prisma.TransactionClient, { ...reversalInput, sourceType })).resolves.toBeNull()
    expect(mockPeriod).toHaveBeenCalledWith('org-1', reversalInput.sourceDate, tx)
    expect(tx.ledgerPostingBatch.updateMany).toHaveBeenCalledWith({
      where: { id: 'batch-1', organizationId: 'org-1', sourceType, sourceId: 'return-1', postingPurpose: sourceType,
        status: { in: ['PENDING', 'FAILED'] }, journalEntries: { none: {} } },
      data: { status: 'REVERSED', reversedAt: expect.any(Date) },
    })
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
    expect(mockCreateBatch).not.toHaveBeenCalled()
    expect(mockInvalidation).not.toHaveBeenCalled()
    expect(tx.ledgerAuditEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'PURCHASING_AP_UNPOSTED_CORRECTION_REVERSED', organizationId: 'org-1', resourceId: 'return-1',
      metadata: expect.objectContaining({ reversalSourceId: 'reversal-1', reversalPeriodId: 'period-reversal' }),
    }) })
  },
)

it('rejects a hidden journal instead of cancelling its batch without reversing its entries',async()=>{
  const tx=unpostedTx();tx.journalEntry.findFirst.mockResolvedValue({id:'retained-journal'})
  await expect(reversePurchaseCorrectionLedgerInTx(tx as unknown as Prisma.TransactionClient,reversalInput)).rejects.toThrow('journal evidence')
  expect(tx.ledgerPostingBatch.updateMany).not.toHaveBeenCalled()
  expect(tx.ledgerAuditEvent.create).not.toHaveBeenCalled()
})

it('rejects a mismatched, posted, reversed or concurrently changed batch',async()=>{
  const tx=unpostedTx();tx.ledgerPostingBatch.updateMany.mockResolvedValue({count:0})
  await expect(reversePurchaseCorrectionLedgerInTx(tx as unknown as Prisma.TransactionClient,reversalInput)).rejects.toThrow('changed or is inconsistent')
  expect(tx.ledgerAuditEvent.create).not.toHaveBeenCalled()
})

it('rejects unlinked retained posting evidence when the source has no batch pointer',async()=>{
  const tx=unpostedTx();tx.ledgerPostingBatch.findFirst.mockResolvedValue({id:'retained-batch'})
  await expect(reversePurchaseCorrectionLedgerInTx(tx as unknown as Prisma.TransactionClient,{...reversalInput,originalPostingBatchId:null})).rejects.toThrow('posting evidence')
  expect(tx.ledgerAuditEvent.create).not.toHaveBeenCalled()
})

it('records an unposted reversal in an open period when no batch or journal exists',async()=>{
  const tx=unpostedTx()
  await expect(reversePurchaseCorrectionLedgerInTx(tx as unknown as Prisma.TransactionClient,{...reversalInput,originalPostingBatchId:null})).resolves.toBeNull()
  expect(tx.ledgerPostingBatch.updateMany).not.toHaveBeenCalled()
  expect(tx.ledgerAuditEvent.create).toHaveBeenCalledWith({data:expect.objectContaining({postingBatchId:null})})
})

it("mirrors the original purchase correction journal exactly and marks the original effects reversed", async () => {
  const original = {
    id: "journal-original",
    organizationId: "org-1",
    journalId: "purchase-journal",
    periodId: "period-original",
    postingBatchId: "batch-original",
    entryNumber: "APRET-20260819-0001",
    status: JournalEntryStatus.POSTED,
    currency: "XAF",
    lines: [
      {
        accountId: "claim-account",
        description: "Supplier claim",
        debit: new Prisma.Decimal(150),
        credit: new Prisma.Decimal(0),
        currency: "XAF",
        exchangeRate: new Prisma.Decimal(1),
        baseDebit: new Prisma.Decimal(150),
        baseCredit: new Prisma.Decimal(0),
        locationId: null,
        customerId: null,
        supplierId: "supplier-1",
        itemId: null,
        dimensions: null,
        metadata: { mappingKey: "SUPPLIER_RETURN_CLAIM" },
      },
      {
        accountId: "inventory-account",
        description: "Inventory relief",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(150),
        currency: "XAF",
        exchangeRate: new Prisma.Decimal(1),
        baseDebit: new Prisma.Decimal(0),
        baseCredit: new Prisma.Decimal(150),
        locationId: null,
        customerId: null,
        supplierId: "supplier-1",
        itemId: null,
        dimensions: null,
        metadata: { mappingKey: "INVENTORY" },
      },
    ],
    reversedByEntries: [],
  }
  const tx = {
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue(original),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation(async (args) => ({ id: "journal-reversal", ...args.data })),
      update: jest.fn().mockResolvedValue({}),
    },
    ledgerPostingBatch: {
      update: jest.fn().mockImplementation(async (args) => ({ id: args.where.id, ...args.data })),
    },
    ledgerAuditEvent: { create: jest.fn().mockResolvedValue({}) },
  } as unknown as Prisma.TransactionClient
  mockPeriod.mockResolvedValue({ id: "period-reversal" })
  mockCreateBatch.mockResolvedValue({ id: "batch-reversal" })
  mockLinkSource.mockResolvedValue({ id: "source-link-reversal" })

  const result = await reversePurchaseCorrectionLedgerInTx(tx, {
    organizationId: "org-1",
    sourceType: AccountingSourceType.PURCHASE_RETURN,
    sourceId: "return-reversal-1",
    originalSourceId: "return-1",
    sourceNumber: "PR-000002",
    sourceDate: new Date("2026-08-19T12:00:00.000Z"),
    originalJournalEntryId: "journal-original",
    actorId: "actor-1",
    supplierId: "supplier-1",
    documentHash: "sha256:return-reversal",
    reason: "Correction entered in error",
    metadata: { reversalOfPurchaseReturnId: "return-1" },
  })

  const reversalCreate = (tx.journalEntry.create as jest.Mock).mock.calls[0][0].data
  expect(reversalCreate).toMatchObject({
    status: JournalEntryStatus.POSTED,
    reversalOfEntryId: "journal-original",
    sourceType: AccountingSourceType.PURCHASE_RETURN,
    sourceId: "return-reversal-1",
  })
  expect(reversalCreate.lines.create).toEqual([
    expect.objectContaining({ accountId: "claim-account", debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(150) }),
    expect.objectContaining({ accountId: "inventory-account", debit: new Prisma.Decimal(150), credit: new Prisma.Decimal(0) }),
  ])
  expect(tx.journalEntry.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: "journal-original" },
    data: expect.objectContaining({ status: JournalEntryStatus.REVERSED }),
  }))
  expect(tx.ledgerPostingBatch.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: "batch-original" },
    data: expect.objectContaining({ status: LedgerPostingBatchStatus.REVERSED }),
  }))
  expect(mockInvalidation).toHaveBeenCalledWith(
    tx,
    "org-1",
    expect.objectContaining({
      originalJournalEntryId: "journal-original",
      reversalJournalEntryId: "journal-reversal",
      originalPeriodId: "period-original",
      reversalPeriodId: "period-reversal",
    }),
    expect.any(Object),
  )
  expect(result).toMatchObject({ ledgerStatus: "POSTED", journalEntryId: "journal-reversal" })
  expect(tx.journalEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{
    id:'journal-original',organizationId:'org-1',sourceType:AccountingSourceType.PURCHASE_RETURN,sourceId:'return-1',
  }}))
})
