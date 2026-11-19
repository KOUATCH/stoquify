import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { confirmPurchaseReceiving, previewPurchaseReceiving } from "@/services/purchase-order/purchase-receiving-workbench.service"
import {
  approvePurchaseOrder,
  createPurchaseOrder,
  executePurchaseOrderLifecycle,
  getPurchaseOrderApprovalPreview,
  getPurchaseOrderLifecyclePreview,
} from "@/services/purchase-order/purchase-order.service"
import { confirmInvoiceApproval, previewInvoiceApproval } from "@/services/purchasing/invoice-approval.service"
import { confirmInvoicePreparation, loadInvoicePreparationSources, previewInvoicePreparation } from "@/services/purchasing/invoice-preparation.service"
import type { InvoicePreparationDraft } from "@/services/purchasing/invoice-preparation-contracts"
import { postPurchaseReturn, postSupplierCreditNote } from "@/services/purchasing/purchase-return-credit.service"
import { loadSupplierCreditWorkbench } from "@/services/purchasing/supplier-credit-workbench.service"

const describePostgres = process.env.RUN_PURCHASE_COMMERCIAL_POSTGRES === "1" ? describe : describe.skip
const today = () => new Date().toISOString().slice(0, 10)

async function fixture() {
  const suffix = randomUUID()
  const organization = await db.organization.create({ data: {
    slug: `purchase-financial-${suffix}`, name: "Synthetic purchasing company", country: "CM", currency: "XAF", requestedModules: [],
  } })
  const organizationId = organization.id
  const role = await db.role.create({ data: {
    organizationId, code: "PURCHASE_FIXTURE", nameEn: "Synthetic purchasing role",
    permissions: ["purchases.orders.create", "purchases.orders.read", "purchases.orders.update", "purchases.orders.approve",
      "purchases.orders.receive", "purchasing.ap.invoice.post"],
  } })
  async function actor(firstName: string) {
    const user = await db.user.create({ data: {
      organizationId, email: `${randomUUID()}@example.invalid`, firstName, lastName: "Fixture",
      isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [], roles: { connect: { id: role.id } },
    } })
    const session = await db.session.create({ data: {
      userId: user.id, token: randomUUID(), expiresAt: new Date(Date.now() + 3600000),
      assuranceOrganizationId: organizationId, assuranceMethod: "password", assuranceLevel: 1, assuranceVerifiedAt: new Date(),
    } })
    return { organizationId, actorId: user.id, sessionId: session.id, sessionToken: session.token }
  }

  const buyer = await actor("Buyer")
  const reviewer = await actor("Independent reviewer")
  const location = await db.location.create({ data: { organizationId, name: "Fixture location", code: suffix, type: "STORE", allowNegativeStock: false } })
  const supplier = await db.supplier.create({ data: { organizationId, name: "Fixture supplier", code: suffix } })
  const item = await db.item.create({ data: {
    organizationId, slug: suffix, sku: suffix, nameEn: "Tracked fixture stock", imageUrls: [], trackInventory: true, sellingPrice: 150, costPrice: 100,
  } })
  const year = new Date().getUTCFullYear()
  const fiscalYear = await db.fiscalYear.create({ data: {
    organizationId, name: "Synthetic fiscal year", startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  } })
  await db.accountingPeriod.create({ data: {
    organizationId, fiscalYearId: fiscalYear.id, periodNumber: 1, name: "Synthetic open period", startDate: fiscalYear.startDate, endDate: fiscalYear.endDate,
  } })

  const chart = [
    { mappingKey: "INVENTORY", type: "ASSET", normalBalance: "DEBIT" },
    { mappingKey: "GRNI", type: "LIABILITY", normalBalance: "CREDIT" },
    { mappingKey: "INPUT_VAT", type: "ASSET", normalBalance: "DEBIT" },
    { mappingKey: "ACCOUNTS_PAYABLE", type: "LIABILITY", normalBalance: "CREDIT" },
    { mappingKey: "SUPPLIER_RETURN_CLAIM", type: "ASSET", normalBalance: "DEBIT" },
  ] as const
  await db.chartOfAccount.createMany({ data: chart.map(account => ({
    ...account, organizationId, code: account.mappingKey, nameEn: account.mappingKey, currency: "XAF",
  })) })
  await db.journal.createMany({ data: [
    { organizationId, code: "FIXTURE_INVENTORY", nameEn: "Fixture inventory journal", type: "INVENTORY", isDefault: true },
    { organizationId, code: "FIXTURE_PURCHASE", nameEn: "Fixture purchases journal", type: "PURCHASE", isDefault: true },
  ] })
  await db.postingRule.create({ data: {
    organizationId, code: "FIXTURE_RECEIPT", nameEn: "Fixture receipt rule", sourceType: "GOODS_RECEIPT", postingPurpose: "GOODS_RECEIPT",
    lines: { create: [
      { organizationId, lineNumber: 1, mappingKey: "INVENTORY", side: "DEBIT", amountSource: "COST_AMOUNT" },
      { organizationId, lineNumber: 2, mappingKey: "GRNI", side: "CREDIT", amountSource: "COST_AMOUNT" },
    ] },
  } })
  await db.postingRule.create({ data: {
    organizationId, code: "FIXTURE_INVOICE", nameEn: "Fixture invoice rule", sourceType: "SUPPLIER_INVOICE", postingPurpose: "SUPPLIER_INVOICE",
    lines: { create: [
      { organizationId, lineNumber: 1, mappingKey: "GRNI", side: "DEBIT", amountSource: "COST_AMOUNT" },
      { organizationId, lineNumber: 2, mappingKey: "INPUT_VAT", side: "DEBIT", amountSource: "TAX_AMOUNT" },
      { organizationId, lineNumber: 3, mappingKey: "ACCOUNTS_PAYABLE", side: "CREDIT", amountSource: "GROSS_AMOUNT" },
    ] },
  } })
  return { organizationId, buyer, reviewer, locationId: location.id, supplierId: supplier.id, itemId: item.id }
}

