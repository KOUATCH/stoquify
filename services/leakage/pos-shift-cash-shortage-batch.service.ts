import { Prisma } from "@prisma/client";

import { db } from "@/prisma/db";
import { ConflictError } from "@/services/_shared/action-errors";

import { resolveApprovedCashShortagePolicy } from "./cash-shortage-policy.service";
import {
  loadPosShiftCashShortageBatchInputSchema,
  type LoadPosShiftCashShortageBatchInput,
  type ParsedLoadPosShiftCashShortageBatchInput,
  type ParsedPosShiftCashShortageBatchCursor,
} from "./pos-shift-cash-shortage-batch.schemas";
import {
  posShiftClosedEventV1Schema,
  type CashShortageEvaluation,
} from "./pos-shift-cash-shortage-contracts";
import { evaluatePosShiftCashShortage } from "./pos-shift-cash-shortage-evaluator";

const POS_SHIFT_CLOSED_EVENT_TYPE = "pos.shift.closed";

const BUSINESS_EVENT_SELECT = {
  id: true,
  organizationId: true,
  eventType: true,
  eventSource: true,
  schemaVersion: true,
  status: true,
  idempotencyKey: true,
  payloadHash: true,
  payload: true,
  occurredAt: true,
  recordedAt: true,
  actorId: true,
  locationId: true,
  registerId: true,
  sourceType: true,
  sourceId: true,
  documentHash: true,
} as const satisfies Prisma.BusinessEventSelect;

type BusinessEventRow = Prisma.BusinessEventGetPayload<{
  select: typeof BUSINESS_EVENT_SELECT;
}>;

export type PosShiftCashShortageBatchCursor = {
  recordedAt: string;
  eventId: string;
};

export type PosShiftCashShortageBatchItem = {
  eventId: string;
  sourceId: string | null;
  recordedAt: string;
  evaluation: CashShortageEvaluation;
};

export type PosShiftCashShortageBatchCounts = {
  scanned: number;
  blocked: number;
  notTriggered: number;
  triggered: number;
  warning: number;
  high: number;
};

export type PosShiftCashShortageBatchResult = {
  organizationId: string;
  recordedFromInclusive: string;
  recordedThroughExclusive: string;
  items: PosShiftCashShortageBatchItem[];
  counts: PosShiftCashShortageBatchCounts;
  hasMore: boolean;
  nextCursor: PosShiftCashShortageBatchCursor | null;
};

function comparePosition(
  left: { recordedAt: Date; eventId: string },
  right: { recordedAt: Date; eventId: string },
): number {
  const timeDifference = left.recordedAt.getTime() - right.recordedAt.getTime();
  if (timeDifference !== 0) return timeDifference;
  if (left.eventId === right.eventId) return 0;
  return left.eventId < right.eventId ? -1 : 1;
}

function assertLoadedRows(
  rows: readonly BusinessEventRow[],
  input: ParsedLoadPosShiftCashShortageBatchInput,
) {
  if (rows.length > input.limit + 1) {
    throw new ConflictError(
      "Cash-shortage event page exceeded its requested bound.",
    );
  }

  const windowStart = input.recordedFromInclusive.getTime();
  const windowEnd = input.recordedThroughExclusive.getTime();
  const cursor = input.cursor
    ? { recordedAt: input.cursor.recordedAt, eventId: input.cursor.eventId }
    : null;
  let previous: { recordedAt: Date; eventId: string } | null = null;

  for (const row of rows) {
    if (row.organizationId !== input.organizationId) {
      throw new ConflictError(
        "Cash-shortage event batch crossed its tenant boundary.",
      );
    }
    const recordedAt = row.recordedAt.getTime();
    if (recordedAt < windowStart || recordedAt >= windowEnd) {
      throw new ConflictError(
        "Cash-shortage event batch returned evidence outside its requested window.",
      );
    }

    const position = { recordedAt: row.recordedAt, eventId: row.id };
    if (cursor && comparePosition(position, cursor) <= 0) {
      throw new ConflictError(
        "Cash-shortage event batch did not advance beyond its cursor.",
      );
    }
    if (previous && comparePosition(position, previous) <= 0) {
      throw new ConflictError(
        "Cash-shortage event batch order is not deterministic.",
      );
    }
    previous = position;
  }
}

