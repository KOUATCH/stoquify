import {
  AccountingPostingPurpose,
  AccountingSourceType,
  JournalType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentExceptionStatus,
  PaymentExceptionType,
  PaymentTransactionState,
  Prisma,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  SupplierBankAccountStatus,
  SupplierBankChangeStatus,
  SupplierPaymentStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { recordPostedJournalCloseInvalidationInTx } from "@/services/accounting/journal-close-invalidation.service"
import { createLedgerPostingBatch, linkAccountingSource } from "@/services/accounting/posting.service"
import { getOpenPeriodForDate } from "@/services/accounting/periods.service"
import { getActivePostingRule } from "@/services/accounting/posting-rules.service"
import { BusinessRuleError, ConflictError } from "@/services/_shared/action-errors"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { resolveInvoiceReceiptRecognition, type InvoiceReceiptRecognitionInput } from "../invoice-receipt-recognition"

import {
  approveSupplierBankChange,
  approveSupplierBankChangeWithControls,
  approveSupplierInvoice,
  approveSupplierPayment,
  approveSupplierPaymentWithControls,
  buildInvoiceLinePlans,
  createAPLedgerPosting,
  postPurchaseCorrectionLedgerInTx,
  postSupplierInvoice,
  prepareSupplierInvoice,
  releaseSupplierPayment,
  releaseSupplierPaymentWithControls,
  requestSupplierInvoiceMatchException,
  reviewSupplierInvoiceMatchException,
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

jest.mock("@/services/accounting/journal-close-invalidation.service", () => ({
  recordPostedJournalCloseInvalidationInTx: jest.fn(),
}))

jest.mock("@/services/accounting/periods.service", () => ({
  getOpenPeriodForDate: jest.fn(),
}))

jest.mock("@/services/accounting/posting-rules.service", () => ({
  getActivePostingRule: jest.fn(),
}))

jest.mock("../invoice-receipt-recognition", () => ({ resolveInvoiceReceiptRecognition: jest.fn() }))

jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn((value: unknown) => `hash-${JSON.stringify(value).length}`),
  markBusinessEventAppliedInTx: jest.fn(),
  recordBusinessEventInTx: jest.fn(),
}))

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockedRecordPostedJournalCloseInvalidation = recordPostedJournalCloseInvalidationInTx as jest.Mock
const mockedCreateLedgerPostingBatch = createLedgerPostingBatch as jest.Mock
const mockedLinkAccountingSource = linkAccountingSource as jest.Mock
const mockedGetOpenPeriodForDate = getOpenPeriodForDate as jest.Mock
const mockedGetActivePostingRule = getActivePostingRule as jest.Mock
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockedMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock
const mockedReceiptRecognition = resolveInvoiceReceiptRecognition as jest.Mock

function legacyRecognition(input: InvoiceReceiptRecognitionInput) {
  return { amounts: { sourceAmount: new Prisma.Decimal(input.total), netAmount: new Prisma.Decimal(input.subtotal), grossAmount: new Prisma.Decimal(input.total), taxAmount: new Prisma.Decimal(input.taxAmount), costAmount: new Prisma.Decimal(input.subtotal) } }
}

function accruedRecognition(input: InvoiceReceiptRecognitionInput) {
  const recognition = { version: 1 as const, organizationId: input.organizationId, supplierId: input.supplierId, invoiceId: input.invoiceId, currency: input.currency, invoiceSourceHash: "a".repeat(64), allocations: [{ receiptLineId: "gr-line-1", receiptId: "gr-1", quantity: "2.000", invoiceNet: "200.00", receiptCost: "200.00", priorQuantity: "0.000", priorCost: "0.00", receiptBatchId: "receipt-batch", receiptJournalId: "receipt-journal", receiptEvidenceHash: "b".repeat(64) }] }
  return { amounts: { ...legacyRecognition(input).amounts, sourceAmount: new Prisma.Decimal(0), varianceAmount: new Prisma.Decimal(0) }, conditionContext: { receiptRecognition: "ACCRUAL", receiptVarianceDirection: "NONE", receiptRecognitionHash: hashBusinessPayload(recognition) }, recognition }
}

function buildTx() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([]),
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
    purchaseReturn: { findMany: jest.fn().mockResolvedValue([]) },
    supplierInvoiceLine: {
      aggregate: jest.fn(),
    },
    supplierInvoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    supplierCreditNote: { findMany: jest.fn().mockResolvedValue([]) },
    threeWayMatch: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    supplierInvoiceMatchException: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    supplierLedgerEntry: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    ledgerPostingBatch: {
      findMany: jest.fn().mockResolvedValue([]),
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
      findMany: jest.fn().mockResolvedValue([]),
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

function approvalEvidence(invoiceId: string, matchId: string, unitCost = "100.00") {
  const cost = new Prisma.Decimal(unitCost), total = cost.times(2), variance = cost.minus(100).times(2)
  const status = variance.eq(0) ? "MATCHED" : "EXCEPTION"
  return {
    amountPaid: new Prisma.Decimal(0), discount: new Prisma.Decimal(0), postedAt: null,
    lines: [{ id: "invoice-line-1", organizationId: "org-1", supplierInvoiceId: invoiceId, goodsReceiptLineId: "gr-line-1", purchaseOrderLineId: "po-line-1", itemId: "item-1", description: "Received stock", quantity: new Prisma.Decimal(2), unitCost: cost, taxRate: new Prisma.Decimal(0), taxAmount: new Prisma.Decimal(0), lineTotal: total, matchStatus: status }],
    threeWayMatches: [{ id: matchId, organizationId: "org-1", supplierInvoiceId: invoiceId, purchaseOrderId: "po-1", status, varianceAmount: variance.abs(), priceVariance: variance, quantityVariance: new Prisma.Decimal(0), toleranceAmount: new Prisma.Decimal(0) }],
  }
}

function approvalReceipts(tx: ReturnType<typeof buildTx>) {
  tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
  tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: "0.000" } })
}

const supplier = {
  id: "supplier-1",
  organizationId: "org-1",
  name: "Sage Distribution",
  isActive: true,
  currentBalance: "0.00",
}

function approvedSupplierPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    organizationId: "org-1",
    supplierId: "supplier-1",
    bankAccountId: "bank-1",
    paymentNumber: "SPAY-20260615-0001",
    status: SupplierPaymentStatus.APPROVED,
    method: "BANK_TRANSFER",
    amount: "100.00",
    currency: "XAF",
    paymentDate: new Date("2026-06-15T00:00:00.000Z"),
    idempotencyKey: "supplier-payment-approval-1",
    documentHash: "sha256:payment-document",
    evidenceHash: "sha256:payment-evidence",
    requestedById: "requester-1",
    approvedById: "approver-1",
    releasedById: null,
    approvedAt: new Date("2026-06-15T00:00:00.000Z"),
    releasedAt: null,
    ledgerPostingBatchId: null,
    postedBusinessEventId: null,
    notes: null,
    metadata: { approvalIdempotencyPayloadHash: "sha256:approval-payload" },
    allocations: [{ id: "alloc-1", supplierInvoiceId: "invoice-1", amount: "100.00" }],
    ...overrides,
  }
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

