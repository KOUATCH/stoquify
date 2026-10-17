-- Additive only. No backfill or grant changes. Rehearse on a disposable DB.
-- Rollback disables application/submission flags and retains request history.
CREATE UNIQUE INDEX "users_organizationId_id_key" ON "users"("organizationId", "id");
CREATE TABLE "access_requests" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "targetKey" TEXT NOT NULL,
  "reason" VARCHAR(400) NOT NULL,
  "submissionHash" TEXT NOT NULL,
  "decision" TEXT NOT NULL DEFAULT 'PENDING',
  "application" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "decisionReason" VARCHAR(400),
  "selectedRoleIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "memberRevision" TEXT,
  "applicationCommandId" TEXT,
  "applicationError" TEXT,
  "grantAuditId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "access_requests_requester_fkey" FOREIGN KEY ("organizationId", "requesterId") REFERENCES "users"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "access_requests_reviewer_fkey" FOREIGN KEY ("organizationId", "reviewerId") REFERENCES "users"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "access_requests_state_check" CHECK (
    "revision" > 0 AND "decision" IN ('PENDING','APPROVED','DECLINED','WITHDRAWN','EXPIRED')
    AND "application" IN ('NOT_REQUIRED','PENDING','APPLIED','FAILED')
    AND (("decision" = 'APPROVED' AND "application" <> 'NOT_REQUIRED') OR ("decision" <> 'APPROVED' AND "application" = 'NOT_REQUIRED'))
    AND ("reviewerId" IS NULL OR "reviewerId" <> "requesterId")
    AND ("decision" NOT IN ('APPROVED','DECLINED') OR ("reviewerId" IS NOT NULL AND "decidedAt" IS NOT NULL))
    AND ("decision" <> 'APPROVED' OR ("memberRevision" IS NOT NULL AND "applicationCommandId" IS NOT NULL))
    AND ("application" <> 'APPLIED' OR ("appliedAt" IS NOT NULL AND "grantAuditId" IS NOT NULL))
  )
);
CREATE INDEX "access_requests_organizationId_requesterId_createdAt_id_idx" ON "access_requests"("organizationId", "requesterId", "createdAt", "id");
CREATE INDEX "access_requests_organizationId_decision_createdAt_id_idx" ON "access_requests"("organizationId", "decision", "createdAt", "id");
CREATE UNIQUE INDEX "access_requests_one_open_target" ON "access_requests"("organizationId", "requesterId", "targetKey") WHERE "decision" = 'PENDING' OR ("decision" = 'APPROVED' AND "application" <> 'APPLIED');
