import { db } from "@/prisma/db";
import { BusinessRuleError } from "@/services/_shared/action-errors";

import type { PosShiftCashShortageBatchResult } from "./pos-shift-cash-shortage-batch.service";
import type { PosShiftCashShortageBatchCursorInput } from "./pos-shift-cash-shortage-batch.schemas";
import {
  POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
  advancePosCashShortageWorkerCheckpoint,
  recordPosCashShortageWorkerCheckpointFailure,
  type PosCashShortageCheckpointState,
  type PosCashShortageCheckpointTransition,
} from "./pos-cash-shortage-worker-checkpoint-contract";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_CHECKPOINT_DB_STATUSES = [
  "PENDING",
  "LEASED",
  "RETRY_SCHEDULED",
  "COMPLETED",
  "DEAD_LETTERED",
] as const;

export type PosCashShortageCheckpointDbStatus =
  (typeof POS_CASH_SHORTAGE_CHECKPOINT_DB_STATUSES)[number];

export type PosCashShortageWorkerCheckpointRow = {
  id: string;
  organizationId: string;
  checkKey: string;
  workerKey: string;
  status: PosCashShortageCheckpointDbStatus;
  recordedFromInclusive: Date;
  recordedThroughExclusive: Date;
  cursor: unknown | null;
  lastProcessedCursor: unknown | null;
  attempt: number;
  leaseOwnerId: string | null;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  nextAttemptAt: Date | null;
  completedAt: Date | null;
  deadLetteredAt: Date | null;
  deadLetterReason: string | null;
  correlationId: string | null;
  metadata: unknown | null;
};

type CheckpointWhere = Record<string, unknown>;
type CheckpointData = Record<string, unknown>;

export type PosCashShortageCheckpointPersistenceClient = {
  posCashShortageWorkerCheckpoint: {
    upsert(input: {
      where: CheckpointWhere;
      create: CheckpointData;
      update: CheckpointData;
    }): Promise<PosCashShortageWorkerCheckpointRow>;
    findFirst(input: {
      where: CheckpointWhere;
      orderBy?: unknown;
    }): Promise<PosCashShortageWorkerCheckpointRow | null>;
    updateMany(input: {
      where: CheckpointWhere;
      data: CheckpointData;
    }): Promise<{ count: number }>;
  };
};

export type EnsurePosCashShortageCheckpointInput = {
  organizationId: string;
  recordedFromInclusive: string | Date;
  recordedThroughExclusive: string | Date;
  cursor?: PosShiftCashShortageBatchCursorInput | null;
  correlationId?: string | null;
  metadata?: unknown | null;
};

export type LeaseNextPosCashShortageCheckpointInput = {
  organizationId: string;
  workerId: string;
  leaseToken: string;
  now: string | Date;
  leaseMs?: number;
};

export type AdvancePersistedPosCashShortageCheckpointInput = {
  organizationId: string;
  checkpointId: string;
  workerId: string;
  leaseToken: string;
  now: string | Date;
  batchResult: PosShiftCashShortageBatchResult;
};

export type RecordPersistedPosCashShortageCheckpointFailureInput = {
  organizationId: string;
  checkpointId: string;
  workerId: string;
  leaseToken: string;
  now: string | Date;
  errorCode: string;
  errorMessage?: string | null;
  maxAttempts?: number;
  retryDelayMs?: number;
};

export async function ensurePosCashShortageWorkerCheckpoint(
  input: EnsurePosCashShortageCheckpointInput,
  client: PosCashShortageCheckpointPersistenceClient = defaultClient(),
) {
  const organizationId = requiredText(
    input.organizationId,
    "POS cash-shortage checkpoint organization is required.",
  );
  const recordedFromInclusive = normalizeDate(
    input.recordedFromInclusive,
    "POS cash-shortage checkpoint recorded-from time is required.",
  );
  const recordedThroughExclusive = normalizeDate(
    input.recordedThroughExclusive,
    "POS cash-shortage checkpoint recorded-through time is required.",
  );
  if (recordedFromInclusive >= recordedThroughExclusive) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint recorded-through time must be later than recorded-from time.",
    );
  }

  return client.posCashShortageWorkerCheckpoint.upsert({
    where: {
      organizationId_checkKey_workerKey_recordedFromInclusive_recordedThroughExclusive: {
        organizationId,
        checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
        workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
        recordedFromInclusive,
        recordedThroughExclusive,
      },
    },
    create: {
      organizationId,
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
      status: "PENDING",
      recordedFromInclusive,
      recordedThroughExclusive,
      cursor: input.cursor ?? null,
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
      correlationId: input.correlationId ?? null,
      metadata: input.metadata ?? null,
    },
    update: {
      metadata: input.metadata ?? undefined,
      correlationId: input.correlationId ?? undefined,
    },
  });
}

