-- CreateEnum
CREATE TYPE "HrisOperationalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "HrisTimeRequestType" AS ENUM ('LEAVE', 'OVERTIME', 'ATTENDANCE_CORRECTION');

-- CreateEnum
CREATE TYPE "HrisTimeRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HrisTimeImportStatus" AS ENUM ('RECEIVED', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HrisTimeEntryStatus" AS ENUM ('IMPORTED', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HrisAttendanceAnomalyStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "hris_work_calendars" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "HrisOperationalStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "sourceHash" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hris_work_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hris_public_holidays" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "holidayDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hris_public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hris_work_schedules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "weeklyPattern" JSONB NOT NULL,
    "standardWeeklyMinutes" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "HrisOperationalStatus" NOT NULL DEFAULT 'DRAFT',
    "preparedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sourceHash" TEXT NOT NULL,
    "approvalEvidenceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hris_work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hris_leave_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "annualEntitlementMinutes" INTEGER NOT NULL,
    "carryOverLimitMinutes" INTEGER NOT NULL DEFAULT 0,
    "accrualRule" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "HrisOperationalStatus" NOT NULL DEFAULT 'DRAFT',
    "preparedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sourceHash" TEXT NOT NULL,
    "approvalEvidenceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hris_leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hris_leave_balance_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leavePolicyId" TEXT NOT NULL,
    "deltaMinutes" INTEGER NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "entryType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hris_leave_balance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hris_time_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leavePolicyId" TEXT,
    "type" "HrisTimeRequestType" NOT NULL,
    "status" "HrisTimeRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "requestedMinutes" INTEGER NOT NULL,
    "proposedWorkedMinutes" INTEGER,
    "proposedAbsenceMinutes" INTEGER,
    "reason" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "requestEvidenceHash" TEXT NOT NULL,
    "approvalEvidenceHash" TEXT,
    "sourceHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hris_time_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hris_time_import_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "sourceHash" TEXT NOT NULL,
    "status" "HrisTimeImportStatus" NOT NULL DEFAULT 'RECEIVED',
    "rowCount" INTEGER NOT NULL,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "importedById" TEXT NOT NULL,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hris_time_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hris_time_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "scheduledMinutes" INTEGER NOT NULL,
    "workedMinutes" INTEGER NOT NULL,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "absenceMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "HrisTimeEntryStatus" NOT NULL DEFAULT 'IMPORTED',
    "sourceRecordId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hris_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hris_attendance_anomalies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "timeEntryId" TEXT,
    "employeeId" TEXT,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" "HrisAttendanceAnomalyStatus" NOT NULL DEFAULT 'OPEN',
    "detail" JSONB,
    "evidenceHash" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hris_attendance_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hris_work_calendars_organizationId_countryCode_status_effec_idx" ON "hris_work_calendars"("organizationId", "countryCode", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "hris_work_calendars_organizationId_code_version_key" ON "hris_work_calendars"("organizationId", "code", "version");

-- CreateIndex
CREATE INDEX "hris_public_holidays_organizationId_holidayDate_idx" ON "hris_public_holidays"("organizationId", "holidayDate");

-- CreateIndex
CREATE UNIQUE INDEX "hris_public_holidays_organizationId_calendarId_holidayDate_key" ON "hris_public_holidays"("organizationId", "calendarId", "holidayDate");

-- CreateIndex
CREATE INDEX "hris_work_schedules_organizationId_employeeId_status_effect_idx" ON "hris_work_schedules"("organizationId", "employeeId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "hris_work_schedules_organizationId_employeeId_effectiveFrom_key" ON "hris_work_schedules"("organizationId", "employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "hris_leave_policies_organizationId_countryCode_status_effec_idx" ON "hris_leave_policies"("organizationId", "countryCode", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "hris_leave_policies_organizationId_code_version_key" ON "hris_leave_policies"("organizationId", "code", "version");

-- CreateIndex
CREATE INDEX "hris_leave_balance_entries_organizationId_employeeId_leaveP_idx" ON "hris_leave_balance_entries"("organizationId", "employeeId", "leavePolicyId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "hris_leave_balance_entries_organizationId_idempotencyKey_key" ON "hris_leave_balance_entries"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "hris_leave_balance_entries_organizationId_sourceType_source_key" ON "hris_leave_balance_entries"("organizationId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "hris_time_requests_organizationId_employeeId_status_type_pe_idx" ON "hris_time_requests"("organizationId", "employeeId", "status", "type", "periodStart");

-- CreateIndex
CREATE INDEX "hris_time_requests_organizationId_status_requestedAt_idx" ON "hris_time_requests"("organizationId", "status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "hris_time_requests_organizationId_idempotencyKey_key" ON "hris_time_requests"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "hris_time_import_batches_organizationId_status_createdAt_idx" ON "hris_time_import_batches"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "hris_time_import_batches_organizationId_idempotencyKey_key" ON "hris_time_import_batches"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "hris_time_import_batches_organizationId_sourceHash_key" ON "hris_time_import_batches"("organizationId", "sourceHash");

-- CreateIndex
CREATE INDEX "hris_time_entries_organizationId_employeeId_workDate_status_idx" ON "hris_time_entries"("organizationId", "employeeId", "workDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hris_time_entries_organizationId_importBatchId_sourceRecord_key" ON "hris_time_entries"("organizationId", "importBatchId", "sourceRecordId");

-- CreateIndex
CREATE INDEX "hris_attendance_anomalies_organizationId_status_severity_cr_idx" ON "hris_attendance_anomalies"("organizationId", "status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "hris_attendance_anomalies_organizationId_employeeId_status_idx" ON "hris_attendance_anomalies"("organizationId", "employeeId", "status");

-- AddForeignKey
ALTER TABLE "hris_work_calendars" ADD CONSTRAINT "hris_work_calendars_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_public_holidays" ADD CONSTRAINT "hris_public_holidays_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_public_holidays" ADD CONSTRAINT "hris_public_holidays_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "hris_work_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_work_schedules" ADD CONSTRAINT "hris_work_schedules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_work_schedules" ADD CONSTRAINT "hris_work_schedules_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_work_schedules" ADD CONSTRAINT "hris_work_schedules_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "hris_work_calendars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_leave_policies" ADD CONSTRAINT "hris_leave_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_leave_balance_entries" ADD CONSTRAINT "hris_leave_balance_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_leave_balance_entries" ADD CONSTRAINT "hris_leave_balance_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_leave_balance_entries" ADD CONSTRAINT "hris_leave_balance_entries_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "hris_leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_time_requests" ADD CONSTRAINT "hris_time_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_time_requests" ADD CONSTRAINT "hris_time_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_time_requests" ADD CONSTRAINT "hris_time_requests_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "hris_leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_time_import_batches" ADD CONSTRAINT "hris_time_import_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_time_entries" ADD CONSTRAINT "hris_time_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_time_entries" ADD CONSTRAINT "hris_time_entries_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "hris_time_import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_time_entries" ADD CONSTRAINT "hris_time_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_attendance_anomalies" ADD CONSTRAINT "hris_attendance_anomalies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_attendance_anomalies" ADD CONSTRAINT "hris_attendance_anomalies_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "hris_time_import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_attendance_anomalies" ADD CONSTRAINT "hris_attendance_anomalies_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "hris_time_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hris_attendance_anomalies" ADD CONSTRAINT "hris_attendance_anomalies_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
