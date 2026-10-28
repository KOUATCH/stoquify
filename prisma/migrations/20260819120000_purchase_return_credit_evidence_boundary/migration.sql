-- P0 purchase return / supplier credit evidence boundary.
-- Corrections are immutable tenant-scoped facts; originals are never edited.

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN_REVERSAL';
ALTER TYPE "AccountingSourceType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';
ALTER TYPE "AccountingSourceType" ADD VALUE IF NOT EXISTS 'SUPPLIER_CREDIT_NOTE';
ALTER TYPE "AccountingPostingPurpose" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';
ALTER TYPE "AccountingPostingPurpose" ADD VALUE IF NOT EXISTS 'SUPPLIER_CREDIT_NOTE';
CREATE TYPE "PurchaseCorrectionDirection" AS ENUM ('CORRECTION', 'REVERSAL');

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_organizationId_id_key" ON "purchase_orders"("organizationId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_organizationId_id_key" ON "goods_receipts"("organizationId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_invoices_organizationId_id_key" ON "supplier_invoices"("organizationId", "id");

CREATE TABLE "purchase_returns" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "goodsReceiptId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "returnNumber" TEXT NOT NULL,
  "direction" "PurchaseCorrectionDirection" NOT NULL DEFAULT 'CORRECTION',
  "reversalOfPurchaseReturnId" TEXT,
  "reason" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "payloadHash" VARCHAR(71) NOT NULL,
  "documentHash" VARCHAR(71) NOT NULL,
  "evidenceHash" VARCHAR(71) NOT NULL,
  "inventoryBusinessEventId" TEXT NOT NULL,
  "ledgerPostingBatchId" TEXT,
  "journalEntryId" TEXT,
  "postedById" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_return_lines" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "purchaseReturnId" TEXT NOT NULL,
  "sourceGoodsReceiptLineId" TEXT NOT NULL,
  "sourcePurchaseOrderLineId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "invoicedQuantity" DECIMAL(12,3) NOT NULL,
  "uninvoicedQuantity" DECIMAL(12,3) NOT NULL,
  "unitCost" DECIMAL(12,2) NOT NULL,
  "inventoryAmount" DECIMAL(14,2) NOT NULL,
  "supplierClaimAmount" DECIMAL(14,2) NOT NULL,
  "grniAmount" DECIMAL(14,2) NOT NULL,
  "inventoryTransactionId" TEXT NOT NULL,
  "evidenceHash" VARCHAR(71) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_return_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_return_positive_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "purchase_return_quantity_split" CHECK ("invoicedQuantity" >= 0 AND "uninvoicedQuantity" >= 0 AND "invoicedQuantity" + "uninvoicedQuantity" = "quantity"),
  CONSTRAINT "purchase_return_amount_split" CHECK ("inventoryAmount" >= 0 AND "supplierClaimAmount" >= 0 AND "grniAmount" >= 0 AND "supplierClaimAmount" + "grniAmount" = "inventoryAmount")
);

CREATE TABLE "supplier_credit_notes" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "goodsReceiptId" TEXT NOT NULL,
  "purchaseReturnId" TEXT NOT NULL,
  "supplierInvoiceId" TEXT NOT NULL,
  "direction" "PurchaseCorrectionDirection" NOT NULL DEFAULT 'CORRECTION',
  "reversalOfSupplierCreditNoteId" TEXT,
  "creditNoteNumber" TEXT NOT NULL,
  "normalizedCreditNoteNumber" TEXT NOT NULL,
  "creditDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XAF',
  "subtotal" DECIMAL(14,2) NOT NULL,
  "taxAmount" DECIMAL(14,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "payloadHash" VARCHAR(71) NOT NULL,
  "documentHash" VARCHAR(71) NOT NULL,
  "evidenceHash" VARCHAR(71) NOT NULL,
  "ledgerPostingBatchId" TEXT,
  "journalEntryId" TEXT,
  "postedBusinessEventId" TEXT NOT NULL,
  "postedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_credit_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_credit_nonnegative_amounts" CHECK ("subtotal" >= 0 AND "taxAmount" >= 0 AND "total" > 0 AND "subtotal" + "taxAmount" = "total")
);

