CREATE TYPE "HrisOrgUnitType" AS ENUM ('COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM', 'BRANCH', 'COST_CENTER');
CREATE TYPE "HrisOrgUnitStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "HrisPositionStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "HrisEmploymentAssignmentType" AS ENUM ('PRIMARY', 'SECONDARY');
CREATE TYPE "HrisEmploymentAssignmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ENDED');
CREATE TYPE "HrisReportingRelationshipType" AS ENUM ('DIRECT', 'MATRIX', 'SCOPED_APPROVER');
CREATE TYPE "HrisReportingRelationshipStatus" AS ENUM ('ACTIVE', 'REVOKED', 'SUPERSEDED');
CREATE TYPE "HrisManagerDelegationAuthority" AS ENUM ('PEOPLE_READ', 'APPROVAL_DECISION');
CREATE TYPE "HrisManagerDelegationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'SUPERSEDED');

CREATE UNIQUE INDEX "locations_organizationId_id_key" ON "locations"("organizationId", "id");
CREATE UNIQUE INDEX "payroll_employees_organizationId_id_key" ON "payroll_employees"("organizationId", "id");

CREATE TABLE "hris_org_units" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "HrisOrgUnitType" NOT NULL,
  "status" "HrisOrgUnitStatus" NOT NULL DEFAULT 'ACTIVE',
  "parentId" TEXT,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hris_org_units_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hris_org_units_effective_period_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"),
  CONSTRAINT "hris_org_units_parent_check" CHECK ("parentId" IS NULL OR "parentId" <> "id")
);

