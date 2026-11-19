/** @jest-environment node */

import { Prisma } from "@prisma/client"

jest.mock("@/prisma/db", () => ({ db: {} }))

import { db } from "@/prisma/db"
import { getCustomerSettlementWorkbench } from "../customer-settlement-workbench.service"

const context = {
  organizationId: "org-1",
  actorUserId: "checker-1",
  permissions: ["finance.receivables.collect", "finance.receivables.reverse"],
}
const input = { customerId: "customer-1", referenceId: "document-1" }
const decimal = (value: string) => new Prisma.Decimal(value)

function fixture() {
  return {
    id: "document-1", organizationId: "org-1", customerId: "customer-1",
    sourceSalesOrderId: "sale-1",
    sourceSalesOrder: { id: "sale-1", organizationId: "org-1", customerId: "customer-1" },
    documentNumber: "AR-1", currency: "XAF", totalAmount: decimal("100"),
    documentHash: "private-document-hash", customerSnapshot: { email: "private@example.test" },
    lifecycleStates: [{ organizationId: "org-1", documentId: "document-1", status: "PARTIALLY_PAID", paidAmount: decimal("40"), unpaidAmount: decimal("60") }],
  }
}

function settlementFixture() {
  return {
    id: "settlement-1", organizationId: "org-1", customerId: "customer-1", receivedById: "collector-1",
    settlementNumber: "ARSET-1", method: "BANK_TRANSFER", amount: decimal("75.25"), currency: "XAF",
    settlementDate: new Date("2026-11-08T08:00:00Z"), status: "POSTED", externalReference: "BANK-1",
    documentHash: "private-document-hash", evidenceHash: "private-evidence-hash", notes: "private notes",
    allocations: [{ organizationId: "org-1", customerReceivableDocumentId: "document-1", salesOrderId: "sale-1", amount: decimal("40") }],
  }
}

function providerReceiptFixture() {
  return {
    id: "native-receipt-1", organizationId: "org-1", direction: "INBOUND", state: "CONFIRMED", amount: decimal("25"), currencyCode: "XAF",
    legacyPaymentId: null, ledgerPostingBatchId: null, sourceType: null, providerAccountId: "provider-1", providerAuthorityEventId: "event-1",
    providerTransactionId: "BANK-TXN-1", providerReference: "BANK-RECEIPT-1", confirmedAt: new Date("2026-11-08T08:01:00Z"), occurredAt: new Date("2026-11-08T08:00:00Z"),
    metadata: { secret: "private-provider-metadata" },
    providerAccount: { id: "provider-1", organizationId: "org-1", status: "ACTIVE", currencyCode: "XAF", providerCode: "BANK", displayName: "Operating bank",
      paymentRail: { organizationId: "org-1", isActive: true, currencyCode: "XAF", type: "BANK_TRANSFER" },
      settlementLedgerAccount: { organizationId: "org-1", isActive: true, deletedAt: null, type: "ASSET", normalBalance: "DEBIT", currency: "XAF" },
    },
    providerAuthorityEvent: { id: "event-1", organizationId: "org-1", providerAccountId: "provider-1", status: "PROCESSED", signatureValid: true, direction: "INBOUND",
      amount: decimal("25"), currencyCode: "XAF", providerTransactionId: "BANK-TXN-1", providerReference: "BANK-RECEIPT-1", occurredAt: new Date("2026-11-08T08:00:00Z"), rawPayload: { secret: "private-provider-payload" } },
  }
}

