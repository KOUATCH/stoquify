import fs from "fs";
import path from "path";

import { Prisma } from "@prisma/client";

jest.mock("@/prisma/db", () => ({
  db: {
    businessEvent: { findFirst: jest.fn() },
  },
}));

jest.mock("../cash-shortage-policy.service", () => ({
  resolveApprovedCashShortagePolicy: jest.fn(),
}));

import { db } from "@/prisma/db";
import type { WorkflowAssuranceIncidentDto } from "@/services/assurance/assurance-incident-contracts";
import { hashBusinessPayload } from "@/services/events/business-event.service";

import { resolveApprovedCashShortagePolicy } from "../cash-shortage-policy.service";
import {
  loadPosCashShortageResolutionSourceForIncident,
} from "../pos-cash-shortage-resolution-source-loader";
import { recheckPosCashShortageResolutionSource } from "../pos-cash-shortage-resolution-source-recheck";
import type {
  CashShortagePolicyV1,
  PosShiftClosedEventV1,
  PosShiftClosedPayloadV1,
} from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();
const mockDb = db as unknown as {
  businessEvent: { findFirst: jest.Mock };
};
const mockResolveApprovedPolicy =
  resolveApprovedCashShortagePolicy as jest.MockedFunction<
    typeof resolveApprovedCashShortagePolicy
  >;

describe("POS cash-shortage resolution source loader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const event = makeEvent();
    mockDb.businessEvent.findFirst.mockResolvedValue(eventRow(event));
    mockResolveApprovedPolicy.mockResolvedValue(makePolicy());
  });

  it("loads server-owned POS close and policy evidence for the source recheck contract", async () => {
    const event = makeEvent();
    const result = await loadPosCashShortageResolutionSourceForIncident({
      incident: incident({ sourceHash: event.payloadHash }),
      currentSourceHash: event.payloadHash,
    });

    expect(mockDb.businessEvent.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        eventType: "pos.shift.closed",
        eventSource: "POS",
        schemaVersion: 1,
        status: "APPLIED",
        sourceType: "CASH_DRAWER_CLOSE",
        sourceId: "session-1",
        payloadHash: event.payloadHash,
      },
      orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
      select: expect.objectContaining({
        id: true,
        organizationId: true,
        payloadHash: true,
        payload: true,
        sourceId: true,
      }),
    });
    expect(mockResolveApprovedPolicy).toHaveBeenCalledWith({
      organizationId: "org-1",
      currency: "XAF",
      effectiveAt: new Date("2026-07-20T10:00:00.000Z"),
    });
    expect(result.activationAuthorized).toBe(false);
    expect(result.sourceRecheckInput.expected).toEqual(
      expect.objectContaining({
        organizationId: "org-1",
        sourceType: "POSSession",
        sourceId: "session-1",
        currentSourceHash: event.payloadHash,
        approvedPolicyHash: hashBusinessPayload(makePolicy()),
        amountAtRisk: "2000",
        currency: "XAF",
        policyId: "cash-shortage-policy-xaf",
      }),
    );
    expect(
      recheckPosCashShortageResolutionSource(result.sourceRecheckInput).status,
    ).toBe("certified");
  });

  it("blocks stale incident source hash before loading source evidence", async () => {
    await expect(
      loadPosCashShortageResolutionSourceForIncident({
        incident: incident({ sourceHash: "0".repeat(64) }),
        currentSourceHash: "f".repeat(64),
      }),
    ).rejects.toThrow(/source evidence is not resolution-ready/i);

    expect(mockDb.businessEvent.findFirst).not.toHaveBeenCalled();
    expect(mockResolveApprovedPolicy).not.toHaveBeenCalled();
  });

  it("blocks when the source event payload hash no longer matches current evidence", async () => {
    const event = makeEvent();
    mockDb.businessEvent.findFirst.mockResolvedValue({
      ...eventRow(event),
      payloadHash: "f".repeat(64),
    });

    await expect(
      loadPosCashShortageResolutionSourceForIncident({
        incident: incident({ sourceHash: event.payloadHash }),
        currentSourceHash: event.payloadHash,
      }),
    ).rejects.toThrow(/source event not found|payload hash verification failed/i);
  });

  it("blocks when approved policy evidence is absent", async () => {
    const event = makeEvent();
    mockResolveApprovedPolicy.mockResolvedValue(null);

    await expect(
      loadPosCashShortageResolutionSourceForIncident({
        incident: incident({ sourceHash: event.payloadHash }),
        currentSourceHash: event.payloadHash,
      }),
    ).rejects.toThrow(/approved cash-shortage policy is required/i);
  });

  it("blocks when recomputed source evidence no longer triggers a shortage", async () => {
    const event = makeEvent({ countedBalance: "11999.00" });
    mockDb.businessEvent.findFirst.mockResolvedValue(eventRow(event));

    await expect(
      loadPosCashShortageResolutionSourceForIncident({
        incident: incident({ sourceHash: event.payloadHash }),
        currentSourceHash: event.payloadHash,
      }),
    ).rejects.toThrow(/no longer requires terminal resolution/i);
  });

  it("does not add actions, routes, workers, schedulers, alerts, or incident command activation", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-resolution-source-loader.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|router|createSafeAction/i);
    expect(source).not.toMatch(/runDormantPosShiftCashShortage|loadPosShiftCashShortageBatch/i);
    expect(source).not.toMatch(/resolveWorkflowAssuranceIncident\s*\(/i);
    expect(source).not.toMatch(/transitionWorkflowAssuranceIncident|recordWorkflowAssuranceIncident/i);
    expect(source).not.toMatch(/sendAlert|dispatchAlert|whatsApp|copilot/i);
  });
});

