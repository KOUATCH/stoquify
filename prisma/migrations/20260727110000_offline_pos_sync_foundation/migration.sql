-- CreateEnum
CREATE TYPE "POSOfflineDeviceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'ROTATING');

-- CreateEnum
CREATE TYPE "POSOfflineSyncBatchStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'ACCEPTED', 'PARTIAL_CONFLICT', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "POSOfflineEventType" AS ENUM ('OFFLINE_SALE_CAPTURED', 'OFFLINE_TENDER_CLAIMED', 'OFFLINE_RECEIPT_PROVISIONED', 'OFFLINE_DRAWER_EVIDENCE', 'OFFLINE_SESSION_EVIDENCE');

-- CreateEnum
CREATE TYPE "POSOfflineEventStatus" AS ENUM ('PENDING_REPLAY', 'RECORDED', 'DUPLICATE_REPLAY', 'CONFLICT', 'QUARANTINED', 'REPLAYED', 'BLOCKED', 'REJECTED');

-- CreateEnum
CREATE TYPE "POSOfflineSyncConflictType" AS ENUM ('IDEMPOTENCY_PAYLOAD_MISMATCH', 'SEQUENCE_GAP', 'SEQUENCE_DUPLICATE_MISMATCH', 'HASH_CHAIN_FORK', 'DEVICE_REVOKED', 'SIGNATURE_INVALID', 'OFFLINE_POLICY_EXPIRED', 'STALE_REFERENCE_SNAPSHOT', 'PROVISIONAL_RECEIPT_PENDING', 'UNPOSTED_ACCEPTED_EVENT', 'UNRECONCILED_TENDER_CLAIM');

-- CreateEnum
CREATE TYPE "POSOfflineSyncConflictSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "POSOfflineSyncConflictStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "POSOfflineSyncCertificateStatus" AS ENUM ('OPEN', 'BLOCKED', 'CERTIFIED', 'EXPIRED');

