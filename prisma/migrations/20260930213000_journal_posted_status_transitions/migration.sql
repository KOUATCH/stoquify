-- Preserve the prior migration checksum and close indirect status rollback.
-- Existing production callers post DRAFT entries and compensate POSTED entries
-- by marking them REVERSED. No production caller reactivates or voids them.
CREATE OR REPLACE FUNCTION stoquify_guard_journal_posted_status() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.status::text = 'POSTED' AND NEW.status::text NOT IN ('POSTED', 'REVERSED'))
      OR (OLD.status::text = 'REVERSED' AND NEW.status::text <> 'REVERSED') THEN
    RAISE EXCEPTION 'Posted journals may only become reversed; reversed journals cannot change status'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
