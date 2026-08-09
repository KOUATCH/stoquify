-- Baseline-only payroll foundation reconstructed from the schema at commit
-- 1b83ef12c792e1956f1108962ec9634257f55feb. Existing databases that already
-- contain these tables must adopt this migration with
-- `prisma migrate resolve --applied`; they must never execute it.
BEGIN;

DO $baseline_guard$
BEGIN
  IF to_regclass('public.payroll_employees') IS NOT NULL
    OR to_regclass('public.payroll_runs') IS NOT NULL
    OR to_regclass('public.payroll_payment_batches') IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Payroll baseline bridge refused: use prisma migrate resolve --applied after schema verification on an existing database.';
  END IF;
END
$baseline_guard$;

-- CreateEnum
CREATE TYPE "PayrollEmployeeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PayrollContractType" AS ENUM ('CDI', 'CDD', 'INTERNSHIP', 'DAILY', 'CONSULTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "PayrollContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'INPUTS_LOCKED', 'CALCULATED', 'APPROVED', 'PAID', 'POSTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PayrollFrequency" AS ENUM ('MONTHLY', 'BI_MONTHLY', 'WEEKLY', 'OFF_CYCLE');

-- CreateEnum
CREATE TYPE "PayrollAttendanceSnapshotStatus" AS ENUM ('DRAFT', 'FROZEN', 'CORRECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PayrollRunType" AS ENUM ('ORDINARY', 'COMPLEMENTARY', 'OFF_CYCLE', 'BONUS', 'CORRECTION');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'EMITTED', 'PAID', 'POSTED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollPayslipStatus" AS ENUM ('DRAFT', 'EMITTED', 'CORRECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PayrollPayslipLineCategory" AS ENUM ('EARNING', 'EMPLOYEE_DEDUCTION', 'EMPLOYER_CHARGE', 'INFORMATION');

-- CreateEnum
CREATE TYPE "PayrollDeclarationStatus" AS ENUM ('PREPARED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PAYMENT_DUE', 'PAID', 'RECONCILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PayrollPaymentBatchStatus" AS ENUM ('DRAFT', 'APPROVED', 'RELEASED', 'PARTIALLY_SETTLED', 'SETTLED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "payroll_employees" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "status" "PayrollEmployeeStatus" NOT NULL DEFAULT 'DRAFT',
    "hireDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "countryCode" TEXT,
    "locationId" TEXT,
    "department" TEXT,
    "jobTitle" TEXT,
    "costCenter" TEXT,
    "taxIdentifierMasked" TEXT,
    "taxIdentifierHash" TEXT,
    "socialIdentifierMasked" TEXT,
    "socialIdentifierHash" TEXT,
    "paymentMethod" "PaymentMethod",
    "bankAccountMasked" TEXT,
    "bankAccountHash" TEXT,
    "mobileMoneyProvider" TEXT,
    "mobileMoneyPhoneMasked" TEXT,
    "mobileMoneyPhoneHash" TEXT,
    "paymentDestinationHash" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_contracts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "type" "PayrollContractType" NOT NULL,
    "status" "PayrollContractStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "workingHoursPerMonth" DECIMAL(8,2),
    "classification" TEXT,
    "echelon" TEXT,
    "convention" TEXT,
    "signedDocumentHash" TEXT,
    "activatedBusinessEventId" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountingPeriodId" TEXT,
    "name" TEXT NOT NULL,
    "frequency" "PayrollFrequency" NOT NULL DEFAULT 'MONTHLY',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "countryCode" TEXT NOT NULL,
    "countryPackVersion" TEXT,
    "countryPackSchemaVersion" TEXT,
    "countryPackResolutionHash" TEXT,
    "countryPackCapabilityStatus" TEXT,
    "inputLockedAt" TIMESTAMP(3),
    "inputLockedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_attendance_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollPeriodId" TEXT,
    "employeeId" TEXT NOT NULL,
    "status" "PayrollAttendanceSnapshotStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "scheduledMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "absenceMinutes" INTEGER NOT NULL DEFAULT 0,
    "leaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "sourceHash" TEXT NOT NULL,
    "frozenById" TEXT,
    "frozenAt" TIMESTAMP(3),
    "correctedFromId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_attendance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "originalRunId" TEXT,
    "runNumber" TEXT NOT NULL,
    "runType" "PayrollRunType" NOT NULL DEFAULT 'ORDINARY',
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "countryCode" TEXT NOT NULL,
    "countryPackVersion" TEXT NOT NULL,
    "countryPackSchemaVersion" TEXT NOT NULL,
    "countryPackResolutionHash" TEXT NOT NULL,
    "countryPackCapabilityStatus" TEXT NOT NULL,
    "ruleSetHash" TEXT NOT NULL,
    "calculationHash" TEXT NOT NULL,
    "attendanceSnapshotHash" TEXT NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employeeDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employerChargeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netPayableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "idempotencyKey" TEXT,
    "documentHash" TEXT,
    "evidenceHash" TEXT,
    "ledgerPostingBatchId" TEXT,
    "postedBusinessEventId" TEXT,
    "journalEntryId" TEXT,
    "accountingSourceLinkId" TEXT,
    "preparedById" TEXT,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "emittedById" TEXT,
    "postedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "emittedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_lines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "attendanceSnapshotId" TEXT,
    "grossAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxableBaseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "socialBaseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employeeDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employerChargeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netPayableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "calculationSnapshot" JSONB NOT NULL,
    "ruleProvenance" JSONB NOT NULL,
    "anomalyFlags" JSONB,
    "documentHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_run_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payslips" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "runLineId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payslipNumber" TEXT NOT NULL,
    "status" "PayrollPayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "countryCode" TEXT NOT NULL,
    "countryPackVersion" TEXT NOT NULL,
    "countryPackSchemaVersion" TEXT NOT NULL,
    "countryPackResolutionHash" TEXT NOT NULL,
    "ruleSetHash" TEXT NOT NULL,
    "grossAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employeeDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employerChargeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netPayableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "documentHash" TEXT NOT NULL,
    "archiveUri" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payslip_lines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "PayrollPayslipLineCategory" NOT NULL,
    "baseAmount" DECIMAL(14,2),
    "rateBps" INTEGER,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_payslip_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_declarations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "declarationType" TEXT NOT NULL,
    "status" "PayrollDeclarationStatus" NOT NULL DEFAULT 'PREPARED',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "countryCode" TEXT NOT NULL,
    "countryPackVersion" TEXT NOT NULL,
    "countryPackSchemaVersion" TEXT NOT NULL,
    "countryPackResolutionHash" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "payloadHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payment_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "status" "PayrollPaymentBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,
    "bankFileHash" TEXT,
    "documentHash" TEXT,
    "evidenceHash" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "releasedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "ledgerPostingBatchId" TEXT,
    "postedBusinessEventId" TEXT,
    "paymentTransactionId" TEXT,
    "paymentExceptionId" TEXT,
    "reconciliationStatus" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_payment_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payment_allocations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "payrollPaymentBatchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_employees_organizationId_status_hireDate_idx" ON "payroll_employees"("organizationId", "status", "hireDate");

-- CreateIndex
CREATE INDEX "payroll_employees_organizationId_paymentDestinationHash_idx" ON "payroll_employees"("organizationId", "paymentDestinationHash");

-- CreateIndex
CREATE INDEX "payroll_employees_organizationId_socialIdentifierHash_idx" ON "payroll_employees"("organizationId", "socialIdentifierHash");

-- CreateIndex
CREATE INDEX "payroll_employees_locationId_idx" ON "payroll_employees"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employees_organizationId_employeeNumber_key" ON "payroll_employees"("organizationId", "employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employees_organizationId_userId_key" ON "payroll_employees"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "payroll_contracts_organizationId_employeeId_status_effectiv_idx" ON "payroll_contracts"("organizationId", "employeeId", "status", "effectiveFrom");

-- CreateIndex
CREATE INDEX "payroll_contracts_organizationId_status_idx" ON "payroll_contracts"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_contracts_organizationId_contractNumber_key" ON "payroll_contracts"("organizationId", "contractNumber");

-- CreateIndex
CREATE INDEX "payroll_periods_organizationId_status_periodStart_idx" ON "payroll_periods"("organizationId", "status", "periodStart");

-- CreateIndex
CREATE INDEX "payroll_periods_accountingPeriodId_idx" ON "payroll_periods"("accountingPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_organizationId_periodStart_periodEnd_key" ON "payroll_periods"("organizationId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "payroll_attendance_snapshots_organizationId_employeeId_peri_idx" ON "payroll_attendance_snapshots"("organizationId", "employeeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "payroll_attendance_snapshots_organizationId_status_frozenAt_idx" ON "payroll_attendance_snapshots"("organizationId", "status", "frozenAt");

-- CreateIndex
CREATE INDEX "payroll_attendance_snapshots_payrollPeriodId_idx" ON "payroll_attendance_snapshots"("payrollPeriodId");

-- CreateIndex
CREATE INDEX "payroll_attendance_snapshots_correctedFromId_idx" ON "payroll_attendance_snapshots"("correctedFromId");

-- CreateIndex
CREATE INDEX "payroll_runs_organizationId_status_createdAt_idx" ON "payroll_runs"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "payroll_runs_organizationId_payrollPeriodId_runType_idx" ON "payroll_runs"("organizationId", "payrollPeriodId", "runType");

-- CreateIndex
CREATE INDEX "payroll_runs_ledgerPostingBatchId_idx" ON "payroll_runs"("ledgerPostingBatchId");

-- CreateIndex
CREATE INDEX "payroll_runs_postedBusinessEventId_idx" ON "payroll_runs"("postedBusinessEventId");

-- CreateIndex
CREATE INDEX "payroll_runs_originalRunId_idx" ON "payroll_runs"("originalRunId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_organizationId_runNumber_key" ON "payroll_runs"("organizationId", "runNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_organizationId_idempotencyKey_key" ON "payroll_runs"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "payroll_run_lines_organizationId_employeeId_idx" ON "payroll_run_lines"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_run_lines_contractId_idx" ON "payroll_run_lines"("contractId");

-- CreateIndex
CREATE INDEX "payroll_run_lines_attendanceSnapshotId_idx" ON "payroll_run_lines"("attendanceSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_lines_payrollRunId_employeeId_key" ON "payroll_run_lines"("payrollRunId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payslips_runLineId_key" ON "payroll_payslips"("runLineId");

-- CreateIndex
CREATE INDEX "payroll_payslips_organizationId_payrollRunId_idx" ON "payroll_payslips"("organizationId", "payrollRunId");

-- CreateIndex
CREATE INDEX "payroll_payslips_organizationId_employeeId_issuedAt_idx" ON "payroll_payslips"("organizationId", "employeeId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payslips_organizationId_payslipNumber_key" ON "payroll_payslips"("organizationId", "payslipNumber");

-- CreateIndex
CREATE INDEX "payroll_payslip_lines_organizationId_payslipId_idx" ON "payroll_payslip_lines"("organizationId", "payslipId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payslip_lines_payslipId_lineNumber_key" ON "payroll_payslip_lines"("payslipId", "lineNumber");

-- CreateIndex
CREATE INDEX "payroll_declarations_organizationId_status_dueDate_idx" ON "payroll_declarations"("organizationId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_declarations_organizationId_payrollRunId_authority__key" ON "payroll_declarations"("organizationId", "payrollRunId", "authority", "declarationType");

-- CreateIndex
CREATE INDEX "payroll_payment_batches_organizationId_status_paymentDate_idx" ON "payroll_payment_batches"("organizationId", "status", "paymentDate");

-- CreateIndex
CREATE INDEX "payroll_payment_batches_payrollRunId_idx" ON "payroll_payment_batches"("payrollRunId");

-- CreateIndex
CREATE INDEX "payroll_payment_batches_ledgerPostingBatchId_idx" ON "payroll_payment_batches"("ledgerPostingBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payment_batches_organizationId_batchNumber_key" ON "payroll_payment_batches"("organizationId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payment_batches_organizationId_idempotencyKey_key" ON "payroll_payment_batches"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "payroll_payment_allocations_organizationId_employeeId_idx" ON "payroll_payment_allocations"("organizationId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_payment_allocations_payslipId_idx" ON "payroll_payment_allocations"("payslipId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payment_allocations_payrollPaymentBatchId_payslipId_key" ON "payroll_payment_allocations"("payrollPaymentBatchId", "payslipId");

-- AddForeignKey
ALTER TABLE "payroll_employees" ADD CONSTRAINT "payroll_employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_contracts" ADD CONSTRAINT "payroll_contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_contracts" ADD CONSTRAINT "payroll_contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_attendance_snapshots" ADD CONSTRAINT "payroll_attendance_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_attendance_snapshots" ADD CONSTRAINT "payroll_attendance_snapshots_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_attendance_snapshots" ADD CONSTRAINT "payroll_attendance_snapshots_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_attendance_snapshots" ADD CONSTRAINT "payroll_attendance_snapshots_correctedFromId_fkey" FOREIGN KEY ("correctedFromId") REFERENCES "payroll_attendance_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_originalRunId_fkey" FOREIGN KEY ("originalRunId") REFERENCES "payroll_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "payroll_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_lines" ADD CONSTRAINT "payroll_run_lines_attendanceSnapshotId_fkey" FOREIGN KEY ("attendanceSnapshotId") REFERENCES "payroll_attendance_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payslips" ADD CONSTRAINT "payroll_payslips_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payslips" ADD CONSTRAINT "payroll_payslips_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payslips" ADD CONSTRAINT "payroll_payslips_runLineId_fkey" FOREIGN KEY ("runLineId") REFERENCES "payroll_run_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payslips" ADD CONSTRAINT "payroll_payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payslip_lines" ADD CONSTRAINT "payroll_payslip_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payslip_lines" ADD CONSTRAINT "payroll_payslip_lines_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payroll_payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_declarations" ADD CONSTRAINT "payroll_declarations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_declarations" ADD CONSTRAINT "payroll_declarations_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_batches" ADD CONSTRAINT "payroll_payment_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_batches" ADD CONSTRAINT "payroll_payment_batches_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_allocations" ADD CONSTRAINT "payroll_payment_allocations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_allocations" ADD CONSTRAINT "payroll_payment_allocations_payrollPaymentBatchId_fkey" FOREIGN KEY ("payrollPaymentBatchId") REFERENCES "payroll_payment_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_allocations" ADD CONSTRAINT "payroll_payment_allocations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payment_allocations" ADD CONSTRAINT "payroll_payment_allocations_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payroll_payslips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
