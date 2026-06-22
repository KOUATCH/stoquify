-- Kontava Workflow Assurance Incident Spine.
-- Durable tenant-scoped anomaly history, event history, alert delivery history, and waivers.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceIncidentStatus') THEN
    CREATE TYPE "WorkflowAssuranceIncidentStatus" AS ENUM (
      'OPEN',
      'ACKNOWLEDGED',
      'ASSIGNED',
      'IN_PROGRESS',
      'RESOLVED',
      'WAIVED',
      'SUPPRESSED',
      'REOPENED',
      'CLOSED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceIncidentEventType') THEN
    CREATE TYPE "WorkflowAssuranceIncidentEventType" AS ENUM (
      'CREATED',
      'DUPLICATE_DETECTED',
      'SEVERITY_CHANGED',
      'ACKNOWLEDGED',
      'ASSIGNED',
      'IN_PROGRESS',
      'RESOLVED',
      'WAIVER_REQUESTED',
      'WAIVER_APPROVED',
      'WAIVER_REJECTED',
      'SUPPRESSED',
      'REOPENED',
      'CLOSED',
      'ALERT_RECORDED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceAlertChannel') THEN
    CREATE TYPE "WorkflowAssuranceAlertChannel" AS ENUM (
      'IN_APP',
      'EMAIL',
      'WEBHOOK',
      'SMS',
      'TASK_QUEUE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceAlertDeliveryStatus') THEN
    CREATE TYPE "WorkflowAssuranceAlertDeliveryStatus" AS ENUM (
      'PENDING',
      'DELIVERED',
      'SKIPPED',
      'FAILED',
      'SUPPRESSED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceWaiverStatus') THEN
    CREATE TYPE "WorkflowAssuranceWaiverStatus" AS ENUM (
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'REVOKED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "workflow_assurance_incidents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "checkRunId" TEXT,
  "checkKey" TEXT NOT NULL,
  "definitionVersion" INTEGER NOT NULL,
  "workflow" "WorkflowAssuranceWorkflow" NOT NULL,
  "moduleSlug" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "severity" "WorkflowAssuranceSeverity" NOT NULL,
  "status" "WorkflowAssuranceIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "evidenceGrade" TEXT NOT NULL DEFAULT 'blocked',
  "sourceLinks" JSONB,
  "assignedRole" TEXT,
  "ownerId" TEXT,
  "dueAt" TIMESTAMP(3),
  "actionRoute" TEXT NOT NULL,
  "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "reopenedAt" TIMESTAMP(3),
  "suppressedAt" TIMESTAMP(3),
  "suppressedById" TEXT,
  "closedAt" TIMESTAMP(3),
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "resolutionNote" TEXT,
  "suppressionReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workflow_assurance_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workflow_assurance_incident_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "eventType" "WorkflowAssuranceIncidentEventType" NOT NULL,
  "fromStatus" "WorkflowAssuranceIncidentStatus",
  "toStatus" "WorkflowAssuranceIncidentStatus",
  "actorId" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workflow_assurance_incident_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workflow_assurance_alert_deliveries" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "channel" "WorkflowAssuranceAlertChannel" NOT NULL,
  "status" "WorkflowAssuranceAlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "dedupeKey" TEXT NOT NULL,
  "recipientId" TEXT,
  "recipientRole" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "actionRoute" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workflow_assurance_alert_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workflow_assurance_waivers" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "status" "WorkflowAssuranceWaiverStatus" NOT NULL DEFAULT 'REQUESTED',
  "requesterId" TEXT NOT NULL,
  "approverId" TEXT,
  "reason" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workflow_assurance_waivers_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_incidents_organizationId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_incidents"
      ADD CONSTRAINT "workflow_assurance_incidents_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_incidents_definitionId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_incidents"
      ADD CONSTRAINT "workflow_assurance_incidents_definitionId_fkey"
      FOREIGN KEY ("definitionId") REFERENCES "workflow_assurance_check_definitions"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_incidents_checkRunId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_incidents"
      ADD CONSTRAINT "workflow_assurance_incidents_checkRunId_fkey"
      FOREIGN KEY ("checkRunId") REFERENCES "workflow_assurance_check_runs"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_incident_events_organizationId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_incident_events"
      ADD CONSTRAINT "workflow_assurance_incident_events_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_incident_events_incidentId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_incident_events"
      ADD CONSTRAINT "workflow_assurance_incident_events_incidentId_fkey"
      FOREIGN KEY ("incidentId") REFERENCES "workflow_assurance_incidents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_alert_deliveries_organizationId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_alert_deliveries"
      ADD CONSTRAINT "workflow_assurance_alert_deliveries_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_alert_deliveries_incidentId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_alert_deliveries"
      ADD CONSTRAINT "workflow_assurance_alert_deliveries_incidentId_fkey"
      FOREIGN KEY ("incidentId") REFERENCES "workflow_assurance_incidents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_waivers_organizationId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_waivers"
      ADD CONSTRAINT "workflow_assurance_waivers_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_waivers_incidentId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_waivers"
      ADD CONSTRAINT "workflow_assurance_waivers_incidentId_fkey"
      FOREIGN KEY ("incidentId") REFERENCES "workflow_assurance_incidents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_assurance_incident_dedupe_key"
  ON "workflow_assurance_incidents"("organizationId", "checkKey", "sourceType", "sourceId", "fingerprint", "sourceHash");

CREATE INDEX IF NOT EXISTS "workflow_assurance_incidents_organizationId_status_severity_lastDetectedAt_idx"
  ON "workflow_assurance_incidents"("organizationId", "status", "severity", "lastDetectedAt");

CREATE INDEX IF NOT EXISTS "workflow_assurance_incidents_organizationId_ownerId_status_dueAt_idx"
  ON "workflow_assurance_incidents"("organizationId", "ownerId", "status", "dueAt");

CREATE INDEX IF NOT EXISTS "workflow_assurance_incidents_organizationId_workflow_status_idx"
  ON "workflow_assurance_incidents"("organizationId", "workflow", "status");

CREATE INDEX IF NOT EXISTS "workflow_assurance_incidents_definitionId_idx"
  ON "workflow_assurance_incidents"("definitionId");

CREATE INDEX IF NOT EXISTS "workflow_assurance_incidents_checkRunId_idx"
  ON "workflow_assurance_incidents"("checkRunId");

CREATE INDEX IF NOT EXISTS "workflow_assurance_incident_events_organizationId_incidentId_createdAt_idx"
  ON "workflow_assurance_incident_events"("organizationId", "incidentId", "createdAt");

CREATE INDEX IF NOT EXISTS "workflow_assurance_incident_events_organizationId_eventType_createdAt_idx"
  ON "workflow_assurance_incident_events"("organizationId", "eventType", "createdAt");

CREATE INDEX IF NOT EXISTS "workflow_assurance_incident_events_actorId_createdAt_idx"
  ON "workflow_assurance_incident_events"("actorId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_assurance_alert_deliveries_organizationId_incidentId_channel_dedupeKey_key"
  ON "workflow_assurance_alert_deliveries"("organizationId", "incidentId", "channel", "dedupeKey");

CREATE INDEX IF NOT EXISTS "workflow_assurance_alert_deliveries_organizationId_status_createdAt_idx"
  ON "workflow_assurance_alert_deliveries"("organizationId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "workflow_assurance_alert_deliveries_organizationId_channel_status_idx"
  ON "workflow_assurance_alert_deliveries"("organizationId", "channel", "status");

CREATE INDEX IF NOT EXISTS "workflow_assurance_alert_deliveries_incidentId_idx"
  ON "workflow_assurance_alert_deliveries"("incidentId");

CREATE INDEX IF NOT EXISTS "workflow_assurance_waivers_organizationId_incidentId_status_idx"
  ON "workflow_assurance_waivers"("organizationId", "incidentId", "status");

CREATE INDEX IF NOT EXISTS "workflow_assurance_waivers_organizationId_requesterId_status_idx"
  ON "workflow_assurance_waivers"("organizationId", "requesterId", "status");

CREATE INDEX IF NOT EXISTS "workflow_assurance_waivers_organizationId_expiresAt_status_idx"
  ON "workflow_assurance_waivers"("organizationId", "expiresAt", "status");
