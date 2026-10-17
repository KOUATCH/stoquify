-- Retain verified quantity corrections whose allocated receipt value rounds to zero.
-- Source, quantity, aggregate equality and append-only protections remain in force.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "supplier_credit_notes"
  DROP CONSTRAINT "supplier_credit_nonnegative_amounts",
  ADD CONSTRAINT "supplier_credit_nonnegative_amounts"
    CHECK ("subtotal" >= 0 AND "taxAmount" >= 0 AND "total" >= 0 AND "subtotal" + "taxAmount" = "total");

ALTER TABLE "supplier_credit_note_lines"
  DROP CONSTRAINT "supplier_credit_line_nonnegative_amounts",
  ADD CONSTRAINT "supplier_credit_line_nonnegative_amounts"
    CHECK ("unitCost" >= 0 AND "taxRate" >= 0 AND "taxAmount" >= 0 AND "lineTotal" >= 0);

COMMIT;
