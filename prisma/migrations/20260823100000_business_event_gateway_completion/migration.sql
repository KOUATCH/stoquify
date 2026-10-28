-- Complete the universal business-event gateway with durable correlation,
-- event-scoped audit evidence, and operator-visible anomaly records.

-- AlterTable
ALTER TABLE "business_events" ADD COLUMN "correlationId" TEXT;

-- AlterTable
ALTER TABLE "business_event_outbox" ADD COLUMN "correlationId" TEXT;

-- CreateEnum
CREATE TYPE "BusinessEventAuditAction" AS ENUM (
  'RECORDED',
  'APPLIED',
  'STATUS_CHANGED',
  'IDEMPOTENT_REPLAY',
  'IDEMPOTENCY_CONFLICT',
  'OUTBOX_RETRY',
  'OUTBOX_DELIVERED',
  'OUTBOX_DEAD_LETTERED'
);

-- CreateEnum
CREATE TYPE "BusinessEventAnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BusinessEventAnomalyStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "business_event_audits" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "action" "BusinessEventAuditAction" NOT NULL,
  "eventSource" "BusinessEventSource",
  "actorId" TEXT,
  "reason" TEXT,
  "payloadHash" TEXT,
  "attemptedPayloadHash" TEXT,
  "correlationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_event_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_event_anomalies" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "anomalyType" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "severity" "BusinessEventAnomalySeverity" NOT NULL,
  "status" "BusinessEventAnomalyStatus" NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "correlationId" TEXT,
  "metadata" JSONB,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolutionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "business_event_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_events_organizationId_correlationId_idx"
ON "business_events"("organizationId", "correlationId");

-- CreateIndex
CREATE INDEX "business_event_outbox_organizationId_correlationId_idx"
ON "business_event_outbox"("organizationId", "correlationId");

-- CreateIndex
CREATE INDEX "business_event_audits_organizationId_createdAt_idx"
ON "business_event_audits"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "business_event_audits_businessEventId_createdAt_idx"
ON "business_event_audits"("businessEventId", "createdAt");

-- CreateIndex
CREATE INDEX "business_event_audits_organizationId_action_createdAt_idx"
ON "business_event_audits"("organizationId", "action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "business_event_anomalies_organizationId_businessEventId_anomalyType_fingerprint_key"
ON "business_event_anomalies"("organizationId", "businessEventId", "anomalyType", "fingerprint");

-- CreateIndex
CREATE INDEX "business_event_anomalies_organizationId_status_severity_lastSeenAt_idx"
ON "business_event_anomalies"("organizationId", "status", "severity", "lastSeenAt");

-- CreateIndex
CREATE INDEX "business_event_anomalies_businessEventId_createdAt_idx"
ON "business_event_anomalies"("businessEventId", "createdAt");

-- AddForeignKey
ALTER TABLE "business_event_audits"
ADD CONSTRAINT "business_event_audits_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_event_audits"
ADD CONSTRAINT "business_event_audits_businessEventId_fkey"
FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_event_anomalies"
ADD CONSTRAINT "business_event_anomalies_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_event_anomalies"
ADD CONSTRAINT "business_event_anomalies_businessEventId_fkey"
FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
