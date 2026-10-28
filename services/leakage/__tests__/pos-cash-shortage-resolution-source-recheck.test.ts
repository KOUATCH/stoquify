import fs from "fs";
import path from "path";

import { Prisma } from "@prisma/client";

import { hashBusinessPayload } from "@/services/events/business-event.service";

import {
  evaluatePosCashShortageResolutionReadinessPreflight,
  POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS,
} from "../pos-cash-shortage-resolution-readiness-preflight";
import {
  recheckPosCashShortageResolutionSource,
  POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_REQUIREMENTS,
} from "../pos-cash-shortage-resolution-source-recheck";
import {
  type CashShortagePolicyV1,
  type PosShiftClosedEventV1,
  type PosShiftClosedPayloadV1,
} from "../pos-shift-cash-shortage-contracts";
import { evaluatePosShiftCashShortage } from "../pos-shift-cash-shortage-evaluator";

const ROOT = process.cwd();
const CLOSED_AT = "2026-07-20T10:00:00.000Z";

type EventFixtureOptions = {
  expectedBalance?: string;
  countedBalance?: string;
  explanation?: string | null;
};

function varianceDirection(
  variance: Prisma.Decimal,
): PosShiftClosedPayloadV1["varianceDirection"] {
  if (variance.eq(0)) return "BALANCED";
  return variance.lt(0) ? "SHORTAGE" : "OVERAGE";
}

function documentHash(payload: PosShiftClosedPayloadV1) {
  return hashBusinessPayload({
    evidenceVersion: payload.evidenceVersion,
    organizationId: payload.organizationId,
    sessionId: payload.sessionId,
    actorId: payload.actorId,
    countedBalance: payload.countedBalance,
    explanation: payload.explanation,
  });
}

function withValidHashes(event: PosShiftClosedEventV1): PosShiftClosedEventV1 {
  return {
    ...event,
    payloadHash: hashBusinessPayload(event.payload),
    documentHash: documentHash(event.payload),
  };
}

function makeEvent(options: EventFixtureOptions = {}): PosShiftClosedEventV1 {
  const expectedBalance = options.expectedBalance ?? "12000.00";
  const countedBalance = options.countedBalance ?? "10000.00";
  const expected = new Prisma.Decimal(expectedBalance);
  const counted = new Prisma.Decimal(countedBalance);
  const scale = Math.max(expected.decimalPlaces(), counted.decimalPlaces(), 2);
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
    closedAt: CLOSED_AT,
    currency: "XAF",
    openingBalance: "5000.00",
    expectedBalance,
    countedBalance,
    variance: variance.toFixed(scale),
    varianceDirection: varianceDirection(variance),
    explanation:
      options.explanation === undefined
        ? "Counted cash was below the expected balance."
        : options.explanation,
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

  return withValidHashes({
    id: "event-1",
    organizationId: payload.organizationId,
    eventType: "pos.shift.closed",
    eventSource: "POS",
    schemaVersion: 1,
    status: "RECORDED",
    idempotencyKey: "pos-shift-close:session-1",
    payloadHash: hashBusinessPayload(payload),
    payload,
    occurredAt: payload.closedAt,
    actorId: payload.actorId,
    locationId: payload.locationId,
    registerId: payload.terminalId,
    sourceType: "CASH_DRAWER_CLOSE",
    sourceId: payload.sessionId,
    documentHash: documentHash(payload),
  });
}

function makePolicy(
  overrides: Partial<CashShortagePolicyV1> = {},
): CashShortagePolicyV1 {
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
    ...overrides,
  };
}

function expectedFrom(event: PosShiftClosedEventV1, policy: CashShortagePolicyV1) {
  const evaluation = evaluatePosShiftCashShortage({ event, policy });
  if (evaluation.outcome !== "triggered") {
    throw new Error("Expected a triggered fixture.");
  }

  return {
    organizationId: event.organizationId,
    sourceType: "POSSession" as const,
    sourceId: event.sourceId,
    currentSourceHash: event.payloadHash,
    approvedPolicyHash: hashBusinessPayload(policy),
    evaluationHash: hashBusinessPayload(evaluation),
    amountAtRisk: evaluation.evidence.normalized.amountAtRisk,
    currency: evaluation.evidence.currency,
    policyId: evaluation.evidence.policy.policyId,
  };
}

