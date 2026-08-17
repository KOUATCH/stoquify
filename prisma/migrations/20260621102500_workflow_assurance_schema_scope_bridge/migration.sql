-- Additive bridge for schema-portable workflow-assurance migration replay.
--
-- Historical workflow-assurance migrations checked pg_type by typname only.
-- PostgreSQL type names are namespace-scoped, so a same-named type in another
-- schema could suppress creation in the active schema. This bridge is ordered
-- immediately before those migrations and creates only missing local enums.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceWorkflow'
  ) THEN
    CREATE TYPE "WorkflowAssuranceWorkflow" AS ENUM (
      'CASH_COMMAND',
      'RECEIVABLES',
      'PAYABLES',
      'INVENTORY',
      'SALES_MARGIN',
      'PAYMENT_RECONCILIATION',
      'LEDGER',
      'BUSINESS_EVENT',
      'PURCHASING_AP',
      'PAYROLL',
      'COMPLIANCE',
      'CLOSE_ASSURANCE',
      'POS',
      'OFFLINE_POS',
      'SNAPSHOT_BI',
      'CROSS_MODULE'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceExecutionMode'
  ) THEN
    CREATE TYPE "WorkflowAssuranceExecutionMode" AS ENUM (
      'SYNCHRONOUS_GUARD',
      'AFTER_COMMIT_VALIDATOR',
      'SCHEDULED_SCAN',
      'PRE_CLOSE_GATE',
      'SNAPSHOT_BI_GUARD'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceResultStatus'
  ) THEN
    CREATE TYPE "WorkflowAssuranceResultStatus" AS ENUM (
      'PASSED',
      'WARNING',
      'FAILED',
      'BLOCKED',
      'SKIPPED',
      'ERROR'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceRunType'
  ) THEN
    CREATE TYPE "WorkflowAssuranceRunType" AS ENUM (
      'MANUAL',
      'SCHEDULED',
      'AFTER_COMMIT',
      'PRE_CLOSE',
      'SNAPSHOT_GUARD'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceRunStatus'
  ) THEN
    CREATE TYPE "WorkflowAssuranceRunStatus" AS ENUM (
      'RUNNING',
      'COMPLETED',
      'COMPLETED_WITH_WARNINGS',
      'FAILED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceSeverity'
  ) THEN
    CREATE TYPE "WorkflowAssuranceSeverity" AS ENUM (
      'INFO',
      'WARNING',
      'HIGH',
      'BLOCKING',
      'COMPLIANCE_CRITICAL'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceIncidentStatus'
  ) THEN
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceIncidentEventType'
  ) THEN
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceAlertChannel'
  ) THEN
    CREATE TYPE "WorkflowAssuranceAlertChannel" AS ENUM (
      'IN_APP',
      'EMAIL',
      'WEBHOOK',
      'SMS',
      'TASK_QUEUE'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceAlertDeliveryStatus'
  ) THEN
    CREATE TYPE "WorkflowAssuranceAlertDeliveryStatus" AS ENUM (
      'PENDING',
      'DELIVERED',
      'SKIPPED',
      'FAILED',
      'SUPPRESSED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type type_entry
    JOIN pg_namespace namespace_entry ON namespace_entry.oid = type_entry.typnamespace
    WHERE namespace_entry.nspname = current_schema()
      AND type_entry.typname = 'WorkflowAssuranceWaiverStatus'
  ) THEN
    CREATE TYPE "WorkflowAssuranceWaiverStatus" AS ENUM (
      'REQUESTED',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'REVOKED'
    );
  END IF;
END $$;