CREATE TABLE "supplier_credit_note_lines" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "supplierCreditNoteId" TEXT NOT NULL,
  "sourcePurchaseReturnLineId" TEXT NOT NULL,
  "sourceSupplierInvoiceLineId" TEXT NOT NULL,
  "sourceGoodsReceiptLineId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unitCost" DECIMAL(12,2) NOT NULL,
  "taxRate" DECIMAL(6,3) NOT NULL,
  "taxAmount" DECIMAL(14,2) NOT NULL,
  "lineTotal" DECIMAL(14,2) NOT NULL,
  "evidenceHash" VARCHAR(71) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_credit_note_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_credit_line_positive_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "supplier_credit_line_nonnegative_amounts" CHECK ("unitCost" >= 0 AND "taxRate" >= 0 AND "taxAmount" >= 0 AND "lineTotal" > 0)
);

CREATE UNIQUE INDEX "purchase_returns_organizationId_id_key" ON "purchase_returns"("organizationId", "id");
CREATE UNIQUE INDEX "purchase_returns_organizationId_returnNumber_key" ON "purchase_returns"("organizationId", "returnNumber");
CREATE UNIQUE INDEX "purchase_returns_organizationId_idempotencyKey_key" ON "purchase_returns"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "purchase_returns_organizationId_evidenceHash_key" ON "purchase_returns"("organizationId", "evidenceHash");
CREATE UNIQUE INDEX "purchase_returns_reversalOfPurchaseReturnId_key" ON "purchase_returns"("reversalOfPurchaseReturnId");
CREATE INDEX "purchase_returns_po_occurred_idx" ON "purchase_returns"("organizationId", "purchaseOrderId", "occurredAt");
CREATE INDEX "purchase_returns_receipt_occurred_idx" ON "purchase_returns"("organizationId", "goodsReceiptId", "occurredAt");
CREATE INDEX "purchase_returns_direction_occurred_idx" ON "purchase_returns"("organizationId", "direction", "occurredAt");

CREATE UNIQUE INDEX "purchase_return_lines_organizationId_id_key" ON "purchase_return_lines"("organizationId", "id");
CREATE UNIQUE INDEX "purchase_return_lines_source_key" ON "purchase_return_lines"("organizationId", "purchaseReturnId", "sourceGoodsReceiptLineId");
CREATE UNIQUE INDEX "purchase_return_lines_inventoryTransactionId_key" ON "purchase_return_lines"("inventoryTransactionId");
CREATE INDEX "purchase_return_lines_receipt_line_idx" ON "purchase_return_lines"("organizationId", "sourceGoodsReceiptLineId");
CREATE INDEX "purchase_return_lines_po_line_idx" ON "purchase_return_lines"("organizationId", "sourcePurchaseOrderLineId");

CREATE UNIQUE INDEX "supplier_credit_notes_organizationId_id_key" ON "supplier_credit_notes"("organizationId", "id");
CREATE UNIQUE INDEX "supplier_credit_notes_supplier_number_key" ON "supplier_credit_notes"("organizationId", "supplierId", "normalizedCreditNoteNumber");
CREATE UNIQUE INDEX "supplier_credit_notes_supplier_document_key" ON "supplier_credit_notes"("organizationId", "supplierId", "documentHash");
CREATE UNIQUE INDEX "supplier_credit_notes_idempotency_key" ON "supplier_credit_notes"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "supplier_credit_notes_return_direction_key" ON "supplier_credit_notes"("organizationId", "purchaseReturnId", "direction");
CREATE UNIQUE INDEX "supplier_credit_notes_evidence_key" ON "supplier_credit_notes"("organizationId", "evidenceHash");
CREATE UNIQUE INDEX "supplier_credit_notes_reversal_key" ON "supplier_credit_notes"("reversalOfSupplierCreditNoteId");
CREATE INDEX "supplier_credit_notes_po_date_idx" ON "supplier_credit_notes"("organizationId", "purchaseOrderId", "creditDate");
CREATE INDEX "supplier_credit_notes_receipt_date_idx" ON "supplier_credit_notes"("organizationId", "goodsReceiptId", "creditDate");
CREATE INDEX "supplier_credit_notes_invoice_date_idx" ON "supplier_credit_notes"("organizationId", "supplierInvoiceId", "creditDate");