describe("return inventory recognition kernel", () => {
  it("retains an accounting blocker without consulting rules when the source is unproven", async () => {
    const tx = buildTx()
    tx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-1", status: LedgerPostingBatchStatus.FAILED })
    const result = await postPurchaseCorrectionLedgerInTx(tx as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", sourceType: AccountingSourceType.PURCHASE_RETURN, sourceId: "return-1",
      sourceNumber: "RET-001", sourceDate: new Date("2026-06-15T12:00:00Z"), supplierId: "supplier-1",
      currency: "USD", actorId: "receiver-1", documentHash: "sha256:return", sourceAmount: 100,
      costAmount: 100, netAmount: 0, grossAmount: 100, taxAmount: 0, varianceAmount: 100,
      metadata: { sourceReceiptId: "gr-1" },
    })
    expect(result).toMatchObject({ ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode: "PURCHASE_RETURN_SOURCE_REVIEW" })
    expect(mockedGetOpenPeriodForDate).toHaveBeenCalledWith("org-1", new Date("2026-06-15T12:00:00Z"), tx)
    expect(mockedGetActivePostingRule).not.toHaveBeenCalled()
    expect(tx.journalEntry.create).not.toHaveBeenCalled()
  })

  it.each(["valid", "unverified", "payable", "claim-account", "double", "tax"])("validates actual return allocation effects: %s", async (kind) => {
    const tx = buildTx(), cost = new Prisma.Decimal(100), claim = new Prisma.Decimal(40), grni = new Prisma.Decimal(60)
    const template = invoicePostingRule().lines[0]
    const lines: Array<Record<string, unknown>> = [
      { ...template, lineNumber: 1, mappingKey: "INVENTORY", side: PostingRuleLineSide.CREDIT, amountSource: PostingRuleAmountSource.COST_AMOUNT },
      { ...template, lineNumber: 2, mappingKey: "SUPPLIER_RETURN_CLAIM", amountSource: PostingRuleAmountSource.NET_AMOUNT },
      { ...template, lineNumber: 3, mappingKey: "GRNI", amountSource: PostingRuleAmountSource.VARIANCE_AMOUNT },
    ]
    if (kind === "payable") lines[2].mappingKey = "ACCOUNTS_PAYABLE"
    if (kind === "claim-account") lines[1].account = apMappedAccounts[2]
    if (kind === "double") for (const line of lines) line.multiplier = "2"
    mockedGetActivePostingRule.mockResolvedValue({ id: "return-rule", code: "RETURN", lines })
    tx.chartOfAccount.findMany.mockResolvedValue([...apMappedAccounts, ...["GRNI", "SUPPLIER_RETURN_CLAIM"].map(mappingKey => ({ ...apMappedAccounts[0], id: `acct-${mappingKey.toLowerCase()}`, mappingKey }))])
    tx.journal.findFirst.mockResolvedValue({ id: "purchase-journal", code: "AC" })
    tx.ledgerPostingBatch.update.mockImplementation(async ({ data }) => ({ id: "batch-1", ...data }))
    tx.journalEntry.create.mockImplementation(async ({ data }) => ({ ...data, id: "entry-1", lines: data.lines.create.map((line: Record<string, unknown>, index: number) => ({ ...line, id: `line-${index}` })) }))
    const result = await createAPLedgerPosting(tx as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", periodId: "period-1", sourceType: AccountingSourceType.PURCHASE_RETURN,
      sourceId: "return-1", sourceNumber: "RET-001", sourceDate: new Date("2026-06-15T12:00:00Z"),
      postingPurpose: AccountingPostingPurpose.PURCHASE_RETURN, journalType: JournalType.PURCHASE,
      journalPrefix: "APRET", actorId: "receiver-1", supplierId: "supplier-1", currency: "USD",
      memo: "Return allocation", documentHash: "sha256:return-source", blockerCode: "RETURN_RULE_MISSING", blockerMessage: "Configure return rules",
      conditionContext: kind === "unverified" ? {} : { receiptReturnRecognition: "VERIFIED", receiptReturnRecognitionHash: "sha256:recognition" },
      amounts: { sourceAmount: cost, costAmount: cost, netAmount: claim, varianceAmount: grni, grossAmount: cost, taxAmount: new Prisma.Decimal(kind === "tax" ? 10 : 0) },
    })
    if (kind === "valid") {
      expect(result.ledgerStatus).toBe("POSTED")
      const entry = tx.journalEntry.create.mock.calls[0][0].data
      expect(entry.lines.create.map((line: { accountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }) => [line.accountId, line.debit.toString(), line.credit.toString()])).toEqual([["acct-inventory", "0", "100"], ["acct-supplier_return_claim", "40", "0"], ["acct-grni", "60", "0"]])
    } else {
      expect(result).toMatchObject({ ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode: "PURCHASE_RETURN_RECOGNITION_RULE_REVIEW" })
      expect(tx.journalEntry.create).not.toHaveBeenCalled()
    }
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
  })
})

describe("explicit non-stock invoice treatment", () => {
  it.each(["mixed", "pure", "direct-unmapped", "normalized-currency", "wrong-currency", "receivables", "implicit", "inventory", "control", "control-flag", "liability", "settlement", "foreign", "non-leaf", "missing-account", "double", "wrong-source"])("checks actual residual accounts and source amounts: %s", async kind => {
    const tx = buildTx(), template = invoicePostingRule().lines[0], zero = new Prisma.Decimal(0)
    const stock = new Prisma.Decimal(kind === "pure" ? 0 : 25), residual = new Prisma.Decimal(5)
    const expense = { ...apMappedAccounts[0], id: "acct-treatment", mappingKey: kind === "direct-unmapped" ? null : "TENANT_NON_STOCK", organizationId: "org-1", type: kind === "liability" ? "LIABILITY" : "EXPENSE", normalBalance: "DEBIT", isControlAccount: kind === "control-flag" }
    const lines: Array<Record<string, unknown>> = [
      { ...template, mappingKey: expense.mappingKey, account: kind === "direct-unmapped" ? expense : undefined,
        amountSource: kind === "wrong-source" ? PostingRuleAmountSource.NET_AMOUNT : PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: kind === "implicit" ? null : { receiptResidualTreatment: "NON_STOCK" } },
      { ...template, lineNumber: 2, mappingKey: "GRNI", amountSource: PostingRuleAmountSource.COST_AMOUNT },
      { ...template, lineNumber: 3, mappingKey: "ACCOUNTS_PAYABLE", side: PostingRuleLineSide.CREDIT, amountSource: PostingRuleAmountSource.GROSS_AMOUNT },
    ]
    if (kind === "inventory") { expense.mappingKey = "INVENTORY"; lines[0].mappingKey = "INVENTORY" }
    if (kind === "control") { expense.mappingKey = "SUPPLIER_RETURN_CLAIM"; lines[0].mappingKey = expense.mappingKey }
    if (kind === "settlement") { expense.mappingKey = "BANK"; lines[0].mappingKey = expense.mappingKey }
    if (kind === "receivables") { expense.mappingKey = "ACCOUNTS_RECEIVABLE"; expense.type = "ASSET"; lines[0].mappingKey = expense.mappingKey }
    if (kind === "double") for (const line of lines) line.multiplier = "2"
    const accounts = [...apMappedAccounts.filter(a => a.mappingKey !== expense.mappingKey), { ...apMappedAccounts[0], id: "acct-grni", mappingKey: "GRNI" }, expense]
    const actual = { ...expense, organizationId: kind === "foreign" ? "other-org" : "org-1", currency: kind === "wrong-currency" ? "EUR" : kind === "normalized-currency" ? " usd " : null, _count: { children: kind === "non-leaf" ? 1 : 0 } }
    tx.chartOfAccount.findMany.mockResolvedValueOnce(accounts).mockResolvedValue(kind === "missing-account" ? [] : [actual])
    mockedGetActivePostingRule.mockResolvedValue({ id: "explicit-treatment", code: "NON-STOCK", lines })
    tx.journal.findFirst.mockResolvedValue({ id: "purchase-journal", code: "AC" })
    tx.ledgerPostingBatch.update.mockImplementation(async ({ data }) => ({ id: "batch-1", ...data }))
    tx.journalEntry.create.mockImplementation(async ({ data }) => ({ ...data, id: "entry-1", lines: data.lines.create.map((line: Record<string, unknown>, i: number) => ({ ...line, id: `line-${i}` })) }))
    const result = await createAPLedgerPosting(tx as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", periodId: "period-1", sourceType: AccountingSourceType.SUPPLIER_INVOICE,
      sourceId: "invoice-mixed", sourceNumber: "INV-MIXED", sourceDate: new Date("2026-06-15T12:00:00Z"),
      postingPurpose: AccountingPostingPurpose.SUPPLIER_INVOICE, journalType: JournalType.PURCHASE,
      journalPrefix: "APINV", actorId: "approver", supplierId: "supplier-1", currency: "USD", memo: "Mixed receipt invoice",
      documentHash: "sha256:invoice", blockerCode: "AP_POSTING_RULE_REVIEW", blockerMessage: "Configure invoice rule",
      amounts: { sourceAmount: residual, costAmount: stock, netAmount: stock.plus(residual), grossAmount: stock.plus(residual), taxAmount: zero, varianceAmount: zero },
      conditionContext: { receiptRecognition: "ACCRUAL", receiptResidualTreatment: "NON_STOCK", receiptVarianceDirection: "NONE", receiptRecognitionHash: "a".repeat(64) },
    })
    if (["mixed", "pure", "direct-unmapped", "normalized-currency"].includes(kind)) {
      expect(result.ledgerStatus).toBe("POSTED")
      const posted = tx.journalEntry.create.mock.calls[0][0].data.lines.create
      expect(posted.some((line: { accountId: string }) => line.accountId === "acct-inventory")).toBe(false)
      expect(posted.find((line: { accountId: string }) => line.accountId === expense.id).debit.toFixed(2)).toBe("5.00")
      expect(tx.chartOfAccount.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", isActive: true, deletedAt: null }) }))
    } else {
      expect(result).toMatchObject({ ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode: "AP_NON_STOCK_TREATMENT_REVIEW" })
      expect(tx.journalEntry.create).not.toHaveBeenCalled()
      expect(mockedLinkAccountingSource).not.toHaveBeenCalled()
    }
  })
})

