-- Cover every native evidence writer, including direct imports. Existing evidence
-- owners still own their workflows; this constraint protects referenced originals.
CREATE FUNCTION hris_bind_employee_document_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE employee_id text; evidence_text text; doc record;
BEGIN
 IF TG_TABLE_NAME = 'payroll_employees' THEN
   employee_id := NEW.id; evidence_text := COALESCE(NEW.metadata::text,'');
 ELSE
   employee_id := NEW."employeeId";
   evidence_text := COALESCE(NEW.metadata::text,'') || COALESCE(NEW."signedDocumentHash",'');
   PERFORM id FROM payroll_employees WHERE id=employee_id AND "organizationId"=NEW."organizationId" FOR UPDATE;
 END IF;
 FOR doc IN SELECT id,status FROM hris_employee_documents
   WHERE "organizationId"=NEW."organizationId" AND "employeeId"=employee_id
   AND position(sha256 in evidence_text)>0 ORDER BY id FOR UPDATE
 LOOP
   IF doc.status NOT IN ('AVAILABLE','SUPERSEDED') THEN
     RAISE EXCEPTION 'HRIS_DOCUMENT_EVIDENCE_UNAVAILABLE';
   END IF;
   UPDATE hris_employee_documents SET "evidenceBoundAt"=COALESCE("evidenceBoundAt",CURRENT_TIMESTAMP),revision=revision+1 WHERE id=doc.id AND "evidenceBoundAt" IS NULL;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER hris_employee_document_evidence_guard BEFORE INSERT OR UPDATE OF metadata ON payroll_employees
FOR EACH ROW EXECUTE FUNCTION hris_bind_employee_document_evidence();
CREATE TRIGGER hris_contract_document_evidence_guard BEFORE INSERT OR UPDATE OF metadata,"signedDocumentHash" ON payroll_contracts
FOR EACH ROW EXECUTE FUNCTION hris_bind_employee_document_evidence();
