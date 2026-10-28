-- Baseline-only AP and stock-count foundation reconstructed from the schema at
-- commit 1b83ef12c792e1956f1108962ec9634257f55feb. Existing databases that
-- already contain these tables must adopt this migration with
-- `prisma migrate resolve --applied`; they must never execute it.
BEGIN;

DO $baseline_guard$
BEGIN
  IF to_regclass('public.supplier_invoices') IS NOT NULL
    OR to_regclass('public.supplier_payments') IS NOT NULL
    OR to_regclass('public.stock_count_sessions') IS NOT NULL
    OR to_regclass('public.stock_count_lines') IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'AP/stock-count baseline bridge refused: use prisma migrate resolve --applied after schema verification on an existing database.';
  END IF;
END
$baseline_guard$;

-- CreateEnum
CREATE TYPE "SupplierBankAccountStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SupplierBankChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('DRAFT', 'MATCHED', 'POSTED', 'PAYMENT_PENDING', 'PAID', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ThreeWayMatchStatus" AS ENUM ('MATCHED', 'EXCEPTION', 'APPROVED_EXCEPTION', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('DRAFT', 'APPROVED', 'RELEASED', 'POSTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "StockCountStatus" AS ENUM ('DRAFT', 'FROZEN', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "stock_adjustment_lines" ADD COLUMN     "evidenceHash" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "stockCountLineId" TEXT;

-- AlterTable
ALTER TABLE "stock_adjustments" ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "evidenceHash" TEXT,
ADD COLUMN     "ledgerPostingBatchId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "postedBusinessEventId" TEXT,
ADD COLUMN     "sourceCountSessionId" TEXT;

-- CreateTable
CREATE TABLE "supplier_bank_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumberMasked" TEXT,
    "accountNumberHash" TEXT,
    "mobileMoneyProvider" TEXT,
    "mobileMoneyPhoneMasked" TEXT,
    "mobileMoneyPhoneHash" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "SupplierBankAccountStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "evidenceHash" TEXT,
    "documentHash" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bank_change_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "status" "SupplierBankChangeStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "reason" TEXT,
    "newBankName" TEXT,
    "newAccountName" TEXT,
    "newAccountNumberMasked" TEXT,
    "newAccountNumberHash" TEXT,
    "newMobileMoneyProvider" TEXT,
    "newMobileMoneyPhoneMasked" TEXT,
    "newMobileMoneyPhoneHash" TEXT,
    "changeHash" TEXT NOT NULL,
    "documentHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bank_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "SupplierInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "duplicateFingerprint" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "documentHash" TEXT,
    "evidenceHash" TEXT,
    "postedBusinessEventId" TEXT,
    "ledgerPostingBatchId" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "postedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoice_lines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT,
    "goodsReceiptLineId" TEXT,
    "itemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "matchStatus" "ThreeWayMatchStatus" NOT NULL DEFAULT 'MATCHED',
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "three_way_matches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "goodsReceiptId" TEXT,
    "status" "ThreeWayMatchStatus" NOT NULL DEFAULT 'MATCHED',
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedById" TEXT,
    "toleranceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "varianceAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "quantityVariance" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "priceVariance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "evidenceHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "three_way_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "paymentNumber" TEXT NOT NULL,
    "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'DRAFT',
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT,
    "documentHash" TEXT,
    "evidenceHash" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "releasedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "ledgerPostingBatchId" TEXT,
    "postedBusinessEventId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payment_allocations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierPaymentId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_sessions" (
    "id" TEXT NOT NULL,
    "countNumber" TEXT NOT NULL,
    "status" "StockCountStatus" NOT NULL DEFAULT 'DRAFT',
    "countDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotHash" TEXT,
    "countSheetHash" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "locationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedBusinessEventId" TEXT,
    "postedAdjustmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_lines" (
    "id" TEXT NOT NULL,
    "stockCountSessionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "systemQuantity" DECIMAL(12,3) NOT NULL,
    "countedQuantity" DECIMAL(12,3),
    "varianceQuantity" DECIMAL(12,3),
    "unitCost" DECIMAL(12,2),
    "varianceValue" DECIMAL(14,2),
    "reasonCode" TEXT,
    "evidenceHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_organizationId_supplierId_status_idx" ON "supplier_bank_accounts"("organizationId", "supplierId", "status");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_organizationId_accountNumberHash_idx" ON "supplier_bank_accounts"("organizationId", "accountNumberHash");

-- CreateIndex
CREATE INDEX "supplier_bank_accounts_organizationId_mobileMoneyPhoneHash_idx" ON "supplier_bank_accounts"("organizationId", "mobileMoneyPhoneHash");

-- CreateIndex
CREATE INDEX "supplier_bank_change_requests_organizationId_supplierId_sta_idx" ON "supplier_bank_change_requests"("organizationId", "supplierId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "supplier_bank_change_requests_bankAccountId_idx" ON "supplier_bank_change_requests"("bankAccountId");

-- CreateIndex
CREATE INDEX "supplier_invoices_organizationId_status_invoiceDate_idx" ON "supplier_invoices"("organizationId", "status", "invoiceDate");

-- CreateIndex
CREATE INDEX "supplier_invoices_supplierId_status_idx" ON "supplier_invoices"("supplierId", "status");

-- CreateIndex
CREATE INDEX "supplier_invoices_purchaseOrderId_idx" ON "supplier_invoices"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_organizationId_supplierId_invoiceNumber_key" ON "supplier_invoices"("organizationId", "supplierId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_organizationId_idempotencyKey_key" ON "supplier_invoices"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_organizationId_duplicateFingerprint_key" ON "supplier_invoices"("organizationId", "duplicateFingerprint");

-- CreateIndex
CREATE INDEX "supplier_invoice_lines_organizationId_supplierInvoiceId_idx" ON "supplier_invoice_lines"("organizationId", "supplierInvoiceId");

-- CreateIndex
CREATE INDEX "supplier_invoice_lines_purchaseOrderLineId_idx" ON "supplier_invoice_lines"("purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "supplier_invoice_lines_goodsReceiptLineId_idx" ON "supplier_invoice_lines"("goodsReceiptLineId");

-- CreateIndex
CREATE INDEX "supplier_invoice_lines_itemId_idx" ON "supplier_invoice_lines"("itemId");

-- CreateIndex
CREATE INDEX "three_way_matches_organizationId_status_matchedAt_idx" ON "three_way_matches"("organizationId", "status", "matchedAt");

-- CreateIndex
CREATE INDEX "three_way_matches_supplierInvoiceId_idx" ON "three_way_matches"("supplierInvoiceId");

-- CreateIndex
CREATE INDEX "three_way_matches_purchaseOrderId_idx" ON "three_way_matches"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "three_way_matches_goodsReceiptId_idx" ON "three_way_matches"("goodsReceiptId");

-- CreateIndex
CREATE INDEX "supplier_payments_organizationId_status_paymentDate_idx" ON "supplier_payments"("organizationId", "status", "paymentDate");

-- CreateIndex
CREATE INDEX "supplier_payments_supplierId_status_idx" ON "supplier_payments"("supplierId", "status");

-- CreateIndex
CREATE INDEX "supplier_payments_bankAccountId_idx" ON "supplier_payments"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_organizationId_paymentNumber_key" ON "supplier_payments"("organizationId", "paymentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_organizationId_idempotencyKey_key" ON "supplier_payments"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "supplier_payment_allocations_organizationId_supplierInvoice_idx" ON "supplier_payment_allocations"("organizationId", "supplierInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payment_allocations_supplierPaymentId_supplierInvo_key" ON "supplier_payment_allocations"("supplierPaymentId", "supplierInvoiceId");

-- CreateIndex
CREATE INDEX "stock_count_sessions_organizationId_status_countDate_idx" ON "stock_count_sessions"("organizationId", "status", "countDate");

-- CreateIndex
CREATE INDEX "stock_count_sessions_locationId_idx" ON "stock_count_sessions"("locationId");

-- CreateIndex
CREATE INDEX "stock_count_sessions_postedBusinessEventId_idx" ON "stock_count_sessions"("postedBusinessEventId");

-- CreateIndex
CREATE INDEX "stock_count_sessions_postedAdjustmentId_idx" ON "stock_count_sessions"("postedAdjustmentId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_sessions_organizationId_countNumber_key" ON "stock_count_sessions"("organizationId", "countNumber");

-- CreateIndex
CREATE INDEX "stock_count_lines_stockCountSessionId_idx" ON "stock_count_lines"("stockCountSessionId");

-- CreateIndex
CREATE INDEX "stock_count_lines_itemId_idx" ON "stock_count_lines"("itemId");

-- CreateIndex
CREATE INDEX "stock_count_lines_locationId_idx" ON "stock_count_lines"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_lines_stockCountSessionId_itemId_locationId_key" ON "stock_count_lines"("stockCountSessionId", "itemId", "locationId");

-- CreateIndex
CREATE INDEX "stock_adjustment_lines_stockCountLineId_idx" ON "stock_adjustment_lines"("stockCountLineId");

-- CreateIndex
CREATE INDEX "stock_adjustments_sourceCountSessionId_idx" ON "stock_adjustments"("sourceCountSessionId");

-- CreateIndex
CREATE INDEX "stock_adjustments_postedBusinessEventId_idx" ON "stock_adjustments"("postedBusinessEventId");

-- CreateIndex
CREATE INDEX "stock_adjustments_ledgerPostingBatchId_idx" ON "stock_adjustments"("ledgerPostingBatchId");

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_change_requests" ADD CONSTRAINT "supplier_bank_change_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_change_requests" ADD CONSTRAINT "supplier_bank_change_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bank_change_requests" ADD CONSTRAINT "supplier_bank_change_requests_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "supplier_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_goodsReceiptLineId_fkey" FOREIGN KEY ("goodsReceiptLineId") REFERENCES "goods_receipt_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "three_way_matches" ADD CONSTRAINT "three_way_matches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "three_way_matches" ADD CONSTRAINT "three_way_matches_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "three_way_matches" ADD CONSTRAINT "three_way_matches_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "three_way_matches" ADD CONSTRAINT "three_way_matches_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "supplier_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_supplierPaymentId_fkey" FOREIGN KEY ("supplierPaymentId") REFERENCES "supplier_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocations" ADD CONSTRAINT "supplier_payment_allocations_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "supplier_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_stockCountSessionId_fkey" FOREIGN KEY ("stockCountSessionId") REFERENCES "stock_count_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
