import { BusinessRuleError } from "@/services/_shared/action-errors";
import type { PosShiftCashShortageBatchResult } from "@/services/leakage/pos-shift-cash-shortage-batch.service";

import {
  loadPosShiftCashShortageBatchInputSchema,
  type ParsedLoadPosShiftCashShortageBatchInput,
  type PosShiftCashShortageBatchCursorInput,
} from "./pos-shift-cash-shortage-batch.schemas";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY =
  "pos.cash_shortage.review.checkpoint.v1";
export const POS_CASH_SHORTAGE_CHECKPOINT_MAX_ATTEMPTS = 3;
export const POS_CASH_SHORTAGE_CHECKPOINT_RETRY_DELAY_MS = 5 * 60 * 1000;

export type PosCashShortageCheckpointStatus =
  | "ready"
  | "leased"
  | "completed"
  | "dead_letter";

export type PosCashShortageCheckpointState = {
  organizationId: string;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  workerKey: typeof POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY;
  status: PosCashShortageCheckpointStatus;
  recordedFromInclusive: string | Date;
  recordedThroughExclusive: string | Date;
  cursor?: PosShiftCashShortageBatchCursorInput | null;
  limit?: number;
  attempt: number;
  leaseOwnerId?: string | null;
  leaseToken?: string | null;
  leaseExpiresAt?: string | Date | null;
  lastProcessedCursor?: PosShiftCashShortageBatchCursorInput | null;
  lastErrorCode?: string | null;
  nextAttemptAt?: string | Date | null;
};

export type PosCashShortageCheckpointLeaseInput = {
  state: PosCashShortageCheckpointState;
  workerId: string;
  leaseToken: string;
  now: string | Date;
};

export type PosCashShortagePreparedCheckpointBatch = {
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  workerKey: typeof POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY;
  organizationId: string;
  batchInput: ParsedLoadPosShiftCashShortageBatchInput;
  lease: {
    workerId: string;
    leaseToken: string;
    leaseExpiresAt: string;
  };
  checkpoint: {
    status: "leased";
    attempt: number;
    cursor: PosShiftCashShortageBatchCursorInput | null;
  };
};

export type PosCashShortageCheckpointAdvanceInput =
  PosCashShortageCheckpointLeaseInput & {
    batchResult: PosShiftCashShortageBatchResult;
  };

export type PosCashShortageCheckpointFailureInput =
  PosCashShortageCheckpointLeaseInput & {
    errorCode: string;
    maxAttempts?: number;
    retryDelayMs?: number;
  };

export type PosCashShortageCheckpointTransition = {
  organizationId: string;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  workerKey: typeof POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY;
  status: PosCashShortageCheckpointStatus;
  cursor: PosShiftCashShortageBatchCursorInput | null;
  attempt: number;
  leaseOwnerId: string | null;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  lastProcessedCursor: PosShiftCashShortageBatchCursorInput | null;
  lastErrorCode: string | null;
  nextAttemptAt: string | null;
  completedAt: string | null;
};

export function preparePosCashShortageWorkerBatchInput(
  input: PosCashShortageCheckpointLeaseInput,
): PosCashShortagePreparedCheckpointBatch {
  const lease = assertActiveLease(input);
  const batchInput = parseCheckpointBatchInput(input.state);

  return {
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
    organizationId: batchInput.organizationId,
    batchInput,
    lease,
    checkpoint: {
      status: "leased",
      attempt: input.state.attempt,
      cursor: input.state.cursor ?? null,
    },
  };
}

export function advancePosCashShortageWorkerCheckpoint(
  input: PosCashShortageCheckpointAdvanceInput,
): PosCashShortageCheckpointTransition {
  assertActiveLease(input);
  const batchInput = parseCheckpointBatchInput(input.state);
  assertBatchResultMatchesCheckpoint(batchInput, input.batchResult);

  if (input.batchResult.hasMore) {
    if (!input.batchResult.nextCursor) {
      throw new BusinessRuleError(
        "POS cash-shortage checkpoint cannot advance a partial page without a next cursor.",
      );
    }

    const nextCursor = parseCursorForWindow(input.state, input.batchResult.nextCursor);
    return transition(input.state, {
      status: "leased",
      cursor: nextCursor,
      lastProcessedCursor: nextCursor,
      lastErrorCode: null,
      nextAttemptAt: null,
      completedAt: null,
    });
  }

  if (input.batchResult.nextCursor) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint cannot complete a window with a dangling next cursor.",
    );
  }

  return transition(input.state, {
    status: "completed",
    cursor: null,
    lastProcessedCursor: finalProcessedCursor(input.state, input.batchResult),
    leaseOwnerId: null,
    leaseToken: null,
    leaseExpiresAt: null,
    lastErrorCode: null,
    nextAttemptAt: null,
    completedAt: normalizeDate(input.now, "Checkpoint completion time is required."),
  });
}

