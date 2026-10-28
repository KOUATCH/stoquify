CREATE TABLE "pos_cash_shortage_worker_checkpoints" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "checkKey" TEXT NOT NULL,
  "workerKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "recordedFromInclusive" TIMESTAMP(3) NOT NULL,
  "recordedThroughExclusive" TIMESTAMP(3) NOT NULL,
  "cursor" JSONB,
  "lastProcessedCursor" JSONB,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "leaseOwnerId" TEXT,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "nextAttemptAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "deadLetteredAt" TIMESTAMP(3),
  "deadLetterReason" TEXT,
  "correlationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_cash_shortage_worker_checkpoints_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_cash_shortage_worker_checkpoints_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pos_cash_shortage_worker_checkpoints_window_check"
    CHECK ("recordedFromInclusive" < "recordedThroughExclusive"),
  CONSTRAINT "pos_cash_shortage_worker_checkpoints_attempt_check"
    CHECK ("attempt" >= 0),
  CONSTRAINT "pos_cash_shortage_worker_checkpoints_status_check"
    CHECK ("status" IN ('PENDING', 'LEASED', 'RETRY_SCHEDULED', 'COMPLETED', 'DEAD_LETTERED'))
);

CREATE UNIQUE INDEX "pos_cash_shortage_worker_checkpoints_window_key"
  ON "pos_cash_shortage_worker_checkpoints"("organizationId", "checkKey", "workerKey", "recordedFromInclusive", "recordedThroughExclusive");

CREATE INDEX "pos_cash_shortage_worker_checkpoints_ready_work_idx"
  ON "pos_cash_shortage_worker_checkpoints"("organizationId", "status", "nextAttemptAt");

CREATE INDEX "pos_cash_shortage_worker_checkpoints_lease_recovery_idx"
  ON "pos_cash_shortage_worker_checkpoints"("organizationId", "status", "leaseExpiresAt");

CREATE INDEX "pos_cash_shortage_worker_checkpoints_check_status_idx"
  ON "pos_cash_shortage_worker_checkpoints"("organizationId", "checkKey", "workerKey", "status");

CREATE INDEX "pos_cash_shortage_worker_checkpoints_lease_token_idx"
  ON "pos_cash_shortage_worker_checkpoints"("leaseToken");
