-- Reconcile databases that received the offline POS foundation through schema
-- synchronization before its migration history was recorded. These statements
-- are no-ops when the foundation migration ran on a clean database.
ALTER TYPE "POSOfflineSyncConflictType"
  ADD VALUE IF NOT EXISTS 'OFFLINE_POLICY_EXPIRED';

ALTER TABLE "pos_offline_devices"
  ADD COLUMN IF NOT EXISTS "policyExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "pos_offline_devices_organizationId_status_policyExpiresAt_idx"
  ON "pos_offline_devices"("organizationId", "status", "policyExpiresAt");
