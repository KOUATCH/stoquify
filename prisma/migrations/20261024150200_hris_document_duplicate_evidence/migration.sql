-- A retained hash resolves to an eligible original, not every attempted copy.
-- Pending/rejected duplicates must not obstruct existing native HR evidence.
CREATE OR REPLACE FUNCTION hris_bind_employee_document_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE employee_id text; evidence_text text; content_hash text; eligible_count integer;
BEGIN
 IF TG_TABLE_NAME = 'payroll_employees' THEN
   employee_id := NEW.id; evidence_text := COALESCE(NEW.metadata::text,'');
 ELSE
   employee_id := NEW."employeeId";
   evidence_text := COALESCE(NEW.metadata::text,'') || COALESCE(NEW."signedDocumentHash",'');
   PERFORM id FROM payroll_employees WHERE id=employee_id AND "organizationId"=NEW."organizationId" FOR UPDATE;
 END IF;
 FOR content_hash IN SELECT DISTINCT sha256 FROM hris_employee_documents
   WHERE "organizationId"=NEW."organizationId" AND "employeeId"=employee_id
   AND position(sha256 in evidence_text)>0 ORDER BY sha256
 LOOP
   PERFORM id FROM hris_employee_documents WHERE "organizationId"=NEW."organizationId" AND "employeeId"=employee_id AND sha256=content_hash ORDER BY id FOR UPDATE;
   SELECT count(*) INTO eligible_count FROM hris_employee_documents WHERE "organizationId"=NEW."organizationId" AND "employeeId"=employee_id AND sha256=content_hash AND status IN ('AVAILABLE','SUPERSEDED');
   IF eligible_count=0 THEN RAISE EXCEPTION 'HRIS_DOCUMENT_EVIDENCE_UNAVAILABLE'; END IF;
   UPDATE hris_employee_documents SET "evidenceBoundAt"=COALESCE("evidenceBoundAt",CURRENT_TIMESTAMP),revision=revision+1
     WHERE "organizationId"=NEW."organizationId" AND "employeeId"=employee_id AND sha256=content_hash AND status IN ('AVAILABLE','SUPERSEDED') AND "evidenceBoundAt" IS NULL;
 END LOOP;
 RETURN NEW;
END $$;
