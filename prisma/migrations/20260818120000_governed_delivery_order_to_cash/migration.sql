-- Governed full-delivery order-to-cash slice. Existing POS rows retain POS defaults.
CREATE TYPE "SalesOrderChannel" AS ENUM ('POS', 'DELIVERY');
CREATE TYPE "DeliveryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');
CREATE TYPE "DeliveryGoodsIssueKind" AS ENUM ('ISSUE', 'REVERSAL');
CREATE TYPE "DeliveryBillingStatus" AS ENUM ('POSTED', 'CREDITED');

ALTER TYPE "AccountingSourceType" ADD VALUE IF NOT EXISTS 'DELIVERY_GOODS_ISSUE';
ALTER TYPE "AccountingSourceType" ADD VALUE IF NOT EXISTS 'DELIVERY_ORDER';
ALTER TYPE "AccountingSourceType" ADD VALUE IF NOT EXISTS 'DELIVERY_INVOICE';
ALTER TYPE "AccountingPostingPurpose" ADD VALUE IF NOT EXISTS 'GOODS_ISSUE';
ALTER TYPE "AccountingPostingPurpose" ADD VALUE IF NOT EXISTS 'SALES_INVOICE';

ALTER TABLE "sales_orders"
  ADD COLUMN "channel" "SalesOrderChannel" NOT NULL DEFAULT 'POS',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryAddress" JSONB,
  ADD COLUMN "priceTaxSnapshotHash" VARCHAR(64),
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "confirmedById" TEXT,
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "deliveredById" TEXT;

ALTER TABLE "sales_order_lines"
  ADD COLUMN "reservedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveredQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "billedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0;