function makePolicy(): CashShortagePolicyV1 {
  return {
    kind: "cash_shortage_policy/v1",
    policyId: "cash-shortage-policy-xaf",
    version: 1,
    currency: "XAF",
    reviewThreshold: "2000",
    highThreshold: "10000",
    minorUnitScale: 0,
    roundingMode: "HALF_UP",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    approvalStatus: "approved",
    approvedAt: "2025-12-15T09:00:00.000Z",
    approvedById: "policy-approver-1",
    mode: "observe",
  };
}

function makeEvent(
  overrides: Partial<Pick<PosShiftClosedPayloadV1, "countedBalance">> = {},
): PosShiftClosedEventV1 {
  const expected = new Prisma.Decimal("12000.00");
  const counted = new Prisma.Decimal(overrides.countedBalance ?? "10000.00");
  const variance = counted.minus(expected);
  const payload: PosShiftClosedPayloadV1 = {
    evidenceVersion: 1,
    organizationId: "org-1",
    sessionId: "session-1",
    sessionNumber: "SHIFT-001",
    terminalId: "terminal-1",
    locationId: "location-1",
    cashDrawerId: "drawer-1",
    closingTransactionId: "drawer-transaction-1",
    actorId: "cashier-1",
    authorityMode: "SELF",
    openedAt: "2026-07-20T08:00:00.000Z",
    closedAt: "2026-07-20T10:00:00.000Z",
    currency: "XAF",
    openingBalance: "5000.00",
    expectedBalance: expected.toFixed(2),
    countedBalance: counted.toFixed(2),
    variance: variance.toFixed(2),
    varianceDirection: variance.lt(0) ? "SHORTAGE" : variance.eq(0) ? "BALANCED" : "OVERAGE",
    explanation: "Counted cash was below the expected balance.",
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
  const event = {
    id: "event-1",
    organizationId: payload.organizationId,
    eventType: "pos.shift.closed" as const,
    eventSource: "POS" as const,
    schemaVersion: 1 as const,
    status: "APPLIED" as const,
    idempotencyKey: "pos-shift-close:session-1",
    payloadHash: hashBusinessPayload(payload),
    payload,
    occurredAt: payload.closedAt,
    actorId: payload.actorId,
    locationId: payload.locationId,
    registerId: payload.terminalId,
    sourceType: "CASH_DRAWER_CLOSE" as const,
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
  return event;
}

function eventRow(event: PosShiftClosedEventV1) {
  return {
    ...event,
    occurredAt: new Date(event.occurredAt),
  };
}

function incident(
  overrides: Partial<WorkflowAssuranceIncidentDto> = {},
): WorkflowAssuranceIncidentDto {
  return {
    id: "incident-1",
    organizationId: "org-1",
    checkKey: "pos.closed_shift_cash_shortage.review",
    workflow: "pos",
    moduleSlug: "pos",
    sourceType: "POSSession",
    sourceId: "session-1",
    sourceLabel: "POS cash drawer close event",
    sourceHash: "source-hash-1",
    fingerprint: "fingerprint-1",
    title: "Cash shortage requiring review",
    detail: "Cash shortage meets the approved threshold.",
    severity: "high",
    status: "open",
    evidenceGrade: "blocked",
    actionRoute: "/dashboard/manager-action-center",
    ownerId: null,
    assignedRole: "branch_manager",
    dueAt: null,
    occurrenceCount: 1,
    firstDetectedAt: "2026-07-27T10:00:00.000Z",
    lastDetectedAt: "2026-07-27T10:00:00.000Z",
    resolvedAt: null,
    reopenedAt: null,
    suppressedAt: null,
    metadata: {},
    sourceLinks: [],
    proofSubject: null,
    proofSummary: {
      evidenceGrade: "blocked",
      sourceHash: "source-hash-1",
      freshness: "current",
      proofSubject: null,
      actionRoute: "/dashboard/manager-action-center",
    },
    redactions: [],
    ...overrides,
  };
}