CREATE UNIQUE INDEX "supplier_credit_note_lines_organizationId_id_key" ON "supplier_credit_note_lines"("organizationId", "id");
CREATE UNIQUE INDEX "supplier_credit_note_lines_source_key" ON "supplier_credit_note_lines"("organizationId", "supplierCreditNoteId", "sourcePurchaseReturnLineId");
CREATE INDEX "supplier_credit_note_lines_invoice_line_idx" ON "supplier_credit_note_lines"("organizationId", "sourceSupplierInvoiceLineId");
CREATE INDEX "supplier_credit_note_lines_receipt_line_idx" ON "supplier_credit_note_lines"("organizationId", "sourceGoodsReceiptLineId");

ALTER TABLE "purchase_returns"
  ADD CONSTRAINT "purchase_returns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_returns_po_tenant_fkey" FOREIGN KEY ("organizationId", "purchaseOrderId") REFERENCES "purchase_orders"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_returns_receipt_tenant_fkey" FOREIGN KEY ("organizationId", "goodsReceiptId") REFERENCES "goods_receipts"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_returns_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_returns_reversal_fkey" FOREIGN KEY ("reversalOfPurchaseReturnId") REFERENCES "purchase_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_return_lines"
  ADD CONSTRAINT "purchase_return_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_return_lines_return_tenant_fkey" FOREIGN KEY ("organizationId", "purchaseReturnId") REFERENCES "purchase_returns"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_return_lines_receipt_line_fkey" FOREIGN KEY ("sourceGoodsReceiptLineId") REFERENCES "goods_receipt_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "purchase_return_lines_po_line_fkey" FOREIGN KEY ("sourcePurchaseOrderLineId") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_credit_notes"
  ADD CONSTRAINT "supplier_credit_notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_notes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_notes_po_tenant_fkey" FOREIGN KEY ("organizationId", "purchaseOrderId") REFERENCES "purchase_orders"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_notes_receipt_tenant_fkey" FOREIGN KEY ("organizationId", "goodsReceiptId") REFERENCES "goods_receipts"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_notes_return_tenant_fkey" FOREIGN KEY ("organizationId", "purchaseReturnId") REFERENCES "purchase_returns"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_notes_invoice_tenant_fkey" FOREIGN KEY ("organizationId", "supplierInvoiceId") REFERENCES "supplier_invoices"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_notes_reversal_fkey" FOREIGN KEY ("reversalOfSupplierCreditNoteId") REFERENCES "supplier_credit_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_credit_note_lines"
  ADD CONSTRAINT "supplier_credit_note_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_note_lines_credit_tenant_fkey" FOREIGN KEY ("organizationId", "supplierCreditNoteId") REFERENCES "supplier_credit_notes"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_note_lines_return_line_tenant_fkey" FOREIGN KEY ("organizationId", "sourcePurchaseReturnLineId") REFERENCES "purchase_return_lines"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_note_lines_invoice_line_fkey" FOREIGN KEY ("sourceSupplierInvoiceLineId") REFERENCES "supplier_invoice_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_credit_note_lines_receipt_line_fkey" FOREIGN KEY ("sourceGoodsReceiptLineId") REFERENCES "goods_receipt_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "purchasing_validate_return_header"()