describe("customer settlement workbench bounded read", () => {
  let document: ReturnType<typeof fixture>
  let settlements: Array<ReturnType<typeof settlementFixture>>
  let providerReceipts: Array<ReturnType<typeof providerReceiptFixture>>
  let mockClient: {
    customerReceivableDocument: { findFirst: jest.Mock }
    customerSettlement: { findMany: jest.Mock }
    paymentTransaction: { findMany: jest.Mock }
  }

  beforeEach(() => {
    document = fixture()
    settlements = [settlementFixture()]
    providerReceipts = []
    mockClient = {
      customerReceivableDocument: { findFirst: jest.fn(async () => document) },
      customerSettlement: { findMany: jest.fn(async () => settlements) },
      paymentTransaction: { findMany: jest.fn(async () => providerReceipts) },
    }
  })

  const read = () => getCustomerSettlementWorkbench(input, context, mockClient as unknown as typeof db)

  it("returns only the exact serializable document and allocated settlement projection", async () => {
    const result = await read()
    expect(result).toEqual({
      scope: { organizationId: "org-1", actorUserId: "checker-1" },
      document: { customerId: "customer-1", referenceId: "document-1", salesOrderId: "sale-1", documentNumber: "AR-1", currency: "XAF", openAmount: "60.00", status: "PARTIALLY_PAID" },
      canCollect: true,
      providerReceipts: [],
      settlements: [{ id: "settlement-1", settlementNumber: "ARSET-1", method: "BANK_TRANSFER", amount: "75.25", allocatedAmount: "40.00", currency: "XAF", settlementDate: "2026-11-08T08:00:00.000Z", status: "POSTED", externalReference: "BANK-1", canReverse: true }],
    })
    expect(result).toEqual(JSON.parse(JSON.stringify(result)))
    expect(mockClient.customerReceivableDocument.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "document-1", organizationId: "org-1", customerId: "customer-1", customer: { organizationId: "org-1" } },
    }))
    const allocationScope = { organizationId: "org-1", OR: [{ customerReceivableDocumentId: "document-1" }, { salesOrderId: "sale-1" }] }
    expect(mockClient.customerSettlement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1", customerId: "customer-1", allocations: { some: allocationScope } },
      select: expect.objectContaining({ allocations: expect.objectContaining({ where: allocationScope }) }),
    }))
  })

  it.each([{ permissions: [] }, { permissions: ["*"] }, { permissions: ["finance.receivables.read"] }])("does not manufacture critical mutation permissions from %j", async ({ permissions }) => {
    const result = await getCustomerSettlementWorkbench(input, { ...context, permissions }, mockClient as unknown as typeof db)
    expect(result.canCollect).toBe(false)
    expect(result.settlements[0].canReverse).toBe(false)
    expect(result.providerReceipts).toEqual([])
    expect(mockClient.paymentTransaction.findMany).not.toHaveBeenCalled()
  })

  it("blocks self-reversal and already reversed settlements", async () => {
    settlements[0].receivedById = context.actorUserId
    expect((await read()).settlements[0].canReverse).toBe(false)
    settlements[0].receivedById = "collector-1"
    settlements[0].status = "REVERSED"
    expect((await read()).settlements[0].canReverse).toBe(false)
  })

  it.each(["DRAFT", "PAID", "CANCELLED", "VOIDED"])("does not offer collection for lifecycle status %s", async status => {
    document.lifecycleStates[0].status = status
    expect((await read()).canCollect).toBe(false)
  })

  it("does not offer collection for a zero remaining balance", async () => {
    document.lifecycleStates[0].unpaidAmount = decimal("0")
    document.lifecycleStates[0].paidAmount = decimal("100")
    expect((await read()).canCollect).toBe(false)
  })

  it("supports opening receivables without introducing an unscoped sales-order allocation", async () => {
    Object.assign(document, { sourceSalesOrderId: null, sourceSalesOrder: null })
    settlements[0].allocations[0].salesOrderId = null as unknown as string
    const result = await read()
    expect(result.document.salesOrderId).toBeNull()
    expect(mockClient.customerSettlement.findMany.mock.calls[0][0].where.allocations.some.OR).toEqual([{ customerReceivableDocumentId: "document-1" }])
    expect(result.settlements[0].allocatedAmount).toBe("40.00")
  })

  it.each([
    ["tenant", "organizationId", "org-other"],
    ["customer", "customerId", "customer-other"],
  ])("rejects a %s document mismatch before looking up settlements", async (_label, key, value) => {
    Object.assign(document, { [key]: value })
    await expect(read()).rejects.toThrow("Posted customer receivable not found")
    expect(mockClient.customerSettlement.findMany).not.toHaveBeenCalled()
  })

  it("rejects absent documents, missing lifecycle evidence and a foreign sales order", async () => {
    mockClient.customerReceivableDocument.findFirst.mockResolvedValueOnce(null)
    await expect(read()).rejects.toThrow("Posted customer receivable not found")
    document.lifecycleStates = []
    await expect(read()).rejects.toThrow("lifecycle evidence is missing")
    document = fixture()
    document.sourceSalesOrder.organizationId = "org-other"
    await expect(read()).rejects.toThrow("sales order scope does not match")
    expect(mockClient.customerSettlement.findMany).not.toHaveBeenCalled()
  })

  it("rejects stale or corrupt lifecycle totals", async () => {
    document.lifecycleStates[0].unpaidAmount = decimal("99")
    await expect(read()).rejects.toThrow("does not conserve")
    expect(mockClient.customerSettlement.findMany).not.toHaveBeenCalled()
  })

  it.each([
    ["organizationId", "org-other"], ["customerId", "customer-other"], ["currency", "USD"],
  ])("rejects related settlement %s scope mismatches", async (key, value) => {
    Object.assign(settlements[0], { [key]: value })
    await expect(read()).rejects.toThrow("settlement scope does not match")
  })

  it("rejects foreign allocation scope instead of including unrelated debt", async () => {
    settlements[0].allocations[0].organizationId = "org-other"
    await expect(read()).rejects.toThrow("allocation scope does not match")
    settlements[0].allocations[0].organizationId = "org-1"
    settlements[0].allocations[0].customerReceivableDocumentId = "document-other"
    settlements[0].allocations[0].salesOrderId = "sale-other"
    await expect(read()).rejects.toThrow("allocation scope does not match")
  })

  it("rejects forged client amounts or source-order identifiers before any read", async () => {
    await expect(getCustomerSettlementWorkbench({ ...input, salesOrderId: "sale-other", openAmount: "9000" } as typeof input, context, mockClient as unknown as typeof db)).rejects.toThrow()
    expect(mockClient.customerReceivableDocument.findFirst).not.toHaveBeenCalled()
  })

  it("returns only bounded safe native receipt selection data with exact source coherence", async () => {
    providerReceipts = [providerReceiptFixture()]
    const result = await read()
    expect(result.providerReceipts).toEqual([{ id: "native-receipt-1", method: "BANK_TRANSFER", providerReference: "BANK-RECEIPT-1", accountLabel: "Operating bank", amount: "25.00", currency: "XAF", occurredAt: "2026-11-08T08:00:00.000Z" }])
    expect(JSON.stringify(result)).not.toMatch(/private-provider|provider-1|event-1|BANK-TXN-1/)
    expect(mockClient.paymentTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", direction: "INBOUND", state: { in: ["CONFIRMED", "SETTLED"] }, legacyPaymentId: null, ledgerPostingBatchId: null,
        currencyCode: "XAF", amount: { gt: 0, lte: decimal("60") } }), take: 50,
      select: expect.not.objectContaining({ metadata: true, payloadHash: true }),
    }))
    expect(result).toEqual(JSON.parse(JSON.stringify(result)))
  })

  it.each([
    ["foreign tenant", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.organizationId = "org-other" }],
    ["used POS receipt", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.legacyPaymentId = "payment-used" as unknown as null }],
    ["posted receipt", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.ledgerPostingBatchId = "batch-used" as unknown as null }],
    ["customer claim", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.sourceType = "CUSTOMER_SETTLEMENT" as unknown as null }],
    ["pending receipt", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.state = "PENDING" }],
    ["foreign account", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAccount.organizationId = "org-other" }],
    ["inactive rail", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAccount.paymentRail.isActive = false }],
    ["unsupported rail", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAccount.paymentRail.type = "CASH" }],
    ["wrong currency", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.currencyCode = "USD" }],
    ["wrong event amount", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAuthorityEvent.amount = decimal("24") }],
    ["overpayment", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.amount = decimal("61"); receipt.providerAuthorityEvent.amount = decimal("61") }],
    ["unprocessed authority", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAuthorityEvent.status = "VERIFIED" }],
    ["unsigned authority", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAuthorityEvent.signatureValid = false }],
    ["different provider transaction", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAuthorityEvent.providerTransactionId = "another-transaction" }],
    ["different reference", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAuthorityEvent.providerReference = "another-reference" }],
    ["different event time", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.occurredAt = new Date("2026-11-09T08:00:00Z") }],
    ["missing confirmation", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.confirmedAt = null as unknown as Date }],
    ["wrong settlement ledger", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAccount.settlementLedgerAccount.normalBalance = "CREDIT" }],
    ["foreign settlement ledger", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAccount.settlementLedgerAccount.organizationId = "org-other" }],
    ["inactive settlement ledger", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAccount.settlementLedgerAccount.isActive = false }],
    ["wrong ledger currency", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAccount.settlementLedgerAccount.currency = "USD" }],
    ["unknown mobile provider", (receipt: ReturnType<typeof providerReceiptFixture>) => { receipt.providerAccount.paymentRail.type = "MOBILE_MONEY" }],
  ])("omits %s selection previews even if the query adapter returns it", async (_label, mutate) => {
    const receipt = providerReceiptFixture(); mutate(receipt); providerReceipts = [receipt]
    expect((await read()).providerReceipts).toEqual([])
  })

  it("does not query provider receipts when the current document cannot be collected", async () => {
    document.lifecycleStates[0].status = "PAID"
    expect((await read()).providerReceipts).toEqual([])
    expect(mockClient.paymentTransaction.findMany).not.toHaveBeenCalled()
  })
})
