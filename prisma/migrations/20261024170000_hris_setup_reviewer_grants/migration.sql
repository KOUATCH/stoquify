-- Additive, no backfill. Existing employee delegations keep their meaning.
CREATE TABLE "hris_setup_reviewer_grants" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "reviewerUserId" TEXT NOT NULL,
  "employeeId" TEXT,
  "domain" TEXT NOT NULL CHECK ("domain" IN ('TIME_POLICY', 'WORK_SCHEDULE', 'TIME_REQUEST')),
  "authority" TEXT NOT NULL CHECK ("authority" IN ('PEOPLE_READ', 'APPROVAL_DECISION')),
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT NOT NULL,
  "reasonHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "hris_setup_reviewer_tenant_fk" FOREIGN KEY ("organizationId", "reviewerUserId") REFERENCES "users"("organizationId", "id") ON DELETE RESTRICT,
  CONSTRAINT "hris_setup_grantor_tenant_fk" FOREIGN KEY ("organizationId", "createdById") REFERENCES "users"("organizationId", "id") ON DELETE RESTRICT,
  CONSTRAINT "hris_setup_employee_tenant_fk" FOREIGN KEY ("organizationId", "employeeId") REFERENCES "payroll_employees"("organizationId", "id") ON DELETE RESTRICT,
  CONSTRAINT "hris_setup_interval" CHECK ("effectiveTo" > "effectiveFrom"),
  CONSTRAINT "hris_setup_domain_scope" CHECK (("domain" = 'TIME_POLICY') = ("employeeId" IS NULL)),
  CONSTRAINT "hris_setup_independent" CHECK ("createdById" <> "reviewerUserId")
);
CREATE INDEX "hris_setup_reviewer_scope_idx" ON "hris_setup_reviewer_grants" ("organizationId", "reviewerUserId", "domain", "effectiveTo");