function serializeEvent(row: BusinessEventRow) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    eventType: row.eventType,
    eventSource: row.eventSource,
    schemaVersion: row.schemaVersion,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    payloadHash: row.payloadHash,
    payload: row.payload,
    occurredAt: row.occurredAt.toISOString(),
    actorId: row.actorId,
    locationId: row.locationId,
    registerId: row.registerId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    documentHash: row.documentHash,
  };
}

async function evaluateRow(
  row: BusinessEventRow,
  organizationId: string,
): Promise<CashShortageEvaluation> {
  const event = serializeEvent(row);
  const sourcePreflight = evaluatePosShiftCashShortage({ event, policy: null });
  if (
    sourcePreflight.outcome === "blocked" &&
    sourcePreflight.code !== "POLICY_MISSING"
  ) {
    return sourcePreflight;
  }
  if (
    sourcePreflight.outcome !== "blocked" ||
    sourcePreflight.code !== "POLICY_MISSING"
  ) {
    throw new ConflictError(
      "Cash-shortage source preflight produced an unexpected outcome.",
    );
  }

  const parsedEvent = posShiftClosedEventV1Schema.parse(event);
  const policy = await resolveApprovedCashShortagePolicy({
    organizationId,
    currency: parsedEvent.payload.currency,
    effectiveAt: new Date(parsedEvent.payload.closedAt),
  });

  return evaluatePosShiftCashShortage({ event: parsedEvent, policy });
}

function countEvaluations(
  items: readonly PosShiftCashShortageBatchItem[],
): PosShiftCashShortageBatchCounts {
  const counts: PosShiftCashShortageBatchCounts = {
    scanned: items.length,
    blocked: 0,
    notTriggered: 0,
    triggered: 0,
    warning: 0,
    high: 0,
  };

  for (const item of items) {
    if (item.evaluation.outcome === "blocked") {
      counts.blocked += 1;
    } else if (item.evaluation.outcome === "not_triggered") {
      counts.notTriggered += 1;
    } else {
      counts.triggered += 1;
      counts[item.evaluation.severity] += 1;
    }
  }

  return counts;
}

function cursorWhere(
  cursor: ParsedPosShiftCashShortageBatchCursor | null,
): Prisma.BusinessEventWhereInput {
  if (!cursor) return {};
  return {
    OR: [
      { recordedAt: { gt: cursor.recordedAt } },
      { recordedAt: cursor.recordedAt, id: { gt: cursor.eventId } },
    ],
  };
}

export async function loadPosShiftCashShortageEvaluationBatch(
  input: LoadPosShiftCashShortageBatchInput,
): Promise<PosShiftCashShortageBatchResult> {
  const parsed = loadPosShiftCashShortageBatchInputSchema.parse(input);
  const cursor = parsed.cursor ?? null;
  const rows = (await db.businessEvent.findMany({
    where: {
      organizationId: parsed.organizationId,
      eventType: POS_SHIFT_CLOSED_EVENT_TYPE,
      eventSource: "POS",
      schemaVersion: 1,
      status: "APPLIED",
      sourceType: "CASH_DRAWER_CLOSE",
      recordedAt: {
        gte: parsed.recordedFromInclusive,
        lt: parsed.recordedThroughExclusive,
      },
      ...cursorWhere(cursor),
    },
    orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
    take: parsed.limit + 1,
    select: BUSINESS_EVENT_SELECT,
  })) as BusinessEventRow[];

  assertLoadedRows(rows, parsed);
  const hasMore = rows.length > parsed.limit;
  const pageRows = hasMore ? rows.slice(0, parsed.limit) : rows;
  const items: PosShiftCashShortageBatchItem[] = [];

  for (const row of pageRows) {
    items.push({
      eventId: row.id,
      sourceId: row.sourceId,
      recordedAt: row.recordedAt.toISOString(),
      evaluation: await evaluateRow(row, parsed.organizationId),
    });
  }

  const lastRow = hasMore ? pageRows.at(-1) : null;
  return {
    organizationId: parsed.organizationId,
    recordedFromInclusive: parsed.recordedFromInclusive.toISOString(),
    recordedThroughExclusive: parsed.recordedThroughExclusive.toISOString(),
    items,
    counts: countEvaluations(items),
    hasMore,
    nextCursor: lastRow
      ? { recordedAt: lastRow.recordedAt.toISOString(), eventId: lastRow.id }
      : null,
  };
}
