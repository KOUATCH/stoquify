import fs from "node:fs";
import path from "node:path";

import {
  POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
  advancePosCashShortageWorkerCheckpoint,
  preparePosCashShortageWorkerBatchInput,
  recordPosCashShortageWorkerCheckpointFailure,
  type PosCashShortageCheckpointState,
} from "../pos-cash-shortage-worker-checkpoint-contract";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";
import type { PosShiftCashShortageBatchResult } from "../pos-shift-cash-shortage-batch.service";

const ROOT = process.cwd();

describe("pos cash-shortage worker checkpoint contract", () => {
  it("prepares a bounded batch input only for an active matching lease", () => {
    const prepared = preparePosCashShortageWorkerBatchInput({
      state: checkpoint(),
      workerId: "worker-1",
      leaseToken: "lease-token-1",
      now: "2026-07-27T10:05:00.000Z",
    });

    expect(prepared).toMatchObject({
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
      organizationId: "org-1",
      lease: {
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        leaseExpiresAt: "2026-07-27T10:15:00.000Z",
      },
      checkpoint: {
        status: "leased",
        attempt: 0,
        cursor: null,
      },
    });
    expect(prepared.batchInput).toMatchObject({
      organizationId: "org-1",
      cursor: null,
      limit: 25,
    });
    expect(prepared.batchInput.recordedFromInclusive.toISOString()).toBe(
      "2026-07-27T00:00:00.000Z",
    );
  });

  it("advances the watermark only from an aligned partial page", () => {
    const advanced = advancePosCashShortageWorkerCheckpoint({
      state: checkpoint(),
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
    });

    expect(advanced).toMatchObject({
      status: "leased",
      cursor: {
        recordedAt: new Date("2026-07-27T09:30:00.000Z"),
        eventId: "event-2",
      },
      lastProcessedCursor: {
        recordedAt: new Date("2026-07-27T09:30:00.000Z"),
        eventId: "event-2",
      },
      leaseOwnerId: "worker-1",
      leaseToken: "lease-token-1",
      completedAt: null,
    });
  });

  it("completes the window and releases the lease on a final page", () => {
    const completed = advancePosCashShortageWorkerCheckpoint({
      state: checkpoint(),
      workerId: "worker-1",
      leaseToken: "lease-token-1",
      now: "2026-07-27T10:06:00.000Z",
      batchResult: batchResult({
        hasMore: false,
        nextCursor: null,
      }),
    });

    expect(completed).toMatchObject({
      status: "completed",
      cursor: null,
      lastProcessedCursor: {
        recordedAt: new Date("2026-07-27T09:00:00.000Z"),
        eventId: "event-1",
      },
      leaseOwnerId: null,
      leaseToken: null,
      leaseExpiresAt: null,
      lastErrorCode: null,
      nextAttemptAt: null,
      completedAt: "2026-07-27T10:06:00.000Z",
    });
  });

  it("records retryable failures and dead-letters exhausted checkpoints", () => {
    const retry = recordPosCashShortageWorkerCheckpointFailure({
      state: checkpoint(),
      workerId: "worker-1",
      leaseToken: "lease-token-1",
      now: "2026-07-27T10:07:00.000Z",
      errorCode: "TRANSIENT_DB_TIMEOUT",
      retryDelayMs: 60_000,
    });

    expect(retry).toMatchObject({
      status: "ready",
      attempt: 1,
      leaseOwnerId: null,
      leaseToken: null,
      leaseExpiresAt: null,
      lastErrorCode: "TRANSIENT_DB_TIMEOUT",
      nextAttemptAt: "2026-07-27T10:08:00.000Z",
    });

    const deadLetter = recordPosCashShortageWorkerCheckpointFailure({
      state: checkpoint({ attempt: 2 }),
      workerId: "worker-1",
      leaseToken: "lease-token-1",
      now: "2026-07-27T10:07:00.000Z",
      errorCode: "BAD_CURSOR",
    });

    expect(deadLetter).toMatchObject({
      status: "dead_letter",
      attempt: 3,
      lastErrorCode: "BAD_CURSOR",
      nextAttemptAt: null,
    });
  });

  it("rejects stale leases, wrong identities, invalid windows, and unsafe result movement", () => {
    expect(() =>
      preparePosCashShortageWorkerBatchInput({
        state: checkpoint({ leaseOwnerId: "other-worker" }),
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:05:00.000Z",
      }),
    ).toThrow("lease ownership");

    expect(() =>
      preparePosCashShortageWorkerBatchInput({
        state: checkpoint(),
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:16:00.000Z",
      }),
    ).toThrow("lease has expired");

    expect(() =>
      preparePosCashShortageWorkerBatchInput({
        state: checkpoint({ status: "ready" }),
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:05:00.000Z",
      }),
    ).toThrow("must be leased");

    expect(() =>
      preparePosCashShortageWorkerBatchInput({
        state: checkpoint({ checkKey: "ledger.posted_source_link.required" as never }),
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:05:00.000Z",
      }),
    ).toThrow("check key");

    expect(() =>
      preparePosCashShortageWorkerBatchInput({
        state: checkpoint({
          recordedThroughExclusive: "2026-07-27T00:00:00.000Z",
        }),
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:05:00.000Z",
      }),
    ).toThrow("Recorded-through time must be later");

    expect(() =>
      advancePosCashShortageWorkerCheckpoint({
        state: checkpoint(),
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:05:00.000Z",
        batchResult: batchResult({ organizationId: "other-org" }),
      }),
    ).toThrow("does not match the leased window");

    expect(() =>
      advancePosCashShortageWorkerCheckpoint({
        state: checkpoint(),
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:05:00.000Z",
        batchResult: batchResult({ hasMore: true, nextCursor: null }),
      }),
    ).toThrow("partial page without a next cursor");

    expect(() =>
      advancePosCashShortageWorkerCheckpoint({
        state: checkpoint(),
        workerId: "worker-1",
        leaseToken: "lease-token-1",
        now: "2026-07-27T10:05:00.000Z",
        batchResult: batchResult({
          hasMore: false,
          nextCursor: {
            recordedAt: "2026-07-27T09:30:00.000Z",
            eventId: "event-2",
          },
        }),
      }),
    ).toThrow("dangling next cursor");
  });

  it("does not load events, persist state, activate routes, schedulers, or direct registry loaders", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "services/leakage/pos-cash-shortage-worker-checkpoint-contract.ts"),
      "utf8",
    );
    const registryService = fs.readFileSync(
      path.join(ROOT, "services/assurance/assurance-registry.service.ts"),
      "utf8",
    );

    expect(source).not.toContain("loadPosShiftCashShortageEvaluationBatch");
    expect(source).not.toMatch(/\bdb\b|prisma|workflowAssuranceIncident/i);
    expect(source).not.toMatch(/CHECK_RUNNERS|router|createSafeAction/i);
    expect(registryService).toContain(POS_SHIFT_CASH_SHORTAGE_CHECK_KEY);
    expect(registryService).toContain("runDormantPosShiftCashShortageReviewCheck");
    expect(registryService).toContain("enabled: true");
    expect(registryService).not.toContain("loadPosShiftCashShortageEvaluationBatch");
    expect(registryService).not.toContain("buildPosShiftCashShortageBatchInputForAssuranceRun");
  });
});

function checkpoint(
  overrides: Partial<PosCashShortageCheckpointState> = {},
): PosCashShortageCheckpointState {
  return {
    organizationId: "org-1",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
    status: "leased",
    recordedFromInclusive: "2026-07-27T00:00:00.000Z",
    recordedThroughExclusive: "2026-07-28T00:00:00.000Z",
    cursor: null,
    limit: 25,
    attempt: 0,
    leaseOwnerId: "worker-1",
    leaseToken: "lease-token-1",
    leaseExpiresAt: "2026-07-27T10:15:00.000Z",
    lastProcessedCursor: null,
    lastErrorCode: null,
    nextAttemptAt: null,
    ...overrides,
  };
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

