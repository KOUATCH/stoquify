-- Add worker lease ownership to payment reconciliation inbox rows.
ALTER TABLE "payment_reconciliation_inbox_items"
  ADD COLUMN "leasedBy" TEXT,
  ADD COLUMN "leaseToken" TEXT;

CREATE INDEX "payment_reconciliation_inbox_items_org_status_leased_by_idx"
  ON "payment_reconciliation_inbox_items"("organizationId", "status", "leasedBy");

CREATE INDEX "payment_reconciliation_inbox_items_org_lease_token_idx"
  ON "payment_reconciliation_inbox_items"("organizationId", "leaseToken");
