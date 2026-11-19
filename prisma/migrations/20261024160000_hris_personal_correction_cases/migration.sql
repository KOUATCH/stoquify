CREATE TABLE hris_personal_correction_cases (
 id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
 "requestedById" TEXT NOT NULL, "assignedOwnerId" TEXT NOT NULL,
 "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','RETURNED','REJECTED','APPLIED')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
 proposal JSONB NOT NULL, baseline JSONB NOT NULL, policy JSONB NOT NULL,
 reason TEXT NOT NULL, "documentId" TEXT, history JSONB NOT NULL,
 "appliedBusinessEventId" TEXT, "appliedEmployeeVersion" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT hris_personal_case_employee_fk FOREIGN KEY ("organizationId","employeeId") REFERENCES payroll_employees("organizationId",id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT hris_personal_case_replay UNIQUE ("organizationId","requestedById","idempotencyKey")
);
CREATE INDEX hris_personal_case_owner ON hris_personal_correction_cases("organizationId","assignedOwnerId",status,"createdAt");
CREATE INDEX hris_personal_case_employee ON hris_personal_correction_cases("organizationId","employeeId","createdAt");
