import { hashBusinessPayload } from "@/services/events/business-event.service";

jest.mock("@/prisma/db", () => ({
  db: {
    businessEvent: { findMany: jest.fn() },
  },
}));

jest.mock("../cash-shortage-policy.service", () => ({
  resolveApprovedCashShortagePolicy: jest.fn(),
}));

import { db } from "@/prisma/db";

import { resolveApprovedCashShortagePolicy } from "../cash-shortage-policy.service";
import {
  loadPosShiftCashShortageBatchInputSchema,
  type LoadPosShiftCashShortageBatchInput,
} from "../pos-shift-cash-shortage-batch.schemas";
import { loadPosShiftCashShortageEvaluationBatch } from "../pos-shift-cash-shortage-batch.service";
import {
  POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
  type CashShortagePolicyV1,
  type PosShiftClosedPayloadV1,
} from "../pos-shift-cash-shortage-contracts";

const mockDb = db as unknown as {
  businessEvent: { findMany: jest.Mock };
};
const mockResolveApprovedPolicy =
  resolveApprovedCashShortagePolicy as jest.MockedFunction<
    typeof resolveApprovedCashShortagePolicy
  >;

const WINDOW_START = "2026-07-20T00:00:00.000Z";
const WINDOW_END = "2026-07-21T00:00:00.000Z";

function batchInput(
  overrides: Partial<LoadPosShiftCashShortageBatchInput> = {},
): LoadPosShiftCashShortageBatchInput {
  return {
    organizationId: "org-1",
    recordedFromInclusive: WINDOW_START,
    recordedThroughExclusive: WINDOW_END,
    ...overrides,
  };
}

function approvedPolicy(): CashShortagePolicyV1 {
  return {
    kind: POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
    policyId: "policy-1",
    version: 1,
    currency: "XAF",
    reviewThreshold: "2000",
    highThreshold: "10000",
    minorUnitScale: 0,
    roundingMode: "HALF_UP",
    effectiveFrom: "2026-07-01T00:00:00.000Z",
    effectiveTo: "2026-08-01T00:00:00.000Z",
    approvalStatus: "approved",
    approvedAt: "2026-06-30T12:00:00.000Z",
    approvedById: "checker-1",
    mode: "observe",
  };
}

function eventRow(options: {
  id?: string;
  organizationId?: string;
  recordedAt?: string;
  expectedBalance?: string;
  countedBalance?: string;
  variance?: string;
  varianceDirection?: "BALANCED" | "SHORTAGE" | "OVERAGE";
  explanation?: string | null;
  payloadOrganizationId?: string;
  malformedPayload?: boolean;
}) {
  const organizationId = options.organizationId ?? "org-1";
  const id = options.id ?? "event-1";
  const expectedBalance = options.expectedBalance ?? "12000.00";
  const countedBalance = options.countedBalance ?? "10000.00";
  const variance = options.variance ?? "-2000.00";
  const varianceDirection = options.varianceDirection ?? "SHORTAGE";
  const explanation =
    options.explanation === undefined
      ? "Counted cash was below the expected balance."
      : options.explanation;
  const payload: PosShiftClosedPayloadV1 = {
    evidenceVersion: 1,
    organizationId: options.payloadOrganizationId ?? organizationId,
    sessionId: `session-${id}`,
    sessionNumber: `SHIFT-${id}`,
    terminalId: "terminal-1",
    locationId: "location-1",
    cashDrawerId: "drawer-1",
    closingTransactionId: `drawer-transaction-${id}`,
    actorId: "cashier-1",
    authorityMode: "SELF",
    openedAt: "2026-07-20T08:00:00.000Z",
    closedAt: "2026-07-20T10:00:00.000Z",
    currency: "XAF",
    openingBalance: "5000.00",
    expectedBalance,
    countedBalance,
    variance,
    varianceDirection,
    explanation,
    totals: {
      sales: "7000.00",
      tax: "0.00",
      discount: "0.00",
      transactionCount: 4,
      cash: "7000.00",
      card: "0.00",
      mobileMoney: "0.00",
      bankTransfer: "0.00",
      credit: "0.00",
    },
  };
  const storedPayload = options.malformedPayload
    ? { malformed: true }
    : payload;

  return {
    id,
    organizationId,
    eventType: "pos.shift.closed",
    eventSource: "POS",
    schemaVersion: 1,
    status: "APPLIED",
    idempotencyKey: `pos-shift:${payload.sessionId}:closed`,
    payloadHash: hashBusinessPayload(storedPayload),
    payload: storedPayload,
    occurredAt: new Date(payload.closedAt),
    recordedAt: new Date(options.recordedAt ?? "2026-07-20T10:00:01.000Z"),
    actorId: payload.actorId,
    locationId: payload.locationId,
    registerId: payload.terminalId,
    sourceType: "CASH_DRAWER_CLOSE",
    sourceId: payload.sessionId,
    documentHash: hashBusinessPayload({
      evidenceVersion: payload.evidenceVersion,
      organizationId: payload.organizationId,
      sessionId: payload.sessionId,
      actorId: payload.actorId,
      countedBalance: payload.countedBalance,
      explanation: payload.explanation,
    }),
  };
}

