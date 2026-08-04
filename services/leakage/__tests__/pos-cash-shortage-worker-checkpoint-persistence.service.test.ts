import fs from "node:fs";
import path from "node:path";

import type { PosShiftCashShortageBatchResult } from "../pos-shift-cash-shortage-batch.service";
import { POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY } from "../pos-cash-shortage-worker-checkpoint-contract";
import {
  type PosCashShortageCheckpointPersistenceClient,
  type PosCashShortageWorkerCheckpointRow,
  advancePersistedPosCashShortageWorkerCheckpoint,
  ensurePosCashShortageWorkerCheckpoint,
  leaseNextPosCashShortageWorkerCheckpoint,
  recordPersistedPosCashShortageWorkerCheckpointFailure,
} from "../pos-cash-shortage-worker-checkpoint-persistence.service";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage worker checkpoint persistence service", () => {
  it("ensures an idempotent tenant/check/worker/window checkpoint", async () => {
    const { client, rows } = checkpointClient();

    const row = await ensurePosCashShortageWorkerCheckpoint(
      {
        organizationId: "org-1",
        recordedFromInclusive: "2026-07-27T00:00:00.000Z",
        recordedThroughExclusive: "2026-07-28T00:00:00.000Z",
        correlationId: "corr-1",
        metadata: { source: "slice-27-test" },
      },
      client,
    );

    expect(row).toMatchObject({
      organizationId: "org-1",
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
      status: "PENDING",
      attempt: 0,
      leaseOwnerId: null,
      leaseToken: null,
      deadLetteredAt: null,
      deadLetterReason: null,
    });
    expect(rows).toHaveLength(1);
  });

  it("leases the next due checkpoint through a compare-and-set update", async () => {
    const { client, rows } = checkpointClient([checkpointRow()]);

    const leased = await leaseNextPosCashShortageWorkerCheckpoint(
      {
        organizationId: "org-1",
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:00:00.000Z",
        leaseMs: 120_000,
      },
      client,
    );

    expect(leased).toMatchObject({
      id: "checkpoint-1",
      status: "LEASED",
      leaseOwnerId: "worker-1",
      leaseToken: "lease-token-1",
      leaseExpiresAt: new Date("2026-07-27T10:02:00.000Z"),
    });
    expect(rows[0]).toMatchObject({ status: "LEASED" });
  });

  it("returns null when a due checkpoint loses the lease race", async () => {
    const row = checkpointRow();
    const { client } = checkpointClient([row], { failNextUpdateMany: true });

    await expect(
      leaseNextPosCashShortageWorkerCheckpoint(
        {
          organizationId: "org-1",
          workerId: "worker-1",
          leaseToken: "lease-token-1",
          now: "2026-07-27T10:00:00.000Z",
        },
        client,
      ),
    ).resolves.toBeNull();
    expect(row.status).toBe("PENDING");
  });

  it("advances a leased checkpoint cursor without releasing the lease", async () => {
    const { client, rows } = checkpointClient([leasedCheckpointRow()]);

    const advanced = await advancePersistedPosCashShortageWorkerCheckpoint(
      {
        organizationId: "org-1",
        checkpointId: "checkpoint-1",
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:05:00.000Z",
        batchResult: batchResult({
          hasMore: true,
          nextCursor: {
            recordedAt: "2026-07-27T09:30:00.000Z",
            eventId: "event-2",
          },
        }),
      },
      client,
    );

    expect(advanced).toMatchObject({
      status: "LEASED",
      leaseOwnerId: "worker-1",
      leaseToken: "lease-token-1",
      cursor: {
        recordedAt: new Date("2026-07-27T09:30:00.000Z"),
        eventId: "event-2",
      },
      completedAt: null,
    });
    expect(rows[0].lastErrorCode).toBeNull();
  });

  it("completes a final page and releases the lease", async () => {
    const { client } = checkpointClient([leasedCheckpointRow()]);

    const completed = await advancePersistedPosCashShortageWorkerCheckpoint(
      {
        organizationId: "org-1",
        checkpointId: "checkpoint-1",
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:06:00.000Z",
        batchResult: batchResult(),
      },
      client,
    );

    expect(completed).toMatchObject({
      status: "COMPLETED",
      cursor: null,
      leaseOwnerId: null,
      leaseToken: null,
      leaseExpiresAt: null,
      completedAt: new Date("2026-07-27T10:06:00.000Z"),
      deadLetteredAt: null,
    });
  });

  it("records retryable failures with durable error evidence", async () => {
    const { client } = checkpointClient([leasedCheckpointRow()]);

    const retry = await recordPersistedPosCashShortageWorkerCheckpointFailure(
      {
        organizationId: "org-1",
        checkpointId: "checkpoint-1",
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:07:00.000Z",
        errorCode: "TRANSIENT_DB_TIMEOUT",
        errorMessage: "redacted timeout summary",
        retryDelayMs: 60_000,
      },
      client,
    );

    expect(retry).toMatchObject({
      status: "RETRY_SCHEDULED",
      attempt: 1,
      leaseOwnerId: null,
      leaseToken: null,
      lastErrorCode: "TRANSIENT_DB_TIMEOUT",
      lastErrorMessage: "redacted timeout summary",
      nextAttemptAt: new Date("2026-07-27T10:08:00.000Z"),
      deadLetteredAt: null,
      deadLetterReason: null,
    });
  });

  it("dead-letters exhausted checkpoints without scheduling another attempt", async () => {
    const { client } = checkpointClient([leasedCheckpointRow({ attempt: 2 })]);

    const deadLetter = await recordPersistedPosCashShortageWorkerCheckpointFailure(
      {
        organizationId: "org-1",
        checkpointId: "checkpoint-1",
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:07:00.000Z",
        errorCode: "BAD_CURSOR",
        errorMessage: "cursor outside recorded window",
      },
      client,
    );

    expect(deadLetter).toMatchObject({
      status: "DEAD_LETTERED",
      attempt: 3,
      leaseOwnerId: null,
      leaseToken: null,
      lastErrorCode: "BAD_CURSOR",
      lastErrorMessage: "cursor outside recorded window",
      nextAttemptAt: null,
      completedAt: null,
      deadLetteredAt: new Date("2026-07-27T10:07:00.000Z"),
      deadLetterReason: "BAD_CURSOR",
    });
  });

  it("rejects stale leased checkpoints before persistence", async () => {
    const { client } = checkpointClient([
      leasedCheckpointRow({ leaseExpiresAt: new Date("2026-07-27T10:00:00.000Z") }),
    ]);

    await expect(
      advancePersistedPosCashShortageWorkerCheckpoint(
        {
          organizationId: "org-1",
          checkpointId: "checkpoint-1",
          workerId: "worker-1",
          leaseToken: "lease-token-1",
          now: "2026-07-27T10:05:00.000Z",
          batchResult: batchResult(),
        },
        client,
      ),
    ).rejects.toThrow("lease has expired");
  });

  it("does not register runners, schedule jobs, expose routes, actions, or incident commands", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|router|createSafeAction/i);
    expect(source).not.toMatch(/recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
  });
});

