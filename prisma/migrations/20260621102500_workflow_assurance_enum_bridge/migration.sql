-- Fresh-replay bridge: create workflow-assurance enums in a separate migration
-- so the following registry migration can parse its table definitions safely.
-- Every branch is idempotent for databases where the historical migration already ran.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceWorkflow' AND n.nspname = current_schema()) THEN
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

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceExecutionMode' AND n.nspname = current_schema()) THEN
    CREATE TYPE "WorkflowAssuranceExecutionMode" AS ENUM (
      'SYNCHRONOUS_GUARD',
      'AFTER_COMMIT_VALIDATOR',
      'SCHEDULED_SCAN',
      'PRE_CLOSE_GATE',
      'SNAPSHOT_BI_GUARD'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceResultStatus' AND n.nspname = current_schema()) THEN
    CREATE TYPE "WorkflowAssuranceResultStatus" AS ENUM (
      'PASSED',
      'WARNING',
      'FAILED',
      'BLOCKED',
      'SKIPPED',
      'ERROR'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceRunType' AND n.nspname = current_schema()) THEN
    CREATE TYPE "WorkflowAssuranceRunType" AS ENUM (
      'MANUAL',
      'SCHEDULED',
      'AFTER_COMMIT',
      'PRE_CLOSE',
      'SNAPSHOT_GUARD'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceRunStatus' AND n.nspname = current_schema()) THEN
    CREATE TYPE "WorkflowAssuranceRunStatus" AS ENUM (
      'RUNNING',
      'COMPLETED',
      'COMPLETED_WITH_WARNINGS',
      'FAILED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'WorkflowAssuranceSeverity' AND n.nspname = current_schema()) THEN
    CREATE TYPE "WorkflowAssuranceSeverity" AS ENUM (
      'INFO',
      'WARNING',
      'HIGH',
      'BLOCKING',
      'COMPLIANCE_CRITICAL'
    );
  END IF;
END $$;