CREATE UNIQUE INDEX "hris_org_units_organizationId_code_key" ON "hris_org_units"("organizationId", "code");
CREATE UNIQUE INDEX "hris_org_units_organizationId_id_key" ON "hris_org_units"("organizationId", "id");
CREATE INDEX "hris_org_units_organizationId_type_status_effectiveFrom_effectiveTo_idx" ON "hris_org_units"("organizationId", "type", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "hris_org_units_organizationId_parentId_idx" ON "hris_org_units"("organizationId", "parentId");

CREATE TABLE "hris_positions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "orgUnitId" TEXT NOT NULL,
  "locationId" TEXT,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "HrisPositionStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hris_positions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hris_positions_effective_period_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);

CREATE UNIQUE INDEX "hris_positions_organizationId_code_key" ON "hris_positions"("organizationId", "code");
CREATE UNIQUE INDEX "hris_positions_organizationId_id_key" ON "hris_positions"("organizationId", "id");
CREATE INDEX "hris_positions_organizationId_orgUnitId_status_effectiveFrom_effectiveTo_idx" ON "hris_positions"("organizationId", "orgUnitId", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "hris_positions_organizationId_locationId_idx" ON "hris_positions"("organizationId", "locationId");

CREATE TABLE "hris_employment_assignments" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "orgUnitId" TEXT NOT NULL,
  "type" "HrisEmploymentAssignmentType" NOT NULL DEFAULT 'PRIMARY',
  "status" "HrisEmploymentAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hris_employment_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hris_employment_assignments_effective_period_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);

CREATE UNIQUE INDEX "hris_employment_assignments_organizationId_id_key" ON "hris_employment_assignments"("organizationId", "id");
CREATE INDEX "hris_employment_assignments_organizationId_employeeId_type_status_effectiveFrom_effectiveTo_idx" ON "hris_employment_assignments"("organizationId", "employeeId", "type", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "hris_employment_assignments_organizationId_orgUnitId_status_effectiveFrom_effectiveTo_idx" ON "hris_employment_assignments"("organizationId", "orgUnitId", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "hris_employment_assignments_organizationId_positionId_idx" ON "hris_employment_assignments"("organizationId", "positionId");

CREATE TABLE "hris_reporting_relationships" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "managerEmployeeId" TEXT NOT NULL,
  "managerAssignmentId" TEXT NOT NULL,
  "reportEmployeeId" TEXT NOT NULL,
  "reportAssignmentId" TEXT NOT NULL,
  "type" "HrisReportingRelationshipType" NOT NULL DEFAULT 'DIRECT',
  "status" "HrisReportingRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "approvalEvidenceHash" VARCHAR(71) NOT NULL,
  "approvedById" TEXT NOT NULL,
  "reasonHash" VARCHAR(71) NOT NULL,
  "supersedesRelationshipId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hris_reporting_relationships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hris_reporting_relationships_effective_period_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"),
  CONSTRAINT "hris_reporting_relationships_people_check" CHECK ("managerEmployeeId" <> "reportEmployeeId"),
  CONSTRAINT "hris_reporting_relationships_assignment_check" CHECK ("managerAssignmentId" <> "reportAssignmentId"),
  CONSTRAINT "hris_reporting_relationships_supersession_check" CHECK ("supersedesRelationshipId" IS NULL OR "supersedesRelationshipId" <> "id"),
  CONSTRAINT "hris_reporting_relationships_hash_check" CHECK (
    length(btrim("approvalEvidenceHash")) = 71 AND left("approvalEvidenceHash", 7) = 'sha256:'
    AND length(btrim("reasonHash")) = 71 AND left("reasonHash", 7) = 'sha256:'
  )
);

CREATE UNIQUE INDEX "hris_reporting_relationships_organizationId_id_key" ON "hris_reporting_relationships"("organizationId", "id");
CREATE INDEX "hris_reporting_relationships_organizationId_managerEmployeeId_status_effectiveFrom_effectiveTo_idx" ON "hris_reporting_relationships"("organizationId", "managerEmployeeId", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "hris_reporting_relationships_organizationId_reportEmployeeId_status_effectiveFrom_effectiveTo_idx" ON "hris_reporting_relationships"("organizationId", "reportEmployeeId", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "hris_reporting_relationships_organizationId_managerAssignmentId_idx" ON "hris_reporting_relationships"("organizationId", "managerAssignmentId");
CREATE INDEX "hris_reporting_relationships_organizationId_reportAssignmentId_idx" ON "hris_reporting_relationships"("organizationId", "reportAssignmentId");
CREATE INDEX "hris_reporting_relationships_organizationId_supersedesRelationshipId_idx" ON "hris_reporting_relationships"("organizationId", "supersedesRelationshipId");

CREATE TABLE "hris_manager_delegations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "delegatorEmployeeId" TEXT NOT NULL,
  "delegateEmployeeId" TEXT NOT NULL,
  "scopeOrgUnitId" TEXT,
  "authority" "HrisManagerDelegationAuthority" NOT NULL,
  "status" "HrisManagerDelegationStatus" NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3) NOT NULL,
  "approvalEvidenceHash" VARCHAR(71) NOT NULL,
  "approvedById" TEXT NOT NULL,
  "reasonHash" VARCHAR(71) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revocationReasonHash" VARCHAR(71),
  "supersedesDelegationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hris_manager_delegations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hris_manager_delegations_effective_period_check" CHECK ("effectiveTo" > "effectiveFrom"),
  CONSTRAINT "hris_manager_delegations_people_check" CHECK ("delegatorEmployeeId" <> "delegateEmployeeId"),
  CONSTRAINT "hris_manager_delegations_supersession_check" CHECK ("supersedesDelegationId" IS NULL OR "supersedesDelegationId" <> "id"),
  CONSTRAINT "hris_manager_delegations_hash_check" CHECK (
    length(btrim("approvalEvidenceHash")) = 71 AND left("approvalEvidenceHash", 7) = 'sha256:'
    AND length(btrim("reasonHash")) = 71 AND left("reasonHash", 7) = 'sha256:'
    AND ("revocationReasonHash" IS NULL OR (length(btrim("revocationReasonHash")) = 71 AND left("revocationReasonHash", 7) = 'sha256:'))
  ),
  CONSTRAINT "hris_manager_delegations_revocation_check" CHECK (
    ("status" = 'ACTIVE' AND "revokedAt" IS NULL AND "revocationReasonHash" IS NULL)
    OR ("status" IN ('REVOKED', 'SUPERSEDED') AND "revokedAt" IS NOT NULL AND "revocationReasonHash" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "hris_manager_delegations_organizationId_id_key" ON "hris_manager_delegations"("organizationId", "id");
CREATE INDEX "hris_manager_delegations_organizationId_delegateEmployeeId_authority_status_effectiveFrom_effectiveTo_idx" ON "hris_manager_delegations"("organizationId", "delegateEmployeeId", "authority", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "hris_manager_delegations_organizationId_delegatorEmployeeId_status_effectiveFrom_effectiveTo_idx" ON "hris_manager_delegations"("organizationId", "delegatorEmployeeId", "status", "effectiveFrom", "effectiveTo");
CREATE INDEX "hris_manager_delegations_organizationId_scopeOrgUnitId_idx" ON "hris_manager_delegations"("organizationId", "scopeOrgUnitId");
CREATE INDEX "hris_manager_delegations_organizationId_supersedesDelegationId_idx" ON "hris_manager_delegations"("organizationId", "supersedesDelegationId");

ALTER TABLE "hris_org_units" ADD CONSTRAINT "hris_org_units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hris_org_units" ADD CONSTRAINT "hris_org_units_organizationId_parentId_fkey" FOREIGN KEY ("organizationId", "parentId") REFERENCES "hris_org_units"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_positions" ADD CONSTRAINT "hris_positions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hris_positions" ADD CONSTRAINT "hris_positions_organizationId_orgUnitId_fkey" FOREIGN KEY ("organizationId", "orgUnitId") REFERENCES "hris_org_units"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_positions" ADD CONSTRAINT "hris_positions_organizationId_locationId_fkey" FOREIGN KEY ("organizationId", "locationId") REFERENCES "locations"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_employment_assignments" ADD CONSTRAINT "hris_employment_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hris_employment_assignments" ADD CONSTRAINT "hris_employment_assignments_organizationId_employeeId_fkey" FOREIGN KEY ("organizationId", "employeeId") REFERENCES "payroll_employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_employment_assignments" ADD CONSTRAINT "hris_employment_assignments_organizationId_positionId_fkey" FOREIGN KEY ("organizationId", "positionId") REFERENCES "hris_positions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_employment_assignments" ADD CONSTRAINT "hris_employment_assignments_organizationId_orgUnitId_fkey" FOREIGN KEY ("organizationId", "orgUnitId") REFERENCES "hris_org_units"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_reporting_relationships" ADD CONSTRAINT "hris_reporting_relationships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hris_reporting_relationships" ADD CONSTRAINT "hris_reporting_relationships_organizationId_managerEmployeeId_fkey" FOREIGN KEY ("organizationId", "managerEmployeeId") REFERENCES "payroll_employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_reporting_relationships" ADD CONSTRAINT "hris_reporting_relationships_organizationId_reportEmployeeId_fkey" FOREIGN KEY ("organizationId", "reportEmployeeId") REFERENCES "payroll_employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_reporting_relationships" ADD CONSTRAINT "hris_reporting_relationships_organizationId_managerAssignmentId_fkey" FOREIGN KEY ("organizationId", "managerAssignmentId") REFERENCES "hris_employment_assignments"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_reporting_relationships" ADD CONSTRAINT "hris_reporting_relationships_organizationId_reportAssignmentId_fkey" FOREIGN KEY ("organizationId", "reportAssignmentId") REFERENCES "hris_employment_assignments"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_reporting_relationships" ADD CONSTRAINT "hris_reporting_relationships_organizationId_supersedesRelationshipId_fkey" FOREIGN KEY ("organizationId", "supersedesRelationshipId") REFERENCES "hris_reporting_relationships"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_manager_delegations" ADD CONSTRAINT "hris_manager_delegations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hris_manager_delegations" ADD CONSTRAINT "hris_manager_delegations_organizationId_delegatorEmployeeId_fkey" FOREIGN KEY ("organizationId", "delegatorEmployeeId") REFERENCES "payroll_employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_manager_delegations" ADD CONSTRAINT "hris_manager_delegations_organizationId_delegateEmployeeId_fkey" FOREIGN KEY ("organizationId", "delegateEmployeeId") REFERENCES "payroll_employees"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_manager_delegations" ADD CONSTRAINT "hris_manager_delegations_organizationId_scopeOrgUnitId_fkey" FOREIGN KEY ("organizationId", "scopeOrgUnitId") REFERENCES "hris_org_units"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hris_manager_delegations" ADD CONSTRAINT "hris_manager_delegations_organizationId_supersedesDelegationId_fkey" FOREIGN KEY ("organizationId", "supersedesDelegationId") REFERENCES "hris_manager_delegations"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