-- CreateTable
CREATE TABLE "pos_offline_devices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "deviceLabel" TEXT NOT NULL,
    "deviceFingerprintHash" TEXT NOT NULL,
    "publicKeyFingerprint" TEXT,
    "signingPublicKeyPem" TEXT,
    "policySnapshotHash" TEXT,
    "sourceSnapshotHash" TEXT,
    "policyExpiresAt" TIMESTAMP(3),
    "status" "POSOfflineDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "highWaterHash" TEXT,
    "enrolledById" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_offline_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_offline_sync_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "actorId" TEXT,
    "status" "POSOfflineSyncBatchStatus" NOT NULL DEFAULT 'RECEIVED',
    "firstSequence" INTEGER,
    "lastSequence" INTEGER,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "payloadHash" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_offline_sync_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_offline_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT,
    "syncBatchId" TEXT,
    "businessEventId" TEXT,
    "eventType" "POSOfflineEventType" NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "deviceSeq" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "provisionalReference" TEXT,
    "payloadHash" TEXT NOT NULL,
    "prevHash" TEXT,
    "entryHash" TEXT NOT NULL,
    "signature" TEXT,
    "capturedAtDevice" TIMESTAMP(3) NOT NULL,
    "receivedAtServer" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "POSOfflineEventStatus" NOT NULL DEFAULT 'PENDING_REPLAY',
    "payload" JSONB NOT NULL,
    "policySnapshotHash" TEXT,
    "sourceSnapshotHash" TEXT,
    "postingBatchId" TEXT,
    "documentHash" TEXT,
    "blockerCode" TEXT,
    "blockerMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_offline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_offline_sync_conflicts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "eventId" TEXT,
    "syncBatchId" TEXT,
    "conflictType" "POSOfflineSyncConflictType" NOT NULL,
    "severity" "POSOfflineSyncConflictSeverity" NOT NULL DEFAULT 'HIGH',
    "status" "POSOfflineSyncConflictStatus" NOT NULL DEFAULT 'OPEN',
    "expectedSequence" INTEGER,
    "actualSequence" INTEGER,
    "expectedHash" TEXT,
    "actualHash" TEXT,
    "existingPayloadHash" TEXT,
    "incomingPayloadHash" TEXT,
    "message" TEXT NOT NULL,
    "resolutionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_offline_sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_offline_sync_certificates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" "POSOfflineSyncCertificateStatus" NOT NULL DEFAULT 'OPEN',
    "certificationScope" TEXT NOT NULL DEFAULT 'DEVICE',
    "lastCertifiedSequence" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "pendingReplayCount" INTEGER NOT NULL DEFAULT 0,
    "closeBlocker" BOOLEAN NOT NULL DEFAULT true,
    "blockerCode" TEXT,
    "blockerMessage" TEXT,
    "certificateHash" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "certifiedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_offline_sync_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_offline_devices_organizationId_status_lastSeenAt_idx" ON "pos_offline_devices"("organizationId", "status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "pos_offline_devices_organizationId_status_policyExpiresAt_idx" ON "pos_offline_devices"("organizationId", "status", "policyExpiresAt");

-- CreateIndex
CREATE INDEX "pos_offline_devices_locationId_idx" ON "pos_offline_devices"("locationId");

-- CreateIndex
CREATE INDEX "pos_offline_devices_terminalId_idx" ON "pos_offline_devices"("terminalId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_offline_devices_organizationId_deviceFingerprintHash_key" ON "pos_offline_devices"("organizationId", "deviceFingerprintHash");

-- CreateIndex
CREATE UNIQUE INDEX "pos_offline_devices_organizationId_terminalId_deviceLabel_key" ON "pos_offline_devices"("organizationId", "terminalId", "deviceLabel");

-- CreateIndex
CREATE INDEX "pos_offline_sync_batches_organizationId_status_receivedAt_idx" ON "pos_offline_sync_batches"("organizationId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "pos_offline_sync_batches_deviceId_receivedAt_idx" ON "pos_offline_sync_batches"("deviceId", "receivedAt");

-- CreateIndex
CREATE INDEX "pos_offline_events_organizationId_status_receivedAtServer_idx" ON "pos_offline_events"("organizationId", "status", "receivedAtServer");

-- CreateIndex
CREATE INDEX "pos_offline_events_organizationId_eventType_capturedAtDevic_idx" ON "pos_offline_events"("organizationId", "eventType", "capturedAtDevice");

-- CreateIndex
CREATE INDEX "pos_offline_events_syncBatchId_idx" ON "pos_offline_events"("syncBatchId");

-- CreateIndex
CREATE INDEX "pos_offline_events_businessEventId_idx" ON "pos_offline_events"("businessEventId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_offline_events_organizationId_deviceId_deviceSeq_key" ON "pos_offline_events"("organizationId", "deviceId", "deviceSeq");

-- CreateIndex
CREATE UNIQUE INDEX "pos_offline_events_organizationId_idempotencyKey_key" ON "pos_offline_events"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "pos_offline_events_organizationId_deviceId_entryHash_key" ON "pos_offline_events"("organizationId", "deviceId", "entryHash");

-- CreateIndex
CREATE INDEX "pos_offline_sync_conflicts_organizationId_status_severity_c_idx" ON "pos_offline_sync_conflicts"("organizationId", "status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "pos_offline_sync_conflicts_deviceId_status_idx" ON "pos_offline_sync_conflicts"("deviceId", "status");

-- CreateIndex
CREATE INDEX "pos_offline_sync_conflicts_eventId_idx" ON "pos_offline_sync_conflicts"("eventId");

-- CreateIndex
CREATE INDEX "pos_offline_sync_conflicts_syncBatchId_idx" ON "pos_offline_sync_conflicts"("syncBatchId");

-- CreateIndex
CREATE INDEX "pos_offline_sync_certificates_organizationId_status_closeBl_idx" ON "pos_offline_sync_certificates"("organizationId", "status", "closeBlocker");

-- CreateIndex
CREATE INDEX "pos_offline_sync_certificates_terminalId_idx" ON "pos_offline_sync_certificates"("terminalId");

-- CreateIndex
CREATE INDEX "pos_offline_sync_certificates_locationId_idx" ON "pos_offline_sync_certificates"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_offline_sync_certificates_organizationId_deviceId_certi_key" ON "pos_offline_sync_certificates"("organizationId", "deviceId", "certificationScope");

-- AddForeignKey
ALTER TABLE "pos_offline_devices" ADD CONSTRAINT "pos_offline_devices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_devices" ADD CONSTRAINT "pos_offline_devices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_devices" ADD CONSTRAINT "pos_offline_devices_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "pos_terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_batches" ADD CONSTRAINT "pos_offline_sync_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_batches" ADD CONSTRAINT "pos_offline_sync_batches_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "pos_offline_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_events" ADD CONSTRAINT "pos_offline_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_events" ADD CONSTRAINT "pos_offline_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "pos_offline_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_events" ADD CONSTRAINT "pos_offline_events_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "pos_terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_events" ADD CONSTRAINT "pos_offline_events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_events" ADD CONSTRAINT "pos_offline_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_events" ADD CONSTRAINT "pos_offline_events_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES "pos_offline_sync_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_events" ADD CONSTRAINT "pos_offline_events_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_conflicts" ADD CONSTRAINT "pos_offline_sync_conflicts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_conflicts" ADD CONSTRAINT "pos_offline_sync_conflicts_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "pos_offline_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_conflicts" ADD CONSTRAINT "pos_offline_sync_conflicts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "pos_offline_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_conflicts" ADD CONSTRAINT "pos_offline_sync_conflicts_syncBatchId_fkey" FOREIGN KEY ("syncBatchId") REFERENCES "pos_offline_sync_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_certificates" ADD CONSTRAINT "pos_offline_sync_certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_certificates" ADD CONSTRAINT "pos_offline_sync_certificates_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "pos_offline_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_certificates" ADD CONSTRAINT "pos_offline_sync_certificates_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "pos_terminals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_offline_sync_certificates" ADD CONSTRAINT "pos_offline_sync_certificates_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
