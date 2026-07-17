-- Phase 0 payroll hardening: protect approved/emitted/released/submitted
-- payroll evidence from direct DB mutation while leaving lifecycle metadata
-- fields available for later controlled workflows.

CREATE OR REPLACE FUNCTION "payroll_assert_immutable_content"(
  old_row JSONB,
  new_row JSONB,
  immutable_label TEXT,
  allowed_keys TEXT[] DEFAULT ARRAY[]::TEXT[]
) RETURNS VOID AS $$
DECLARE
  normalized_old JSONB := old_row;
  normalized_new JSONB := new_row;
  allowed_key TEXT;
BEGIN
  FOREACH allowed_key IN ARRAY allowed_keys LOOP
    normalized_old := normalized_old - allowed_key;
    normalized_new := normalized_new - allowed_key;
  END LOOP;

  IF normalized_old IS DISTINCT FROM normalized_new THEN
    RAISE EXCEPTION 'Cannot modify immutable payroll evidence: %', immutable_label
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payroll_runs_prevent_finalized_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status"::TEXT IN ('POSTED', 'ARCHIVED') THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payroll run %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status"::TEXT IN ('POSTED', 'ARCHIVED') THEN
    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payroll run ' || OLD."id",
      ARRAY['updatedAt', 'metadata', 'status', 'archivedAt']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payroll_run_lines_prevent_posted_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  parent_status TEXT;
  target_payroll_run_id TEXT;
BEGIN
  target_payroll_run_id := CASE
    WHEN TG_OP = 'INSERT' THEN NEW."payrollRunId"
    ELSE OLD."payrollRunId"
  END;

  SELECT "status"::TEXT INTO parent_status
  FROM "payroll_runs"
  WHERE "id" = target_payroll_run_id;

  IF parent_status IN ('POSTED', 'ARCHIVED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payroll run line %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add payroll run lines to immutable payroll run %', NEW."payrollRunId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payroll run line ' || OLD."id",
      ARRAY['updatedAt', 'metadata']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payroll_payslips_prevent_emitted_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status"::TEXT IN ('EMITTED', 'CORRECTED', 'VOIDED') THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payslip %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status"::TEXT IN ('EMITTED', 'CORRECTED', 'VOIDED') THEN
    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payslip ' || OLD."id",
      ARRAY['updatedAt', 'metadata', 'status', 'voidedAt', 'archiveUri']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payroll_payslip_lines_prevent_emitted_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  parent_status TEXT;
  target_payslip_id TEXT;
BEGIN
  target_payslip_id := CASE
    WHEN TG_OP = 'INSERT' THEN NEW."payslipId"
    ELSE OLD."payslipId"
  END;

  SELECT "status"::TEXT INTO parent_status
  FROM "payroll_payslips"
  WHERE "id" = target_payslip_id;

  IF parent_status IN ('EMITTED', 'CORRECTED', 'VOIDED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payslip line %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add payslip lines to immutable payslip %', NEW."payslipId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payslip line ' || OLD."id",
      ARRAY[]::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payment batch ' || OLD."id",
      ARRAY['updatedAt', 'metadata', 'notes', 'reconciliationStatus', 'paymentExceptionId']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payroll_payment_allocations_prevent_released_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  parent_status TEXT;
  target_payment_batch_id TEXT;
BEGIN
  target_payment_batch_id := CASE
    WHEN TG_OP = 'INSERT' THEN NEW."payrollPaymentBatchId"
    ELSE OLD."payrollPaymentBatchId"
  END;

  SELECT "status"::TEXT INTO parent_status
  FROM "payroll_payment_batches"
  WHERE "id" = target_payment_batch_id;

  IF parent_status IN ('RELEASED', 'PARTIALLY_SETTLED', 'SETTLED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable payroll evidence: payment allocation %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add allocations to immutable payroll payment batch %', NEW."payrollPaymentBatchId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    PERFORM "payroll_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'payment allocation ' || OLD."id",
      ARRAY[]::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payroll_declarations_prevent_payload_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payroll evidence: declaration %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM "payroll_assert_immutable_content"(
    to_jsonb(OLD),
    to_jsonb(NEW),
    'declaration ' || OLD."id",
    ARRAY['updatedAt', 'metadata', 'status', 'dueDate']::TEXT[]
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.payroll_runs') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payroll_runs_prevent_finalized_mutation_trigger" ON "payroll_runs";
    CREATE TRIGGER "payroll_runs_prevent_finalized_mutation_trigger"
      BEFORE UPDATE OR DELETE ON "payroll_runs"
      FOR EACH ROW EXECUTE FUNCTION "payroll_runs_prevent_finalized_mutation"();
  END IF;

  IF to_regclass('public.payroll_run_lines') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payroll_run_lines_prevent_posted_mutation_trigger" ON "payroll_run_lines";
    CREATE TRIGGER "payroll_run_lines_prevent_posted_mutation_trigger"
      BEFORE INSERT OR UPDATE OR DELETE ON "payroll_run_lines"
      FOR EACH ROW EXECUTE FUNCTION "payroll_run_lines_prevent_posted_mutation"();
  END IF;

  IF to_regclass('public.payroll_payslips') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payroll_payslips_prevent_emitted_mutation_trigger" ON "payroll_payslips";
    CREATE TRIGGER "payroll_payslips_prevent_emitted_mutation_trigger"
      BEFORE UPDATE OR DELETE ON "payroll_payslips"
      FOR EACH ROW EXECUTE FUNCTION "payroll_payslips_prevent_emitted_mutation"();
  END IF;

  IF to_regclass('public.payroll_payslip_lines') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payroll_payslip_lines_prevent_emitted_mutation_trigger" ON "payroll_payslip_lines";
    CREATE TRIGGER "payroll_payslip_lines_prevent_emitted_mutation_trigger"
      BEFORE INSERT OR UPDATE OR DELETE ON "payroll_payslip_lines"
      FOR EACH ROW EXECUTE FUNCTION "payroll_payslip_lines_prevent_emitted_mutation"();
  END IF;

  IF to_regclass('public.payroll_payment_batches') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payroll_payment_batches_prevent_released_mutation_trigger" ON "payroll_payment_batches";
    CREATE TRIGGER "payroll_payment_batches_prevent_released_mutation_trigger"
      BEFORE UPDATE OR DELETE ON "payroll_payment_batches"
      FOR EACH ROW EXECUTE FUNCTION "payroll_payment_batches_prevent_released_mutation"();
  END IF;

  IF to_regclass('public.payroll_payment_allocations') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payroll_payment_allocations_prevent_released_mutation_trigger" ON "payroll_payment_allocations";
    CREATE TRIGGER "payroll_payment_allocations_prevent_released_mutation_trigger"
      BEFORE INSERT OR UPDATE OR DELETE ON "payroll_payment_allocations"
      FOR EACH ROW EXECUTE FUNCTION "payroll_payment_allocations_prevent_released_mutation"();
  END IF;

  IF to_regclass('public.payroll_declarations') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payroll_declarations_prevent_payload_mutation_trigger" ON "payroll_declarations";
    CREATE TRIGGER "payroll_declarations_prevent_payload_mutation_trigger"
      BEFORE UPDATE OR DELETE ON "payroll_declarations"
      FOR EACH ROW EXECUTE FUNCTION "payroll_declarations_prevent_payload_mutation"();
  END IF;
END $$;