CREATE TABLE "delivery_reservations" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "salesOrderId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL, "status" "DeliveryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1, "documentHash" VARCHAR(64) NOT NULL,
  "commandEventId" VARCHAR(191) NOT NULL, "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3), "releasedAt" TIMESTAMP(3), "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_reservation_lines" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "reservationId" TEXT NOT NULL,
  "salesOrderLineId" TEXT NOT NULL, "itemId" TEXT NOT NULL, "locationId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL, "consumedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_reservation_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_goods_issues" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "salesOrderId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL, "kind" "DeliveryGoodsIssueKind" NOT NULL DEFAULT 'ISSUE',
  "issueNumber" TEXT NOT NULL, "documentHash" VARCHAR(64) NOT NULL,
  "commandEventId" VARCHAR(191) NOT NULL, "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "reversalOfGoodsIssueId" TEXT, "ledgerPostingBatchId" TEXT, "journalEntryId" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "issuedById" TEXT NOT NULL,
  "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_goods_issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_goods_issue_lines" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "goodsIssueId" TEXT NOT NULL,
  "salesOrderLineId" TEXT NOT NULL, "itemId" TEXT NOT NULL, "locationId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL, "unitCost" DECIMAL(12,2) NOT NULL,
  "totalCost" DECIMAL(14,2) NOT NULL, "inventoryTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_goods_issue_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_billing_outcomes" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "salesOrderId" TEXT NOT NULL,
  "status" "DeliveryBillingStatus" NOT NULL DEFAULT 'POSTED', "invoiceNumber" TEXT NOT NULL,
  "currency" VARCHAR(3) NOT NULL, "subtotal" DECIMAL(14,2) NOT NULL,
  "taxAmount" DECIMAL(14,2) NOT NULL, "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(14,2) NOT NULL, "documentHash" VARCHAR(64) NOT NULL,
  "commandEventId" VARCHAR(191) NOT NULL, "customerReceivableDocumentId" TEXT,
  "customerLedgerEntryId" TEXT, "ledgerPostingBatchId" TEXT, "journalEntryId" TEXT,
  "fiscalDocumentId" TEXT, "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "postedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_billing_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_billing_lines" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "billingOutcomeId" TEXT NOT NULL,
  "salesOrderLineId" TEXT NOT NULL, "itemId" TEXT NOT NULL,
  "deliveredQuantity" DECIMAL(12,3) NOT NULL, "billedQuantity" DECIMAL(12,3) NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL, "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(6,3) NOT NULL DEFAULT 0, "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(14,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_billing_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_reservations_organizationId_salesOrderId_key" ON "delivery_reservations"("organizationId", "salesOrderId");
CREATE UNIQUE INDEX "delivery_reservations_organizationId_commandEventId_key" ON "delivery_reservations"("organizationId", "commandEventId");
CREATE INDEX "delivery_reservations_organizationId_locationId_status_idx" ON "delivery_reservations"("organizationId", "locationId", "status");
CREATE UNIQUE INDEX "delivery_reservation_lines_reservationId_salesOrderLineId_key" ON "delivery_reservation_lines"("reservationId", "salesOrderLineId");
CREATE INDEX "delivery_reservation_lines_organizationId_itemId_locationId_idx" ON "delivery_reservation_lines"("organizationId", "itemId", "locationId");
CREATE UNIQUE INDEX "delivery_goods_issues_organizationId_issueNumber_key" ON "delivery_goods_issues"("organizationId", "issueNumber");
CREATE UNIQUE INDEX "delivery_goods_issues_organizationId_commandEventId_key" ON "delivery_goods_issues"("organizationId", "commandEventId");
CREATE UNIQUE INDEX "delivery_goods_issues_reversalOfGoodsIssueId_key" ON "delivery_goods_issues"("reversalOfGoodsIssueId");
CREATE INDEX "delivery_goods_issues_organizationId_salesOrderId_kind_issuedAt_idx" ON "delivery_goods_issues"("organizationId", "salesOrderId", "kind", "issuedAt");
CREATE UNIQUE INDEX "delivery_goods_issue_lines_goodsIssueId_salesOrderLineId_key" ON "delivery_goods_issue_lines"("goodsIssueId", "salesOrderLineId");
CREATE INDEX "delivery_goods_issue_lines_organizationId_itemId_locationId_idx" ON "delivery_goods_issue_lines"("organizationId", "itemId", "locationId");
CREATE UNIQUE INDEX "delivery_billing_outcomes_salesOrderId_key" ON "delivery_billing_outcomes"("salesOrderId");
CREATE UNIQUE INDEX "delivery_billing_outcomes_organizationId_invoiceNumber_key" ON "delivery_billing_outcomes"("organizationId", "invoiceNumber");
CREATE UNIQUE INDEX "delivery_billing_outcomes_organizationId_commandEventId_key" ON "delivery_billing_outcomes"("organizationId", "commandEventId");
CREATE INDEX "delivery_billing_outcomes_organizationId_status_postedAt_idx" ON "delivery_billing_outcomes"("organizationId", "status", "postedAt");
CREATE UNIQUE INDEX "delivery_billing_lines_billingOutcomeId_salesOrderLineId_key" ON "delivery_billing_lines"("billingOutcomeId", "salesOrderLineId");
CREATE INDEX "delivery_billing_lines_organizationId_itemId_idx" ON "delivery_billing_lines"("organizationId", "itemId");
CREATE INDEX "sales_orders_organizationId_channel_status_orderDate_idx" ON "sales_orders"("organizationId", "channel", "status", "orderDate");

ALTER TABLE "delivery_reservations" ADD CONSTRAINT "delivery_reservations_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_reservation_lines" ADD CONSTRAINT "delivery_reservation_lines_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "delivery_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_reservation_lines" ADD CONSTRAINT "delivery_reservation_lines_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES "sales_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_goods_issues" ADD CONSTRAINT "delivery_goods_issues_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_goods_issues" ADD CONSTRAINT "delivery_goods_issues_reversalOfGoodsIssueId_fkey" FOREIGN KEY ("reversalOfGoodsIssueId") REFERENCES "delivery_goods_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_goods_issue_lines" ADD CONSTRAINT "delivery_goods_issue_lines_goodsIssueId_fkey" FOREIGN KEY ("goodsIssueId") REFERENCES "delivery_goods_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_goods_issue_lines" ADD CONSTRAINT "delivery_goods_issue_lines_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES "sales_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_billing_outcomes" ADD CONSTRAINT "delivery_billing_outcomes_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_billing_lines" ADD CONSTRAINT "delivery_billing_lines_billingOutcomeId_fkey" FOREIGN KEY ("billingOutcomeId") REFERENCES "delivery_billing_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "delivery_billing_lines" ADD CONSTRAINT "delivery_billing_lines_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES "sales_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
