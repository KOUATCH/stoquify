const fs = require("fs")
const path = require("path")

const root = process.cwd()
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
const migration = fs.readFileSync(
  path.join(root, "prisma/migrations/20260819120000_purchase_return_credit_evidence_boundary/migration.sql"),
  "utf8",
)

describe("purchase return and supplier credit evidence boundary", () => {
  it("requires tenant-scoped purchase order, receipt, return, and invoice links", () => {
    expect(schema).toContain("model PurchaseReturn")
    expect(schema).toContain("model SupplierCreditNote")
    expect(migration).toContain('FOREIGN KEY ("organizationId", "purchaseOrderId")')
    expect(migration).toContain('FOREIGN KEY ("organizationId", "goodsReceiptId")')
    expect(migration).toContain('FOREIGN KEY ("organizationId", "purchaseReturnId")')
    expect(migration).toContain('FOREIGN KEY ("organizationId", "supplierInvoiceId")')
    expect(migration).toContain("purchasing_validate_return_header")
    expect(migration).toContain("purchasing_validate_credit_header")
  })

  it("makes correction evidence append-only and requires exact reversal links", () => {
    expect(migration).toContain("purchasing_correction_evidence_append_only")
    expect(migration).toContain('CREATE TRIGGER "purchase_returns_append_only"')
    expect(migration).toContain('CREATE TRIGGER "purchase_return_lines_append_only"')
    expect(migration).toContain('CREATE TRIGGER "supplier_credit_notes_append_only"')
    expect(migration).toContain('CREATE TRIGGER "supplier_credit_note_lines_append_only"')
    expect(migration).toContain('movement."reversalOfTransactionId" = original."inventoryTransactionId"')
    expect(migration).toContain("Supplier credit reversal line must exactly mirror original evidence")
  })

  it("prevents over-returns and duplicate return or supplier-credit commands", () => {
    expect(migration).toContain("Purchase return quantity exceeds source goods receipt quantity")
    expect(migration).toContain("Active supplier credit must be reversed before its purchase return")
    expect(migration).toContain("Supplier credit quantity exceeds or duplicates source supplier invoice quantity")
    expect(migration).toContain('CREATE UNIQUE INDEX "purchase_returns_organizationId_idempotencyKey_key"')
    expect(migration).toContain('CREATE UNIQUE INDEX "supplier_credit_notes_idempotency_key"')
    expect(migration).toContain('CREATE UNIQUE INDEX "supplier_credit_notes_return_direction_key"')
  })
})
