-- Additive scope integrity for close records. No legacy facts are repaired here.
-- Quiesce writers for this bounded transactional migration: regular unique-index
-- creation and validated foreign keys hold table locks, not a zero-downtime path.
-- A timeout or count-only legacy preflight failure rolls back every new object.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- One deterministic lock cohort prevents audit/DDL races and lock upgrades.
LOCK TABLE
  public."accountant_comments",
  public."accountant_reviews",
  public."accounting_periods",
  public."close_assurance_findings",
  public."close_checklist_items",
  public."close_evidence_items",
  public."close_pack_exports",
  public."close_runs",
  public."fiscal_years"
IN ACCESS EXCLUSIVE MODE;

DO $close_scope_preflight$
DECLARE violations jsonb;
BEGIN
  SELECT jsonb_object_agg(edge, invalid_rows) INTO violations
  FROM (
    SELECT 'accounting_periods_fiscal_scope_fkey' AS edge, count(*) AS invalid_rows
    FROM public."accounting_periods" c WHERE NOT EXISTS (
      SELECT 1 FROM public."fiscal_years" p WHERE p."organizationId"=c."organizationId" AND p."id"=c."fiscalYearId")
    UNION ALL
    SELECT 'close_runs_period_scope_fkey', count(*)
    FROM public."close_runs" c WHERE NOT EXISTS (
      SELECT 1 FROM public."accounting_periods" p WHERE p."organizationId"=c."organizationId" AND p."id"=c."periodId")
    UNION ALL
    SELECT 'close_checklists_run_scope_fkey', count(*)
    FROM public."close_checklist_items" c WHERE NOT EXISTS (
      SELECT 1 FROM public."close_runs" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."id"=c."closeRunId")
    UNION ALL
    SELECT 'close_findings_run_scope_fkey', count(*)
    FROM public."close_assurance_findings" c WHERE NOT EXISTS (
      SELECT 1 FROM public."close_runs" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."id"=c."closeRunId")
    UNION ALL
    SELECT 'close_evidence_run_scope_fkey', count(*)
    FROM public."close_evidence_items" c WHERE NOT EXISTS (
      SELECT 1 FROM public."close_runs" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."id"=c."closeRunId")
    UNION ALL
    SELECT 'close_exports_run_scope_fkey', count(*)
    FROM public."close_pack_exports" c WHERE NOT EXISTS (
      SELECT 1 FROM public."close_runs" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."id"=c."closeRunId")
    UNION ALL
    SELECT 'accountant_reviews_run_scope_fkey', count(*)
    FROM public."accountant_reviews" c WHERE NOT EXISTS (
      SELECT 1 FROM public."close_runs" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."id"=c."closeRunId")
    UNION ALL
    SELECT 'accountant_comments_run_scope_fkey', count(*)
    FROM public."accountant_comments" c WHERE NOT EXISTS (
      SELECT 1 FROM public."close_runs" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."id"=c."closeRunId")
    UNION ALL
    SELECT 'close_findings_checklist_scope_fkey', count(*)
    FROM public."close_assurance_findings" c WHERE c."checklistItemId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public."close_checklist_items" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."closeRunId"=c."closeRunId" AND p."id"=c."checklistItemId")
    UNION ALL
    SELECT 'close_evidence_checklist_scope_fkey', count(*)
    FROM public."close_evidence_items" c WHERE c."checklistItemId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public."close_checklist_items" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."closeRunId"=c."closeRunId" AND p."id"=c."checklistItemId")
    UNION ALL
    SELECT 'close_evidence_finding_scope_fkey', count(*)
    FROM public."close_evidence_items" c WHERE c."findingId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public."close_assurance_findings" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."closeRunId"=c."closeRunId" AND p."id"=c."findingId")
    UNION ALL
    SELECT 'accountant_comments_finding_scope_fkey', count(*)
    FROM public."accountant_comments" c WHERE c."findingId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public."close_assurance_findings" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."closeRunId"=c."closeRunId" AND p."id"=c."findingId")
    UNION ALL
    SELECT 'accountant_comments_evidence_scope_fkey', count(*)
    FROM public."accountant_comments" c WHERE c."evidenceItemId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public."close_evidence_items" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."closeRunId"=c."closeRunId" AND p."id"=c."evidenceItemId")
    UNION ALL
    SELECT 'accountant_comments_review_scope_fkey', count(*)
    FROM public."accountant_comments" c WHERE c."reviewId" IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public."accountant_reviews" p WHERE p."organizationId"=c."organizationId" AND p."periodId"=c."periodId" AND p."closeRunId"=c."closeRunId" AND p."id"=c."reviewId")
  ) scope_edges WHERE invalid_rows > 0;
  IF violations IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Close scope integrity preflight failed.',
      DETAIL = violations::text,
      HINT = 'Review inconsistent legacy references under a separate approved repair plan; this migration does not change those records.';
  END IF;
END;
$close_scope_preflight$;

-- AccountingPeriod already has its (organizationId,id) unique key.
CREATE UNIQUE INDEX "fiscal_years_scope_key" ON public."fiscal_years" ("organizationId", "id");
CREATE UNIQUE INDEX "close_runs_scope_key" ON public."close_runs" ("organizationId", "periodId", "id");
CREATE UNIQUE INDEX "close_checklists_scope_key" ON public."close_checklist_items" ("organizationId", "periodId", "closeRunId", "id");
CREATE UNIQUE INDEX "close_findings_scope_key" ON public."close_assurance_findings" ("organizationId", "periodId", "closeRunId", "id");
CREATE UNIQUE INDEX "close_evidence_scope_key" ON public."close_evidence_items" ("organizationId", "periodId", "closeRunId", "id");
CREATE UNIQUE INDEX "accountant_reviews_scope_key" ON public."accountant_reviews" ("organizationId", "periodId", "closeRunId", "id");

