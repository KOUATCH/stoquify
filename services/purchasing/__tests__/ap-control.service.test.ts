import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentTransactionState,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  SupplierBankAccountStatus,
  SupplierBankChangeStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { createLedgerPostingBatch, linkAccountingSource } from "@/services/accounting/posting.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  approveSupplierBankChange,
  approveSupplierBankChangeWithControls,
  postSupplierInvoice,
  releaseSupplierPayment,
  releaseSupplierPaymentWithControls,
} from "../ap-control.service"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/services/accounting/posting.service", () => ({
  createLedgerPostingBatch: jest.fn(),
  linkAccountingSource: jest.fn(),
}))

jest.mock("@/services/accounting/periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}))

jest.mock("@/services/accounting/posting-rules.service", () => ({
  getActivePostingRule: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn((value: unknown) => `hash-${JSON.stringify(value).length}`),
  markBusinessEventAppliedInTx: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
}))

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockedCreateLedgerPostingBatch = createLedgerPostingBatch as jest.Mock
const mockedLinkAccountingSource = linkAccountingSource as jest.Mock
const mockedGetOpenPeriodForDate = getOpenPeriodForDate as jest.Mock
const mockedGetActivePostingRule = getActivePostingRule as jest.Mock
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockedMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock

function buildTx() {
  return {
    organization: {
      findFirst: jest.fn(),
    },
    supplier: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    purchaseOrder: {
      findFirst: jest.fn(),
    },
    goodsReceiptLine: {
      findFirst: jest.fn(),
    },
    supplierInvoiceLine: {
      aggregate: jest.fn(),
    },
    supplierInvoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    threeWayMatch: {
      create: jest.fn(),
    },
    supplierLedgerEntry: {
      create: jest.fn(),
    },
    ledgerPostingBatch: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    ledgerAuditEvent: {
      create: jest.fn(),
    },
    chartOfAccount: {
      findMany: jest.fn(),
    },
    journal: {
      findFirst: jest.fn(),
    },
    journalEntry: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    supplierBankAccount: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    supplierBankChangeRequest: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    supplierPayment: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentTransaction: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "payment-tx-1",
        sourceId: "payment-1",
        state: PaymentTransactionState.PENDING,
      }),
    },
    paymentException: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "payment-exception-1",
        sourceId: "payment-1",
        type: PaymentExceptionType.MISSING_STATEMENT_LINE,
        status: PaymentExceptionStatus.OPEN,
      }),
    },
  }
}

function mockReceiptLine() {
  return {
    id: "gr-line-1",
    goodsReceiptId: "gr-1",
    purchaseOrderLineId: "po-line-1",
    itemId: "item-1",
    receivedQuantity: "10.000",
    unitCost: "100.00",
    goodsReceipt: {
      id: "gr-1",
      purchaseOrderId: "po-1",
      organizationId: "org-1",
      status: "RECEIVED",
    },
    purchaseOrderLine: {
      id: "po-line-1",
      purchaseOrderId: "po-1",
      itemId: "item-1",
      receivedQuantity: "10.000",
      unitCost: "100.00",
    },
  }
}

const supplier = {
  id: "supplier-1",
  organizationId: "org-1",
  name: "Sage Distribution",
  isActive: true,
  currentBalance: "0.00",
}

const apMappedAccounts = [
  "INVENTORY",
  "INPUT_VAT",
  "ACCOUNTS_PAYABLE",
  "BANK",
  "CASH_ON_HAND",
  "MOBILE_MONEY_CLEARING",
  "CARD_CLEARING",
  "CHEQUE_CLEARING",
].map((mappingKey, index) => ({
  id: `acct-${mappingKey.toLowerCase()}`,
  code: String(400 + index),
  mappingKey,
  isActive: true,
  deletedAt: null,
  _count: { children: 0 },
}))

function invoicePostingRule() {
  return {
    id: "rule-ap-invoice",
    code: "AP-SUPPLIER-INVOICE",
    sourceType: AccountingSourceType.SUPPLIER_INVOICE,
    postingPurpose: AccountingPostingPurpose.SUPPLIER_INVOICE,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "INVENTORY",
        amountSource: PostingRuleAmountSource.NET_AMOUNT,
        multiplier: "1",
        condition: null,
        description: "Inventory",
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "INPUT_VAT",
        amountSource: PostingRuleAmountSource.TAX_AMOUNT,
        multiplier: "1",
        condition: null,
        description: "Input VAT",
      },
      {
        lineNumber: 3,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "ACCOUNTS_PAYABLE",
        amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
        multiplier: "1",
        condition: null,
        description: "Supplier payable",
      },
    ],
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedCreateLedgerPostingBatch.mockResolvedValue({ id: "batch-1" })
  mockedLinkAccountingSource.mockResolvedValue({ id: "source-link-1" })
  mockedGetOpenPeriodForDate.mockResolvedValue({ id: "period-1" })
  mockedGetActivePostingRule.mockResolvedValue(null)
  mockedRecordBusinessEventInTx.mockResolvedValue({ event: { id: "event-1" }, created: true })
  mockedMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1", status: "APPLIED" })
})

