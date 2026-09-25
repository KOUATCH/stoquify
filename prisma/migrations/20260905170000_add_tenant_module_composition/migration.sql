-- Additive workspace configuration. No tenant is activated and no commercial
-- grant is issued by this migration. Existing access is snapshotted by the
-- authenticated composition service on the tenant's first configuration write.
CREATE TYPE "TenantModuleConfigurationCommandState" AS ENUM ('DRAFT', 'ACTIVE', 'FAILED');

CREATE TABLE "tenant_module_configurations" (
  "organizationId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "selectedModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "activeModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "legacyUnknownValues" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "manifestHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_module_configurations_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "tenant_module_configurations_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "tenant_module_configurations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "tenant_module_grants" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "moduleSlug" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "readOnly" BOOLEAN NOT NULL DEFAULT false,
  "trial" BOOLEAN NOT NULL DEFAULT false,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_module_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_module_grants_revision_check" CHECK ("revision" >= 1),
  CONSTRAINT "tenant_module_grants_status_check" CHECK ("status" IN ('active','trial','read_only','suspended','expired','unavailable','legacy_default','system_default')),
  CONSTRAINT "tenant_module_grants_source_check" CHECK ("source" IN ('requested_modules','legacy_default','system_default','manual_override','plan','trial')),
  CONSTRAINT "tenant_module_grants_validity_check" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt"),
  CONSTRAINT "tenant_module_grants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tenant_module_grants_organizationId_moduleSlug_key" ON "tenant_module_grants"("organizationId", "moduleSlug");
CREATE INDEX "tenant_module_grants_organizationId_status_idx" ON "tenant_module_grants"("organizationId", "status");

CREATE TABLE "tenant_module_configuration_commands" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "expectedRevision" INTEGER NOT NULL,
  "resultRevision" INTEGER,
  "state" "TenantModuleConfigurationCommandState" NOT NULL,
  "selectedModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "previousModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "previewHash" TEXT,
  "reviewSnapshot" JSONB,
  "errorCode" TEXT,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_module_configuration_commands_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_module_configuration_commands_revision_check" CHECK ("expectedRevision" >= 0 AND ("resultRevision" IS NULL OR "resultRevision" = "expectedRevision" + 1)),
  CONSTRAINT "tenant_module_configuration_commands_state_check" CHECK (("state" = 'ACTIVE' AND "resultRevision" IS NOT NULL AND "errorCode" IS NULL AND "previewHash" IS NOT NULL) OR ("state" = 'FAILED' AND "resultRevision" IS NULL AND "errorCode" IS NOT NULL) OR ("state" = 'DRAFT' AND "resultRevision" IS NULL AND "errorCode" IS NULL)),
  CONSTRAINT "tenant_module_configuration_commands_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tenant_module_commands_org_idempotency_key" ON "tenant_module_configuration_commands"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "tenant_module_configuration_commands_organizationId_id_key" ON "tenant_module_configuration_commands"("organizationId", "id");
CREATE INDEX "tenant_module_commands_org_state_created_idx" ON "tenant_module_configuration_commands"("organizationId", "state", "createdAt");

-- A command is a retained submitted snapshot, not an editable draft row.
-- Editing/reopening creates a new command and never rewrites prior evidence.
CREATE FUNCTION "reject_tenant_module_command_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Tenant module configuration command evidence is append-only';
END;
$$;
CREATE TRIGGER "tenant_module_configuration_commands_append_only"
BEFORE UPDATE OR DELETE ON "tenant_module_configuration_commands"
FOR EACH ROW EXECUTE FUNCTION "reject_tenant_module_command_mutation"();
