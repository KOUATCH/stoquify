ALTER TABLE "agent_activation_approvals"
  ADD COLUMN "idempotencyKey" VARCHAR(191),
  ADD COLUMN "requestHash" VARCHAR(71);

ALTER TABLE "agent_pilot_certifications"
  ADD COLUMN "idempotencyKey" VARCHAR(191),
  ADD COLUMN "requestHash" VARCHAR(71);

CREATE UNIQUE INDEX "agent_activation_approvals_packageId_idempotencyKey_key"
  ON "agent_activation_approvals"("packageId", "idempotencyKey");

CREATE UNIQUE INDEX "agent_pilot_certifications_packageId_idempotencyKey_key"
  ON "agent_pilot_certifications"("packageId", "idempotencyKey");
