-- Keep provider and statement source evidence append-only while allowing
-- controlled processing, archival, storage-link, and legal-hold lifecycle fields.

CREATE OR REPLACE FUNCTION "payment_reconciliation_assert_immutable_evidence"(
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
    RAISE EXCEPTION 'Cannot modify immutable payment reconciliation evidence: %', immutable_label
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payment_reconciliation_provider_events_prevent_evidence_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payment reconciliation evidence: provider event %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM "payment_reconciliation_assert_immutable_evidence"(
    to_jsonb(OLD),
    to_jsonb(NEW),
    'provider event ' || OLD."id",
    ARRAY['updatedAt', 'status', 'processedAt', 'correlationId', 'traceId', 'archivedAt', 'legalHoldAt']::TEXT[]
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payment_reconciliation_statement_files_prevent_evidence_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payment reconciliation evidence: statement file %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF OLD."encryptedObjectKey" IS NOT NULL
    AND NEW."encryptedObjectKey" IS DISTINCT FROM OLD."encryptedObjectKey" THEN
    RAISE EXCEPTION 'Cannot replace immutable payment reconciliation evidence storage key: statement file %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM "payment_reconciliation_assert_immutable_evidence"(
    to_jsonb(OLD),
    to_jsonb(NEW),
    'statement file ' || OLD."id",
    ARRAY['updatedAt', 'status', 'encryptedObjectKey', 'archivedAt', 'legalHoldAt']::TEXT[]
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payment_reconciliation_statement_lines_prevent_evidence_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payment reconciliation evidence: statement line %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  PERFORM "payment_reconciliation_assert_immutable_evidence"(
    to_jsonb(OLD),
    to_jsonb(NEW),
    'statement line ' || OLD."id",
    ARRAY['updatedAt', 'status', 'archivedAt', 'legalHoldAt']::TEXT[]
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.provider_events') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payment_reconciliation_provider_events_prevent_evidence_mutation_trigger" ON "provider_events";
    CREATE TRIGGER "payment_reconciliation_provider_events_prevent_evidence_mutation_trigger"
      BEFORE UPDATE OR DELETE ON "provider_events"
      FOR EACH ROW EXECUTE FUNCTION "payment_reconciliation_provider_events_prevent_evidence_mutation"();
  END IF;

  IF to_regclass('public.statement_files') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payment_reconciliation_statement_files_prevent_evidence_mutation_trigger" ON "statement_files";
    CREATE TRIGGER "payment_reconciliation_statement_files_prevent_evidence_mutation_trigger"
      BEFORE UPDATE OR DELETE ON "statement_files"
      FOR EACH ROW EXECUTE FUNCTION "payment_reconciliation_statement_files_prevent_evidence_mutation"();
  END IF;

  IF to_regclass('public.statement_lines') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "payment_reconciliation_statement_lines_prevent_evidence_mutation_trigger" ON "statement_lines";
    CREATE TRIGGER "payment_reconciliation_statement_lines_prevent_evidence_mutation_trigger"
      BEFORE UPDATE OR DELETE ON "statement_lines"
      FOR EACH ROW EXECUTE FUNCTION "payment_reconciliation_statement_lines_prevent_evidence_mutation"();
  END IF;
END $$;