describe("POS shift cash-shortage evaluation batch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.businessEvent.findMany.mockResolvedValue([]);
    mockResolveApprovedPolicy.mockResolvedValue(approvedPolicy());
  });

  it.each([
    ["blank organization", { organizationId: "" }],
    ["equal window endpoints", { recordedThroughExclusive: WINDOW_START }],
    [
      "reversed window",
      { recordedThroughExclusive: "2026-07-19T23:59:59.000Z" },
    ],
    ["zero limit", { limit: 0 }],
    ["oversized limit", { limit: 101 }],
    [
      "cursor before window",
      {
        cursor: { recordedAt: "2026-07-19T23:59:59.000Z", eventId: "event-1" },
      },
    ],
    [
      "cursor at exclusive end",
      { cursor: { recordedAt: WINDOW_END, eventId: "event-1" } },
    ],
  ])("rejects %s", (_label, overrides) => {
    expect(
      loadPosShiftCashShortageBatchInputSchema.safeParse(batchInput(overrides))
        .success,
    ).toBe(false);
  });

  it("queries the exact tenant-scoped eligible source contract", async () => {
    const result = await loadPosShiftCashShortageEvaluationBatch(batchInput());

    expect(mockDb.businessEvent.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        eventType: "pos.shift.closed",
        eventSource: "POS",
        schemaVersion: 1,
        status: "APPLIED",
        sourceType: "CASH_DRAWER_CLOSE",
        recordedAt: {
          gte: new Date(WINDOW_START),
          lt: new Date(WINDOW_END),
        },
      },
      orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
      take: 51,
      select: expect.objectContaining({
        id: true,
        organizationId: true,
        payload: true,
        recordedAt: true,
        sourceId: true,
      }),
    });
    expect(result).toEqual({
      organizationId: "org-1",
      recordedFromInclusive: WINDOW_START,
      recordedThroughExclusive: WINDOW_END,
      items: [],
      counts: {
        scanned: 0,
        blocked: 0,
        notTriggered: 0,
        triggered: 0,
        warning: 0,
        high: 0,
      },
      hasMore: false,
      nextCursor: null,
    });
  });

  it("uses a structured cursor and limit-plus-one pagination", async () => {
    const cursor = {
      recordedAt: "2026-07-20T09:00:00.000Z",
      eventId: "event-9",
    };
    await loadPosShiftCashShortageEvaluationBatch(
      batchInput({ cursor, limit: 2 }),
    );

    expect(mockDb.businessEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { recordedAt: { gt: new Date(cursor.recordedAt) } },
            {
              recordedAt: new Date(cursor.recordedAt),
              id: { gt: cursor.eventId },
            },
          ],
        }),
        orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
        take: 3,
      }),
    );
  });

  it("serializes a trusted event and resolves policy by tenant, currency, and close time", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([eventRow({})]);

    const result = await loadPosShiftCashShortageEvaluationBatch(batchInput());

    expect(mockResolveApprovedPolicy).toHaveBeenCalledWith({
      organizationId: "org-1",
      currency: "XAF",
      effectiveAt: new Date("2026-07-20T10:00:00.000Z"),
    });
    expect(result.items[0]).toMatchObject({
      eventId: "event-1",
      sourceId: "session-event-1",
      recordedAt: "2026-07-20T10:00:01.000Z",
      evaluation: {
        outcome: "triggered",
        severity: "warning",
        evidence: {
          eventId: "event-1",
          sourceId: "session-event-1",
          policy: { policyId: "policy-1", version: 1 },
        },
      },
    });
    expect(result.counts).toEqual({
      scanned: 1,
      blocked: 0,
      notTriggered: 0,
      triggered: 1,
      warning: 1,
      high: 0,
    });
  });

  it("blocks malformed source evidence without resolving policy", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([
      eventRow({ malformedPayload: true }),
    ]);

    const result = await loadPosShiftCashShortageEvaluationBatch(batchInput());

    expect(mockResolveApprovedPolicy).not.toHaveBeenCalled();
    expect(result.items[0]?.evaluation).toMatchObject({
      outcome: "blocked",
      code: "SOURCE_SCHEMA_INVALID",
    });
    expect(result.counts.blocked).toBe(1);
  });

  it("blocks identity-drifted source evidence without crossing the policy boundary", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([
      eventRow({ payloadOrganizationId: "org-2" }),
    ]);

    const result = await loadPosShiftCashShortageEvaluationBatch(batchInput());

    expect(mockResolveApprovedPolicy).not.toHaveBeenCalled();
    expect(result.items[0]?.evaluation).toMatchObject({
      outcome: "blocked",
      code: "SOURCE_IDENTITY_MISMATCH",
    });
  });

  it("preserves POLICY_MISSING instead of supplying a default", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([eventRow({})]);
    mockResolveApprovedPolicy.mockResolvedValue(null);

    const result = await loadPosShiftCashShortageEvaluationBatch(batchInput());

    expect(result.items[0]?.evaluation).toMatchObject({
      outcome: "blocked",
      code: "POLICY_MISSING",
    });
  });

  it("returns deterministic mixed-outcome counts", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([
      eventRow({
        id: "event-1",
        recordedAt: "2026-07-20T10:00:01.000Z",
        countedBalance: "12000.00",
        variance: "0.00",
        varianceDirection: "BALANCED",
        explanation: null,
      }),
      eventRow({
        id: "event-2",
        recordedAt: "2026-07-20T10:00:02.000Z",
        countedBalance: "10500.00",
        variance: "-1500.00",
      }),
      eventRow({ id: "event-3", recordedAt: "2026-07-20T10:00:03.000Z" }),
      eventRow({
        id: "event-4",
        recordedAt: "2026-07-20T10:00:04.000Z",
        countedBalance: "2000.00",
        variance: "-10000.00",
      }),
      eventRow({
        id: "event-5",
        recordedAt: "2026-07-20T10:00:05.000Z",
        malformedPayload: true,
      }),
    ]);

    const result = await loadPosShiftCashShortageEvaluationBatch(batchInput());

    expect(result.counts).toEqual({
      scanned: 5,
      blocked: 1,
      notTriggered: 2,
      triggered: 2,
      warning: 1,
      high: 1,
    });
  });

  it("evaluates only the page and returns the last included row as continuation", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([
      eventRow({ id: "event-1", recordedAt: "2026-07-20T10:00:01.000Z" }),
      eventRow({ id: "event-2", recordedAt: "2026-07-20T10:00:02.000Z" }),
      eventRow({ id: "event-3", recordedAt: "2026-07-20T10:00:03.000Z" }),
    ]);

    const result = await loadPosShiftCashShortageEvaluationBatch(
      batchInput({ limit: 2 }),
    );

    expect(result.items.map((item) => item.eventId)).toEqual([
      "event-1",
      "event-2",
    ]);
    expect(mockResolveApprovedPolicy).toHaveBeenCalledTimes(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toEqual({
      recordedAt: "2026-07-20T10:00:02.000Z",
      eventId: "event-2",
    });
  });

  it("fails closed when approved-policy evidence cannot be verified", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([eventRow({})]);
    mockResolveApprovedPolicy.mockRejectedValue(
      new Error("Approved cash-shortage policy hash verification failed."),
    );

    await expect(
      loadPosShiftCashShortageEvaluationBatch(batchInput()),
    ).rejects.toThrow(
      "Approved cash-shortage policy hash verification failed.",
    );
  });

  it("rejects a foreign-tenant row even if the database client violates its query", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([
      eventRow({ organizationId: "org-2" }),
    ]);

    await expect(
      loadPosShiftCashShortageEvaluationBatch(batchInput()),
    ).rejects.toThrow("Cash-shortage event batch crossed its tenant boundary.");
    expect(mockResolveApprovedPolicy).not.toHaveBeenCalled();
  });

  it("rejects unordered rows rather than emitting an unstable cursor", async () => {
    mockDb.businessEvent.findMany.mockResolvedValue([
      eventRow({ id: "event-2", recordedAt: "2026-07-20T10:00:02.000Z" }),
      eventRow({ id: "event-1", recordedAt: "2026-07-20T10:00:01.000Z" }),
    ]);

    await expect(
      loadPosShiftCashShortageEvaluationBatch(batchInput()),
    ).rejects.toThrow("Cash-shortage event batch order is not deterministic.");
    expect(mockResolveApprovedPolicy).not.toHaveBeenCalled();
  });

  it("replays a static page deterministically without requiring write methods", async () => {
    const rows = [eventRow({})];
    mockDb.businessEvent.findMany.mockResolvedValue(rows);

    const first = await loadPosShiftCashShortageEvaluationBatch(batchInput());
    const second = await loadPosShiftCashShortageEvaluationBatch(batchInput());

    expect(second).toEqual(first);
    expect(mockDb.businessEvent.findMany).toHaveBeenCalledTimes(2);
    expect(Object.keys(mockDb.businessEvent)).toEqual(["findMany"]);
  });
});
