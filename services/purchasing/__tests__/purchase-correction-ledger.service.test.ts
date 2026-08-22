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
})