RETURNS TRIGGER AS $$
DECLARE source_receipt RECORD; source_order RECORD; original_return RECORD;
BEGIN
  SELECT "purchaseOrderId", "status", "inventoryPostedAt" INTO source_receipt
    FROM "goods_receipts" WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."goodsReceiptId";
  SELECT "supplierId" INTO source_order
    FROM "purchase_orders" WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."purchaseOrderId";
  IF source_receipt IS NULL OR source_order IS NULL
     OR source_receipt."purchaseOrderId" <> NEW."purchaseOrderId"
     OR source_order."supplierId" <> NEW."supplierId"
     OR source_receipt."inventoryPostedAt" IS NULL
     OR source_receipt."status" NOT IN ('RECEIVED', 'COMPLETED') THEN
    RAISE EXCEPTION 'Purchase return source purchase order / goods receipt chain is unsupported or cross-tenant' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'CORRECTION' AND NEW."reversalOfPurchaseReturnId" IS NOT NULL THEN
    RAISE EXCEPTION 'Purchase return correction cannot reference a reversal source' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'REVERSAL' THEN
    SELECT * INTO original_return FROM "purchase_returns"
      WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."reversalOfPurchaseReturnId";
    IF original_return IS NULL OR original_return."direction" <> 'CORRECTION'
       OR original_return."purchaseOrderId" <> NEW."purchaseOrderId"
       OR original_return."goodsReceiptId" <> NEW."goodsReceiptId"
       OR original_return."supplierId" <> NEW."supplierId" THEN
      RAISE EXCEPTION 'Purchase return reversal must reference its tenant-scoped original correction' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "supplier_credit_notes" credit
       WHERE credit."organizationId" = NEW."organizationId"
         AND credit."purchaseReturnId" = original_return."id"
         AND credit."direction" = 'CORRECTION'
         AND NOT EXISTS (
           SELECT 1 FROM "supplier_credit_notes" reversal
            WHERE reversal."organizationId" = NEW."organizationId"
              AND reversal."reversalOfSupplierCreditNoteId" = credit."id"
         )
    ) THEN
      RAISE EXCEPTION 'Active supplier credit must be reversed before its purchase return' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "purchase_returns_validate_source"
BEFORE INSERT ON "purchase_returns" FOR EACH ROW EXECUTE FUNCTION "purchasing_validate_return_header"();

CREATE OR REPLACE FUNCTION "purchasing_validate_return_line"()
RETURNS TRIGGER AS $$
DECLARE return_header RECORD; receipt_line RECORD; movement RECORD; net_returned DECIMAL(12,3);
BEGIN
  SELECT * INTO return_header FROM "purchase_returns"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."purchaseReturnId";
  SELECT grl.* INTO receipt_line FROM "goods_receipt_lines" grl
    JOIN "goods_receipts" gr ON gr."id" = grl."goodsReceiptId"
   WHERE gr."organizationId" = NEW."organizationId"
     AND grl."id" = NEW."sourceGoodsReceiptLineId"
     AND grl."goodsReceiptId" = return_header."goodsReceiptId";
  SELECT * INTO movement FROM "inventory_transactions"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."inventoryTransactionId";
  IF return_header IS NULL OR receipt_line IS NULL
     OR receipt_line."purchaseOrderLineId" <> NEW."sourcePurchaseOrderLineId"
     OR receipt_line."itemId" <> NEW."itemId"
     OR movement IS NULL OR movement."referenceType" <> 'RETURN'
     OR movement."referenceId" <> NEW."purchaseReturnId"
     OR ABS(movement."quantity") <> NEW."quantity"
     OR (return_header."direction" = 'CORRECTION' AND (movement."type" <> 'PURCHASE_RETURN' OR movement."quantity" >= 0))
     OR (return_header."direction" = 'REVERSAL' AND (movement."type" <> 'PURCHASE_RETURN_REVERSAL' OR movement."quantity" <= 0)) THEN
    RAISE EXCEPTION 'Purchase return line is not backed by its tenant-scoped receipt and inventory movement' USING ERRCODE = '23514';
  END IF;
  IF return_header."direction" = 'CORRECTION' THEN
    SELECT COALESCE(SUM(CASE pr."direction" WHEN 'CORRECTION' THEN prl."quantity" ELSE -prl."quantity" END), 0)
      INTO net_returned FROM "purchase_return_lines" prl
      JOIN "purchase_returns" pr ON pr."id" = prl."purchaseReturnId"
     WHERE pr."organizationId" = NEW."organizationId"
       AND prl."sourceGoodsReceiptLineId" = NEW."sourceGoodsReceiptLineId";
    IF net_returned + NEW."quantity" > receipt_line."receivedQuantity" THEN
      RAISE EXCEPTION 'Purchase return quantity exceeds source goods receipt quantity' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM "purchase_return_lines" original
       WHERE original."purchaseReturnId" = return_header."reversalOfPurchaseReturnId"
         AND original."sourceGoodsReceiptLineId" = NEW."sourceGoodsReceiptLineId"
         AND original."quantity" = NEW."quantity"
         AND original."invoicedQuantity" = NEW."invoicedQuantity"
         AND original."uninvoicedQuantity" = NEW."uninvoicedQuantity"
         AND original."unitCost" = NEW."unitCost"
         AND movement."reversalOfTransactionId" = original."inventoryTransactionId"
    ) THEN
      RAISE EXCEPTION 'Purchase return reversal line must exactly mirror original stock evidence' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "purchase_return_lines_validate_source"