type Fixture = Awaited<ReturnType<typeof fixture>>
async function approvedOrder(f: Fixture, discount = 100, shippingCost = 50) {
  const order = await createPurchaseOrder({
    organizationId: f.organizationId, createdById: f.buyer.actorId, supplierId: f.supplierId, locationId: f.locationId,
    date: today(), expectedDeliveryDate: today(), shippingCost,
    orderLines: [{ itemId: f.itemId, quantity: 10, unitPrice: 100, taxRate: 10, discount }],
  })
  const submit = await getPurchaseOrderLifecyclePreview(order.id, f.buyer, "submit")
  await executePurchaseOrderLifecycle(order.id, f.buyer, { kind: "submit", expectedRevision: submit.revision, idempotencyKey: randomUUID() })
  const review = await getPurchaseOrderApprovalPreview(order.id, f.reviewer)
  await approvePurchaseOrder(order.id, f.organizationId, f.reviewer.actorId, { ...f.reviewer, expectedRevision: review.revision, idempotencyKey: randomUUID() })
  return db.purchaseOrder.findUniqueOrThrow({ where: { id: order.id }, include: { lines: true } })
}

async function receiptCommand(f: Fixture, order: Awaited<ReturnType<typeof approvedOrder>>, receivedQuantity: number) {
  const draft = { kind: "receive" as const, orderId: order.id, inspectionOutcome: "PASSED" as const, items: [{ lineId: order.lines[0].id, receivedQuantity }] }
  const preview = await previewPurchaseReceiving(draft, f.reviewer)
  return { draft, expectedRevision: preview.revision, idempotencyKey: randomUUID() }
}

