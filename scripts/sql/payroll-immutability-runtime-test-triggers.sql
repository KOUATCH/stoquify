-- Runtime-only trigger installation for the dedicated payroll immutability test DB.
-- The database schema is created from the current Prisma schema before this file
-- runs, so only functions and triggers that Prisma cannot represent belong here.

CREATE OR REPLACE FUNCTION "payroll_declaration_evidence_prevent_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payroll evidence: declaration evidence %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable payroll evidence: declaration evidence %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "payroll_declaration_evidence_prevent_mutation_trigger"
  ON "payroll_declaration_evidence";
CREATE TRIGGER "payroll_declaration_evidence_prevent_mutation_trigger"
  BEFORE UPDATE OR DELETE ON "payroll_declaration_evidence"
  FOR EACH ROW EXECUTE FUNCTION "payroll_declaration_evidence_prevent_mutation"();

CREATE OR REPLACE FUNCTION "payroll_payment_batches_prevent_released_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status"::TEXT IN ('RELEASED', 'PARTIALLY_SETTLED', 'SETTLED') THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payment batch %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status"::TEXT IN ('RELEASED', 'PARTIALLY_SETTLED', 'SETTLED') THEN
    IF OLD."status"::TEXT IS DISTINCT FROM NEW."status"::TEXT THEN
      IF NOT (
        (OLD."status"::TEXT = 'RELEASED' AND NEW."status"::TEXT IN ('PARTIALLY_SETTLED', 'SETTLED')) OR
        (OLD."status"::TEXT = 'PARTIALLY_SETTLED' AND NEW."status"::TEXT IN ('PARTIALLY_SETTLED', 'SETTLED')) OR
        (OLD."status"::TEXT = 'SETTLED' AND NEW."status"::TEXT = 'SETTLED')
      ) THEN
        RAISE EXCEPTION 'Cannot change immutable payroll payment lifecycle status from % to % for payment batch %', OLD."status", NEW."status", OLD."id"
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;
    END IF;

    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payment batch ' || OLD."id",
      ARRAY['updatedAt', 'metadata', 'notes', 'status', 'reconciliationStatus', 'paymentExceptionId']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payroll_employee_balance_events_prevent_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payroll evidence: employee balance event %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable payroll evidence: employee balance event %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "payroll_employee_balance_events_prevent_mutation_trigger"
  ON "payroll_employee_balance_events";
CREATE TRIGGER "payroll_employee_balance_events_prevent_mutation_trigger"
  BEFORE UPDATE OR DELETE ON "payroll_employee_balance_events"
  FOR EACH ROW EXECUTE FUNCTION "payroll_employee_balance_events_prevent_mutation"();
