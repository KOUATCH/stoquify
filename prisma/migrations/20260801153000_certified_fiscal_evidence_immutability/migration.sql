-- Protect certified fiscal evidence from direct database mutation.
-- Certification remains a controlled service transition; once a document is
-- certified or reversed, its source, totals, hashes, authority references,
-- submission trail, evidence artifacts, and lines are append-only by design.

CREATE OR REPLACE FUNCTION "compliance_assert_immutable_content"(
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
    RAISE EXCEPTION 'Cannot modify immutable fiscal evidence: %', immutable_label
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "compliance_fiscal_documents_prevent_certified_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status"::TEXT IN ('CERTIFIED', 'REVERSED') THEN
      RAISE EXCEPTION 'Cannot delete immutable fiscal evidence: fiscal document %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."status"::TEXT = 'CERTIFIED' THEN
    IF NEW."status"::TEXT NOT IN ('CERTIFIED', 'REVERSED') THEN
      RAISE EXCEPTION 'Cannot reopen immutable fiscal evidence: fiscal document %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF NEW."status"::TEXT = 'REVERSED' THEN
      IF NEW."reversedAt" IS NULL THEN
        RAISE EXCEPTION 'Cannot reverse immutable fiscal evidence without reversal timestamp: fiscal document %', OLD."id"
          USING ERRCODE = 'integrity_constraint_violation';
      END IF;

      PERFORM "compliance_assert_immutable_content"(
        to_jsonb(OLD),
        to_jsonb(NEW),
        'fiscal document ' || OLD."id",
        ARRAY['updatedAt', 'status', 'reversedAt', 'reversedById', 'reversalReason']::TEXT[]
      );
    ELSE
      PERFORM "compliance_assert_immutable_content"(
        to_jsonb(OLD),
        to_jsonb(NEW),
        'fiscal document ' || OLD."id",
        ARRAY['updatedAt']::TEXT[]
      );
    END IF;
  ELSIF OLD."status"::TEXT = 'REVERSED' THEN
    PERFORM "compliance_assert_immutable_content"(
      to_jsonb(OLD),
      to_jsonb(NEW),
      'reversed fiscal document ' || OLD."id",
      ARRAY['updatedAt']::TEXT[]
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "compliance_fiscal_document_lines_prevent_certified_parent_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  old_parent_status TEXT;
  new_parent_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    SELECT "status"::TEXT INTO old_parent_status
    FROM "fiscal_documents"
    WHERE "id" = OLD."fiscalDocumentId";
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT "status"::TEXT INTO new_parent_status
    FROM "fiscal_documents"
    WHERE "id" = NEW."fiscalDocumentId";
  END IF;

  IF old_parent_status IN ('CERTIFIED', 'REVERSED')
    OR new_parent_status IN ('CERTIFIED', 'REVERSED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable fiscal evidence: fiscal document line %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add lines to immutable fiscal evidence: fiscal document %', NEW."fiscalDocumentId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RAISE EXCEPTION 'Cannot modify immutable fiscal evidence: fiscal document line %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "compliance_submissions_prevent_certified_document_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  old_parent_status TEXT;
  new_parent_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    SELECT "status"::TEXT INTO old_parent_status
    FROM "fiscal_documents"
    WHERE "id" = OLD."fiscalDocumentId";
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT "status"::TEXT INTO new_parent_status
    FROM "fiscal_documents"
    WHERE "id" = NEW."fiscalDocumentId";
  END IF;

  IF old_parent_status IN ('CERTIFIED', 'REVERSED')
    OR new_parent_status IN ('CERTIFIED', 'REVERSED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable fiscal evidence: compliance submission %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add submissions to immutable fiscal evidence: fiscal document %', NEW."fiscalDocumentId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RAISE EXCEPTION 'Cannot modify immutable fiscal evidence: compliance submission %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "compliance_fiscal_status_for_evidence_relation"(
  direct_fiscal_document_id TEXT,
  direct_submission_id TEXT
) RETURNS TEXT AS $$
DECLARE
  parent_status TEXT;
BEGIN
  IF direct_fiscal_document_id IS NOT NULL THEN
    SELECT "status"::TEXT INTO parent_status
    FROM "fiscal_documents"
    WHERE "id" = direct_fiscal_document_id;

    IF parent_status IS NOT NULL THEN
      RETURN parent_status;
    END IF;
  END IF;

  IF direct_submission_id IS NOT NULL THEN
    SELECT fiscal_document."status"::TEXT INTO parent_status
    FROM "compliance_submissions" compliance_submission
    JOIN "fiscal_documents" fiscal_document
      ON fiscal_document."id" = compliance_submission."fiscalDocumentId"
    WHERE compliance_submission."id" = direct_submission_id;
  END IF;

  RETURN parent_status;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "compliance_evidence_prevent_certified_document_mutation"()
RETURNS TRIGGER AS $$
DECLARE
  old_parent_status TEXT;
  new_parent_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    old_parent_status := "compliance_fiscal_status_for_evidence_relation"(
      OLD."fiscalDocumentId",
      OLD."submissionId"
    );
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_parent_status := "compliance_fiscal_status_for_evidence_relation"(
      NEW."fiscalDocumentId",
      NEW."submissionId"
    );
  END IF;

  IF old_parent_status IN ('CERTIFIED', 'REVERSED')
    OR new_parent_status IN ('CERTIFIED', 'REVERSED') THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete immutable fiscal evidence: evidence artifact %', OLD."id"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Cannot add evidence artifacts to immutable fiscal evidence: fiscal document %', NEW."fiscalDocumentId"
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    RAISE EXCEPTION 'Cannot modify immutable fiscal evidence: evidence artifact %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.fiscal_documents') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "compliance_fiscal_documents_prevent_certified_mutation_trigger" ON "fiscal_documents";
    CREATE TRIGGER "compliance_fiscal_documents_prevent_certified_mutation_trigger"
      BEFORE UPDATE OR DELETE ON "fiscal_documents"
      FOR EACH ROW EXECUTE FUNCTION "compliance_fiscal_documents_prevent_certified_mutation"();
  END IF;

  IF to_regclass('public.fiscal_document_lines') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "compliance_fiscal_document_lines_prevent_certified_parent_mutation_trigger" ON "fiscal_document_lines";
    CREATE TRIGGER "compliance_fiscal_document_lines_prevent_certified_parent_mutation_trigger"
      BEFORE INSERT OR UPDATE OR DELETE ON "fiscal_document_lines"
      FOR EACH ROW EXECUTE FUNCTION "compliance_fiscal_document_lines_prevent_certified_parent_mutation"();
  END IF;

  IF to_regclass('public.compliance_submissions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "compliance_submissions_prevent_certified_document_mutation_trigger" ON "compliance_submissions";
    CREATE TRIGGER "compliance_submissions_prevent_certified_document_mutation_trigger"
      BEFORE INSERT OR UPDATE OR DELETE ON "compliance_submissions"
      FOR EACH ROW EXECUTE FUNCTION "compliance_submissions_prevent_certified_document_mutation"();
  END IF;

  IF to_regclass('public.compliance_evidence') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "compliance_evidence_prevent_certified_document_mutation_trigger" ON "compliance_evidence";
    CREATE TRIGGER "compliance_evidence_prevent_certified_document_mutation_trigger"
      BEFORE INSERT OR UPDATE OR DELETE ON "compliance_evidence"
      FOR EACH ROW EXECUTE FUNCTION "compliance_evidence_prevent_certified_document_mutation"();
  END IF;
END $$;