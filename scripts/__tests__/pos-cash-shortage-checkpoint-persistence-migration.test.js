const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION = path.join(
  ROOT,
  "prisma/migrations/20260728100000_pos_cash_shortage_checkpoint_persistence/migration.sql",
);
const SCHEMA = path.join(ROOT, "prisma/schema.prisma");

describe("POS cash-shortage checkpoint persistence migration", () => {
  const migration = fs.readFileSync(MIGRATION, "utf8");
  const schema = fs.readFileSync(SCHEMA, "utf8");

  it("creates a dedicated checkpoint table with tenant and window identity", () => {
    expect(migration).toContain('CREATE TABLE "pos_cash_shortage_worker_checkpoints"');
    expect(migration).toContain('"organizationId" TEXT NOT NULL');
    expect(migration).toContain('"checkKey" TEXT NOT NULL');
    expect(migration).toContain('"workerKey" TEXT NOT NULL');
    expect(migration).toContain('"recordedFromInclusive" TIMESTAMP(3) NOT NULL');
    expect(migration).toContain('"recordedThroughExclusive" TIMESTAMP(3) NOT NULL');
    expect(migration).toContain("pos_cash_shortage_worker_checkpoints_window_key");
  });

  it("persists cursor, lease, retry, completion, and dead-letter fields", () => {
    for (const field of [
      '"cursor" JSONB',
      '"lastProcessedCursor" JSONB',
      '"attempt" INTEGER NOT NULL DEFAULT 0',
      '"leaseOwnerId" TEXT',
      '"leaseToken" TEXT',
      '"leaseExpiresAt" TIMESTAMP(3)',
      '"lastErrorCode" TEXT',
      '"nextAttemptAt" TIMESTAMP(3)',
      '"completedAt" TIMESTAMP(3)',
      '"deadLetteredAt" TIMESTAMP(3)',
      '"deadLetterReason" TEXT',
    ]) {
      expect(migration).toContain(field);
    }
  });

  it("adds ready-work and lease-recovery indexes without activation wiring", () => {
    expect(migration).toContain("pos_cash_shortage_worker_checkpoints_ready_work_idx");
    expect(migration).toContain('"organizationId", "status", "nextAttemptAt"');
    expect(migration).toContain("pos_cash_shortage_worker_checkpoints_lease_recovery_idx");
    expect(migration).toContain('"organizationId", "status", "leaseExpiresAt"');
    expect(migration).toContain("pos_cash_shortage_worker_checkpoints_attempt_check");
    expect(migration).toContain("pos_cash_shortage_worker_checkpoints_status_check");

    expect(migration).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|createSafeAction|router\(/i);
    expect(migration).not.toMatch(/recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i);
  });

  it("keeps the Prisma model aligned with the preflight contract", () => {
    expect(schema).toContain("model PosCashShortageWorkerCheckpoint");
    expect(schema).toContain("@@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive], map: \"pos_cash_shortage_worker_checkpoints_window_key\")");
    expect(schema).toContain("@@index([organizationId, status, nextAttemptAt], map: \"pos_cash_shortage_worker_checkpoints_ready_work_idx\")");
    expect(schema).toContain("@@index([organizationId, status, leaseExpiresAt], map: \"pos_cash_shortage_worker_checkpoints_lease_recovery_idx\")");
    expect(schema).toContain('@@map("pos_cash_shortage_worker_checkpoints")');
  });
});