describe("POS cash-shortage resolution source recheck", () => {
  it("certifies current POSSession shortage evidence when source, policy, and evaluation hashes match", () => {
    const event = makeEvent();
    const policy = makePolicy();

    const result = recheckPosCashShortageResolutionSource({
      event,
      approvedPolicy: policy,
      expected: expectedFrom(event, policy),
    });

    expect(result).toEqual({
      version: 1,
      checkKey: "pos.closed_shift_cash_shortage.review",
      status: "certified",
      resolutionSourceRecheckCertified: true,
      activationAuthorized: false,
      currentSourceHash: event.payloadHash,
      approvedPolicyHash: hashBusinessPayload(policy),
      evaluationHash: expect.any(String),
      evaluationOutcome: "triggered",
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("blocks when the incident-facing source hash is stale", () => {
    const event = makeEvent();
    const policy = makePolicy();
    const expected = expectedFrom(event, policy);

    const result = recheckPosCashShortageResolutionSource({
      event,
      approvedPolicy: policy,
      expected: {
        ...expected,
        currentSourceHash: "0".repeat(64),
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["current_source_hash_matches"]),
    );
  });

  it("blocks when the approved policy evidence changed before resolution", () => {
    const event = makeEvent();
    const originalPolicy = makePolicy();
    const changedPolicy = makePolicy({ version: 2, reviewThreshold: "5000" });

    const result = recheckPosCashShortageResolutionSource({
      event,
      approvedPolicy: changedPolicy,
      expected: expectedFrom(event, originalPolicy),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "approved_policy_hash_matches",
        "evaluation_hash_matches",
      ]),
    );
  });

  it("blocks when the recomputed evaluation hash does not match", () => {
    const event = makeEvent();
    const policy = makePolicy();
    const expected = expectedFrom(event, policy);

    const result = recheckPosCashShortageResolutionSource({
      event,
      approvedPolicy: policy,
      expected: {
        ...expected,
        evaluationHash: "f".repeat(64),
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["evaluation_hash_matches"]),
    );
  });

  it("blocks when current source evidence no longer triggers a cash-shortage case", () => {
    const event = makeEvent({ expectedBalance: "12000.00", countedBalance: "11999.00" });
    const policy = makePolicy();
    const evaluation = evaluatePosShiftCashShortage({ event, policy });
    const result = recheckPosCashShortageResolutionSource({
      event,
      approvedPolicy: policy,
      expected: {
        organizationId: event.organizationId,
        sourceType: "POSSession",
        sourceId: event.sourceId,
        currentSourceHash: event.payloadHash,
        approvedPolicyHash: hashBusinessPayload(policy),
        evaluationHash: hashBusinessPayload(evaluation),
        amountAtRisk: "1",
        currency: "XAF",
        policyId: policy.policyId,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.evaluationOutcome).toBe("not_triggered");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["triggered_shortage_evidence"]),
    );
  });

  it("blocks when the POSSession source identity does not match the incident source", () => {
    const event = makeEvent();
    const policy = makePolicy();

    const result = recheckPosCashShortageResolutionSource({
      event,
      approvedPolicy: policy,
      expected: {
        ...expectedFrom(event, policy),
        sourceId: "other-session",
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["pos_session_source_identity"]),
    );
  });

  it("satisfies the Slice 36 readiness preflight source-owned recheck contract", () => {
    const lifecycleSource = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-incident-lifecycle-policy.ts",
      ),
      "utf8",
    );
    const sourceRecheckSource = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-resolution-source-recheck.ts",
      ),
      "utf8",
    );

    const result = evaluatePosCashShortageResolutionReadinessPreflight({
      posLifecyclePolicySourceText: lifecycleSource,
      sourceRecheckContractSourceText: sourceRecheckSource,
    });

    expect(result).toEqual({
      version: 1,
      status: "certified",
      resolutionReadinessCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("does not add terminal commands, data writes, schedulers, routes, or actions", () => {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "services/leakage/pos-cash-shortage-resolution-source-recheck.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction/i);
    expect(source).not.toMatch(/loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage/i);
    expect(source).not.toMatch(/db\.|prisma\./i);
  });
});