BEFORE INSERT ON "purchase_return_lines" FOR EACH ROW EXECUTE FUNCTION "purchasing_validate_return_line"();

CREATE OR REPLACE FUNCTION "purchasing_validate_credit_header"()
RETURNS TRIGGER AS $$
DECLARE source_return RECORD; source_invoice RECORD; original_credit RECORD;
BEGIN
  SELECT * INTO source_return FROM "purchase_returns"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."purchaseReturnId";
  SELECT * INTO source_invoice FROM "supplier_invoices"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."supplierInvoiceId";
  IF source_return IS NULL OR source_invoice IS NULL
     OR source_return."purchaseOrderId" <> NEW."purchaseOrderId"
     OR source_return."goodsReceiptId" <> NEW."goodsReceiptId"
     OR source_return."supplierId" <> NEW."supplierId"
     OR source_invoice."purchaseOrderId" <> NEW."purchaseOrderId"
     OR source_invoice."supplierId" <> NEW."supplierId"
     OR source_invoice."postedAt" IS NULL THEN
    RAISE EXCEPTION 'Supplier credit source return / invoice chain is unsupported or cross-tenant' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'CORRECTION' AND (source_return."direction" <> 'CORRECTION' OR NEW."reversalOfSupplierCreditNoteId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Supplier credit correction must reference an original purchase return' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'CORRECTION' AND EXISTS (
    SELECT 1 FROM "purchase_returns" reversal
     WHERE reversal."organizationId" = NEW."organizationId"
       AND reversal."reversalOfPurchaseReturnId" = source_return."id"
  ) THEN
    RAISE EXCEPTION 'Supplier credit cannot be posted for a reversed purchase return' USING ERRCODE = '23514';
  END IF;
  IF NEW."direction" = 'REVERSAL' THEN
    SELECT * INTO original_credit FROM "supplier_credit_notes"
      WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."reversalOfSupplierCreditNoteId";
    IF original_credit IS NULL OR original_credit."direction" <> 'CORRECTION'
       OR original_credit."purchaseReturnId" <> NEW."purchaseReturnId"
       OR original_credit."supplierInvoiceId" <> NEW."supplierInvoiceId" THEN
      RAISE EXCEPTION 'Supplier credit reversal must reference its tenant-scoped original credit' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "supplier_credit_notes_validate_source"
BEFORE INSERT ON "supplier_credit_notes" FOR EACH ROW EXECUTE FUNCTION "purchasing_validate_credit_header"();

