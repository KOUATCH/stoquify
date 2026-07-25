ALTER TABLE "agent_runs"
  ADD COLUMN "staleOutput" BOOLEAN NOT NULL DEFAULT false;
