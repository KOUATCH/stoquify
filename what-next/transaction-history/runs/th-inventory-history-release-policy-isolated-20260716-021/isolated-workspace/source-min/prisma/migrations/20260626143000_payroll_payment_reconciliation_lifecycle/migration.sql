-- Prompt 17: allow controlled payroll payment reconciliation lifecycle updates
-- while preserving immutable payment evidence content after release.

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
