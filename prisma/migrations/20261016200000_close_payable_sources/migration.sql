-- Phase 4 consumes supplier-ledger and invoice match-exception evidence.
-- Invoice/allocation/credit/payment/batch sources already use the Phase 3 guard.
CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON supplier_ledger_entries
FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_source_change();
CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON supplier_invoice_match_exceptions
FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_source_change();

-- Prior assessments did not evaluate the new AP classification contract.
DO $$ DECLARE tenant TEXT; BEGIN
  FOR tenant IN SELECT DISTINCT "organizationId" FROM close_runs ORDER BY "organizationId" LOOP
    PERFORM advance_close_source_revision(tenant, 'close_payable_classification', NULL, 'CONTRACT_UPGRADE');
  END LOOP;
END $$;
