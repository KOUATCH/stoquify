ALTER TABLE "tenant_module_configurations"
 ADD COLUMN "activeRevision" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "newWorkStoppedModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "newWorkStoppedAt" JSONB NOT NULL DEFAULT '{}';
-- Preserve the existing workspace revision; this does not certify domain setup.
UPDATE "tenant_module_configurations" SET "activeRevision" = "revision";
ALTER TABLE "tenant_module_configurations" ADD CONSTRAINT "module_active_revision_check"
 CHECK ("activeRevision" >= 0 AND "activeRevision" <= "revision" AND jsonb_typeof("newWorkStoppedAt") = 'object');
ALTER TABLE "tenant_module_configuration_commands" DROP CONSTRAINT "tenant_module_configuration_commands_state_check";
ALTER TABLE "tenant_module_configuration_commands" ADD CONSTRAINT "tenant_module_configuration_commands_state_check" CHECK (
 ("state" = 'ACTIVE' AND "resultRevision" IS NOT NULL AND "errorCode" IS NULL AND "previewHash" IS NOT NULL) OR
 ("state" = 'FAILED' AND "resultRevision" IS NULL AND "errorCode" IS NOT NULL) OR
 ("state" = 'DRAFT' AND "resultRevision" IS NULL AND "errorCode" IS NULL) OR
 ("state" = 'REQUESTED' AND "resultRevision" IS NULL AND "errorCode" IS NULL AND "previewHash" IS NOT NULL));
CREATE TYPE "TenantModuleLifecycleState" AS ENUM ('REQUESTED','PREPARING','ACTIVE','FAILED','RETAINED');
CREATE TYPE "TenantModuleLifecycleStepState" AS ENUM ('PENDING','RUNNING','WAITING_INPUT','SUCCEEDED','FAILED');
CREATE TABLE "tenant_module_lifecycle_operations" (
 "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "commandId" TEXT NOT NULL,
 "desiredRevision" INTEGER NOT NULL, "baseActiveRevision" INTEGER NOT NULL,
 "desiredModules" TEXT[] NOT NULL, "stopNewWorkModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "authorityHash" TEXT NOT NULL, "setupInputs" JSONB NOT NULL DEFAULT '{}', "state" "TenantModuleLifecycleState" NOT NULL DEFAULT 'REQUESTED',
 "version" INTEGER NOT NULL DEFAULT 0, "leaseToken" TEXT, "leaseUntil" TIMESTAMP(3),
 "errorCode" TEXT, "actorId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3),
 CONSTRAINT "module_lifecycle_configuration_fk" FOREIGN KEY ("organizationId") REFERENCES "tenant_module_configurations"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "module_lifecycle_command_fk" FOREIGN KEY ("organizationId","commandId") REFERENCES "tenant_module_configuration_commands"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "module_lifecycle_revision_check" CHECK ("desiredRevision" > "baseActiveRevision" AND "baseActiveRevision" >= 0 AND "version" >= 0),
 CONSTRAINT "module_lifecycle_lease_check" CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL)));
CREATE UNIQUE INDEX "tenant_module_lifecycle_operations_commandId_key" ON "tenant_module_lifecycle_operations"("commandId");
CREATE UNIQUE INDEX "tenant_module_lifecycle_operations_organizationId_commandId_key" ON "tenant_module_lifecycle_operations"("organizationId","commandId");
CREATE UNIQUE INDEX "tenant_module_lifecycle_operations_organizationId_id_key" ON "tenant_module_lifecycle_operations"("organizationId","id");
CREATE UNIQUE INDEX "tenant_module_lifecycle_operations_organizationId_desiredRevision_key" ON "tenant_module_lifecycle_operations"("organizationId","desiredRevision");
CREATE INDEX "tenant_module_lifecycle_operations_organizationId_state_createdAt_idx" ON "tenant_module_lifecycle_operations"("organizationId","state","createdAt");
CREATE TABLE "tenant_module_lifecycle_steps" (
 "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "operationId" TEXT NOT NULL,
 "moduleSlug" TEXT NOT NULL, "stepKey" TEXT NOT NULL, "inputHash" TEXT NOT NULL,
 "state" "TenantModuleLifecycleStepState" NOT NULL DEFAULT 'PENDING', "code" TEXT NOT NULL, "href" TEXT,
 "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0), "evidence" JSONB, "evidenceHash" TEXT,
 "checkedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "module_lifecycle_step_operation_fk" FOREIGN KEY ("organizationId","operationId") REFERENCES "tenant_module_lifecycle_operations"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "module_lifecycle_step_identity" ON "tenant_module_lifecycle_steps"("organizationId","operationId","moduleSlug","stepKey");
CREATE TABLE "tenant_module_lifecycle_events" (
 "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "operationId" TEXT NOT NULL,
 "sequence" INTEGER NOT NULL CHECK ("sequence" >= 0), "eventKey" TEXT NOT NULL, "eventType" TEXT NOT NULL,
 "state" "TenantModuleLifecycleState" NOT NULL, "actorId" TEXT NOT NULL,
 "evidence" JSONB NOT NULL, "evidenceHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "module_lifecycle_event_operation_fk" FOREIGN KEY ("organizationId","operationId") REFERENCES "tenant_module_lifecycle_operations"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "module_lifecycle_event_sequence" ON "tenant_module_lifecycle_events"("organizationId","operationId","sequence");
CREATE UNIQUE INDEX "module_lifecycle_event_key" ON "tenant_module_lifecycle_events"("organizationId","operationId","eventKey");
CREATE TRIGGER "tenant_module_lifecycle_events_append_only" BEFORE UPDATE OR DELETE ON "tenant_module_lifecycle_events"
 FOR EACH ROW EXECUTE FUNCTION "reject_tenant_module_command_mutation"();
