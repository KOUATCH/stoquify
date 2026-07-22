import { Prisma } from "@prisma/client";

jest.mock("@/prisma/db", () => ({
  db: {
    cashShortagePolicy: { findMany: jest.fn() },
    businessEvent: { findUnique: jest.fn() },
  },
}));

import { db } from "@/prisma/db";
import { hashBusinessPayload } from "@/services/events/business-event.service";

import { resolveApprovedCashShortagePolicy } from "../cash-shortage-policy.service";
import {
  POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
  type CashShortagePolicyV1,
  type PosShiftClosedEventV1,
  type PosShiftClosedPayloadV1,
} from "../pos-shift-cash-shortage-contracts";
import { evaluatePosShiftCashShortage } from "../pos-shift-cash-shortage-evaluator";

const mockDb = db as unknown as {
  cashShortagePolicy: { findMany: jest.Mock };
  businessEvent: { findUnique: jest.Mock };
};

function approvedPolicyEvidence() {
  const approvedAt = new Date("2026-07-19T11:00:00.000Z");
  const policy: CashShortagePolicyV1 = {
    kind: POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
    policyId: "policy-1",
    version: 1,
    currency: "XAF",
    reviewThreshold: "2000",
    highThreshold: "10000",
    minorUnitScale: 0,
    roundingMode: "HALF_UP",
    effectiveFrom: "2026-07-20T00:00:00.000Z",
    effectiveTo: "2026-08-01T00:00:00.000Z",
    approvalStatus: "approved",
    approvedAt: approvedAt.toISOString(),
    approvedById: "checker-1",
    mode: "observe",
  };
  const policyHash = hashBusinessPayload(policy);
  const row = {
    id: policy.policyId,
    organizationId: "org-1",
    version: policy.version,
    currency: policy.currency,
    reviewThreshold: new Prisma.Decimal(policy.reviewThreshold),
    highThreshold: new Prisma.Decimal(policy.highThreshold),
    minorUnitScale: policy.minorUnitScale,
    roundingMode: policy.roundingMode,
    effectiveFrom: new Date(policy.effectiveFrom),
    effectiveTo: new Date(policy.effectiveTo!),
    mode: "OBSERVE",
    status: "APPROVED",
    createdById: "maker-1",
    approvedById: policy.approvedById,
    approvedAt,
    documentHash: policyHash,
    createdAt: new Date("2026-07-19T10:00:00.000Z"),
    updatedAt: approvedAt,
  };
  const payload = {
    evidenceVersion: 1,
    organizationId: row.organizationId,
    policy,
    policyHash,
  };
  const event = {
    id: "approval-event-1",
    eventType: "cash_shortage.policy.approved",
    schemaVersion: 1,
    status: "APPLIED",
    actorId: row.approvedById,
    sourceType: "MANUAL",
    sourceId: row.id,
    documentHash: policyHash,
    occurredAt: approvedAt,
    payload,
    payloadHash: hashBusinessPayload(payload),
  };
  return { row, policy, policyHash, event };
}

function closedShiftEvent(): PosShiftClosedEventV1 {
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
    expectedBalance: "12000.00",
    countedBalance: "10000.00",
    variance: "-2000.00",
    varianceDirection: "SHORTAGE",
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
  const documentHash = hashBusinessPayload({
    evidenceVersion: payload.evidenceVersion,
    organizationId: payload.organizationId,
    sessionId: payload.sessionId,
    actorId: payload.actorId,
    countedBalance: payload.countedBalance,
    explanation: payload.explanation,
  });

  return {
    id: "pos-event-1",
    organizationId: payload.organizationId,
    eventType: "pos.shift.closed",
    eventSource: "POS",
    schemaVersion: 1,
    status: "APPLIED",
    idempotencyKey: "pos-shift-close:session-1",
    payloadHash: hashBusinessPayload(payload),
    payload,
    occurredAt: payload.closedAt,
    actorId: payload.actorId,
    locationId: payload.locationId,
    registerId: payload.terminalId,
    sourceType: "CASH_DRAWER_CLOSE",
    sourceId: payload.sessionId,
    documentHash,
  };
}

describe("cash-shortage policy resolver to evaluator contract", () => {
  it("feeds an evidence-verified approved policy into the strict Slice 4 evaluator", async () => {
    const evidence = approvedPolicyEvidence();
    mockDb.cashShortagePolicy.findMany.mockResolvedValue([evidence.row]);
    mockDb.businessEvent.findUnique.mockResolvedValue(evidence.event);

    const policy = await resolveApprovedCashShortagePolicy({
      organizationId: "org-1",
      currency: "XAF",
      effectiveAt: "2026-07-20T10:00:00.000Z",
    });

    expect(policy).toEqual(evidence.policy);
    expect(
      evaluatePosShiftCashShortage({ event: closedShiftEvent(), policy }),
    ).toMatchObject({
      outcome: "triggered",
      severity: "warning",
      evidence: {
        policy: {
          policyId: "policy-1",
          policyHash: evidence.policyHash,
        },
      },
    });
  });
});
