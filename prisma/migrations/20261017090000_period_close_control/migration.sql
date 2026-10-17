ALTER TABLE accounting_periods ADD COLUMN "controlVersion" INTEGER NOT NULL DEFAULT 0 CHECK ("controlVersion" >= 0),
  ADD COLUMN "lastControlEventId" TEXT;
CREATE TABLE period_control_events (
  id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "periodId" TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0), operation TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL, "toStatus" TEXT NOT NULL, "actorId" TEXT NOT NULL CHECK (length(trim("actorId")) > 0),
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 10), "idempotencyKey" TEXT NOT NULL,
  "sourceRevision" TEXT NOT NULL CHECK ("sourceRevision" ~ '^(0|[1-9][0-9]*)$'),
  approval JSONB NOT NULL CHECK (jsonb_typeof(approval) = 'object'), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId", "periodId") REFERENCES accounting_periods("organizationId",id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK ((operation = 'CLOSE' AND "fromStatus" = 'OPEN' AND "toStatus" = 'CLOSED') OR
    (operation = 'REOPEN' AND "fromStatus" IN ('CLOSED','LOCKED') AND "toStatus" = 'OPEN'))
);
CREATE UNIQUE INDEX "period_control_events_organizationId_idempotencyKey_key" ON period_control_events("organizationId","idempotencyKey");
CREATE UNIQUE INDEX "period_control_events_organizationId_periodId_version_key" ON period_control_events("organizationId","periodId",version);
CREATE FUNCTION protect_period_control_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Period control receipts are immutable and must be retained'; END $$;
CREATE TRIGGER period_control_event_retention BEFORE UPDATE OR DELETE ON period_control_events
FOR EACH ROW EXECUTE FUNCTION protect_period_control_event();

CREATE FUNCTION guard_period_control_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE receipt period_control_events%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status::text <> 'OPEN' OR OLD."controlVersion" > 0 THEN RAISE EXCEPTION 'Controlled periods must be retained'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status::text <> 'OPEN' OR NEW."controlVersion" <> 0 OR NEW."lastControlEventId" IS NOT NULL OR
      NEW."closedAt" IS NOT NULL OR NEW."closedById" IS NOT NULL OR NEW."lockedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'New accounting periods must start open without control history';
    END IF;
    RETURN NEW;
  END IF;
  IF (OLD.status::text IN ('CLOSED','LOCKED') OR NEW.status IS DISTINCT FROM OLD.status) AND
    (NEW."organizationId",NEW.id,NEW."fiscalYearId",NEW."startDate",NEW."endDate") IS DISTINCT FROM
    (OLD."organizationId",OLD.id,OLD."fiscalYearId",OLD."startDate",OLD."endDate") THEN
    RAISE EXCEPTION 'Closed period scope cannot be changed';
  END IF;
  IF NEW.status = OLD.status THEN
    IF (NEW."controlVersion",NEW."lastControlEventId",NEW."closedAt",NEW."closedById",NEW."lockedAt") IS DISTINCT FROM
       (OLD."controlVersion",OLD."lastControlEventId",OLD."closedAt",OLD."closedById",OLD."lockedAt") THEN
      RAISE EXCEPTION 'Period control fields require an audited transition';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO receipt FROM period_control_events WHERE id = NEW."lastControlEventId" AND "organizationId" = OLD."organizationId" AND "periodId" = OLD.id;
  IF NOT FOUND OR receipt.version <> OLD."controlVersion" + 1 OR NEW."controlVersion" <> receipt.version OR
    receipt."fromStatus" <> OLD.status::text OR receipt."toStatus" <> NEW.status::text THEN
    RAISE EXCEPTION 'Period transition requires a matching retained receipt and version';
  END IF;
  IF NEW.status::text = 'CLOSED' AND (NEW."closedAt" IS DISTINCT FROM receipt."createdAt" OR NEW."lockedAt" IS DISTINCT FROM receipt."createdAt" OR NEW."closedById" IS DISTINCT FROM receipt."actorId") THEN
    RAISE EXCEPTION 'Close timestamps and actor must match the retained receipt';
  END IF;
  IF NEW.status::text = 'OPEN' AND (NEW."closedAt" IS NOT NULL OR NEW."lockedAt" IS NOT NULL OR NEW."closedById" IS NOT NULL) THEN
    RAISE EXCEPTION 'Reopening must clear active close markers';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER a_period_control_transition BEFORE INSERT OR UPDATE OR DELETE ON accounting_periods