function invoiceDraft(f: Fixture, lines: Array<{ id: string; receivedQuantity: Prisma.Decimal }>, useExpectedTax = true): InvoicePreparationDraft {
  return {
    supplierId: f.supplierId, invoiceNumber: `SYNTHETIC-${randomUUID()}`, invoiceDate: today(), currency: "XAF",
    documentReference: "https://example.invalid/purchase-fixture", documentSha256: "c".repeat(64),
    lines: lines.map(line => ({
      goodsReceiptLineId: line.id, description: "Tracked fixture stock", quantity: line.receivedQuantity.toString(), unitCost: "100",
      discount: line.receivedQuantity.mul(10).toFixed(2), freight: line.receivedQuantity.mul(5).toFixed(2),
      taxRate: useExpectedTax ? "10" : "0", taxAmount: useExpectedTax ? line.receivedQuantity.mul(10).toFixed(2) : "0",
    })),
  }
}

async function ledgerBalances(organizationId: string) {
  const journals = await db.journalEntry.findMany({ where: { organizationId }, include: { lines: { include: { account: true } } } })
  const balances = new Map<string, Prisma.Decimal>()
  for (const journal of journals) {
    const total = journal.lines.reduce((sum, line) => sum.plus(line.debit).minus(line.credit), new Prisma.Decimal(0))
    expect(total.toFixed(2)).toBe("0.00")
    for (const line of journal.lines) {
      const key = line.account.code
      balances.set(key, (balances.get(key) ?? new Prisma.Decimal(0)).plus(line.debit).minus(line.credit))
    }
  }
  return Object.fromEntries([...balances].map(([key, value]) => [key, value.toFixed(2)]))
}

