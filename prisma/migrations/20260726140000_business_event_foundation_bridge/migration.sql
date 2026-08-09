-- Baseline-only business-event foundation reconstructed from the schema at
-- commit 1b83ef12c792e1956f1108962ec9634257f55feb. Existing databases that
-- already contain these tables must adopt this migration with
-- `prisma migrate resolve --applied`; they must never execute it.
BEGIN;

DO $baseline_guard$
BEGIN
  IF to_regclass('public.business_events') IS NOT NULL
    OR to_regclass('public.business_event_outbox') IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Business-event baseline bridge refused: use prisma migrate resolve --applied after schema verification on an existing database.';
  END IF;
END
$baseline_guard$;

-- CreateEnum
CREATE TYPE "BusinessEventSource" AS ENUM ('INTERNAL', 'API', 'POS', 'OFFLINE_POS', 'PROVIDER_WEBHOOK', 'IMPORT', 'WORKER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BusinessEventStatus" AS ENUM ('RECORDED', 'APPLIED', 'REJECTED', 'COMPENSATED', 'FAILED');

-- CreateEnum
CREATE TYPE "BusinessOutboxChannel" AS ENUM ('NOTIFICATION', 'EMAIL', 'WEBHOOK', 'AUTHORITY_SUBMISSION', 'RECEIPT_PRINT', 'SYNC_ACK', 'REPORT_EXPORT');

-- CreateEnum
CREATE TYPE "BusinessOutboxStatus" AS ENUM ('PENDING', 'LOCKED', 'SENT', 'FAILED', 'DEAD_LETTER', 'CANCELLED');

-- CreateTable
CREATE TABLE "business_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventSource" "BusinessEventSource" NOT NULL DEFAULT 'INTERNAL',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "BusinessEventStatus" NOT NULL DEFAULT 'RECORDED',
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "actorId" TEXT,
    "locationId" TEXT,
    "registerId" TEXT,
    "deviceId" TEXT,
    "sourceType" "AccountingSourceType",
    "sourceId" TEXT,
    "postingBatchId" TEXT,
    "documentHash" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_event_outbox" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessEventId" TEXT NOT NULL,
    "channel" "BusinessOutboxChannel" NOT NULL,
    "eventName" TEXT NOT NULL,
    "destination" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "BusinessOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_events_organizationId_eventType_occurredAt_idx" ON "business_events"("organizationId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "business_events_organizationId_status_recordedAt_idx" ON "business_events"("organizationId", "status", "recordedAt");

-- CreateIndex
CREATE INDEX "business_events_organizationId_sourceType_sourceId_idx" ON "business_events"("organizationId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "business_events_payloadHash_idx" ON "business_events"("payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "business_events_organizationId_eventSource_idempotencyKey_key" ON "business_events"("organizationId", "eventSource", "idempotencyKey");

-- CreateIndex
CREATE INDEX "business_event_outbox_organizationId_status_availableAt_idx" ON "business_event_outbox"("organizationId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "business_event_outbox_businessEventId_idx" ON "business_event_outbox"("businessEventId");

-- CreateIndex
CREATE UNIQUE INDEX "business_event_outbox_organizationId_channel_idempotencyKey_key" ON "business_event_outbox"("organizationId", "channel", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_event_outbox" ADD CONSTRAINT "business_event_outbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_event_outbox" ADD CONSTRAINT "business_event_outbox_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