export function recordPosCashShortageWorkerCheckpointFailure(
  input: PosCashShortageCheckpointFailureInput,
): PosCashShortageCheckpointTransition {
  assertActiveLease(input);
  parseCheckpointBatchInput(input.state);

  const maxAttempts =
    input.maxAttempts ?? POS_CASH_SHORTAGE_CHECKPOINT_MAX_ATTEMPTS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint max attempts must be at least one.",
    );
  }

  const retryDelayMs =
    input.retryDelayMs ?? POS_CASH_SHORTAGE_CHECKPOINT_RETRY_DELAY_MS;
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint retry delay must be non-negative.",
    );
  }

  const errorCode = requiredText(
    input.errorCode,
    "POS cash-shortage checkpoint failure requires an error code.",
  );
  const failedAttempt = input.state.attempt + 1;
  const exhausted = failedAttempt >= maxAttempts;
  const now = new Date(normalizeDate(input.now, "Checkpoint failure time is required."));

  return transition(input.state, {
    status: exhausted ? "dead_letter" : "ready",
    attempt: failedAttempt,
    leaseOwnerId: null,
    leaseToken: null,
    leaseExpiresAt: null,
    lastErrorCode: errorCode,
    nextAttemptAt: exhausted
      ? null
      : new Date(now.getTime() + retryDelayMs).toISOString(),
    completedAt: null,
  });
}

function assertActiveLease(input: PosCashShortageCheckpointLeaseInput) {
  const workerId = requiredText(
    input.workerId,
    "POS cash-shortage checkpoint worker is required.",
  );
  const leaseToken = requiredText(
    input.leaseToken,
    "POS cash-shortage checkpoint lease token is required.",
  );
  const now = new Date(normalizeDate(input.now, "Checkpoint lease check time is required."));

  assertCheckpointIdentity(input.state);

  if (input.state.status !== "leased") {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint must be leased before worker processing.",
    );
  }
  if (input.state.leaseOwnerId !== workerId || input.state.leaseToken !== leaseToken) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint lease ownership does not match the worker.",
    );
  }
  if (!input.state.leaseExpiresAt) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint lease expiry is required.",
    );
  }

  const leaseExpiresAt = new Date(
    normalizeDate(
      input.state.leaseExpiresAt,
      "POS cash-shortage checkpoint lease expiry is invalid.",
    ),
  );
  if (leaseExpiresAt <= now) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint lease has expired.",
    );
  }

  return {
    workerId,
    leaseToken,
    leaseExpiresAt: leaseExpiresAt.toISOString(),
  };
}

function assertCheckpointIdentity(state: PosCashShortageCheckpointState) {
  if (state.checkKey !== POS_SHIFT_CASH_SHORTAGE_CHECK_KEY) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint requires the POS cash-shortage check key.",
    );
  }
  if (state.workerKey !== POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint requires the certified checkpoint worker key.",
    );
  }
  if (!Number.isInteger(state.attempt) || state.attempt < 0) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint attempt must be a non-negative integer.",
    );
  }
}

function parseCheckpointBatchInput(
  state: PosCashShortageCheckpointState,
): ParsedLoadPosShiftCashShortageBatchInput {
  assertCheckpointIdentity(state);

  return loadPosShiftCashShortageBatchInputSchema.parse({
    organizationId: state.organizationId,
    recordedFromInclusive: state.recordedFromInclusive,
    recordedThroughExclusive: state.recordedThroughExclusive,
    cursor: state.cursor ?? null,
    limit: state.limit,
  });
}

function assertBatchResultMatchesCheckpoint(
  batchInput: ParsedLoadPosShiftCashShortageBatchInput,
  batchResult: PosShiftCashShortageBatchResult,
) {
  if (
    batchResult.organizationId !== batchInput.organizationId ||
    batchResult.recordedFromInclusive !==
      batchInput.recordedFromInclusive.toISOString() ||
    batchResult.recordedThroughExclusive !==
      batchInput.recordedThroughExclusive.toISOString()
  ) {
    throw new BusinessRuleError(
      "POS cash-shortage checkpoint batch result does not match the leased window.",
    );
  }
}

function parseCursorForWindow(
  state: PosCashShortageCheckpointState,
  cursor: { recordedAt: string | Date; eventId: string },
) {
  return loadPosShiftCashShortageBatchInputSchema.parse({
    organizationId: state.organizationId,
    recordedFromInclusive: state.recordedFromInclusive,
    recordedThroughExclusive: state.recordedThroughExclusive,
    cursor: {
      recordedAt: new Date(cursor.recordedAt),
      eventId: cursor.eventId,
    },
    limit: state.limit,
  }).cursor!;
}

function finalProcessedCursor(
  state: PosCashShortageCheckpointState,
  batchResult: PosShiftCashShortageBatchResult,
) {
  const lastItem = batchResult.items.at(-1);
  if (!lastItem) return state.lastProcessedCursor ?? state.cursor ?? null;
  return parseCursorForWindow(state, {
    recordedAt: lastItem.recordedAt,
    eventId: lastItem.eventId,
  });
}

function transition(
  state: PosCashShortageCheckpointState,
  override: Partial<PosCashShortageCheckpointTransition>,
): PosCashShortageCheckpointTransition {
  return {
    organizationId: state.organizationId,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workerKey: POS_CASH_SHORTAGE_CHECKPOINT_WORKER_KEY,
    status: state.status,
    cursor: state.cursor ?? null,
    attempt: state.attempt,
    leaseOwnerId: state.leaseOwnerId ?? null,
    leaseToken: state.leaseToken ?? null,
    leaseExpiresAt: state.leaseExpiresAt
      ? new Date(state.leaseExpiresAt).toISOString()
      : null,
    lastProcessedCursor: state.lastProcessedCursor ?? null,
    lastErrorCode: state.lastErrorCode ?? null,
    nextAttemptAt: state.nextAttemptAt
      ? new Date(state.nextAttemptAt).toISOString()
      : null,
    completedAt: null,
    ...override,
  };
}

function normalizeDate(value: string | Date, message: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new BusinessRuleError(message);
  return date.toISOString();
}

function requiredText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new BusinessRuleError(message);
  return normalized;
}