describePostgres("purchase commercial basis on PostgreSQL", () => {
  beforeAll(async () => {
    const database = process.env.PURCHASE_COMMERCIAL_TEST_DATABASE ?? ""
    const target = new URL(process.env.DATABASE_URL ?? "")
    if (!/^stoquify_pos_audit_\d{8}_[a-f0-9]{8,16}$/.test(database) || process.env.NODE_ENV !== "test"
      || !["127.0.0.1", "localhost"].includes(target.hostname) || target.pathname !== `/${database}` || target.searchParams.get("schema") !== "public") {
      throw new Error("An explicitly named disposable purchase database is required")
    }
    const [current] = await db.$queryRaw<Array<{ database: string }>>`select current_database() as database`
    expect(current.database).toBe(database)
    expect(jest.isMockFunction(db.$transaction)).toBe(false)
  })
  afterAll(async () => { await db.$disconnect() })

  it("ties two discounted and freight-bearing receipts to inventory, accrual, tax and the posted supplier liability exactly once", async () => {
    const f = await fixture()
    const order = await approvedOrder(f)
    expect(order.total.toFixed(2)).toBe("1050.00")
    const firstCommand = await receiptCommand(f, order, 4)
    const first = await confirmPurchaseReceiving(firstCommand, f.reviewer)
    expect((await db.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PARTIALLY_RECEIVED")
    await expect(ledgerBalances(f.organizationId)).resolves.toEqual({ INVENTORY: "380.00", GRNI: "-380.00" })
    expect(await confirmPurchaseReceiving(firstCommand, f.reviewer)).toMatchObject({ goodsReceiptId: first.goodsReceiptId, replayed: true })
    const second = await confirmPurchaseReceiving(await receiptCommand(f, order, 6), f.reviewer)
    const receipts = await Promise.all([first, second].map(receipt => db.goodsReceiptLine.findFirstOrThrow({ where: { goodsReceiptId: receipt.goodsReceiptId } })))
    expect(receipts.map(line => line.lineTotal.toFixed(2))).toEqual(["380.00", "570.00"])
    expect(receipts.map(line => line.commercialBasis)).toEqual([
      { version: 1, gross: "400.00", discount: "40.00", freight: "20.00", tax: "40.00", taxRate: "10.000", net: "380.00" },
      { version: 1, gross: "600.00", discount: "60.00", freight: "30.00", tax: "60.00", taxRate: "10.000", net: "570.00" },
    ])
    const stock = await db.inventoryLevel.findUniqueOrThrow({ where: { itemId_locationId: { itemId: f.itemId, locationId: f.locationId } } })
    expect(stock.quantityOnHand.toFixed(3)).toBe("10.000")
    expect(stock.quantityAvailable.toFixed(3)).toBe("10.000")
    expect(stock.totalValue.toFixed(2)).toBe("950.00")
    expect(await db.inventoryTransaction.count({ where: { organizationId: f.organizationId, type: "PURCHASE_RECEIPT" } })).toBe(2)
    await expect(ledgerBalances(f.organizationId)).resolves.toEqual({ INVENTORY: "950.00", GRNI: "-950.00" })

    const sources = await loadInvoicePreparationSources({ supplierId: f.supplierId }, f.buyer)
    expect(sources.receipts).toHaveLength(2)
    expect(sources.receipts.every(row => row.taxRate === "10.000")).toBe(true)
    const draft = invoiceDraft(f, receipts)
    const preview = await previewInvoicePreparation(draft, f.buyer)
    expect(preview).toMatchObject({ subtotal: "950.00", tax: "100.00", total: "1050.00", variance: "0.00" })
    const prepared = await confirmInvoicePreparation({ draft, expectedRevision: preview.revision, idempotencyKey: randomUUID() }, f.buyer)
    expect(prepared.preparationStatus).toBe("MATCHED")
    const approval = await previewInvoiceApproval({ invoiceId: prepared.invoiceId }, f.reviewer)
    expect(approval.blockers).toEqual([])
    const approvalCommand = { invoiceId: prepared.invoiceId, expectedRevision: approval.revision, idempotencyKey: randomUUID() }
    const posted = await confirmInvoiceApproval(approvalCommand, f.reviewer)
    expect(posted).toMatchObject({ ledgerStatus: "POSTED", total: "1050.00" })
    expect(await confirmInvoiceApproval(approvalCommand, f.reviewer)).toMatchObject({ supplierLiabilityId: posted.supplierLiabilityId, replayed: true })
    await expect(ledgerBalances(f.organizationId)).resolves.toEqual({ INVENTORY: "950.00", GRNI: "0.00", INPUT_VAT: "100.00", ACCOUNTS_PAYABLE: "-1050.00" })
  })

  it("retains rounded invoice shares when partial invoices approve in reverse preparation order", async () => {
    const f = await fixture()
    const order = await approvedOrder(f, 100.03, 50.02)
    const receipt = await confirmPurchaseReceiving(await receiptCommand(f, order, 4), f.reviewer)
    const receiptLine = await db.goodsReceiptLine.findFirstOrThrow({ where: { goodsReceiptId: receipt.goodsReceiptId } })
    expect(receiptLine.commercialBasis).toMatchObject({ gross: "400.00", discount: "40.01", freight: "20.01", tax: "40.00", net: "380.00" })

    async function prepareInvoice(quantity: number, discount: string, freight: string) {
      const draft = invoiceDraft(f, [{ ...receiptLine, receivedQuantity: new Prisma.Decimal(quantity) }])
      draft.lines[0] = { ...draft.lines[0], discount, freight }
      const preview = await previewInvoicePreparation(draft, f.buyer)
      expect(preview.variance).toBe("0.00")
      return confirmInvoicePreparation({ draft, expectedRevision: preview.revision, idempotencyKey: randomUUID() }, f.buyer)
    }
    const first = await prepareInvoice(1, "10.00", "5.00")
    const second = await prepareInvoice(3, "30.01", "15.01")
    expect([first.total, second.total]).toEqual(["105.00", "315.00"])
    expect([first.preparationStatus, second.preparationStatus]).toEqual(["MATCHED", "MATCHED"])
    const sources = await loadInvoicePreparationSources({ supplierId: f.supplierId }, f.buyer)
    expect(sources.receipts[0].available).toBe("0")

    async function approveInvoice(invoiceId: string) {
      const preview = await previewInvoiceApproval({ invoiceId }, f.reviewer)
      expect(preview.blockers).toEqual([])
      return confirmInvoiceApproval({ invoiceId, expectedRevision: preview.revision, idempotencyKey: randomUUID() }, f.reviewer)
    }
    expect((await approveInvoice(second.invoiceId)).ledgerStatus).toBe("POSTED")
    await expect(ledgerBalances(f.organizationId)).resolves.toEqual({ INVENTORY: "380.00", GRNI: "-95.00", INPUT_VAT: "30.00", ACCOUNTS_PAYABLE: "-315.00" })
    expect((await approveInvoice(first.invoiceId)).ledgerStatus).toBe("POSTED")
    await expect(ledgerBalances(f.organizationId)).resolves.toEqual({ INVENTORY: "380.00", GRNI: "0.00", INPUT_VAT: "40.00", ACCOUNTS_PAYABLE: "-420.00" })
  })

  it("holds a tax-only deviation before an independent approver can create a liability", async () => {
    const f = await fixture()
    const order = await approvedOrder(f)
    const receipt = await confirmPurchaseReceiving(await receiptCommand(f, order, 10), f.reviewer)
    const receiptLine = await db.goodsReceiptLine.findFirstOrThrow({ where: { goodsReceiptId: receipt.goodsReceiptId } })
    const draft = invoiceDraft(f, [receiptLine], false)
    const preview = await previewInvoicePreparation(draft, f.buyer)
    expect(preview).toMatchObject({ subtotal: "950.00", tax: "0.00", total: "950.00", variance: "100.00" })
    const prepared = await confirmInvoicePreparation({ draft, expectedRevision: preview.revision, idempotencyKey: randomUUID() }, f.buyer)
    expect(prepared.preparationStatus).toBe("DISPUTED")
    const approval = await previewInvoiceApproval({ invoiceId: prepared.invoiceId }, f.reviewer)
    expect(approval.blockers).toContain("MATCH_EXCEPTION")
    await expect(confirmInvoiceApproval({ invoiceId: prepared.invoiceId, expectedRevision: approval.revision, idempotencyKey: randomUUID() }, f.reviewer)).rejects.toThrow()
    await expect(ledgerBalances(f.organizationId)).resolves.toEqual({ INVENTORY: "950.00", GRNI: "-950.00" })
  })

  it("offers only a fully mapped charged return and records its supplier credit without another stock movement", async () => {
    const f = await fixture()
    await db.postingRule.create({ data: {
      organizationId: f.organizationId, code: "FIXTURE_RETURN", nameEn: "Fixture return rule", sourceType: "PURCHASE_RETURN", postingPurpose: "PURCHASE_RETURN",
      lines: { create: [
        { organizationId: f.organizationId, lineNumber: 1, mappingKey: "GRNI", side: "DEBIT", amountSource: "VARIANCE_AMOUNT" },
        { organizationId: f.organizationId, lineNumber: 2, mappingKey: "SUPPLIER_RETURN_CLAIM", side: "DEBIT", amountSource: "NET_AMOUNT" },
        { organizationId: f.organizationId, lineNumber: 3, mappingKey: "INVENTORY", side: "CREDIT", amountSource: "COST_AMOUNT" },
      ] },
    } })
    await db.postingRule.create({ data: {
      organizationId: f.organizationId, code: "FIXTURE_CREDIT", nameEn: "Fixture credit rule", sourceType: "SUPPLIER_CREDIT_NOTE", postingPurpose: "SUPPLIER_CREDIT_NOTE",
      lines: { create: [
        { organizationId: f.organizationId, lineNumber: 1, mappingKey: "ACCOUNTS_PAYABLE", side: "DEBIT", amountSource: "GROSS_AMOUNT" },
        { organizationId: f.organizationId, lineNumber: 2, mappingKey: "SUPPLIER_RETURN_CLAIM", side: "CREDIT", amountSource: "COST_AMOUNT" },
        { organizationId: f.organizationId, lineNumber: 3, mappingKey: "INPUT_VAT", side: "CREDIT", amountSource: "TAX_AMOUNT" },
      ] },
    } })
    const order = await approvedOrder(f)
    const receipt = await confirmPurchaseReceiving(await receiptCommand(f, order, 4), f.reviewer)
    const line = await db.goodsReceiptLine.findFirstOrThrow({ where: { goodsReceiptId: receipt.goodsReceiptId } })
    const draft = invoiceDraft(f, [line])
    const preparation = await previewInvoicePreparation(draft, f.buyer)
    const invoice = await confirmInvoicePreparation({ draft, expectedRevision: preparation.revision, idempotencyKey: randomUUID() }, f.buyer)
    const approval = await previewInvoiceApproval({ invoiceId: invoice.invoiceId }, f.reviewer)
    expect((await confirmInvoiceApproval({ invoiceId: invoice.invoiceId, expectedRevision: approval.revision, idempotencyKey: randomUUID() }, f.reviewer)).ledgerStatus).toBe("POSTED")

    const returned = await postPurchaseReturn({
      organizationId: f.organizationId, purchaseOrderId: order.id, goodsReceiptId: receipt.goodsReceiptId, postedById: f.reviewer.actorId,
      idempotencyKey: randomUUID(), reason: "Supplier accepted a defective unit", lines: [{ sourceGoodsReceiptLineId: line.id, quantity: 1 }],
    })
    expect(returned.ledgerStatus).toBe("POSTED")
    const workbench = await loadSupplierCreditWorkbench(f.organizationId, returned.purchaseReturn.returnNumber)
    expect(workbench.candidates).toHaveLength(1)
    const candidate = workbench.candidates[0]
    const invoiceLine = await db.supplierInvoiceLine.findFirstOrThrow({ where: { supplierInvoiceId: invoice.invoiceId } })
    expect(candidate).toMatchObject({ purchaseReturnId: returned.purchaseReturn.id, supplierInvoiceId: invoice.invoiceId, total: "105.00",
      lines: [{ sourcePurchaseReturnLineId: returned.purchaseReturn.lines[0].id, sourceSupplierInvoiceLineId: invoiceLine.id, quantity: "1" }],
    })
    expect((await loadSupplierCreditWorkbench(randomUUID(), returned.purchaseReturn.returnNumber)).candidates).toEqual([])

    const command = {
      organizationId: f.organizationId, purchaseReturnId: candidate.purchaseReturnId, supplierInvoiceId: candidate.supplierInvoiceId,
      postedById: f.buyer.actorId, idempotencyKey: randomUUID(), creditNoteNumber: "FIXTURE-CREDIT", creditDate: new Date(),
      expectedTotal: candidate.total, documentHash: "sha256:" + "d".repeat(64), reason: "Supplier documented the return credit",
      lines: candidate.lines.map(({ sourcePurchaseReturnLineId, sourceSupplierInvoiceLineId }) => ({ sourcePurchaseReturnLineId, sourceSupplierInvoiceLineId })),
    }
    await expect(postSupplierCreditNote({ ...command, expectedTotal: "105.01" })).rejects.toThrow("expected supplier credit amount changed")
    expect(await db.supplierCreditNote.count({ where: { organizationId: f.organizationId } })).toBe(0)
    await expect(ledgerBalances(f.organizationId)).resolves.toEqual({ INVENTORY: "285.00", GRNI: "0.00", INPUT_VAT: "40.00", ACCOUNTS_PAYABLE: "-420.00", SUPPLIER_RETURN_CLAIM: "95.00" })
    const credit = await postSupplierCreditNote(command)
    expect(credit.ledgerStatus).toBe("POSTED")
    expect(credit.supplierCreditNote.total.toFixed(2)).toBe("105.00")
    expect((await postSupplierCreditNote(command)).supplierCreditNote.id).toBe(credit.supplierCreditNote.id)
    expect((await loadSupplierCreditWorkbench(f.organizationId, returned.purchaseReturn.returnNumber)).candidates).toEqual([])
    expect(await db.inventoryTransaction.count({ where: { organizationId: f.organizationId } })).toBe(2)
    await expect(ledgerBalances(f.organizationId)).resolves.toEqual({ INVENTORY: "285.00", GRNI: "0.00", INPUT_VAT: "30.00", ACCOUNTS_PAYABLE: "-315.00", SUPPLIER_RETURN_CLAIM: "0.00" })
  })
})