function checkpointClient(
  initialRows: PosCashShortageWorkerCheckpointRow[] = [],
  options: { failNextUpdateMany?: boolean } = {},
) {
  const rows = [...initialRows];
  let failNextUpdateMany = options.failNextUpdateMany ?? false;
  const client: PosCashShortageCheckpointPersistenceClient = {
    posCashShortageWorkerCheckpoint: {
      async upsert(input) {
        const key = input.where
          .organizationId_checkKey_workerKey_recordedFromInclusive_recordedThroughExclusive as {
          organizationId: string;
          checkKey: string;
          workerKey: string;
          recordedFromInclusive: Date;
          recordedThroughExclusive: Date;
        };
        const existing = rows.find(
          (row) =>
            row.organizationId === key.organizationId &&
            row.checkKey === key.checkKey &&
            row.workerKey === key.workerKey &&
            row.recordedFromInclusive.getTime() === key.recordedFromInclusive.getTime() &&
            row.recordedThroughExclusive.getTime() ===
              key.recordedThroughExclusive.getTime(),
        );
        if (existing) {
          Object.assign(existing, definedOnly(input.update));
          return existing;
        }
        const created = {
          id: `checkpoint-${rows.length + 1}`,
          ...(input.create as Omit<PosCashShortageWorkerCheckpointRow, "id">),
        };
        rows.push(created);
        return created;
      },
      async findFirst(input) {
        return rows.find((row) => matchesWhere(row, input.where)) ?? null;
      },
      async updateMany(input) {
        if (failNextUpdateMany) {
          failNextUpdateMany = false;
          return { count: 0 };
        }
        const row = rows.find((candidate) => matchesWhere(candidate, input.where));
        if (!row) return { count: 0 };
        Object.assign(row, input.data);
        return { count: 1 };
      },
    },
  };
  return { client, rows };
}

