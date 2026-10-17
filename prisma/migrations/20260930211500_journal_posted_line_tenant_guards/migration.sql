-- Narrow journal boundary protections. Historical rows are not rewritten.
-- Source writers create POSTED parents with nested lines; INSERT remains
-- supported, subject to parent/account tenant consistency. This does not
-- certify complete posted-header, late-insert or organization-retention rules.

CREATE FUNCTION stoquify_guard_journal_posted_status() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status::text IN ('POSTED', 'REVERSED') AND NEW.status::text = 'DRAFT' THEN
    RAISE EXCEPTION 'Posted journal entries cannot return to draft'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entries_prevent_posted_draft
BEFORE UPDATE OF status ON journal_entries
FOR EACH ROW EXECUTE FUNCTION stoquify_guard_journal_posted_status();

CREATE FUNCTION stoquify_guard_journal_line_boundary() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_ids text[];
  old_status text;
  new_status text;
  parent_organization text;
  account_organization text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    parent_ids := ARRAY[NEW."journalEntryId"];
  ELSIF TG_OP = 'DELETE' THEN
    parent_ids := ARRAY[OLD."journalEntryId"];
  ELSE
    parent_ids := ARRAY[OLD."journalEntryId", NEW."journalEntryId"];
  END IF;

  -- A stable order also covers moving a draft line between draft parents.
  PERFORM id FROM journal_entries WHERE id = ANY(parent_ids) ORDER BY id FOR SHARE;

  IF TG_OP <> 'INSERT' THEN
    SELECT status::text INTO old_status FROM journal_entries WHERE id = OLD."journalEntryId";
    IF old_status IN ('POSTED', 'REVERSED') AND (TG_OP = 'DELETE' OR NEW IS DISTINCT FROM OLD) THEN
      RAISE EXCEPTION 'Posted journal lines require a compensating correction'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  SELECT "organizationId", status::text INTO parent_organization, new_status
    FROM journal_entries WHERE id = NEW."journalEntryId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal line parent is unavailable' USING ERRCODE = '23503';
  END IF;
  IF TG_OP = 'UPDATE' AND old_status NOT IN ('POSTED', 'REVERSED')
      AND new_status IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'Draft journal lines cannot move into a posted entry'
      USING ERRCODE = '23514';
  END IF;

  SELECT "organizationId" INTO account_organization FROM chart_of_accounts WHERE id = NEW."accountId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal line account is unavailable' USING ERRCODE = '23503';
  END IF;
  IF NEW."organizationId" IS DISTINCT FROM parent_organization
      OR NEW."organizationId" IS DISTINCT FROM account_organization THEN
    RAISE EXCEPTION 'Journal line, parent and account must belong to the same organization'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entry_lines_guard_posted_tenant
BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION stoquify_guard_journal_line_boundary();