FOR EACH ROW EXECUTE FUNCTION guard_period_control_transition();

-- A validated seal is an output of approval, not a new financial source.
-- Reopening and every other period change retain normal source invalidation.
CREATE FUNCTION invalidate_close_on_period_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_row JSONB; new_row JSONB; tenant TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_row := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_row := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' THEN
    IF old_row = new_row THEN RETURN NEW; END IF;
    IF OLD.status::text = 'OPEN' AND NEW.status::text = 'CLOSED' AND
      (old_row - ARRAY['status','closedAt','lockedAt','closedById','controlVersion','lastControlEventId','updatedAt']) =
      (new_row - ARRAY['status','closedAt','lockedAt','closedById','controlVersion','lastControlEventId','updatedAt']) THEN
      -- a_period_control_transition runs first and requires the matching receipt.
      RETURN NEW;
    END IF;
  END IF;
  FOR tenant IN SELECT DISTINCT value FROM unnest(ARRAY[old_row->>'organizationId',new_row->>'organizationId']) value WHERE value IS NOT NULL ORDER BY value LOOP
    PERFORM advance_close_source_revision(tenant, TG_TABLE_NAME, COALESCE(new_row->>'id',old_row->>'id'), TG_OP);
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DROP TRIGGER close_source_revision_change ON accounting_periods;
CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON accounting_periods
FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_period_change();

-- Run before source-revision triggers. Hold SHARE through commit so close must
-- observe earlier writers, and writers waking after close see its final state.
CREATE FUNCTION assert_journal_period_open(org TEXT, period_id TEXT, economic_date TIMESTAMP) RETURNS void LANGUAGE plpgsql AS $$
DECLARE p RECORD; matched BOOLEAN := FALSE;
BEGIN
  FOR p IN SELECT * FROM accounting_periods WHERE "organizationId" = org AND
    (id = period_id OR ("startDate" <= economic_date AND "endDate" >= economic_date)) ORDER BY id FOR SHARE LOOP
    IF p.status::text <> 'OPEN' THEN RAISE EXCEPTION 'Journal period is not open'; END IF;
    IF p.id = period_id AND economic_date BETWEEN p."startDate" AND p."endDate" THEN matched := TRUE; END IF;
  END LOOP;
  IF NOT matched THEN RAISE EXCEPTION 'Journal period tenant or economic date is invalid'; END IF;
END $$;
CREATE FUNCTION guard_journal_period_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payload JSONB; parent RECORD;
BEGIN
  FOR payload IN SELECT value FROM jsonb_array_elements(CASE TG_OP WHEN 'INSERT' THEN jsonb_build_array(to_jsonb(NEW)) WHEN 'DELETE' THEN jsonb_build_array(to_jsonb(OLD)) ELSE jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) END) LOOP
    IF TG_TABLE_NAME = 'journal_entries' THEN
      PERFORM assert_journal_period_open(payload->>'organizationId', payload->>'periodId', (payload->>'entryDate')::TIMESTAMP);
    ELSE
      SELECT "organizationId", "periodId", "entryDate" INTO parent FROM journal_entries WHERE id = payload->>'journalEntryId';
      IF NOT FOUND THEN
        -- Cascaded deletion follows the already-checked parent DELETE.
        IF TG_OP = 'DELETE' THEN CONTINUE; END IF;
        RAISE EXCEPTION 'Journal line parent is unavailable';
      END IF;
      PERFORM assert_journal_period_open(parent."organizationId", parent."periodId", parent."entryDate");
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER a_journal_period_write BEFORE INSERT OR UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION guard_journal_period_write();
CREATE TRIGGER a_journal_period_write BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines FOR EACH ROW EXECUTE FUNCTION guard_journal_period_write();