function definedOnly(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function matchesWhere(row: PosCashShortageWorkerCheckpointRow, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return matchesOr(row, value as Array<Record<string, unknown>>);
    if (key === "status" && isInFilter(value)) return value.in.includes(row.status);
    if (key === "nextAttemptAt" && isLteFilter(value)) {
      return row.nextAttemptAt !== null && row.nextAttemptAt <= value.lte;
    }
    if (key === "leaseExpiresAt" && isGtFilter(value)) {
      return row.leaseExpiresAt !== null && row.leaseExpiresAt > value.gt;
    }
    return (row as unknown as Record<string, unknown>)[key] === value;
  });
}

function matchesOr(row: PosCashShortageWorkerCheckpointRow, values: Array<Record<string, unknown>>) {
  return values.some((where) => matchesWhere(row, where));
}

function isInFilter(value: unknown): value is { in: PosCashShortageWorkerCheckpointRow["status"][] } {
  return typeof value === "object" && value !== null && "in" in value;
}

function isLteFilter(value: unknown): value is { lte: Date } {
  return typeof value === "object" && value !== null && "lte" in value;
}

function isGtFilter(value: unknown): value is { gt: Date } {
  return typeof value === "object" && value !== null && "gt" in value;
}

function checkpointRow(
  overrides: Partial<PosCashShortageWorkerCheckpointRow> = {},
): PosCashShortageWorkerCheckpointRow {
  return {
    id: "checkpoint-1",
    organizationId: "org-1",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
    status: "PENDING",
    recordedFromInclusive: new Date("2026-07-27T00:00:00.000Z"),
    recordedThroughExclusive: new Date("2026-07-28T00:00:00.000Z"),
    cursor: null,
    lastProcessedCursor: null,
    attempt: 0,
    leaseOwnerId: null,
    leaseToken: null,
    leaseExpiresAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    nextAttemptAt: null,
    completedAt: null,
    deadLetteredAt: null,
    deadLetterReason: null,
    correlationId: null,
    metadata: null,
    ...overrides,
  };
}

function leasedCheckpointRow(
  overrides: Partial<PosCashShortageWorkerCheckpointRow> = {},
) {
  return checkpointRow({
    status: "LEASED",
    leaseOwnerId: "worker-1",
    leaseToken: "lease-token-1",
    leaseExpiresAt: new Date("2026-07-27T10:15:00.000Z"),
    ...overrides,
  });
}

function batchResult(
  overrides: Partial<PosShiftCashShortageBatchResult> = {},
): PosShiftCashShortageBatchResult {
  return {
    organizationId: "org-1",
    recordedFromInclusive: "2026-07-27T00:00:00.000Z",
    recordedThroughExclusive: "2026-07-28T00:00:00.000Z",
    items: [
      {
        eventId: "event-1",
        sourceId: "session-1",
        recordedAt: "2026-07-27T09:00:00.000Z",
        evaluation: {
          outcome: "triggered",
          severity: "high",
          amountAtRisk: "1000",
          currency: "XAF",
          reasons: ["Cash counted is below expected cash."],
          metadata: {
            eventId: "event-1",
            locationId: "loc-1",
            terminalId: "terminal-1",
            cashDrawerId: "drawer-1",
            cashierId: "cashier-1",
            closerId: "closer-1",
            policyId: "policy-1",
          },
        },
      },
    ],
    counts: {
      scanned: 1,
      blocked: 0,
      notTriggered: 0,
      triggered: 1,
      warning: 0,
      high: 1,
    },
    hasMore: false,
    nextCursor: null,
    ...overrides,
  };
}
