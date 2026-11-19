-- Freeze only an existing v2 history-proof discriminator. No backfill or changes
-- to legacy rows; normal lifecycle metadata updates retain the same numeric 2.
CREATE OR REPLACE FUNCTION "payroll_run_history_proof_version_immutable"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."metadata" -> 'yearToDateProofVersion' = '2'::JSONB
    AND (NEW."metadata" -> 'yearToDateProofVersion') IS DISTINCT FROM '2'::JSONB
  THEN
    RAISE EXCEPTION 'Payroll history proof version cannot be changed or removed'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "payroll_run_history_proof_version_immutable"
  BEFORE UPDATE OF "metadata" ON "payroll_runs"
  FOR EACH ROW EXECUTE FUNCTION "payroll_run_history_proof_version_immutable"();
