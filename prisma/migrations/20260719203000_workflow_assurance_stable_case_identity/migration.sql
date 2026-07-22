-- Stable Workflow Assurance case identity.
-- Evidence hashes may change while one logical source remains one reviewable case.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "workflow_assurance_incidents"
    GROUP BY "organizationId", "checkKey", "definitionVersion", "sourceType", "sourceId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot install stable Workflow Assurance identity: duplicate logical cases require adjudication.'
      USING ERRCODE = '23505';
  END IF;
END $$;

ALTER TYPE "WorkflowAssuranceIncidentEventType"
  ADD VALUE IF NOT EXISTS 'SOURCE_CHANGED';

DROP INDEX IF EXISTS "workflow_assurance_incident_dedupe_key";

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_assurance_incident_identity_key"
  ON "workflow_assurance_incidents"(
    "organizationId",
    "checkKey",
    "definitionVersion",
    "sourceType",
    "sourceId"
  );
