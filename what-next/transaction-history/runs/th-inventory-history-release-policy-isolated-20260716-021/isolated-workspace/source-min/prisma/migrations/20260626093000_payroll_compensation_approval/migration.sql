-- Prompt 09: Compensation, rubrique catalog, employee assignment, and salary-change approval.

CREATE TYPE "PayrollRubriqueKind" AS ENUM (
  'EARNING',
  'DEDUCTION',
  'EMPLOYER_CHARGE',
  'INFORMATION'
);

CREATE TYPE "PayrollRubriqueValueType" AS ENUM (
  'FIXED_AMOUNT',
  'RATE_BPS',
  'QUANTITY_RATE',
  'FORMULA_REFERENCE'
);

CREATE TYPE "PayrollRubriqueStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'RETIRED'
);

CREATE TYPE "PayrollRubriqueAssignmentStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'ENDED'
);

CREATE TYPE "PayrollSalaryChangeStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'APPLIED'
);

CREATE TABLE "payroll_rubriques" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "kind" "PayrollRubriqueKind" NOT NULL,
  "valueType" "PayrollRubriqueValueType" NOT NULL,
  "status" "PayrollRubriqueStatus" NOT NULL DEFAULT 'DRAFT',
  "taxableBase" BOOLEAN NOT NULL DEFAULT false,
  "socialBase" BOOLEAN NOT NULL DEFAULT false,
  "employerCharge" BOOLEAN NOT NULL DEFAULT false,
  "payslipLabel" TEXT,
  "postingDebitAccountCode" TEXT,
  "postingCreditAccountCode" TEXT,
  "countryCode" TEXT,
  "statutoryParameterPath" TEXT,
  "countryPackVersion" TEXT,
  "countryPackSchemaVersion" TEXT,
  "countryPackResolutionHash" TEXT,
  "countryPackLegalRef" TEXT,
  "countryPackVerificationStatus" TEXT,
  "countryPackCapabilityStatus" TEXT,
  "metadata" JSONB,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payroll_rubriques_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_employee_rubrique_assignments" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "rubriqueId" TEXT NOT NULL,
  "status" "PayrollRubriqueAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
  "amount" DECIMAL(14,2),
  "rateBps" INTEGER,
  "quantity" DECIMAL(12,3),
  "currency" TEXT NOT NULL DEFAULT 'XAF',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "evidenceDocumentHash" TEXT,
  "approvalBusinessEventId" TEXT,
  "metadata" JSONB,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payroll_employee_rubrique_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_salary_change_requests" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "sourceContractId" TEXT NOT NULL,
  "supersedingContractId" TEXT,
  "status" "PayrollSalaryChangeStatus" NOT NULL DEFAULT 'REQUESTED',
  "currentBaseSalary" DECIMAL(14,2) NOT NULL,
  "proposedBaseSalary" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XAF',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "requestedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "rejectedById" TEXT,
  "appliedById" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "requestReason" TEXT NOT NULL,
  "decisionReason" TEXT,
  "evidenceDocumentHash" TEXT NOT NULL,
  "approvalEvidenceHash" TEXT,
  "requestBusinessEventId" TEXT,
  "approvalBusinessEventId" TEXT,
  "appliedBusinessEventId" TEXT,
  "metadata" JSONB,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payroll_salary_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_rubriques_organizationId_code_key"
  ON "payroll_rubriques"("organizationId", "code");
CREATE INDEX "payroll_rubriques_organizationId_status_kind_idx"
  ON "payroll_rubriques"("organizationId", "status", "kind");
CREATE INDEX "payroll_rubriques_organizationId_statutoryParameterPath_idx"
  ON "payroll_rubriques"("organizationId", "statutoryParameterPath");

CREATE INDEX "payroll_employee_rubrique_assignments_organizationId_employeeId_status_effectiveFrom_idx"
  ON "payroll_employee_rubrique_assignments"("organizationId", "employeeId", "status", "effectiveFrom");
CREATE INDEX "payroll_employee_rubrique_assignments_organizationId_rubriqueId_status_idx"
  ON "payroll_employee_rubrique_assignments"("organizationId", "rubriqueId", "status");
CREATE INDEX "payroll_employee_rubrique_assignments_organizationId_effectiveFrom_idx"
  ON "payroll_employee_rubrique_assignments"("organizationId", "effectiveFrom");

CREATE INDEX "payroll_salary_change_requests_organizationId_employeeId_status_effectiveFrom_idx"
  ON "payroll_salary_change_requests"("organizationId", "employeeId", "status", "effectiveFrom");
CREATE INDEX "payroll_salary_change_requests_organizationId_sourceContractId_idx"
  ON "payroll_salary_change_requests"("organizationId", "sourceContractId");
CREATE INDEX "payroll_salary_change_requests_organizationId_supersedingContractId_idx"
  ON "payroll_salary_change_requests"("organizationId", "supersedingContractId");
CREATE INDEX "payroll_salary_change_requests_requestedById_idx"
  ON "payroll_salary_change_requests"("requestedById");
CREATE INDEX "payroll_salary_change_requests_approvedById_idx"
  ON "payroll_salary_change_requests"("approvedById");

ALTER TABLE "payroll_rubriques"
  ADD CONSTRAINT "payroll_rubriques_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_employee_rubrique_assignments"
  ADD CONSTRAINT "payroll_employee_rubrique_assignments_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_employee_rubrique_assignments"
  ADD CONSTRAINT "payroll_employee_rubrique_assignments_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_employee_rubrique_assignments"
  ADD CONSTRAINT "payroll_employee_rubrique_assignments_rubriqueId_fkey"
  FOREIGN KEY ("rubriqueId") REFERENCES "payroll_rubriques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_salary_change_requests"
  ADD CONSTRAINT "payroll_salary_change_requests_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_salary_change_requests"
  ADD CONSTRAINT "payroll_salary_change_requests_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "payroll_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_salary_change_requests"
  ADD CONSTRAINT "payroll_salary_change_requests_sourceContractId_fkey"
  FOREIGN KEY ("sourceContractId") REFERENCES "payroll_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_salary_change_requests"
  ADD CONSTRAINT "payroll_salary_change_requests_supersedingContractId_fkey"
  FOREIGN KEY ("supersedingContractId") REFERENCES "payroll_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