CREATE OR REPLACE FUNCTION "purchasing_validate_credit_line"()
RETURNS TRIGGER AS $$
DECLARE credit_header RECORD; return_line RECORD; invoice_line RECORD; net_credited DECIMAL(12,3);
BEGIN
  SELECT * INTO credit_header FROM "supplier_credit_notes"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."supplierCreditNoteId";
  SELECT * INTO return_line FROM "purchase_return_lines"
    WHERE "organizationId" = NEW."organizationId" AND "id" = NEW."sourcePurchaseReturnLineId";
  SELECT sil.* INTO invoice_line FROM "supplier_invoice_lines" sil
    JOIN "supplier_invoices" si ON si."id" = sil."supplierInvoiceId"
   WHERE si."organizationId" = NEW."organizationId"
     AND sil."id" = NEW."sourceSupplierInvoiceLineId"
     AND sil."supplierInvoiceId" = credit_header."supplierInvoiceId";
  IF credit_header IS NULL OR return_line IS NULL OR invoice_line IS NULL
     OR return_line."purchaseReturnId" <> credit_header."purchaseReturnId"
     OR return_line."sourceGoodsReceiptLineId" <> NEW."sourceGoodsReceiptLineId"
     OR invoice_line."goodsReceiptLineId" <> NEW."sourceGoodsReceiptLineId"
     OR invoice_line."itemId" <> NEW."itemId" OR return_line."itemId" <> NEW."itemId"
     OR return_line."invoicedQuantity" <> NEW."quantity" THEN
    RAISE EXCEPTION 'Supplier credit line must match its return, receipt and posted invoice evidence' USING ERRCODE = '23514';
  END IF;
  IF credit_header."direction" = 'CORRECTION' THEN
    SELECT COALESCE(SUM(CASE credit."direction" WHEN 'CORRECTION' THEN line."quantity" ELSE -line."quantity" END), 0)
      INTO net_credited FROM "supplier_credit_note_lines" line
      JOIN "supplier_credit_notes" credit ON credit."id" = line."supplierCreditNoteId"
     WHERE credit."organizationId" = NEW."organizationId"
       AND line."sourceSupplierInvoiceLineId" = NEW."sourceSupplierInvoiceLineId";
    IF net_credited + NEW."quantity" > invoice_line."quantity" THEN
      RAISE EXCEPTION 'Supplier credit quantity exceeds or duplicates source supplier invoice quantity' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF credit_header."direction" = 'REVERSAL' AND NOT EXISTS (
    SELECT 1 FROM "supplier_credit_note_lines" original
     WHERE original."supplierCreditNoteId" = credit_header."reversalOfSupplierCreditNoteId"
       AND original."sourcePurchaseReturnLineId" = NEW."sourcePurchaseReturnLineId"
       AND original."sourceSupplierInvoiceLineId" = NEW."sourceSupplierInvoiceLineId"
       AND original."quantity" = NEW."quantity" AND original."unitCost" = NEW."unitCost"
       AND original."taxAmount" = NEW."taxAmount" AND original."lineTotal" = NEW."lineTotal"
  ) THEN
    RAISE EXCEPTION 'Supplier credit reversal line must exactly mirror original evidence' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "supplier_credit_note_lines_validate_source"
BEFORE INSERT ON "supplier_credit_note_lines" FOR EACH ROW EXECUTE FUNCTION "purchasing_validate_credit_line"();

CREATE OR REPLACE FUNCTION "purchasing_correction_evidence_append_only"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Purchase return and supplier credit evidence is immutable and append-only' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "purchase_returns_append_only" BEFORE UPDATE OR DELETE ON "purchase_returns" FOR EACH ROW EXECUTE FUNCTION "purchasing_correction_evidence_append_only"();
CREATE TRIGGER "purchase_return_lines_append_only" BEFORE UPDATE OR DELETE ON "purchase_return_lines" FOR EACH ROW EXECUTE FUNCTION "purchasing_correction_evidence_append_only"();
CREATE TRIGGER "supplier_credit_notes_append_only" BEFORE UPDATE OR DELETE ON "supplier_credit_notes" FOR EACH ROW EXECUTE FUNCTION "purchasing_correction_evidence_append_only"();
CREATE TRIGGER "supplier_credit_note_lines_append_only" BEFORE UPDATE OR DELETE ON "supplier_credit_note_lines" FOR EACH ROW EXECUTE FUNCTION "purchasing_correction_evidence_append_only"();