-- Keep all existing id-only foreign keys and their deletion behavior. The
-- supplemental NO ACTION checks run after their CASCADE/SET NULL actions.
-- MATCH SIMPLE skips an optional link when its nullable identifier is absent;
-- it never sets required organization/period/run columns to NULL.
ALTER TABLE public."accounting_periods" ADD CONSTRAINT "accounting_periods_fiscal_scope_fkey"
  FOREIGN KEY ("organizationId", "fiscalYearId") REFERENCES public."fiscal_years" ("organizationId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."close_runs" ADD CONSTRAINT "close_runs_period_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId") REFERENCES public."accounting_periods" ("organizationId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."close_checklist_items" ADD CONSTRAINT "close_checklists_run_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId") REFERENCES public."close_runs" ("organizationId", "periodId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."close_assurance_findings" ADD CONSTRAINT "close_findings_run_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId") REFERENCES public."close_runs" ("organizationId", "periodId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."close_evidence_items" ADD CONSTRAINT "close_evidence_run_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId") REFERENCES public."close_runs" ("organizationId", "periodId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."close_pack_exports" ADD CONSTRAINT "close_exports_run_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId") REFERENCES public."close_runs" ("organizationId", "periodId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."accountant_reviews" ADD CONSTRAINT "accountant_reviews_run_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId") REFERENCES public."close_runs" ("organizationId", "periodId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."accountant_comments" ADD CONSTRAINT "accountant_comments_run_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId") REFERENCES public."close_runs" ("organizationId", "periodId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."close_assurance_findings" ADD CONSTRAINT "close_findings_checklist_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId", "checklistItemId") REFERENCES public."close_checklist_items" ("organizationId", "periodId", "closeRunId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."close_evidence_items" ADD CONSTRAINT "close_evidence_checklist_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId", "checklistItemId") REFERENCES public."close_checklist_items" ("organizationId", "periodId", "closeRunId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."close_evidence_items" ADD CONSTRAINT "close_evidence_finding_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId", "findingId") REFERENCES public."close_assurance_findings" ("organizationId", "periodId", "closeRunId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."accountant_comments" ADD CONSTRAINT "accountant_comments_finding_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId", "findingId") REFERENCES public."close_assurance_findings" ("organizationId", "periodId", "closeRunId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."accountant_comments" ADD CONSTRAINT "accountant_comments_evidence_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId", "evidenceItemId") REFERENCES public."close_evidence_items" ("organizationId", "periodId", "closeRunId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;
ALTER TABLE public."accountant_comments" ADD CONSTRAINT "accountant_comments_review_scope_fkey"
  FOREIGN KEY ("organizationId", "periodId", "closeRunId", "reviewId") REFERENCES public."accountant_reviews" ("organizationId", "periodId", "closeRunId", "id") MATCH SIMPLE ON DELETE NO ACTION ON UPDATE RESTRICT;

CREATE FUNCTION public."close_core_scope_identity_immutable"()
RETURNS trigger LANGUAGE plpgsql AS $close_scope_identity$
BEGIN
  IF ROW(NEW."id", NEW."organizationId", NEW."periodId")
    IS DISTINCT FROM ROW(OLD."id", OLD."organizationId", OLD."periodId") THEN
    RAISE EXCEPTION 'Close record scope identity cannot be changed' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME <> 'close_runs' THEN
    IF NEW."closeRunId" IS DISTINCT FROM OLD."closeRunId" THEN
      RAISE EXCEPTION 'Close record scope identity cannot be changed' USING ERRCODE = '23514';
    END IF;
  END IF;
  -- Status, ownership, review decisions and stale/source metadata stay writable.
  RETURN NEW;
END;
$close_scope_identity$;

CREATE TRIGGER "close_runs_scope_identity_guard" BEFORE UPDATE ON public."close_runs"
  FOR EACH ROW EXECUTE FUNCTION public."close_core_scope_identity_immutable"();
CREATE TRIGGER "close_checklist_items_scope_identity_guard" BEFORE UPDATE ON public."close_checklist_items"
  FOR EACH ROW EXECUTE FUNCTION public."close_core_scope_identity_immutable"();
CREATE TRIGGER "close_assurance_findings_scope_identity_guard" BEFORE UPDATE ON public."close_assurance_findings"
  FOR EACH ROW EXECUTE FUNCTION public."close_core_scope_identity_immutable"();
CREATE TRIGGER "close_evidence_items_scope_identity_guard" BEFORE UPDATE ON public."close_evidence_items"
  FOR EACH ROW EXECUTE FUNCTION public."close_core_scope_identity_immutable"();
CREATE TRIGGER "close_pack_exports_scope_identity_guard" BEFORE UPDATE ON public."close_pack_exports"
  FOR EACH ROW EXECUTE FUNCTION public."close_core_scope_identity_immutable"();
CREATE TRIGGER "accountant_reviews_scope_identity_guard" BEFORE UPDATE ON public."accountant_reviews"
  FOR EACH ROW EXECUTE FUNCTION public."close_core_scope_identity_immutable"();
CREATE TRIGGER "accountant_comments_scope_identity_guard" BEFORE UPDATE ON public."accountant_comments"
  FOR EACH ROW EXECUTE FUNCTION public."close_core_scope_identity_immutable"();

COMMIT;
