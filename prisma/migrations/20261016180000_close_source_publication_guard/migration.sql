CREATE TABLE close_source_revisions (
  "organizationId" TEXT PRIMARY KEY,
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE close_source_changes (
  id BIGSERIAL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  revision BIGINT NOT NULL,
  "sourceTable" TEXT NOT NULL,
  "sourceId" TEXT,
  operation TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "close_source_changes_organizationId_revision_key" ON close_source_changes("organizationId", revision);

CREATE FUNCTION advance_close_source_revision(org TEXT, source_table TEXT, source_id TEXT, operation_name TEXT) RETURNS void LANGUAGE plpgsql AS $$
DECLARE next_revision BIGINT; stale JSONB; affected RECORD;
BEGIN
  IF org IS NULL THEN RETURN; END IF;
  INSERT INTO close_source_revisions ("organizationId", revision, "updatedAt") VALUES (org, 1, clock_timestamp())
  ON CONFLICT ("organizationId") DO UPDATE SET revision = close_source_revisions.revision + 1, "updatedAt" = clock_timestamp()
  RETURNING revision INTO next_revision;
  INSERT INTO close_source_changes ("organizationId", revision, "sourceTable", "sourceId", operation, "recordedAt")
  VALUES (org, next_revision, source_table, source_id, operation_name, clock_timestamp());
  stale := jsonb_build_object('status', 'EVIDENCE_STALE', 'sourceCode', 'CLOSE_SOURCE_REVISION_CHANGED',
    'sourceTable', source_table, 'sourceId', source_id, 'operation', operation_name, 'sourceRevision', next_revision::TEXT,
    'detectedAt', clock_timestamp(), 'staleReason', 'A financial source changed. Run a new close assessment.');
  -- Same lock order as application invalidation: run before retained exports.
  FOR affected IN SELECT id FROM close_runs WHERE "organizationId" = org AND
    (status IN ('RUNNING','READY','CERTIFIED','EXPORTED') OR EXISTS
      (SELECT 1 FROM close_pack_exports p WHERE p."closeRunId" = close_runs.id AND p."organizationId" = org AND p."isCertified"
        AND COALESCE(p.metadata #>> '{staleState,status}', '') <> 'EVIDENCE_STALE')) ORDER BY id
  LOOP
    UPDATE close_runs SET status = CASE WHEN status IN ('RUNNING','READY','CERTIFIED','EXPORTED') THEN 'BLOCKED'::"CloseRunStatus" ELSE status END,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('staleState', stale), "updatedAt" = clock_timestamp()
      WHERE id = affected.id AND "organizationId" = org;
    UPDATE close_pack_exports SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('staleState', stale)
      WHERE "closeRunId" = affected.id AND "organizationId" = org AND "isCertified"
        AND COALESCE(metadata #>> '{staleState,status}', '') <> 'EVIDENCE_STALE';
  END LOOP;
END $$;

CREATE FUNCTION invalidate_close_on_source_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_row JSONB; new_row JSONB; old_org TEXT; new_org TEXT; tenant TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_row := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND old_row = new_row THEN RETURN NEW; END IF;
  -- Pilot certification is source evidence stored in the audit log. Ordinary
  -- access/close audit records are outputs and must not self-invalidate.
  IF TG_TABLE_NAME = 'audit_logs' AND NOT (
    COALESCE(old_row->>'entityType' = 'PayrollPilotCycleCertification' AND old_row->>'action' = 'PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED', FALSE) OR
    COALESCE(new_row->>'entityType' = 'PayrollPilotCycleCertification' AND new_row->>'action' = 'PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED', FALSE)
  ) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  -- Close's own evidence/audit events must not invalidate their own publication.
  -- A changed event moving into/out of the close namespace is still a source change.
  IF TG_TABLE_NAME = 'business_events' AND
    (old_row IS NULL OR (old_row->>'eventType' LIKE 'close.%' AND old_row->>'status' NOT IN ('FAILED','REJECTED'))) AND
    (new_row IS NULL OR (new_row->>'eventType' LIKE 'close.%' AND new_row->>'status' NOT IN ('FAILED','REJECTED'))) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME = 'organizations' THEN
    old_org := old_row->>'id'; new_org := new_row->>'id';
  ELSIF TG_NARGS = 0 THEN
    old_org := old_row->>'organizationId'; new_org := new_row->>'organizationId';
  ELSE
    -- Reviewed child sources inherit tenant from their parent, including both
    -- sides of reassignment. Parent deletions also have their own trigger.
    IF old_row IS NOT NULL THEN EXECUTE format('SELECT "organizationId" FROM %I WHERE id = $1', TG_ARGV[0]) INTO old_org USING old_row->>TG_ARGV[1]; END IF;
    IF new_row IS NOT NULL THEN EXECUTE format('SELECT "organizationId" FROM %I WHERE id = $1', TG_ARGV[0]) INTO new_org USING new_row->>TG_ARGV[1]; END IF;
  END IF;
  FOR tenant IN SELECT DISTINCT value FROM unnest(ARRAY[old_org,new_org]) value WHERE value IS NOT NULL ORDER BY value LOOP
    PERFORM advance_close_source_revision(tenant, TG_TABLE_NAME, COALESCE(new_row->>'id',old_row->>'id'), TG_OP);
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

DO $$ DECLARE source_table TEXT; BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'organizations','accounting_periods','fiscal_years','organization_accounting_settings','chart_of_accounts','journals','payment_rails',
    'journal_entries','journal_entry_lines','ledger_posting_batches','accounting_source_links',
    'provider_accounts','settlement_accounts','provider_events','statement_files','statement_lines',
    'payment_transactions','match_records','reconciliation_runs','reconciliation_no_activity_evidence','suspense_items','payment_exceptions',
    'items','locations','inventory_transactions','stock_adjustments','stock_count_sessions',
    'supplier_invoices','supplier_payments','supplier_payment_allocations','supplier_credit_notes',
    'payroll_periods','payroll_runs','payroll_run_transitions','payroll_run_lines','payroll_payslips',
    'payroll_declarations','payroll_declaration_evidence','payroll_payment_batches','payroll_payment_allocations',
    'payroll_employee_balance_cases','payroll_employee_balance_events','fiscal_documents','business_events','audit_logs',
    'pos_offline_events','pos_offline_sync_conflicts','pos_offline_sync_certificates'
  ] LOOP
    EXECUTE format('CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_source_change()', source_table);
  END LOOP;
END $$;
CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON inventory_levels FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_source_change('items','itemId');
CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON stock_adjustment_lines FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_source_change('stock_adjustments','adjustmentId');
CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON stock_count_lines FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_source_change('stock_count_sessions','stockCountSessionId');

-- Historical certificates retain their content/hash; their current eligibility
-- must be reassessed because they did not observe this revision contract.
UPDATE close_runs SET status = 'BLOCKED', metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('staleState',
  jsonb_build_object('status','EVIDENCE_STALE','sourceCode','CLOSE_REVISION_CONTRACT_REQUIRED','staleReason','Run a new assessment under the source revision contract.'))
WHERE status IN ('RUNNING','READY','CERTIFIED','EXPORTED');
UPDATE close_pack_exports SET metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('staleState',
  jsonb_build_object('status','EVIDENCE_STALE','sourceCode','CLOSE_REVISION_CONTRACT_REQUIRED','staleReason','Retained historical certificate; a new source revision assessment is required.'))
WHERE "isCertified";
