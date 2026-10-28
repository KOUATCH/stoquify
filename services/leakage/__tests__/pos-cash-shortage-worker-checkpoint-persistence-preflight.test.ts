import fs from "fs";
import path from "path";

import {
  evaluatePosCashShortageCheckpointPersistencePreflight,
  POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_REQUIREMENTS,
} from "../pos-cash-shortage-worker-checkpoint-persistence-preflight";
import { POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY } from "../pos-cash-shortage-worker-checkpoint-contract";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage worker checkpoint persistence preflight", () => {
  it("certifies the current Prisma schema when the dedicated checkpoint model exists", () => {
    const schemaText = fs.readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");

    const result = evaluatePosCashShortageCheckpointPersistencePreflight({ schemaText });

    expect(result).toEqual({
      version: 1,
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
      modelName: "PosCashShortageWorkerCheckpoint",
      status: "certified",
      workerCheckpointPersistenceCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [...POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_REQUIREMENTS],
      missingRequirements: [],
    });
  });

  it("certifies a future dedicated checkpoint model with lease, retry, cursor, and idempotency controls", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: validSchema(),
    });

    expect(result.status).toBe("certified");
    expect(result.workerCheckpointPersistenceCertified).toBe(true);
    expect(result.activationAuthorized).toBe(false);
    expect(result.satisfiedRequirements).toEqual([
      ...POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_REQUIREMENTS,
    ]);
    expect(result.missingRequirements).toEqual([]);
  });

  it("blocks schemas missing retry fields and lease recovery indexes", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: `
        model PosCashShortageWorkerCheckpoint {
          id String @id
          organizationId String
          checkKey String
          workerKey String
          status String
          recordedFromInclusive DateTime
          recordedThroughExclusive DateTime
          cursor Json?
          lastProcessedCursor Json?
          leaseOwnerId String?
          leaseToken String?
          leaseExpiresAt DateTime?

          @@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive])
          @@index([organizationId, status, nextAttemptAt])
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["retry_and_dead_letter_fields", "lease_recovery_index"]),
    );
  });

  it("blocks checkpoint models that omit the durable table mapping", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: validSchema().replace(
        /\n\s+@@map\("pos_cash_shortage_worker_checkpoints"\)/,
        "",
      ),
    });

    expect(result.status).toBe("blocked");
    expect(result.workerCheckpointPersistenceCertified).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["dedicated_checkpoint_table_mapping"]),
    );
  });

  it("blocks schemas with retry fields but no explicit dead-letter evidence fields", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: `
        model PosCashShortageWorkerCheckpoint {
          id String @id
          organizationId String
          checkKey String
          workerKey String
          status String
          recordedFromInclusive DateTime
          recordedThroughExclusive DateTime
          cursor Json?
          lastProcessedCursor Json?
          attempt Int
          leaseOwnerId String?
          leaseToken String?
          leaseExpiresAt DateTime?
          lastErrorCode String?
          lastErrorMessage String?
          nextAttemptAt DateTime?
          completedAt DateTime?

          @@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive])
          @@index([organizationId, status, nextAttemptAt])
          @@index([organizationId, status, leaseExpiresAt])
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.workerCheckpointPersistenceCertified).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["retry_and_dead_letter_fields"]),
    );
  });
  it("ignores commented field names when classifying schema readiness", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: `
        model PosCashShortageWorkerCheckpoint {
          id String @id
          organizationId String
          checkKey String
          workerKey String
          status String
          recordedFromInclusive DateTime
          recordedThroughExclusive DateTime
          cursor Json?
          lastProcessedCursor Json?
          attempt Int
          leaseOwnerId String?
          leaseToken String?
          leaseExpiresAt DateTime?
          lastErrorCode String?
          lastErrorMessage String?
          nextAttemptAt DateTime?
          completedAt DateTime?
          // deadLetteredAt DateTime?
          // deadLetterReason String?

          @@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive])
          @@index([organizationId, status, nextAttemptAt])
          @@index([organizationId, status, leaseExpiresAt])
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["retry_and_dead_letter_fields"]),
    );
  });

  it("ignores model-shaped text inside comments when classifying schema readiness", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: `
        /*
        model PosCashShortageWorkerCheckpoint {
          id String @id
          organizationId String
          checkKey String
          workerKey String
          status String
          recordedFromInclusive DateTime
          recordedThroughExclusive DateTime
          cursor Json?
          lastProcessedCursor Json?
          attempt Int
          leaseOwnerId String?
          leaseToken String?
          leaseExpiresAt DateTime?
          lastErrorCode String?
          lastErrorMessage String?
          nextAttemptAt DateTime?
          completedAt DateTime?
          deadLetteredAt DateTime?
          deadLetterReason String?

          @@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive])
          @@index([organizationId, status, nextAttemptAt])
          @@index([organizationId, status, leaseExpiresAt])
        }
        */
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.workerCheckpointPersistenceCertified).toBe(false);
    expect(result.missingRequirements).toEqual([
      ...POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_REQUIREMENTS,
    ]);
  });
  it("ignores complete line-commented checkpoint models when classifying schema readiness", () => {
    const commentedModel = validSchema()
      .split(/\r?\n/)
      .map((line) => `// ${line}`)
      .join("\n");

    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: commentedModel,
    });

    expect(result.status).toBe("blocked");
    expect(result.workerCheckpointPersistenceCertified).toBe(false);
    expect(result.missingRequirements).toEqual([
      ...POS_CASH_SHORTAGE_CHECKPOINT_PERSISTENCE_REQUIREMENTS,
    ]);
  });
  it("accepts exact checkpoint identity and work indexes formatted across multiple lines", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: `
        model PosCashShortageWorkerCheckpoint {
          id String @id
          organizationId String
          checkKey String
          workerKey String
          status String
          recordedFromInclusive DateTime
          recordedThroughExclusive DateTime
          cursor Json?
          lastProcessedCursor Json?
          attempt Int
          leaseOwnerId String?
          leaseToken String?
          leaseExpiresAt DateTime?
          lastErrorCode String?
          lastErrorMessage String?
          nextAttemptAt DateTime?
          completedAt DateTime?
          deadLetteredAt DateTime?
          deadLetterReason String?
          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt

          @@unique([
            organizationId,
            checkKey,
            workerKey,
            recordedFromInclusive,
            recordedThroughExclusive
          ])
          @@index([
            organizationId,
            status,
            nextAttemptAt
          ])
          @@index([
            organizationId,
            status,
            leaseExpiresAt
          ])
          @@map("pos_cash_shortage_worker_checkpoints")
        }
      `,
    });

    expect(result.status).toBe("certified");
    expect(result.workerCheckpointPersistenceCertified).toBe(true);
    expect(result.activationAuthorized).toBe(false);
    expect(result.missingRequirements).toEqual([]);
  });
  it("ignores checkpoint identity and work indexes inside inline comments", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: validSchema()
        .replace(
          /\n\s+@@unique\(\[organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive\]\)/,
          "\n      identityComment String // @@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive])",
        )
        .replace(
          /\n\s+@@index\(\[organizationId, status, nextAttemptAt\]\)/,
          "\n      readyWorkComment String // @@index([organizationId, status, nextAttemptAt])",
        )
        .replace(
          /\n\s+@@index\(\[organizationId, status, leaseExpiresAt\]\)/,
          "\n      leaseRecoveryComment String // @@index([organizationId, status, leaseExpiresAt])",
        ),
    });

    expect(result.status).toBe("blocked");
    expect(result.workerCheckpointPersistenceCertified).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "idempotent_window_identity",
        "ready_work_index",
        "lease_recovery_index",
      ]),
    );
  });
  it("blocks otherwise complete checkpoint schemas without audit timestamps", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: validSchema()
        .replace(/\n\s+createdAt DateTime @default\(now\(\)\)/, "")
        .replace(/\n\s+updatedAt DateTime @updatedAt/, ""),
    });

    expect(result.status).toBe("blocked");
    expect(result.workerCheckpointPersistenceCertified).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["checkpoint_audit_timestamps"]),
    );
  });
  it("requires exact checkpoint identity and work indexes instead of substring matches", () => {
    const result = evaluatePosCashShortageCheckpointPersistencePreflight({
      schemaText: `
        model PosCashShortageWorkerCheckpoint {
          id String @id
          organizationId String
          checkKey String
          workerKey String
          status String
          recordedFromInclusive DateTime
          recordedThroughExclusive DateTime
          cursor Json?
          lastProcessedCursor Json?
          attempt Int
          leaseOwnerId String?
          leaseToken String?
          leaseExpiresAt DateTime?
          lastErrorCode String?
          lastErrorMessage String?
          nextAttemptAt DateTime?
          completedAt DateTime?
          deadLetteredAt DateTime?
          deadLetterReason String?

          @@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive, status])
          @@index([organizationId, status, nextAttemptAt, leaseExpiresAt])
          @@index([organizationId, status])
        }
      `,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "idempotent_window_identity",
        "ready_work_index",
        "lease_recovery_index",
      ]),
    );
  });
  it("does not add Prisma writes, worker execution, scheduler hooks, routes, or actions", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|workerId|leaseToken\s*=|router|createSafeAction/i);
    expect(source).not.toMatch(/recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i);
    expect(source).not.toMatch(/db\.|prisma|migrate|migration/i);
  });
});

function validSchema() {
  return `
    model PosCashShortageWorkerCheckpoint {
      id String @id
      organizationId String
      checkKey String
      workerKey String
      status String
      recordedFromInclusive DateTime
      recordedThroughExclusive DateTime
      cursor Json?
      lastProcessedCursor Json?
      attempt Int
      leaseOwnerId String?
      leaseToken String?
      leaseExpiresAt DateTime?
      lastErrorCode String?
      lastErrorMessage String?
      nextAttemptAt DateTime?
      completedAt DateTime?
      deadLetteredAt DateTime?
      deadLetterReason String?
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt

      @@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive])
      @@index([organizationId, status, nextAttemptAt])
      @@index([organizationId, status, leaseExpiresAt])
      @@map("pos_cash_shortage_worker_checkpoints")
    }
  `;
}
