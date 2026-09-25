-- Forward-only strengthening of the module authority boundary. Existing command
-- evidence and grants must keep their configuration parent. These foreign keys
-- also serialize concurrent parent deletion/child insertion correctly.
-- If a target already contains orphan evidence, validation stops; operators must
-- reconcile that target rather than recreate legacy authority or delete evidence.
ALTER TABLE "tenant_module_grants"
  ADD CONSTRAINT "tenant_module_grants_configuration_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "tenant_module_configurations"("organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_module_configuration_commands"
  ADD CONSTRAINT "tenant_module_commands_configuration_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "tenant_module_configurations"("organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
