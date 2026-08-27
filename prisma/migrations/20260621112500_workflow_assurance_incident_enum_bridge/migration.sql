-- Fresh-replay bridge for incident-spine enums. The historical migration that
-- follows creates these types dynamically and references them in the same batch.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceIncidentStatus' AND n.nspname = current_schema()) THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceIncidentEventType' AND n.nspname = current_schema()) THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceAlertChannel' AND n.nspname = current_schema()) THEN
    CREATE TYPE "WorkflowAssuranceAlertChannel" AS ENUM (
      'IN_APP',
      'EMAIL',
      'WEBHOOK',
      'SMS',
      'TASK_QUEUE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceAlertDeliveryStatus' AND n.nspname = current_schema()) THEN
    CREATE TYPE "WorkflowAssuranceAlertDeliveryStatus" AS ENUM (
      'PENDING',
      'DELIVERED',
      'SKIPPED',
      'FAILED',
      'SUPPRESSED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceWaiverStatus' AND n.nspname = current_schema()) THEN
    CREATE TYPE "WorkflowAssuranceWaiverStatus" AS ENUM (
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'REVOKED'
    );
  END IF;
END $$;
