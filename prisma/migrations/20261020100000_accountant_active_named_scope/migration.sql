BEGIN;
-- Keep the previously applied AF04 authority migration immutable. Enforce one
-- retained active namespace per named client mandate for both legacy and managed
-- writers. Existing collisions must be reviewed; never delete consent to migrate.
CREATE UNIQUE INDEX accountant_active_named_scope_key
  ON accountant_access_grants ("organizationId", "accountantUserId")
  WHERE "activeScopeKey" IS NOT NULL;
COMMIT;
