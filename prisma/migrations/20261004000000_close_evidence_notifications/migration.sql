-- Additive, durable in-app publications. No grants, activation or data backfill.
CREATE UNIQUE INDEX "business_event_outbox_organizationId_id_key"
ON "business_event_outbox"("organizationId", "id");

CREATE TABLE "close_evidence_notifications" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "outboxId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "responseId" TEXT,
  "eventName" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "close_evidence_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "close_evidence_notifications_event_check" CHECK (
    ("eventName" = 'close.assurance.missing_evidence.requested' AND "responseId" IS NULL)
    OR ("eventName" IN ('close.assurance.missing_evidence.response_submitted',
      'close.assurance.missing_evidence.response_accepted') AND "responseId" IS NOT NULL)
  ),
  CONSTRAINT "close_evidence_notifications_outbox_fkey"
    FOREIGN KEY ("organizationId", "outboxId") REFERENCES "business_event_outbox"("organizationId", "id")
    ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "close_evidence_notifications_org_outbox_key" ON "close_evidence_notifications"("organizationId", "outboxId");
CREATE INDEX "close_evidence_notifications_org_period_published_idx"
ON "close_evidence_notifications"("organizationId", "periodId", "publishedAt", "id");
