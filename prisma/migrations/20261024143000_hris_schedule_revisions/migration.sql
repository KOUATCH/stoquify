-- HR-13: preserve published schedule revisions and explicit dated shift facts.
-- Existing rows retain revision 1; no guessed shift times or employee backfill.
ALTER TABLE "hris_work_schedules"
  ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "supersedesScheduleId" TEXT,
  ADD COLUMN IF NOT EXISTS "shiftPlan" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "hris_work_schedules_org_employee_date_revision_key"
  ON "hris_work_schedules" ("organizationId", "employeeId", "effectiveFrom", "revision");
-- A draft replacement may coexist with its retained predecessor. Publication
-- retires only an exact-interval predecessor, under the existing employee lock.
CREATE UNIQUE INDEX IF NOT EXISTS "hris_work_schedules_active_work_date_key"
  ON "hris_work_schedules" ("organizationId", "employeeId", "effectiveFrom")
  WHERE "status" = 'ACTIVE';
DROP INDEX IF EXISTS "hris_work_schedules_organizationId_employeeId_effectiveFrom_key";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hris_work_schedules_supersedesScheduleId_fkey') THEN
    ALTER TABLE "hris_work_schedules" ADD CONSTRAINT "hris_work_schedules_supersedesScheduleId_fkey"
      FOREIGN KEY ("supersedesScheduleId") REFERENCES "hris_work_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hris_work_schedules_revision_positive') THEN
    ALTER TABLE "hris_work_schedules" ADD CONSTRAINT "hris_work_schedules_revision_positive" CHECK ("revision" > 0);
  END IF;
END $$;