describe("source-bound supplier credit rounding", () => {
  it.each(["credit-variance", "debit-variance", "zero-net-positive-claim", "wrong-balanced-account", "double-amounts", "wrong-direction"])("validates actual allocated credit effects: %s", async kind => {
    const tx = buildTx(), template = invoicePostingRule().lines[0]
    const claim = new Prisma.Decimal(kind === "debit-variance" ? ".02" : kind === "zero-net-positive-claim" ? ".01" : "0"), net = new Prisma.Decimal(kind === "zero-net-positive-claim" ? "0" : ".01")
    const direction = kind === "debit-variance" || kind === "zero-net-positive-claim" ? "DEBIT" : "CREDIT"
    const lines: Array<Record<string, unknown>> = [
      { ...template, lineNumber: 1, mappingKey: "ACCOUNTS_PAYABLE", amountSource: PostingRuleAmountSource.GROSS_AMOUNT },
      { ...template, lineNumber: 2, mappingKey: "SUPPLIER_RETURN_CLAIM", side: PostingRuleLineSide.CREDIT, amountSource: PostingRuleAmountSource.COST_AMOUNT },
      { ...template, lineNumber: 3, mappingKey: kind === "wrong-balanced-account" ? "INVENTORY" : "INVENTORY_VARIANCE", side: direction, amountSource: PostingRuleAmountSource.VARIANCE_AMOUNT },
    ]
    if (kind === "double-amounts") for (const line of lines) line.multiplier = "2"
    mockedGetActivePostingRule.mockResolvedValue({ id: "credit-rule", code: "CREDIT", lines })
    tx.chartOfAccount.findMany.mockResolvedValue([...apMappedAccounts, ...["INVENTORY_VARIANCE", "SUPPLIER_RETURN_CLAIM"].map(mappingKey => ({ ...apMappedAccounts[0], id: `acct-${mappingKey.toLowerCase()}`, mappingKey }))])
    tx.journal.findFirst.mockResolvedValue({ id: "purchase-journal", code: "AC" })
    tx.ledgerPostingBatch.update.mockImplementation(async ({ data }) => ({ id: "batch-1", ...data }))
    tx.journalEntry.create.mockImplementation(async ({ data }) => ({ ...data, id: "entry-1", lines: data.lines.create.map((line: Record<string, unknown>, index: number) => ({ ...line, id: `line-${index}` })) }))
    const result = await postPurchaseCorrectionLedgerInTx(tx as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", sourceType: AccountingSourceType.SUPPLIER_CREDIT_NOTE,
      sourceId: "credit-1", sourceNumber: "CR-1", sourceDate: new Date("2026-06-15T12:00:00Z"),
      actorId: "accountant", supplierId: "supplier-1", currency: "USD", documentHash: "sha256:credit-source",
      sourceAmount: net, costAmount: claim, netAmount: net, varianceAmount: net.minus(claim).abs(), grossAmount: net, taxAmount: 0,
      receiptCreditRecognitionHash: "sha256:verified-credit-allocation", receiptCreditVarianceDirection: kind === "wrong-direction" ? "DEBIT" : direction,
      metadata: { receiptCreditRecognition: "retained source allocation" },
    })
    if (kind === "credit-variance" || kind === "debit-variance" || kind === "zero-net-positive-claim") {
      expect(result.ledgerStatus).toBe("POSTED")
      const actual = tx.journalEntry.create.mock.calls[0][0].data.lines.create.map((line: { accountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }) => [line.accountId, line.debit.toFixed(2), line.credit.toFixed(2)])
      expect(actual).toEqual(kind === "zero-net-positive-claim"
        ? [["acct-supplier_return_claim", "0.00", "0.01"], ["acct-inventory_variance", "0.01", "0.00"]]
        : kind === "credit-variance"
        ? [["acct-accounts_payable", "0.01", "0.00"], ["acct-inventory_variance", "0.00", "0.01"]]
        : [["acct-accounts_payable", "0.01", "0.00"], ["acct-supplier_return_claim", "0.00", "0.02"], ["acct-inventory_variance", "0.01", "0.00"]])
    } else {
      expect(result).toMatchObject({ ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode: "SUPPLIER_CREDIT_RECOGNITION_RULE_REVIEW" })
      expect(tx.journalEntry.create).not.toHaveBeenCalled()
    }
  })
})

describe("receipt inventory recognition kernel", () => {
  it.each(["valid", "payable", "opposite", "partial", "extra", "direct-account", "tax"])("validates actual receipt effects: %s", async (kind) => {
    const tx = buildTx()
    const cost = new Prisma.Decimal(100)
    const rule = invoicePostingRule()
    const receiptLines: Array<Record<string, unknown>> = [
      { ...rule.lines[0], amountSource: PostingRuleAmountSource.COST_AMOUNT },
      { ...rule.lines[2], mappingKey: "GRNI", amountSource: PostingRuleAmountSource.COST_AMOUNT },
    ]
    if (kind === "payable") receiptLines[1].mappingKey = "ACCOUNTS_PAYABLE"
    if (kind === "opposite") { receiptLines[0].side = PostingRuleLineSide.CREDIT; receiptLines[1].side = PostingRuleLineSide.DEBIT }
    if (kind === "partial") for (const line of receiptLines) line.multiplier = "0.5"
    if (kind === "extra") receiptLines.push({ ...rule.lines[1], amountSource: PostingRuleAmountSource.COST_AMOUNT })
    if (kind === "direct-account") receiptLines[1].account = { ...apMappedAccounts[2], mappingKey: "ACCOUNTS_PAYABLE" }
    mockedGetActivePostingRule.mockResolvedValue({ ...rule, sourceType: AccountingSourceType.GOODS_RECEIPT, postingPurpose: AccountingPostingPurpose.GOODS_RECEIPT, lines: receiptLines })
    tx.chartOfAccount.findMany.mockResolvedValue([...apMappedAccounts, { ...apMappedAccounts[0], id: "acct-grni", mappingKey: "GRNI" }])
    tx.journal.findFirst.mockResolvedValue({ id: "purchase-journal", code: "AC" })
    tx.ledgerPostingBatch.update.mockImplementation(async ({ data }) => ({ id: "batch-1", ...data }))
    tx.journalEntry.create.mockImplementation(async ({ data }) => ({ ...data, id: "entry-1", lines: data.lines.create.map((line: Record<string, unknown>, index: number) => ({ ...line, id: `line-${index}` })) }))
    const result = await createAPLedgerPosting(tx as unknown as Prisma.TransactionClient, {
      organizationId: "org-1", periodId: "period-1", sourceType: AccountingSourceType.GOODS_RECEIPT,
      sourceId: "gr-1", sourceNumber: "GR-001", sourceDate: new Date("2026-06-15T12:00:00Z"),
      postingPurpose: AccountingPostingPurpose.GOODS_RECEIPT, journalType: JournalType.PURCHASE,
      journalPrefix: "APGR", actorId: "receiver-1", supplierId: "supplier-1", currency: "USD",
      memo: "Accepted receipt", documentHash: "sha256:receipt-source", blockerCode: "RECEIPT_RULE_MISSING", blockerMessage: "Configure receipt rules",
      amounts: { sourceAmount: cost, costAmount: cost, netAmount: cost, grossAmount: cost, taxAmount: new Prisma.Decimal(kind === "tax" ? 10 : 0) },
    })
    if (kind === "valid") {
      expect(result.ledgerStatus).toBe("POSTED")
      const entry = tx.journalEntry.create.mock.calls[0][0].data
      expect(entry).toMatchObject({ entryNumber: "APGR-20260615-0001", currency: "USD", sourceType: AccountingSourceType.GOODS_RECEIPT })
      expect(entry.lines.create.map((line: { accountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }) => [line.accountId, line.debit.toString(), line.credit.toString()])).toEqual([["acct-inventory", "100", "0"], ["acct-grni", "0", "100"]])
      expect(mockedLinkAccountingSource).toHaveBeenCalledTimes(1)
      expect(mockedRecordPostedJournalCloseInvalidation).toHaveBeenCalledTimes(1)
    } else {
      expect(result).toMatchObject({ ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode: "GOODS_RECEIPT_RULE_REVIEW" })
      expect(tx.journalEntry.create).not.toHaveBeenCalled()
      expect(mockedLinkAccountingSource).not.toHaveBeenCalled()
    }
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
  })
})