export async function leaseNextPosCashShortageWorkerCheckpoint(
  input: LeaseNextPosCashShortageCheckpointInput,
  client: PosCashShortageCheckpointPersistenceClient = defaultClient(),
) {
  const now = normalizeDate(input.now, "POS cash-shortage checkpoint lease time is required.");
  const leaseMs = input.leaseMs ?? 60_000;
  if (!Number.isInteger(leaseMs) || leaseMs < 10_000) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint lease duration must be at least 10000ms.",
    );
  }

  const candidate = await client.posCashShortageWorkerCheckpoint.findFirst({
    where: {
      organizationId: requiredText(
        input.organizationId,
        "POS cash-shortage checkpoint organization is required.",
      ),
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
      status: { in: ["PENDING", "RETRY_SCHEDULED"] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: [
      { recordedFromInclusive: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });
  if (!candidate) return null;

  const workerId = requiredText(input.workerId, "POS cash-shortage checkpoint worker is required.");
  const leaseToken = requiredText(
    input.leaseToken,
    "POS cash-shortage checkpoint lease token is required.",
  );
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);
  const claimed = await client.posCashShortageWorkerCheckpoint.updateMany({
    where: {
      id: candidate.id,
      organizationId: candidate.organizationId,
      status: candidate.status,
      leaseOwnerId: null,
      leaseToken: null,
    },
    data: {
      status: "LEASED",
      leaseOwnerId: workerId,
      leaseToken,
      leaseExpiresAt,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  });
  if (claimed.count !== 1) return null;

  return client.posCashShortageWorkerCheckpoint.findFirst({
    where: {
      id: candidate.id,
      organizationId: candidate.organizationId,
      status: "LEASED",
      leaseOwnerId: workerId,
      leaseToken,
    },
  });
}

export async function advancePersistedPosCashShortageWorkerCheckpoint(
  input: AdvancePersistedPosCashShortageCheckpointInput,
  client: PosCashShortageCheckpointPersistenceClient = defaultClient(),
) {
  const row = await requireLeasedCheckpoint(input, client);
  const transition = advancePosCashShortageWorkerCheckpoint({
    state: rowToCheckpointState(row),
    workerId: input.workerId,
    leaseToken: input.leaseToken,
    now: input.now,
    batchResult: input.batchResult,
  });

  return persistLeasedTransition(row, transition, normalizeDate(input.now, "Checkpoint time is required."), client);
}

export async function recordPersistedPosCashShortageWorkerCheckpointFailure(
  input: RecordPersistedPosCashShortageCheckpointFailureInput,
  client: PosCashShortageCheckpointPersistenceClient = defaultClient(),
) {
  const row = await requireLeasedCheckpoint(input, client);
  const transition = recordPosCashShortageWorkerCheckpointFailure({
    state: rowToCheckpointState(row),
    workerId: input.workerId,
    leaseToken: input.leaseToken,
    now: input.now,
    errorCode: input.errorCode,
    maxAttempts: input.maxAttempts,
    retryDelayMs: input.retryDelayMs,
  });
  const now = normalizeDate(input.now, "Checkpoint failure time is required.");

  return persistLeasedTransition(row, transition, now, client, {
    lastErrorMessage: input.errorMessage ?? null,
    deadLetterReason:
      transition.status === "dead_letter" ? transition.lastErrorCode : null,
  });
}

async function requireLeasedCheckpoint(
  input: {
    organizationId: string;
    checkpointId: string;
    workerId: string;
    leaseToken: string;
    now: string | Date;
  },
  client: PosCashShortageCheckpointPersistenceClient,
) {
  const row = await client.posCashShortageWorkerCheckpoint.findFirst({
    where: {
      id: requiredText(input.checkpointId, "POS cash-shortage checkpoint id is required."),
      organizationId: requiredText(
        input.organizationId,
        "POS cash-shortage checkpoint organization is required.",
      ),
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
    },
  });
  if (!row) {
    throw new BusinessRuleError("POS cash-shortage checkpoint was not found.");
  }
  return row;
}

async function persistLeasedTransition(
  row: PosCashShortageWorkerCheckpointRow,
  transition: PosCashShortageCheckpointTransition,
  now: Date,
  client: PosCashShortageCheckpointPersistenceClient,
  overrides: { lastErrorMessage?: string | null; deadLetterReason?: string | null } = {},
) {
  const dbStatus = dbStatusFromTransition(transition);
  const updated = await client.posCashShortageWorkerCheckpoint.updateMany({
    where: {
      id: row.id,
      organizationId: row.organizationId,
      status: "LEASED",
      leaseOwnerId: row.leaseOwnerId,
      leaseToken: row.leaseToken,
      leaseExpiresAt: { gt: now },
    },
    data: {
      status: dbStatus,
      cursor: transition.cursor,
      lastProcessedCursor: transition.lastProcessedCursor,
      attempt: transition.attempt,
      leaseOwnerId: transition.leaseOwnerId,
      leaseToken: transition.leaseToken,
      leaseExpiresAt: transition.leaseExpiresAt ? new Date(transition.leaseExpiresAt) : null,
      lastErrorCode: transition.lastErrorCode,
      lastErrorMessage: overrides.lastErrorMessage ?? null,
      nextAttemptAt: transition.nextAttemptAt ? new Date(transition.nextAttemptAt) : null,
      completedAt: transition.completedAt ? new Date(transition.completedAt) : null,
      deadLetteredAt: dbStatus === "DEAD_LETTERED" ? now : null,
      deadLetterReason: overrides.deadLetterReason ?? null,
    },
  });
  if (updated.count !== 1) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint lease changed before persistence completed.",
    );
  }

  return client.posCashShortageWorkerCheckpoint.findFirst({
    where: {
      id: row.id,
      organizationId: row.organizationId,
    },
  });
}

function rowToCheckpointState(
  row: PosCashShortageWorkerCheckpointRow,
): PosCashShortageCheckpointState {
  return {
    organizationId: row.organizationId,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
    status: stateStatusFromDb(row.status),
    recordedFromInclusive: row.recordedFromInclusive,
    recordedThroughExclusive: row.recordedThroughExclusive,
    cursor: row.cursor as PosShiftCashShortageBatchCursorInput | null,
    attempt: row.attempt,
    leaseOwnerId: row.leaseOwnerId,
    leaseToken: row.leaseToken,
    leaseExpiresAt: row.leaseExpiresAt,
    lastProcessedCursor: row.lastProcessedCursor as PosShiftCashShortageBatchCursorInput | null,
    lastErrorCode: row.lastErrorCode,
    nextAttemptAt: row.nextAttemptAt,
  };
}

function stateStatusFromDb(
  status: PosCashShortageCheckpointDbStatus,
): PosCashShortageCheckpointState["status"] {
  switch (status) {
    case "PENDING":
    case "RETRY_SCHEDULED":
      return "ready";
    case "LEASED":
      return "leased";
    case "COMPLETED":
      return "completed";
    case "DEAD_LETTERED":
      return "dead_letter";
  }
}

function dbStatusFromTransition(
  transition: PosCashShortageCheckpointTransition,
): PosCashShortageCheckpointDbStatus {
  switch (transition.status) {
    case "ready":
      return transition.nextAttemptAt ? "RETRY_SCHEDULED" : "PENDING";
    case "leased":
      return "LEASED";
    case "completed":
      return "COMPLETED";
    case "dead_letter":
      return "DEAD_LETTERED";
  }
}

function defaultClient(): PosCashShortageCheckpointPersistenceClient {
  return db as unknown as PosCashShortageCheckpointPersistenceClient;
}

function normalizeDate(value: string | Date, message: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new BusinessRuleError(message);
  return date;
}

function requiredText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new BusinessRuleError(message);
  return normalized;
}
