-- CreateEnum
CREATE TYPE "PayrollEmployeeBalanceCaseType" AS ENUM (
  'RECEIVABLE',
  'REFUND'
);

-- CreateEnum
CREATE TYPE "PayrollEmployeeBalanceCaseStatus" AS ENUM (
  'OPEN',
  'PARTIALLY_SETTLED',
  'SETTLED',
  'CANCELLED',
  'WRITTEN_OFF'
);

-- CreateEnum
CREATE TYPE "PayrollEmployeeBalanceEventType" AS ENUM (
  'OPEN',
  'SETTLE_CASH',
  'SETTLE_BANK',
  'SETTLE_MOBILE_MONEY',
  'SETTLE_DEDUCTION',
  'REFUND_PAYMENT',
  'WRITE_OFF',
  'CANCEL'
);

-- AlterEnum
ALTER TYPE "AccountingSourceType" ADD VALUE 'PAYROLL_EMPLOYEE_BALANCE';
ALTER TYPE "AccountingSourceType" ADD VALUE 'PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT';

-- AlterEnum
ALTER TYPE "AccountingPostingPurpose" ADD VALUE 'PAYROLL_EMPLOYEE_RECEIVABLE';
ALTER TYPE "AccountingPostingPurpose" ADD VALUE 'PAYROLL_EMPLOYEE_BALANCE_SETTLEMENT';

-- CreateTable
CREATE TABLE "payroll_employee_balance_cases" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "payrollRunId" TEXT NOT NULL,
  "payslipId" TEXT,
  "caseNumber" TEXT NOT NULL,
  "caseType" "PayrollEmployeeBalanceCaseType" NOT NULL,
  "status" "PayrollEmployeeBalanceCaseStatus" NOT NULL DEFAULT 'OPEN',
  "amount" DECIMAL(14,2) NOT NULL,
  "settledAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "outstandingAmount" DECIMAL(14,2) NOT NULL,
  "sourceNetPayableAmount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XAF',
  "reason" TEXT NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "openedById" TEXT NOT NULL,
  "settledAt" TIMESTAMP(3),
  "settledById" TEXT,
  "documentHash" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "ledgerPostingBatchId" TEXT,
  "journalEntryId" TEXT,
  "accountingSourceLinkId" TEXT,
  "openedBusinessEventId" TEXT,
  "idempotencyKey" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_employee_balance_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_employee_balance_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "balanceCaseId" TEXT NOT NULL,
  "eventType" "PayrollEmployeeBalanceEventType" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XAF',
  "eventDate" TIMESTAMP(3) NOT NULL,
  "actorId" TEXT NOT NULL,
  "method" "PaymentMethod",
  "documentHash" TEXT,
  "evidenceHash" TEXT NOT NULL,
  "ledgerPostingBatchId" TEXT,
  "journalEntryId" TEXT,
  "accountingSourceLinkId" TEXT,
  "businessEventId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_employee_balance_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_balance_cases_organizationId_caseNumber_key"
  ON "payroll_employee_balance_cases"("organizationId", "caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_balance_cases_organizationId_idempotencyKey_key"
  ON "payroll_employee_balance_cases"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "payroll_employee_balance_cases_organizationId_employeeId_status_idx"
  ON "payroll_employee_balance_cases"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "payroll_employee_balance_cases_organizationId_payrollRunId_idx"
  ON "payroll_employee_balance_cases"("organizationId", "payrollRunId");

-- CreateIndex
CREATE INDEX "payroll_employee_balance_cases_payslipId_idx"
  ON "payroll_employee_balance_cases"("payslipId");

-- CreateIndex
CREATE INDEX "payroll_employee_balance_cases_ledgerPostingBatchId_idx"
  ON "payroll_employee_balance_cases"("ledgerPostingBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_balance_events_organizationId_idempotencyKey_key"
  ON "payroll_employee_balance_events"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_balance_events_organizationId_balanceCaseId_eventType_idempotencyKey_key"
  ON "payroll_employee_balance_events"("organizationId", "balanceCaseId", "eventType", "idempotencyKey");

-- CreateIndex
CREATE INDEX "payroll_employee_balance_events_organizationId_balanceCaseId_createdAt_idx"
  ON "payroll_employee_balance_events"("organizationId", "balanceCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "payroll_employee_balance_events_organizationId_eventType_createdAt_idx"
  ON "payroll_employee_balance_events"("organizationId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "payroll_employee_balance_events_ledgerPostingBatchId_idx"
  ON "payroll_employee_balance_events"("ledgerPostingBatchId");

-- AddForeignKey
ALTER TABLE "payroll_employee_balance_cases"
  ADD CONSTRAINT "payroll_employee_balance_cases_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_employee_balance_cases"
  ADD CONSTRAINT "payroll_employee_balance_cases_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_employee_balance_cases"
  ADD CONSTRAINT "payroll_employee_balance_cases_payrollRunId_fkey"
  FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_employee_balance_cases"
  ADD CONSTRAINT "payroll_employee_balance_cases_payslipId_fkey"
  FOREIGN KEY ("payslipId") REFERENCES "payroll_payslips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_employee_balance_events"
  ADD CONSTRAINT "payroll_employee_balance_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_employee_balance_events"
  ADD CONSTRAINT "payroll_employee_balance_events_balanceCaseId_fkey"
  FOREIGN KEY ("balanceCaseId") REFERENCES "payroll_employee_balance_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "payroll_employee_balance_events_prevent_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable payroll evidence: employee balance event %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable payroll evidence: employee balance event %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "payroll_employee_balance_events_prevent_mutation_trigger" ON "payroll_employee_balance_events";
CREATE TRIGGER "payroll_employee_balance_events_prevent_mutation_trigger"
  BEFORE UPDATE OR DELETE ON "payroll_employee_balance_events"
  FOR EACH ROW EXECUTE FUNCTION "payroll_employee_balance_events_prevent_mutation"();