beforeEach(() => {
  jest.clearAllMocks()
  mockedReceiptRecognition.mockImplementation(async (_tx, input: InvoiceReceiptRecognitionInput) => legacyRecognition(input))
  mockedCreateLedgerPostingBatch.mockResolvedValue({ id: "batch-1" })
  mockedRecordPostedJournalCloseInvalidation.mockResolvedValue({
    invalidatedCount: 0,
    results: [],
  })
  mockedLinkAccountingSource.mockResolvedValue({ id: "source-link-1" })
  mockedGetOpenPeriodForDate.mockResolvedValue({ id: "period-1" })
  mockedGetActivePostingRule.mockResolvedValue(null)
  mockedRecordBusinessEventInTx.mockResolvedValue({
    event: { id: "event-1" },
    created: true,
  })
  mockedMarkBusinessEventAppliedInTx.mockResolvedValue({
    id: "event-1",
    status: "APPLIED",
  })
})

describe("ap-control.service", () => {
  it.each([
    ["3", "0", "0", "7", true],
    ["3", "0", "0", "8", false],
    ["0", "4", "6", "4", true],
    ["2", "6", "6", "3", false],
  ])("validates uninvoiced returns %s and invoiced returns %s against existing invoices %s", async (uninvoiced, invoiced, reserved, requested, allowed) => {
    const tx = buildTx(), d = (value: string) => new Prisma.Decimal(value)
    approvalReceipts(tx)
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: reserved } })
    tx.purchaseReturn.findMany.mockResolvedValue([{ id: "return", organizationId: "org-1", supplierId: "supplier-1", goodsReceiptId: "gr-1", purchaseOrderId: "po-1", direction: "CORRECTION", reversalOfPurchaseReturnId: null, lines: [{ id: "return-line", organizationId: "org-1", purchaseReturnId: "return", sourceGoodsReceiptLineId: "gr-line-1", sourcePurchaseOrderLineId: "po-line-1", itemId: "item-1", quantity: d(uninvoiced as string).plus(invoiced as string), uninvoicedQuantity: d(uninvoiced as string), invoicedQuantity: d(invoiced as string) }] }])
    const result = buildInvoiceLinePlans(tx as unknown as Prisma.TransactionClient, { organizationId: "org-1", supplierId: "supplier-1", lines: [{ goodsReceiptLineId: "gr-line-1", description: "Returned receipt", quantity: requested as string, unitCost: "100.00" }] })
    if (allowed) expect((await result)[0].availableQuantity.toString()).toBe(requested)
    else await expect(result).rejects.toThrow("exceeds received and uninvoiced goods")
  })

  it("reserves repeated invoice lines together after subtracting uninvoiced returns", async () => {
    const tx = buildTx()
    approvalReceipts(tx)
    tx.purchaseReturn.findMany.mockResolvedValue([{ id: "return", organizationId: "org-1", supplierId: "supplier-1", goodsReceiptId: "gr-1", direction: "CORRECTION", reversalOfPurchaseReturnId: null, lines: [{ organizationId: "org-1", purchaseReturnId: "return", sourceGoodsReceiptLineId: "gr-line-1", sourcePurchaseOrderLineId: "po-line-1", itemId: "item-1", quantity: new Prisma.Decimal(3), uninvoicedQuantity: new Prisma.Decimal(3), invoicedQuantity: new Prisma.Decimal(0) }] }])
    await expect(buildInvoiceLinePlans(tx as unknown as Prisma.TransactionClient, { organizationId: "org-1", supplierId: "supplier-1", lines: [4, 4].map(quantity => ({ goodsReceiptLineId: "gr-line-1", description: "Repeated receipt", quantity, unitCost: "100.00" })) })).rejects.toThrow("exceeds received and uninvoiced goods")
  })

  it.each(["total", "tax", "scope", "ambiguous", "variance", "liability", "batch", "receipt"])("rejects changed approval source %s before financial effects", async (kind) => {
    const tx = buildTx()
    approvalReceipts(tx)
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    const invoice = {
      id: "invoice-source", organizationId: "org-1", supplierId: supplier.id, supplier,
      purchaseOrderId: "po-1", invoiceNumber: "SOURCE", invoiceDate: new Date("2026-06-15"),
      status: "MATCHED", createdById: "maker-1", approvedById: null, ledgerPostingBatchId: null,
      postedBusinessEventId: null, subtotal: new Prisma.Decimal(200), taxAmount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(200), currency: "XAF", documentHash: "sha256:source",
      ...approvalEvidence("invoice-source", "match-source"),
    }
    if (kind === "total") invoice.total = new Prisma.Decimal(999)
    if (kind === "tax") invoice.lines[0].taxAmount = new Prisma.Decimal(25)
    if (kind === "scope") invoice.lines[0].organizationId = "other-org"
    if (kind === "ambiguous") invoice.threeWayMatches.push({ ...invoice.threeWayMatches[0], id: "match-other" })
    if (kind === "variance") invoice.threeWayMatches[0].varianceAmount = new Prisma.Decimal(5)
    if (kind === "liability") tx.supplierLedgerEntry.findFirst.mockResolvedValue({ id: "existing-liability" })
    if (kind === "batch") tx.ledgerPostingBatch.findMany.mockResolvedValue([{ id: "existing-batch" }])
    if (kind === "receipt") tx.goodsReceiptLine.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.findFirst.mockResolvedValue(invoice)
    await expect(approveSupplierInvoice({ organizationId: "org-1", supplierInvoiceId: invoice.id, approvedById: "checker-1" })).rejects.toBeInstanceOf(BusinessRuleError)
    expect(tx.supplierInvoice.updateMany).not.toHaveBeenCalled()
    expect(tx.supplier.update).not.toHaveBeenCalled()
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("rejects duplicate supplier invoices before creating AP evidence", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      status: "RECEIVED",
    })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({
      _sum: { quantity: "0.000" },
    })
    tx.supplierInvoice.findFirst.mockResolvedValue({
      id: "invoice-existing",
      invoiceNumber: "INV-001",
    })

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

  it.each(["RECEIVED", "CANCELLED"])("blocks supplier invoices that exceed received and uninvoiced quantity for %s orders", async status => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      status,
    })
    tx.goodsReceiptLine.findFirst.mockResolvedValue({
      ...mockReceiptLine(),
      receivedQuantity: "5.000",
    })
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({
      _sum: { quantity: "4.000" },
    })

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

  it("rejects cumulative quantities from repeated receipt lines before creating an invoice", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: "0.000" } })

    await expect(prepareSupplierInvoice({
      organizationId: "org-1", supplierId: "supplier-1", createdById: "maker-1",
      invoiceNumber: "INV-SPLIT-OVER", invoiceDate: "2026-06-15",
      lines: [1, 2].map(index => ({
        goodsReceiptLineId: "gr-line-1", description: `Split line ${index}`,
        quantity: "6.000", unitCost: "100.00",
      })),
    })).rejects.toThrow("Supplier invoice quantity exceeds received and uninvoiced goods.")
    expect(tx.supplierInvoice.create).not.toHaveBeenCalled()
    expect(tx.supplier.update).not.toHaveBeenCalled()
    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled()
  })

  it("excludes held inspection receipts from supplier-invoice and accounting evidence", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1", status: "RECEIVED" })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(null)

    await expect(
      prepareSupplierInvoice({
        organizationId: "org-1",
        supplierId: "supplier-1",
        purchaseOrderId: "po-1",
        invoiceNumber: "INV-HELD-001",
        invoiceDate: "2026-06-15",
        createdById: "buyer-1",
        lines: [
          {
            purchaseOrderLineId: "po-line-1",
            goodsReceiptLineId: "gr-line-held",
            itemId: "item-1",
            description: "Held inspection stock",
            quantity: "1.000",
            unitCost: "100.00",
          },
        ],
      }),
    ).rejects.toThrow("Supplier invoice line requires received goods evidence")

    expect(tx.goodsReceiptLine.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "gr-line-held",
          goodsReceipt: expect.objectContaining({
            organizationId: "org-1",
            status: { in: ["RECEIVED", "COMPLETED"] },
          }),
        }),
      }),
    )
    expect(tx.supplierInvoice.create).not.toHaveBeenCalled()
    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled()
  })

  it.each(["RECEIVED", "CANCELLED"])("prepares matched invoice evidence without supplier or accounting ledger effects for %s orders", async status => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      status,
    })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({
      _sum: { quantity: "0.000" },
    })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockResolvedValue({
      id: "invoice-prepared",
      invoiceNumber: "INV-PREPARED",
      status: "MATCHED",
      lines: [{ id: "invoice-line-1" }],
    })
    tx.threeWayMatch.create.mockResolvedValue({
      id: "match-prepared",
      status: "MATCHED",
    })

    const result = await prepareSupplierInvoice({
      organizationId: "org-1",
      supplierId: "supplier-1",
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-PREPARED",
      invoiceDate: "2026-06-15",
      createdById: "maker-1",
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

    expect(tx.goodsReceiptLine.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ purchaseOrderLine: { purchaseOrder: expect.objectContaining({ deletedAt: null, status: { in: expect.arrayContaining(["CANCELLED"]) } }) } }) }));
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(result.ledgerStatus).toBe("PENDING_APPROVAL")
    expect(tx.supplierInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "MATCHED",
          createdById: "maker-1",
          approvedById: null,
          postedAt: null,
        }),
      }),
    )
    expect(tx.supplier.update).not.toHaveBeenCalled()
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("keeps exact matching as default and prepares price variance as disputed exception evidence", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1", status: "RECEIVED" })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({ _sum: { quantity: "0.000" } })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockResolvedValue({
      id: "invoice-disputed",
      invoiceNumber: "INV-VARIANCE",
      status: "DISPUTED",
      lines: [{ id: "invoice-line-variance" }],
    })
    tx.threeWayMatch.create.mockResolvedValue({
      id: "match-exception",
      status: "EXCEPTION",
      varianceAmount: new Prisma.Decimal("20.00"),
      priceVariance: new Prisma.Decimal("20.00"),
    })

    const result = await prepareSupplierInvoice({
      organizationId: "org-1",
      supplierId: "supplier-1",
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-VARIANCE",
      invoiceDate: "2026-06-15",
      createdById: "maker-1",
      lines: [
        {
          purchaseOrderLineId: "po-line-1",
          goodsReceiptLineId: "gr-line-1",
          itemId: "item-1",
          description: "Received stock with supplier variance",
          quantity: "2.000",
          unitCost: "110.00",
        },
      ],
    })

    expect(result.ledgerStatus).toBe("PENDING_MATCH_EXCEPTION")
    expect(tx.supplierInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DISPUTED",
          lines: {
            create: [expect.objectContaining({ matchStatus: "EXCEPTION" })],
          },
        }),
      }),
    )
    expect(tx.threeWayMatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "EXCEPTION",
          varianceAmount: new Prisma.Decimal("20.00"),
          priceVariance: new Prisma.Decimal("20.00"),
          toleranceAmount: new Prisma.Decimal(0),
        }),
      }),
    )
    expect(tx.supplier.update).not.toHaveBeenCalled()
    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled()
  })

  it("rejects a supplier invoice when maker and approver are the same actor", async () => {
    await expect(
      postSupplierInvoice({
        organizationId: "org-1",
        supplierId: "supplier-1",
        invoiceNumber: "INV-SELF",
        invoiceDate: "2026-06-15",
        createdById: "actor-1",
        approvedById: "actor-1",
        lines: [
          {
            goodsReceiptLineId: "gr-line-1",
            description: "Received stock",
            quantity: "1.000",
            unitCost: "100.00",
          },
        ],
      }),
    ).rejects.toThrow("independent approver")

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("rejects duplicate active match exceptions for the same tenant-scoped match", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierInvoiceMatchException.updateMany.mockResolvedValue({ count: 0 })
    tx.supplierInvoice.findFirst.mockResolvedValue({
      id: "invoice-disputed",
      organizationId: "org-1",
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-VARIANCE",
      status: "DISPUTED",
      createdById: "maker-1",
      threeWayMatches: [
        {
          id: "match-exception",
          status: "EXCEPTION",
          varianceAmount: new Prisma.Decimal("20.00"),
          priceVariance: new Prisma.Decimal("20.00"),
        },
      ],
    })
    tx.supplierInvoiceMatchException.findFirst.mockResolvedValue({
      id: "exception-existing",
      status: "OPEN",
    })

    await expect(
      requestSupplierInvoiceMatchException({
        organizationId: "org-1",
        supplierInvoiceId: "invoice-disputed",
        requestedById: "maker-1",
        reason: "Supplier documented a temporary price variance.",
        evidenceReference: "artifact://supplier/invoice-variance-proof",
        expiresAt: "2099-06-30T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.supplierInvoiceMatchException.create).not.toHaveBeenCalled()
  })

  it("does not let an unknown invoice maker request an exception", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierInvoice.findFirst.mockResolvedValue({ id: "invoice-unknown", createdById: null })
    await expect(requestSupplierInvoiceMatchException({ organizationId: "org-1", supplierInvoiceId: "invoice-unknown", requestedById: "maker-1", reason: "Documented variance", evidenceReference: "artifact://variance", expiresAt: "2099-06-30T00:00:00Z" })).rejects.toThrow("Only the supplier invoice maker")
    expect(tx.supplierInvoiceMatchException.create).not.toHaveBeenCalled()
  })

  it("preserves a serialization abort for the reviewed service to retry the transaction", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("Transaction conflict", { code: "P2034", clientVersion: "test" })
    mockDb.$transaction.mockRejectedValueOnce(error)
    await expect(requestSupplierInvoiceMatchException({ organizationId: "org-1", supplierInvoiceId: "invoice", requestedById: "maker", reason: "Documented variance", evidenceReference: "artifact://variance", expiresAt: "2099-06-30T00:00:00Z" })).rejects.toBe(error)
  })

  it("maps a concurrent P2002 match-exception race to the canonical conflict", async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "test", meta: { target: ["organizationId", "threeWayMatchId"] } },
    )
    mockDb.$transaction.mockRejectedValueOnce(error)

    await expect(
      requestSupplierInvoiceMatchException({
        organizationId: "org-1",
        supplierInvoiceId: "invoice-disputed",
        requestedById: "maker-1",
        reason: "Supplier documented a temporary price variance.",
        evidenceReference: "artifact://supplier/invoice-variance-proof",
        expiresAt: "2099-06-30T00:00:00.000Z",
      }),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it("normalizes unexpected match-exception persistence failures without leaking details", async () => {
    mockDb.$transaction.mockRejectedValueOnce(new Error("supplier_invoice_match_exception SQL failed"))

    await expect(
      requestSupplierInvoiceMatchException({
        organizationId: "org-1",
        supplierInvoiceId: "invoice-disputed",
        requestedById: "maker-1",
        reason: "Supplier documented a temporary price variance.",
        evidenceReference: "artifact://supplier/invoice-variance-proof",
        expiresAt: "2099-06-30T00:00:00.000Z",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "INTERNAL_ERROR",
        status: 500,
        expose: false,
        message: "Supplier invoice match exception request could not be completed safely.",
      }),
    )
  })

  it("keeps match-exception reads tenant scoped", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierInvoiceMatchException.updateMany.mockResolvedValue({ count: 0 })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)

    await expect(
      requestSupplierInvoiceMatchException({
        organizationId: "org-2",
        supplierInvoiceId: "invoice-org-1",
        requestedById: "maker-2",
        reason: "Tenant-isolated variance request.",
        evidenceReference: "artifact://org-2/variance-proof",
        expiresAt: "2099-06-30T00:00:00.000Z",
      }),
    ).rejects.toThrow("not found for this organization")

    expect(tx.supplierInvoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "invoice-org-1",
          organizationId: "org-2",
        }),
      }),
    )
    expect(tx.supplierInvoiceMatchException.create).not.toHaveBeenCalled()
  })

  it("enforces maker-checker separation on match-exception review", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierInvoiceMatchException.findFirst.mockResolvedValue({
      id: "exception-1",
      organizationId: "org-1",
      supplierInvoiceId: "invoice-disputed",
      threeWayMatchId: "match-exception",
      status: "OPEN",
      policyVersion: "EXACT_THREE_WAY_MATCH_EXCEPTION_V1",
      requestedById: "maker-1",
      expiresAt: new Date("2099-06-30T00:00:00.000Z"),
    })

    await expect(
      reviewSupplierInvoiceMatchException({
        organizationId: "org-1",
        matchExceptionId: "exception-1",
        reviewedById: "maker-1",
        decision: "APPROVE",
      }),
    ).rejects.toThrow("independent approver")

    expect(tx.supplierInvoiceMatchException.updateMany).not.toHaveBeenCalled()
  })

  it("materializes expiry and blocks review of an expired match exception", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierInvoiceMatchException.findFirst.mockResolvedValue({
      id: "exception-expired",
      organizationId: "org-1",
      supplierInvoiceId: "invoice-disputed",
      threeWayMatchId: "match-exception",
      status: "OPEN",
      policyVersion: "EXACT_THREE_WAY_MATCH_EXCEPTION_V1",
      requestedById: "maker-1",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    })
    tx.supplierInvoiceMatchException.updateMany.mockResolvedValue({ count: 1 })

    await expect(
      reviewSupplierInvoiceMatchException({
        organizationId: "org-1",
        matchExceptionId: "exception-expired",
        reviewedById: "checker-1",
        decision: "APPROVE",
      }),
    ).rejects.toThrow("has expired")

    expect(tx.supplierInvoiceMatchException.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: "OPEN",
        }),
        data: { status: "EXPIRED" },
      }),
    )
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ eventType: "purchase.supplier_invoice.match_exception.expired", payload: expect.objectContaining({ previousStatus: "OPEN", status: "EXPIRED", effectiveAt: "2020-01-01T00:00:00.000Z" }) }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "SUPPLIER_INVOICE_MATCH_EXCEPTION_EXPIRED" }) }))
  })

  it("blocks disputed invoice posting without an approved active exception", async () => {
    const tx = buildTx()
    approvalReceipts(tx)
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierInvoice.findFirst.mockResolvedValue({
      id: "invoice-disputed",
      organizationId: "org-1",
      supplierId: "supplier-1",
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-VARIANCE",
      invoiceDate: new Date("2026-06-15T00:00:00.000Z"),
      status: "DISPUTED",
      subtotal: new Prisma.Decimal("220.00"),
      taxAmount: new Prisma.Decimal("0.00"),
      total: new Prisma.Decimal("220.00"),
      currency: "XAF",
      documentHash: "sha256:variance-document",
      createdById: "maker-1",
      approvedById: null,
      ledgerPostingBatchId: null,
      postedBusinessEventId: null,
      metadata: { gate: "011-purchasing-ap-controls" },
      ...approvalEvidence("invoice-disputed", "match-exception", "110.00"),
      supplier,
    })
    tx.supplierInvoiceMatchException.findFirst.mockResolvedValue(null)

    await expect(
      approveSupplierInvoice({
        organizationId: "org-1",
        supplierInvoiceId: "invoice-disputed",
        approvedById: "checker-1",
      }),
    ).rejects.toThrow("approved active exception")

    expect(tx.supplierInvoice.updateMany).not.toHaveBeenCalled()
    expect(tx.supplier.update).not.toHaveBeenCalled()
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
    expect(mockedCreateLedgerPostingBatch).not.toHaveBeenCalled()
  })

  it("posts through an approved active exception and resolves only its match lifecycle", async () => {
    const tx = buildTx()
    approvalReceipts(tx)
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    const disputedInvoice = {
      id: "invoice-disputed",
      organizationId: "org-1",
      supplierId: "supplier-1",
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-VARIANCE",
      invoiceDate: new Date("2026-06-15T00:00:00.000Z"),
      status: "DISPUTED",
      subtotal: new Prisma.Decimal("220.00"),
      taxAmount: new Prisma.Decimal("0.00"),
      total: new Prisma.Decimal("220.00"),
      currency: "XAF",
      documentHash: "sha256:variance-document",
      createdById: "maker-1",
      approvedById: null,
      ledgerPostingBatchId: null,
      postedBusinessEventId: null,
      metadata: { gate: "011-purchasing-ap-controls" },
      ...approvalEvidence("invoice-disputed", "match-exception", "110.00"),
      supplier,
    }
    tx.supplierInvoice.findFirst.mockResolvedValue(disputedInvoice)
    tx.supplierInvoiceMatchException.findFirst.mockResolvedValue({
      id: "exception-approved",
      expiresAt: new Date("2099-06-30T00:00:00.000Z"),
      policyVersion: "EXACT_THREE_WAY_MATCH_EXCEPTION_V1", requestedById: "maker-1", approvedById: "checker-1", decidedAt: new Date("2026-06-15T00:00:00.000Z"), varianceAmount: new Prisma.Decimal(20), priceVariance: new Prisma.Decimal(20),
    })
    tx.supplierInvoice.updateMany.mockResolvedValue({ count: 1 })
    tx.supplierInvoiceMatchException.updateMany.mockResolvedValue({ count: 1 })
    tx.threeWayMatch.updateMany.mockResolvedValue({ count: 1 })
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.FAILED,
    })
    tx.supplierInvoice.update.mockResolvedValue({
      ...disputedInvoice,
      status: "POSTED",
      approvedById: "checker-1",
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
    })

    const result = await approveSupplierInvoice({
      organizationId: "org-1",
      supplierInvoiceId: "invoice-disputed",
      approvedById: "checker-1",
    })

    expect(result.threeWayMatch).toEqual(
      expect.objectContaining({ id: "match-exception", status: "APPROVED_EXCEPTION" }),
    )
    expect(tx.supplierInvoiceMatchException.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "exception-approved",
          organizationId: "org-1",
          status: "APPROVED",
          expiresAt: { gt: expect.any(Date) },
        }),
        data: expect.objectContaining({
          status: "RESOLVED",
          resolvedById: "checker-1",
          resolvedAt: expect.any(Date),
        }),
      }),
    )
    expect(tx.threeWayMatch.updateMany).toHaveBeenCalledWith({
      where: {
        id: "match-exception",
        organizationId: "org-1",
        status: "EXCEPTION",
      },
      data: { status: "APPROVED_EXCEPTION" },
    })
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        payload: expect.objectContaining({
          matchExceptionId: "exception-approved",
          matchStatus: "APPROVED_EXCEPTION",
        }),
      }),
    )
  })

  it("does not infer a posted journal from a replay missing ledger evidence", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    tx.supplierInvoice.findFirst.mockResolvedValue({
      id: "invoice-posted", status: "POSTED", createdById: "maker-1", approvedById: "checker-1",
      metadata: {}, threeWayMatches: [], ledgerPostingBatchId: null, postedBusinessEventId: null,
    })
    const result = await approveSupplierInvoice({ organizationId: "org-1", supplierInvoiceId: "invoice-posted", approvedById: "checker-1" })
    expect(result.ledgerStatus).toBe("UNVERIFIED")
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
    expect(tx.supplier.update).not.toHaveBeenCalled()
  })

  it.each([false, true])("atomically approves a prepared invoice as a separate checker (receipt accrual: %s)", async (accrued) => {
    const tx = buildTx()
    if (accrued) mockedReceiptRecognition.mockImplementation(async (_tx, input: InvoiceReceiptRecognitionInput) => accruedRecognition(input))
    approvalReceipts(tx)
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    const preparedInvoice = {
      id: "invoice-prepared",
      organizationId: "org-1",
      supplierId: "supplier-1",
      purchaseOrderId: "po-1",
      invoiceNumber: "INV-PREPARED",
      invoiceDate: new Date("2026-06-15T00:00:00.000Z"),
      status: "MATCHED",
      subtotal: new Prisma.Decimal("200.00"),
      taxAmount: new Prisma.Decimal("0.00"),
      total: new Prisma.Decimal("200.00"),
      currency: "XAF",
      documentHash: "sha256:prepared-document",
      createdById: "maker-1",
      approvedById: null,
      ledgerPostingBatchId: null,
      postedBusinessEventId: null,
      metadata: { gate: "011-purchasing-ap-controls" },
      ...approvalEvidence("invoice-prepared", "match-prepared"),
      supplier,
    }
    tx.supplierInvoice.findFirst.mockResolvedValue(preparedInvoice)
    tx.supplierInvoice.updateMany.mockResolvedValue({ count: 1 })
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.FAILED,
    })
    tx.supplierInvoice.update.mockResolvedValue({
      ...preparedInvoice,
      status: "POSTED",
      approvedById: "checker-1",
      ledgerPostingBatchId: "batch-1",
      postedBusinessEventId: "event-1",
    })

    const startedAt = new Date()
    const result = await approveSupplierInvoice({
      organizationId: "org-1",
      supplierInvoiceId: "invoice-prepared",
      approvedById: "checker-1",
    })
    const postedAt = tx.supplierInvoice.updateMany.mock.calls[0][0].data.postedAt as Date
    expect(mockedReceiptRecognition).toHaveBeenCalledWith(tx, expect.objectContaining({ organizationId: "org-1", supplierId: "supplier-1", invoiceId: "invoice-prepared", lines: preparedInvoice.lines }))
    const retained = tx.supplierInvoice.update.mock.calls[0][0].data.metadata
    const payload = mockedRecordBusinessEventInTx.mock.calls[0][1].payload
    if (accrued) {
      const recognition = accruedRecognition(mockedReceiptRecognition.mock.calls[0][1]).recognition
      expect(retained.receiptRecognition).toEqual(recognition)
      expect(payload.receiptRecognitionHash).toBe(hashBusinessPayload(recognition))
      expect(mockedCreateLedgerPostingBatch.mock.calls[0][0].metadata.details.receiptRecognition).toEqual(recognition)
    } else {
      expect(retained).not.toHaveProperty("receiptRecognition")
      expect(payload).not.toHaveProperty("receiptRecognitionHash")
    }
    expect(postedAt.getTime()).toBeGreaterThanOrEqual(startedAt.getTime())
    expect(postedAt.getTime()).toBeLessThanOrEqual(Date.now())
    expect(mockedRecordBusinessEventInTx.mock.calls[0][1].occurredAt).toEqual(postedAt)

    expect(result.ledgerStatus).toBe("BLOCKED_PENDING_RULES")
    expect(tx.supplierInvoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "invoice-prepared",
          status: "MATCHED",
          approvedById: null,
        }),
        data: expect.objectContaining({
          status: "POSTED",
          approvedById: "checker-1",
        }),
      }),
    )
    expect(tx.supplierLedgerEntry.create).toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "purchase.supplier_invoice.posted",
        actorId: "checker-1",
        payload: expect.objectContaining({
          makerId: "maker-1",
          approverId: "checker-1",
        }),
      }),
    )
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "SUPPLIER_INVOICE_APPROVED_AND_POSTED",
          userId: "checker-1",
        }),
      }),
    )
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

  it("audits and blocks supplier payment self-approval in AP service controls", async () => {
    const tx = buildTx()

    await expect(
      approveSupplierPaymentWithControls(
        {
          organizationId: "org-1",
          supplierId: "supplier-1",
          bankAccountId: "bank-1",
          method: "BANK_TRANSFER",
          requestedById: "approver-1",
          approvedById: "approver-1",
          paymentDate: "2026-06-15",
          allocations: [{ supplierInvoiceId: "invoice-1", amount: "100.00" }],
        },
        {
          organizationId: "org-1",
          actorId: "approver-1",
          actorPermissions: ["purchasing.ap.payment.approve"],
          lastAuthAt: Date.now(),
        },
        tx as unknown as Parameters<typeof approveSupplierPaymentWithControls>[2],
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "SUPPLIER_PAYMENT_APPROVE_CONTROL_DENIED",
          organizationId: "org-1",
          userId: "approver-1",
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

  it.each(["approval", "release"])("blocks %s above the credit-adjusted invoice balance before writes", async operation => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.supplierBankAccount.findFirst.mockResolvedValue({id:"bank-1",status:SupplierBankAccountStatus.APPROVED})
    tx.supplierBankChangeRequest.count.mockResolvedValue(0)
    tx.supplierInvoice.findMany.mockResolvedValue([{id:"invoice-1",organizationId:"org-1",supplierId:"supplier-1",currency:"XAF",total:"100.00",amountPaid:"0.00"}])
    tx.supplierCreditNote.findMany.mockResolvedValue([{id:"credit-1",organizationId:"org-1",supplierId:"supplier-1",supplierInvoiceId:"invoice-1",currency:"XAF",total:new Prisma.Decimal("20"),direction:"CORRECTION",postedBusinessEventId:"credit-event"}])
    tx.supplierPayment.findFirst.mockResolvedValue(operation === "release" ? approvedSupplierPayment() : null)
    tx.supplierPayment.count.mockResolvedValue(0)
    tx.supplierPayment.create.mockRejectedValue(new Error("Reached payment write before credit validation"))
    tx.supplierPayment.update.mockRejectedValue(new Error("Reached payment write before credit validation"))
    const call = operation === "release" ? releaseSupplierPayment({organizationId:"org-1",supplierPaymentId:"payment-1",releasedById:"releaser-1",paymentDate:"2026-06-15"}) : approveSupplierPayment({organizationId:"org-1",supplierId:"supplier-1",bankAccountId:"bank-1",method:"BANK_TRANSFER",requestedById:"requester-1",approvedById:"approver-1",paymentDate:"2026-06-15",allocations:[{supplierInvoiceId:"invoice-1",amount:"100.00"}]})
    await expect(call).rejects.toThrow("exceeds outstanding supplier invoice balance")
    expect(tx.supplierPayment.create).not.toHaveBeenCalled()
    expect(tx.supplierPayment.update).not.toHaveBeenCalled()
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
  })

  it("creates approved supplier payment evidence without release side effects", async () => {
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
        amountPaid: "0.00",
        currency: "XAF",
      },
    ])
    tx.supplierPayment.count.mockResolvedValue(0)
    tx.supplierPayment.findFirst.mockResolvedValue(null)
    tx.supplierPayment.create.mockResolvedValue(approvedSupplierPayment())

    const result = await approveSupplierPayment({
      organizationId: "org-1",
      supplierId: "supplier-1",
      bankAccountId: "bank-1",
      method: "BANK_TRANSFER",
      requestedById: "requester-1",
      approvedById: "approver-1",
      paymentDate: "2026-06-15",
      allocations: [{ supplierInvoiceId: "invoice-1", amount: "100.00" }],
      idempotencyKey: "supplier-payment-approval-1",
    })

    expect(result.approvalStatus).toBe("APPROVED")
    expect(tx.supplierPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SupplierPaymentStatus.APPROVED,
          requestedById: "requester-1",
          approvedById: "approver-1",
          releasedById: null,
          allocations: expect.objectContaining({
            create: [expect.objectContaining({ supplierInvoiceId: "invoice-1" })],
          }),
        }),
      }),
    )
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        eventType: "supplier.payment.approved",
        actorId: "approver-1",
      }),
    )
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "SUPPLIER_PAYMENT_APPROVED" }),
      }),
    )
    expect(tx.supplierInvoice.update).not.toHaveBeenCalled()
    expect(tx.supplierLedgerEntry.create).not.toHaveBeenCalled()
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled()
  })
  it("audits and blocks supplier payment self-release in AP service controls", async () => {
    const tx = buildTx()
    tx.supplierPayment.findFirst.mockResolvedValue(
      approvedSupplierPayment({
        requestedById: "treasury-1",
        approvedById: "approver-1",
      }),
    )

    await expect(
      releaseSupplierPaymentWithControls(
        {
          organizationId: "org-1",
          supplierPaymentId: "payment-1",
          releasedById: "treasury-1",
          paymentDate: "2026-06-15",
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
    expect(tx.supplierPayment.update).not.toHaveBeenCalled()
  })
  it("blocks supplier payment release by the stored approver", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierPayment.findFirst.mockResolvedValue(approvedSupplierPayment())

    await expect(
      releaseSupplierPayment({
        organizationId: "org-1",
        supplierPaymentId: "payment-1",
        releasedById: "approver-1",
        paymentDate: "2026-06-15",
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.supplier.findFirst).not.toHaveBeenCalled()
    expect(tx.supplierPayment.update).not.toHaveBeenCalled()
  })
  it("blocks supplier payment release when a bank change is pending", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierPayment.findFirst.mockResolvedValue(approvedSupplierPayment())
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.supplierBankAccount.findFirst.mockResolvedValue({
      id: "bank-1",
      status: SupplierBankAccountStatus.APPROVED,
    })
    tx.supplierBankChangeRequest.count.mockResolvedValue(1)

    await expect(
      releaseSupplierPayment({
        organizationId: "org-1",
        supplierPaymentId: "payment-1",
        releasedById: "releaser-1",
        paymentDate: "2026-06-15",
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.supplierPayment.update).not.toHaveBeenCalled()
  })
  it("blocks supplier payment allocations above invoice outstanding balance", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierPayment.findFirst.mockResolvedValue(
      approvedSupplierPayment({
        amount: "10.00",
        allocations: [{ id: "alloc-1", supplierInvoiceId: "invoice-1", amount: "10.00" }],
      }),
    )
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
        supplierPaymentId: "payment-1",
        releasedById: "releaser-1",
        paymentDate: "2026-06-15",
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.supplierPayment.update).not.toHaveBeenCalled()
  })
  it.each(["matching", "different approver", "different match"])("derives immediate-posting approval evidence from persisted rows: %s", async evidence => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: "po-1", status: "RECEIVED" })
    approvalReceipts(tx)
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockImplementation(async ({ data }) => ({
      ...data, id: "invoice-1",
      approvedById: evidence === "different approver" ? "another-checker" : data.approvedById,
      lines: data.lines.create.map((line: Record<string, unknown>) => ({ ...line, id: "invoice-line-1" })),
    }))
    tx.threeWayMatch.create.mockImplementation(async ({ data }) => ({
      ...data, id: "match-1", supplierInvoiceId: evidence === "different match" ? "another-invoice" : data.supplierInvoiceId,
    }))
    tx.ledgerPostingBatch.update.mockResolvedValue({ id: "batch-1", status: LedgerPostingBatchStatus.FAILED })
    tx.supplierInvoice.update.mockResolvedValue({ id: "invoice-1" })

    const result = await postSupplierInvoice({
      organizationId: "org-1", supplierId: "supplier-1", purchaseOrderId: "po-1",
      invoiceNumber: "INV-AUDIT", invoiceDate: "2026-06-15", createdById: "buyer-1", approvedById: "accountant-1",
      lines: [{ purchaseOrderLineId: "po-line-1", goodsReceiptLineId: "gr-line-1", itemId: "item-1", description: "Received stock", quantity: "2.000", unitCost: "100.00" }],
    })

    expect(result.ledgerStatus).toBe("BLOCKED_PENDING_RULES")
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({
      payload: expect.objectContaining({ makerId: "buyer-1", approverId: evidence === "different approver" ? "another-checker" : "accountant-1", matchStatus: "MATCHED" }),
      metadata: expect.objectContaining({ makerCheckerVerified: evidence === "matching" }),
    }))
    expect(tx.supplierLedgerEntry.create).toHaveBeenCalledTimes(1)
    expect(mockedMarkBusinessEventAppliedInTx).toHaveBeenCalledTimes(1)
  })

  it("posts matched supplier invoices with event evidence and explicit ledger blocker", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      status: "RECEIVED",
    })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({
      _sum: { quantity: "0.000" },
    })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockResolvedValue({
      id: "invoice-1",
      invoiceNumber: "INV-003",
      lines: [{ id: "invoice-line-1" }],
    })
    tx.threeWayMatch.create.mockResolvedValue({ id: "match-1" })
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.FAILED,
    })
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
          metadata: expect.objectContaining({
            blockerCode: "AP_POSTING_RULE_REVIEW",
          }),
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
    expect(mockedRecordPostedJournalCloseInvalidation).not.toHaveBeenCalled()
  })

  it.each([false, true])("posts matched supplier invoices to a balanced AP journal (receipt accrual: %s)", async (accrued) => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    const rule = invoicePostingRule()
    if (accrued) {
      mockedReceiptRecognition.mockImplementation(async (_tx, input: InvoiceReceiptRecognitionInput) => accruedRecognition(input))
      rule.lines[0] = { ...rule.lines[0], mappingKey: "GRNI", amountSource: PostingRuleAmountSource.COST_AMOUNT }
    }
    mockedGetActivePostingRule.mockResolvedValue(rule)
    tx.organization.findFirst.mockResolvedValue({
      country: "CM",
      accountingSettings: { countryPack: null, taxRegime: null },
    })
    tx.supplier.findFirst.mockResolvedValue(supplier)
    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      status: "RECEIVED",
    })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({
      _sum: { quantity: "0.000" },
    })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockResolvedValue({
      id: "invoice-1",
      invoiceNumber: "INV-AP-001",
      lines: [{ id: "invoice-line-1" }],
    })
    tx.threeWayMatch.create.mockResolvedValue({ id: "match-1" })
    tx.chartOfAccount.findMany.mockResolvedValue([...apMappedAccounts, { ...apMappedAccounts[0], id: "acct-grni", mappingKey: "GRNI" }])
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-ac",
      code: "AC",
      type: JournalType.PURCHASE,
    })
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.POSTED,
    })
    tx.journalEntry.create.mockImplementation(async ({ data }) => ({
      ...data, id: "journal-entry-1",
      lines: data.lines.create.map((line: Record<string, unknown>, index: number) => ({ ...line, id: `journal-line-${index}` })),
    }))
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
    expect(mockedReceiptRecognition).toHaveBeenCalledWith(tx, expect.objectContaining({ organizationId: "org-1", invoiceId: "invoice-1", currency: "XAF" }))
    if (accrued) {
      const recognition = accruedRecognition(mockedReceiptRecognition.mock.calls[0][1]).recognition
      expect(tx.supplierInvoice.update.mock.calls[0][0].data.metadata.receiptRecognition).toEqual(recognition)
      expect(mockedRecordBusinessEventInTx.mock.calls[0][1].payload.receiptRecognitionHash).toBe(hashBusinessPayload(recognition))
      expect(tx.journalEntry.create.mock.calls[0][0].data.lines.create).not.toEqual(expect.arrayContaining([expect.objectContaining({ accountId: "acct-inventory" })]))
    }
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
              expect.objectContaining({
                accountId: accrued ? "acct-grni" : "acct-inventory",
                debit: expect.any(Object),
                credit: expect.any(Object),
              }),
              expect.objectContaining({
                accountId: "acct-input_vat",
                debit: expect.any(Object),
                credit: expect.any(Object),
              }),
              expect.objectContaining({
                accountId: "acct-accounts_payable",
                debit: expect.any(Object),
                credit: expect.any(Object),
              }),
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
    expect(mockedRecordPostedJournalCloseInvalidation).toHaveBeenCalledWith(
      tx,
      "org-1",
      {
        journalEntryId: "journal-entry-1",
        periodId: "period-1",
        entryDate: new Date("2026-06-15"),
        correlationId: "batch-1",
        staleReason: "Purchasing/AP journal posting changed certified close evidence.",
      },
      {
        actorId: "accountant-1",
        now: expect.any(Date),
      },
    )
    expect(tx.ledgerAuditEvent.create.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRecordPostedJournalCloseInvalidation.mock.invocationCallOrder[0],
    )
    expect(mockedRecordPostedJournalCloseInvalidation.mock.invocationCallOrder[0]).toBeLessThan(
      mockedRecordBusinessEventInTx.mock.invocationCallOrder[0],
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
    tx.purchaseOrder.findFirst.mockResolvedValue({
      id: "po-1",
      status: "RECEIVED",
    })
    tx.goodsReceiptLine.findFirst.mockResolvedValue(mockReceiptLine())
    tx.supplierInvoiceLine.aggregate.mockResolvedValue({
      _sum: { quantity: "0.000" },
    })
    tx.supplierInvoice.findFirst.mockResolvedValue(null)
    tx.supplierInvoice.create.mockResolvedValue({
      id: "invoice-rollback",
      invoiceNumber: "INV-ROLLBACK",
      lines: [{ id: "invoice-line-1" }],
    })
    tx.threeWayMatch.create.mockResolvedValue({ id: "match-rollback" })
    tx.chartOfAccount.findMany.mockResolvedValue(apMappedAccounts)
    tx.journal.findFirst.mockResolvedValue({
      id: "journal-ac",
      code: "AC",
      type: JournalType.PURCHASE,
    })
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-rollback",
      status: LedgerPostingBatchStatus.POSTED,
    })
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

  it("releases approved supplier payments with bank evidence, allocations, event evidence, and ledger blocker", async () => {
    const tx = buildTx()
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    tx.supplierPayment.findFirst.mockResolvedValue(approvedSupplierPayment())
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
    tx.ledgerPostingBatch.update.mockResolvedValue({
      id: "batch-1",
      status: LedgerPostingBatchStatus.FAILED,
    })
    tx.supplierPayment.update
      .mockResolvedValueOnce({
        ...approvedSupplierPayment({
          status: SupplierPaymentStatus.RELEASED,
          releasedById: "releaser-1",
          releasedAt: new Date("2026-06-15T00:00:00.000Z"),
        }),
      })
      .mockResolvedValueOnce({
        id: "payment-1",
        ledgerPostingBatchId: "batch-1",
        postedBusinessEventId: "event-1",
        allocations: [{ id: "alloc-1", supplierInvoiceId: "invoice-1" }],
      })

    const result = await releaseSupplierPayment({
      organizationId: "org-1",
      supplierPaymentId: "payment-1",
      releasedById: "releaser-1",
      paymentDate: "2026-06-15",
      idempotencyKey: "supplier-payment-release-1",
    })

    expect(result.ledgerStatus).toBe("BLOCKED_PENDING_RULES")
    expect(tx.supplierPayment.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "payment-1" },
        data: expect.objectContaining({
          status: SupplierPaymentStatus.RELEASED,
          releasedById: "releaser-1",
          metadata: expect.objectContaining({
            releaseStatus: "RELEASED",
            releaseIdempotencyPayloadHash: expect.stringMatching(/^sha256:/),
          }),
        }),
      }),
    )
    expect(tx.supplierPayment.create).not.toHaveBeenCalled()
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
          approvedById: "approver-1",
          releasedById: "releaser-1",
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
    tx.supplierPayment.findFirst.mockResolvedValue(
      approvedSupplierPayment({
        status: SupplierPaymentStatus.RELEASED,
        releasedById: "releaser-1",
        ledgerPostingBatchId: "batch-1",
        postedBusinessEventId: "event-1",
        metadata: { releaseIdempotencyPayloadHash: "sha256:previous-payment" },
      }),
    )

    await expect(
      releaseSupplierPayment({
        organizationId: "org-1",
        supplierPaymentId: "payment-1",
        releasedById: "releaser-1",
        paymentDate: "2026-06-15",
        idempotencyKey: "payment-key-1",
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(tx.supplierBankAccount.findFirst).not.toHaveBeenCalled()
    expect(tx.supplierPayment.update).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
  })
})