describe("ap-control.service", () => {
  it("rejects duplicate supplier invoices before creating AP evidence", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1", status: "RECEIVED" })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: "0.000" } })
    tx.supplierInvoice.findFirst.mockResolvedValue({ id: "invoice-existing", invoiceNumber: "INV-001" })

    await expect(
      postSupplierInvoice({
        organizationId: "org-1",
        supplierId: "supplier-1",
        purchaseOrderId: "po-1",
        invoiceNumber: "INV-001",
        invoiceDate: "2026-06-15",
        createdById: "buyer-1",
        lines: [
          {
            purchaseOrderLineId: "po-line-1",
            goodsReceiptLineId: "gr-line-1",
            itemId: "item-1",
            description: "Received stock",
            quantity: "1.000",
            unitCost: "100.00",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.supplierInvoice.create).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("blocks supplier invoices that exceed received and uninvoiced quantity", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1", status: "RECEIVED" })
    tx.goodsReceiptLine.findFirst.mockResolvedValue({
      ...mockReceiptLine(),
      receivedQuantity: "5.000",
    })
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: "4.000" } })

    await expect(
      postSupplierInvoice({
        organizationId: "org-1",
        supplierId: "supplier-1",
        purchaseOrderId: "po-1",
        invoiceNumber: "INV-002",
        invoiceDate: "2026-06-15",
        createdById: "buyer-1",
        lines: [
          {
            purchaseOrderLineId: "po-line-1",
            goodsReceiptLineId: "gr-line-1",
            itemId: "item-1",
            description: "Over received stock",
            quantity: "2.000",
            unitCost: "100.00",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.supplierInvoice.create).not.toHaveBeenCalled()
  })

  it("rejects self-approval for supplier bank changes", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierBankChangeRequest.findFirst.mockResolvedValue({
      id: "change-1",
      organizationId: "org-1",
      supplierId: "supplier-1",
      bankAccountId: null,
      requestedById: "actor-1",
      status: SupplierBankChangeStatus.PENDING,
      supplier,
    })

    await expect(
      approveSupplierBankChange({
        organizationId: "org-1",
        changeRequestId: "change-1",
        approvedById: "actor-1",
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.supplierBankAccount.create).not.toHaveBeenCalled()
  })

  it("audits and blocks supplier bank self-approval in AP service controls", async () => {
    const tx = buildTx()
    tx.supplierBankChangeRequest.findFirst.mockResolvedValue({
      id: "change-1",
      supplierId: "supplier-1",
      requestedById: "approver-1",
    })

    await expect(
      approveSupplierBankChangeWithControls(
        {
          organizationId: "org-1",
          changeRequestId: "change-1",
          approvedById: "approver-1",
        },
        {
          organizationId: "org-1",
          actorId: "approver-1",
          actorPermissions: ["purchasing.supplier.bank.approve"],
          lastAuthAt: Date.now(),
        },
        tx as unknown as Parameters<typeof approveSupplierBankChangeWithControls>[2],
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "SUPPLIER_BANK_CHANGE_APPROVE_CONTROL_DENIED",
          organizationId: "org-1",
          userId: "approver-1",
          changes: expect.objectContaining({
            reasonCode: "SELF_APPROVAL_BLOCKED",
            allowed: false,
          }),
        }),
      }),
    )
    expect(tx.supplierBankAccount.create).not.toHaveBeenCalled()
  })

  it("audits and blocks supplier payment self-release in AP service controls", async () => {
    const tx = buildTx()

    await expect(
      releaseSupplierPaymentWithControls(
        {
          organizationId: "org-1",
          supplierId: "supplier-1",
          bankAccountId: "bank-1",
          method: "BANK_TRANSFER",
          requestedById: "treasury-1",
          approvedById: "treasury-1",
          releasedById: "treasury-1",
          paymentDate: "2026-06-15",
          allocations: [{ supplierInvoiceId: "invoice-1", amount: "100.00" }],
        },
        {
          organizationId: "org-1",
          actorId: "treasury-1",
          actorPermissions: ["purchasing.ap.payment.release"],
          lastAuthAt: Date.now(),
        },
        tx as unknown as Parameters<typeof releaseSupplierPaymentWithControls>[2],
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "SUPPLIER_PAYMENT_RELEASE_CONTROL_DENIED",
          organizationId: "org-1",
          userId: "treasury-1",
          changes: expect.objectContaining({
            reasonCode: "SELF_APPROVAL_BLOCKED",
            allowed: false,
          }),
        }),
      }),
    )
    expect(tx.supplier.findFirst).not.toHaveBeenCalled()
    expect(tx.supplierPayment.create).not.toHaveBeenCalled()
  })

  it("blocks supplier payment release when a bank change is pending", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.supplierBankAccount.findFirst.mockResolvedValue({
      id: "bank-1",
      status: SupplierBankAccountStatus.APPROVED,
    })
    tx.supplierBankChangeRequest.count.mockResolvedValue(1)

    await expect(
      releaseSupplierPayment({
        organizationId: "org-1",
        supplierId: "supplier-1",
        bankAccountId: "bank-1",
        method: "BANK_TRANSFER",
        requestedById: "requester-1",
        approvedById: "approver-1",
        releasedById: "releaser-1",
        paymentDate: "2026-06-15",
        allocations: [{ supplierInvoiceId: "invoice-1", amount: "100.00" }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.supplierPayment.create).not.toHaveBeenCalled()
  })

  it("blocks supplier payment allocations above invoice outstanding balance", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.supplierBankAccount.findFirst.mockResolvedValue({
      id: "bank-1",
      status: SupplierBankAccountStatus.APPROVED,
    })
    tx.supplierBankChangeRequest.count.mockResolvedValue(0)
    tx.supplierInvoice.findMany.mockResolvedValue([
      {
        id: "invoice-1",
        organizationId: "org-1",
        supplierId: "supplier-1",
        total: "100.00",
        amountPaid: "95.00",
        currency: "XAF",
      },
    ])

    await expect(
      releaseSupplierPayment({
        organizationId: "org-1",
        supplierId: "supplier-1",
        bankAccountId: "bank-1",
        method: "BANK_TRANSFER",
        requestedById: "requester-1",
        approvedById: "approver-1",
        releasedById: "releaser-1",
        paymentDate: "2026-06-15",
        allocations: [{ supplierInvoiceId: "invoice-1", amount: "10.00" }],
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.supplierPayment.create).not.toHaveBeenCalled()
  })

  it("posts matched supplier invoices with event evidence and explicit ledger blocker", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1", status: "RECEIVED" })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: "0.000" } })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockResolvedValue({
      id: "invoice-1",
      invoiceNumber: "INV-003",
      lines: [{ id: "invoice-line-1" }],
    })
    tx.threeWayMatch.create.mockResolvedValue({ id: "match-1" })
    tx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-1", status: LedgerPostingBatchStatus.FAILED })
    tx.supplierInvoice.update.mockResolvedValue({
      id: "invoice-1",
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      lines: [{ id: "invoice-line-1" }],
      threeWayMatches: [{ id: "match-1" }],
    })

    const result = await postSupplierInvoice({
      organizationId: "org-1",
      supplierId: "supplier-1",
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-003",
      invoiceDate: "2026-06-15",
      createdById: "buyer-1",
      approvedById: "accountant-1",
      lines: [
        {
          purchaseOrderLineId: "po-line-1",
          goodsReceiptLineId: "gr-line-1",
          itemId: "item-1",
          description: "Received stock",
          quantity: "2.000",
          unitCost: "100.00",
        },
      ],
    })

    expect(result.ledgerStatus).toBe("BLOCKED_PENDING_RULES")
    expect(tx.supplierInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "POSTED",
          total: expect.any(Object),
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                goodsReceiptLineId: "gr-line-1",
                matchStatus: "MATCHED",
              }),
            ]),
          }),
        }),
      }),
    )
    expect(tx.ledgerPostingBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: LedgerPostingBatchStatus.FAILED,
          metadata: expect.objectContaining({ blockerCode: "AP_POSTING_RULE_REVIEW" }),
        }),
      }),
    )
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "purchase.supplier_invoice.posted",
        sourceType: "SUPPLIER_INVOICE",
        sourceId: "invoice-1",
      }),
    )
  })

  it("posts matched supplier invoices to a balanced AP journal when rules resolve", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    mockedGetActivePostingRule.mockResolvedValue(invoicePostingRule())
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: { countryPack: null, taxRegime: null },
    })
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1", status: "RECEIVED" })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: "0.000" } })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockResolvedValue({
      id: "invoice-1",
      invoiceNumber: "INV-AP-001",
      lines: [{ id: "invoice-line-1" }],
    })
    tx.threeWayMatch.create.mockResolvedValue({ id: "match-1" })
    tx.chartOfAccount.findMany.mockResolvedValue(apMappedAccounts)
    tx.journal.findFirst.mockResolvedValue({ id: "journal-ac", code: "AC", type: JournalType.PURCHASE })
    tx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-1", status: LedgerPostingBatchStatus.POSTED })
    tx.journalEntry.create.mockResolvedValue({ id: "journal-entry-1" })
    tx.supplierInvoice.update.mockResolvedValue({
      id: "invoice-1",
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      lines: [{ id: "invoice-line-1" }],
      threeWayMatches: [{ id: "match-1" }],
    })

    const result = await postSupplierInvoice({
      organizationId: "org-1",
      supplierId: "supplier-1",
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-AP-001",
      invoiceDate: "2026-06-15",
      createdById: "buyer-1",
      approvedById: "accountant-1",
      idempotencyKey: "invoice-key-1",
      lines: [
        {
          purchaseOrderLineId: "po-line-1",
          goodsReceiptLineId: "gr-line-1",
          itemId: "item-1",
          description: "Received stock",
          quantity: "2.000",
          unitCost: "100.00",
          taxRate: "19.25",
        },
      ],
    })

    expect(result.ledgerStatus).toBe("POSTED")
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          journalId: "journal-ac",
          postingBatchId: "batch-1",
          sourceType: "SUPPLIER_INVOICE",
          sourceId: "invoice-1",
          lines: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ accountId: "acct-inventory", debit: expect.any(Object), credit: expect.any(Object) }),
              expect.objectContaining({ accountId: "acct-input_vat", debit: expect.any(Object), credit: expect.any(Object) }),
              expect.objectContaining({ accountId: "acct-accounts_payable", debit: expect.any(Object), credit: expect.any(Object) }),
            ]),
          }),
        }),
      }),
    )
    expect(mockedLinkAccountingSource).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        postingBatchId: "batch-1",
        journalEntryId: "journal-entry-1",
        sourceType: "SUPPLIER_INVOICE",
        sourceId: "invoice-1",
      }),
      tx,
    )
    expect(tx.supplierInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ledgerPostingBatchId: "batch-1",
          metadata: expect.objectContaining({
            ledgerStatus: "POSTED",
            countryPackStatus: "RESOLVED",
          }),
        }),
      }),
    )
  })

  it("rejects mutated supplier invoice idempotency replays before posting side effects", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.supplierInvoice.findFirst.mockResolvedValue({
      id: "invoice-1",
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      metadata: { idempotencyPayloadHash: "sha256:previous-payload" },
    })

    await expect(
      postSupplierInvoice({
        organizationId: "org-1",
        supplierId: "supplier-1",
        purchaseOrderId: "po-1",
        invoiceNumber: "INV-IDEMP-1",
        invoiceDate: "2026-06-15",
        createdById: "buyer-1",
        idempotencyKey: "invoice-key-1",
        lines: [
          {
            purchaseOrderLineId: "po-line-1",
            goodsReceiptLineId: "gr-line-1",
            itemId: "item-1",
            description: "Changed stock",
            quantity: "2.000",
            unitCost: "100.00",
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.supplierInvoice.create).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("does not emit final AP invoice events when ledger journal creation fails inside the transaction", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    mockedGetActivePostingRule.mockResolvedValue(invoicePostingRule())
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: { countryPack: null, taxRegime: null },
    })
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1", status: "RECEIVED" })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: "0.000" } })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockResolvedValue({
      id: "invoice-rollback",
      invoiceNumber: "INV-ROLLBACK",
      lines: [{ id: "invoice-line-1" }],
    })
    tx.threeWayMatch.create.mockResolvedValue({ id: "match-rollback" })
    tx.chartOfAccount.findMany.mockResolvedValue(apMappedAccounts)
    tx.journal.findFirst.mockResolvedValue({ id: "journal-ac", code: "AC", type: JournalType.PURCHASE })
    tx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-rollback", status: LedgerPostingBatchStatus.POSTED })
    tx.journalEntry.create.mockRejectedValue(new Error("journal failed"))

    await expect(
      postSupplierInvoice({
        organizationId: "org-1",
        supplierId: "supplier-1",
        purchaseOrderId: "po-1",
        invoiceNumber: "INV-ROLLBACK",
        invoiceDate: "2026-06-15",
        createdById: "buyer-1",
        approvedById: "accountant-1",
        lines: [
          {
            purchaseOrderLineId: "po-line-1",
            goodsReceiptLineId: "gr-line-1",
            itemId: "item-1",
            description: "Received stock",
            quantity: "2.000",
            unitCost: "100.00",
          },
        ],
      }),
    ).rejects.toThrow("journal failed")

    expect(tx.supplierInvoice.update).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
    expect(mockedMarkBusinessEventAppliedInTx).not.toHaveBeenCalled()
  })

  it("releases supplier payments with approved bank evidence, allocations, event evidence, and ledger blocker", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue({
      ...supplier,
      currentBalance: "100.00",
    })
    tx.supplierBankAccount.findFirst.mockResolvedValue({
      id: "bank-1",
      status: SupplierBankAccountStatus.APPROVED,
    })
    tx.supplierBankChangeRequest.count.mockResolvedValue(0)
    tx.supplierInvoice.findMany.mockResolvedValue([
      {
        id: "invoice-1",
        organizationId: "org-1",
        supplierId: "supplier-1",
        total: "100.00",
        amountPaid: "0.00",
        currency: "XAF",
      },
    ])
    tx.supplierPayment.count.mockResolvedValue(0)
    tx.supplierPayment.findFirst.mockResolvedValue(null)
    tx.supplierPayment.create.mockResolvedValue({
      id: "payment-1",
      paymentNumber: "SPAY-20260615-0001",
      currency: "XAF",
      evidenceHash: "sha256:evidence",
      allocations: [{ id: "alloc-1", supplierInvoiceId: "invoice-1" }],
    })
    tx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-1", status: LedgerPostingBatchStatus.FAILED })
    tx.supplierPayment.update.mockResolvedValue({
      id: "payment-1",
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      allocations: [{ id: "alloc-1", supplierInvoiceId: "invoice-1" }],
    })

    const result = await releaseSupplierPayment({
      organizationId: "org-1",
      supplierId: "supplier-1",
      bankAccountId: "bank-1",
      method: "BANK_TRANSFER",
      requestedById: "requester-1",
      approvedById: "approver-1",
      releasedById: "releaser-1",
      paymentDate: "2026-06-15",
      allocations: [{ supplierInvoiceId: "invoice-1", amount: "100.00" }],
    })

    expect(result.ledgerStatus).toBe("BLOCKED_PENDING_RULES")
    expect(tx.supplierPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "RELEASED",
          bankAccountId: "bank-1",
          allocations: expect.objectContaining({
            create: [
              expect.objectContaining({
                supplierInvoiceId: "invoice-1",
              }),
            ],
          }),
        }),
      }),
    )
    expect(tx.supplierInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1" },
        data: expect.objectContaining({ status: "PAID" }),
      }),
    )
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "supplier.payment.released",
        sourceType: "SUPPLIER_PAYMENT",
        sourceId: "payment-1",
        payload: expect.objectContaining({
          paymentTransactionId: "payment-tx-1",
          paymentExceptionId: "payment-exception-1",
          reconciliationStatus: "LEDGER_BLOCKED",
        }),
      }),
    )
    expect(tx.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: "OUTBOUND",
          state: PaymentTransactionState.SUSPENSE,
          sourceType: "SUPPLIER_PAYMENT",
          sourceId: "payment-1",
        }),
      }),
    )
    expect(tx.paymentException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PaymentExceptionType.SUSPENSE_POSTING_BLOCKED,
          status: PaymentExceptionStatus.OPEN,
          sourceType: "SUPPLIER_PAYMENT",
          sourceId: "payment-1",
        }),
      }),
    )
  })

  it("rejects mutated supplier payment idempotency replays before release side effects", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.supplierPayment.findFirst.mockResolvedValue({
      id: "payment-1",
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
      metadata: { idempotencyPayloadHash: "sha256:previous-payment" },
    })

    await expect(
      releaseSupplierPayment({
        organizationId: "org-1",
        supplierId: "supplier-1",
        bankAccountId: "bank-1",
        method: "BANK_TRANSFER",
        requestedById: "requester-1",
        approvedById: "approver-1",
        releasedById: "releaser-1",
        paymentDate: "2026-06-15",
        idempotencyKey: "payment-key-1",
        allocations: [{ supplierInvoiceId: "invoice-1", amount: "100.00" }],
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.supplierBankAccount.findFirst).not.toHaveBeenCalled()
    expect(tx.supplierPayment.create).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
  })
})
