ALTER TABLE "agent_runs"
  ADD COLUMN "skillKey" TEXT,
  ADD COLUMN "skillVersion" INTEGER,
  ADD COLUMN "promptHash" TEXT,
  ADD COLUMN "durationMs" INTEGER,
  ADD COLUMN "toolCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "redactionCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "agent_feedback_runId_actorId_key"
  ON "agent_feedback"("runId", "actorId");
