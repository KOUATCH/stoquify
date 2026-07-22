import { readFileSync } from "fs";
import { join } from "path";

import { Prisma } from "@prisma/client";

import { hashBusinessPayload } from "@/services/events/business-event.service";

import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  type CashShortagePolicyV1,
  type PosShiftClosedEventV1,
  type PosShiftClosedPayloadV1,
} from "../pos-shift-cash-shortage-contracts";
import { evaluatePosShiftCashShortage } from "../pos-shift-cash-shortage-evaluator";

const CLOSED_AT = "2026-07-20T10:00:00.000Z";

type EventFixtureOptions = {
  expectedBalance?: string;
  countedBalance?: string;
  explanation?: string | null;
  currency?: string;
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
    currency: options.currency ?? "XAF",
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

function expectBlocked(
  result: ReturnType<typeof evaluatePosShiftCashShortage>,
  code: string,
) {
  expect(result).toMatchObject({
    outcome: "blocked",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: 1,
    code,
  });
}

describe("evaluatePosShiftCashShortage", () => {
  describe("threshold outcomes", () => {
    it("does not trigger for an exactly balanced shift", () => {
      const result = evaluatePosShiftCashShortage({
        event: makeEvent({
          expectedBalance: "12000.00",
          countedBalance: "12000.00",
          explanation: null,
        }),
        policy: makePolicy(),
      });

      expect(result).toMatchObject({
        outcome: "not_triggered",
        reason: "balanced",
        evidence: { normalized: { amountAtRisk: "0" } },
      });
    });

    it("does not trigger for an overage", () => {
      const result = evaluatePosShiftCashShortage({
        event: makeEvent({
          expectedBalance: "12000.00",
          countedBalance: "13000.00",
        }),
        policy: makePolicy(),
      });

      expect(result).toMatchObject({
        outcome: "not_triggered",
        reason: "overage",
        evidence: { normalized: { amountAtRisk: "0" } },
      });
    });

    it("does not trigger below the review threshold", () => {
      const result = evaluatePosShiftCashShortage({
        event: makeEvent({
          expectedBalance: "12000.00",
          countedBalance: "10001.00",
        }),
        policy: makePolicy(),
      });

      expect(result).toMatchObject({
        outcome: "not_triggered",
        reason: "below_review_threshold",
        evidence: {
          normalized: { signedVariance: "-1999", amountAtRisk: "1999" },
        },
      });
    });

    it.each([
      ["exact review threshold", "10000.00", "warning", "2000"],
      ["one minor unit above review", "9999.00", "warning", "2001"],
      ["exact high threshold", "2000.00", "high", "10000"],
    ])("triggers at %s", (_label, countedBalance, severity, amountAtRisk) => {
      const result = evaluatePosShiftCashShortage({
        event: makeEvent({ countedBalance }),
        policy: makePolicy(),
      });

      expect(result).toMatchObject({
        outcome: "triggered",
        severity,
        title: "Cash shortage requiring review",
        evidence: { normalized: { amountAtRisk } },
      });
    });

    it.each(["XAF", "XOF"])(
      "uses an explicit %s policy without a currency default",
      (currency) => {
        const policy = makePolicy({
          policyId: `cash-shortage-policy-${currency.toLowerCase()}`,
          currency,
        });
        const result = evaluatePosShiftCashShortage({
          event: makeEvent({ currency }),
          policy,
        });

        expect(result).toMatchObject({
          outcome: "triggered",
          severity: "warning",
          evidence: {
            currency,
            policy: { policyId: policy.policyId, currency },
          },
        });
      },
    );

    it("applies explicit Decimal rounding before calculating normalized variance", () => {
      const event = makeEvent({
        expectedBalance: "10.50",
        countedBalance: "9.50",
      });
      const halfUp = evaluatePosShiftCashShortage({
        event,
        policy: makePolicy({
          reviewThreshold: "1",
          highThreshold: "5",
          roundingMode: "HALF_UP",
        }),
      });
      const halfEven = evaluatePosShiftCashShortage({
        event,
        policy: makePolicy({
          reviewThreshold: "1",
          highThreshold: "5",
          roundingMode: "HALF_EVEN",
        }),
      });

      expect(halfUp).toMatchObject({
        outcome: "triggered",
        severity: "warning",
        evidence: {
          normalized: {
            expectedBalance: "11",
            countedBalance: "10",
            signedVariance: "-1",
            amountAtRisk: "1",
          },
        },
      });
      expect(halfEven).toMatchObject({
        outcome: "not_triggered",
        reason: "below_review_threshold",
        evidence: {
          normalized: {
            expectedBalance: "10",
            countedBalance: "10",
            signedVariance: "0",
            amountAtRisk: "0",
          },
        },
      });
    });
  });

  describe("source trust gates", () => {
    it("blocks a source with a missing required field", () => {
      const event = makeEvent();
      const { cashDrawerId, ...incompletePayload } = event.payload;

      expect(cashDrawerId).toBe("drawer-1");
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: { ...event, payload: incompletePayload },
          policy: makePolicy(),
        }),
        "SOURCE_SCHEMA_INVALID",
      );
    });

    it("blocks an ineligible event status", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: { ...makeEvent(), status: "REJECTED" },
          policy: makePolicy(),
        }),
        "SOURCE_EVENT_STATUS_INVALID",
      );
    });

    it("accepts an applied source event", () => {
      const result = evaluatePosShiftCashShortage({
        event: { ...makeEvent(), status: "APPLIED" },
        policy: makePolicy(),
      });

      expect(result).toMatchObject({
        outcome: "triggered",
        severity: "warning",
      });
    });

    it("blocks an explanation beyond the POS producer limit", () => {
      const event = makeEvent();
      const changed = withValidHashes({
        ...event,
        payload: { ...event.payload, explanation: "x".repeat(501) },
      });

      expectBlocked(
        evaluatePosShiftCashShortage({ event: changed, policy: makePolicy() }),
        "SOURCE_SCHEMA_INVALID",
      );
    });

    it.each([
      [
        "payload hash drift",
        (event: PosShiftClosedEventV1) => ({
          ...event,
          payload: {
            ...event.payload,
            totals: { ...event.payload.totals, cash: "6999.00" },
          },
        }),
      ],
      [
        "document hash drift",
        (event: PosShiftClosedEventV1) => ({
          ...event,
          documentHash: "0".repeat(64),
        }),
      ],
    ])("blocks %s", (_label, mutate) => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: mutate(makeEvent()),
          policy: makePolicy(),
        }),
        "SOURCE_HASH_MISMATCH",
      );
    });

    it.each([
      [
        "organization",
        (event: PosShiftClosedEventV1) => ({
          ...event,
          organizationId: "org-2",
        }),
      ],
      [
        "actor",
        (event: PosShiftClosedEventV1) => ({ ...event, actorId: "cashier-2" }),
      ],
      [
        "location",
        (event: PosShiftClosedEventV1) => ({
          ...event,
          locationId: "location-2",
        }),
      ],
      [
        "register",
        (event: PosShiftClosedEventV1) => ({
          ...event,
          registerId: "terminal-2",
        }),
      ],
      [
        "source",
        (event: PosShiftClosedEventV1) => ({ ...event, sourceId: "session-2" }),
      ],
      [
        "occurrence time",
        (event: PosShiftClosedEventV1) => ({
          ...event,
          occurredAt: "2026-07-20T10:00:01.000Z",
        }),
      ],
    ])("blocks %s identity drift", (_label, mutate) => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: mutate(makeEvent()),
          policy: makePolicy(),
        }),
        "SOURCE_IDENTITY_MISMATCH",
      );
    });

    it("blocks arithmetic drift even when the changed payload is rehashed", () => {
      const event = makeEvent();
      const changed = withValidHashes({
        ...event,
        payload: { ...event.payload, variance: "-1999.99" },
      });

      expectBlocked(
        evaluatePosShiftCashShortage({ event: changed, policy: makePolicy() }),
        "SOURCE_ARITHMETIC_MISMATCH",
      );
    });

    it("blocks direction drift even when the changed payload is rehashed", () => {
      const event = makeEvent();
      const changed = withValidHashes({
        ...event,
        payload: { ...event.payload, varianceDirection: "OVERAGE" },
      });

      expectBlocked(
        evaluatePosShiftCashShortage({ event: changed, policy: makePolicy() }),
        "SOURCE_DIRECTION_MISMATCH",
      );
    });

    it("blocks a nonzero variance without an explanation", () => {
      const event = makeEvent();
      const changed = withValidHashes({
        ...event,
        payload: { ...event.payload, explanation: null },
      });

      expectBlocked(
        evaluatePosShiftCashShortage({ event: changed, policy: makePolicy() }),
        "SOURCE_EXPLANATION_REQUIRED",
      );
    });
  });

  describe("policy trust gates", () => {
    it("blocks a missing policy", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({ event: makeEvent() }),
        "POLICY_MISSING",
      );
    });

    it("blocks a malformed policy", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: makeEvent(),
          policy: { ...makePolicy(), kind: "unsupported" },
        }),
        "POLICY_SCHEMA_INVALID",
      );
    });

    it("blocks an unapproved policy", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: makeEvent(),
          policy: makePolicy({ approvalStatus: "draft" }),
        }),
        "POLICY_NOT_APPROVED",
      );
    });

    it.each([
      ["missing approver", { approvedById: null }],
      ["missing approval time", { approvedAt: null }],
      ["approval after close", { approvedAt: "2026-07-20T10:00:01.000Z" }],
    ] satisfies Array<[string, Partial<CashShortagePolicyV1>]>)(
      "blocks %s policy approval evidence",
      (_label, overrides) => {
        expectBlocked(
          evaluatePosShiftCashShortage({
            event: makeEvent(),
            policy: makePolicy(overrides),
          }),
          "POLICY_APPROVAL_EVIDENCE_MISSING",
        );
      },
    );

    it("blocks enforce mode", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: makeEvent(),
          policy: makePolicy({ mode: "enforce" }),
        }),
        "POLICY_MODE_UNSUPPORTED",
      );
    });

    it("blocks a currency mismatch", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: makeEvent(),
          policy: makePolicy({ currency: "XOF" }),
        }),
        "POLICY_CURRENCY_MISMATCH",
      );
    });

    it("blocks a policy that is not yet effective", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: makeEvent(),
          policy: makePolicy({ effectiveFrom: "2026-07-20T10:00:01.000Z" }),
        }),
        "POLICY_NOT_EFFECTIVE",
      );
    });

    it("treats the effective end as exclusive", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: makeEvent(),
          policy: makePolicy({ effectiveTo: CLOSED_AT }),
        }),
        "POLICY_EXPIRED",
      );
    });

    it("blocks an invalid effective range", () => {
      expectBlocked(
        evaluatePosShiftCashShortage({
          event: makeEvent(),
          policy: makePolicy({
            effectiveFrom: "2026-01-02T00:00:00.000Z",
            effectiveTo: "2026-01-01T00:00:00.000Z",
          }),
        }),
        "POLICY_SCHEMA_INVALID",
      );
    });

    it.each([
      ["zero review threshold", { reviewThreshold: "0" }],
      ["review threshold rounded to zero", { reviewThreshold: "0.4" }],
      [
        "high threshold below review",
        { reviewThreshold: "2000", highThreshold: "1999" },
      ],
    ] satisfies Array<[string, Partial<CashShortagePolicyV1>]>)(
      "blocks %s",
      (_label, overrides) => {
        expectBlocked(
          evaluatePosShiftCashShortage({
            event: makeEvent(),
            policy: makePolicy(overrides),
          }),
          "POLICY_THRESHOLD_INVALID",
        );
      },
    );
  });

  it("pins source and approved policy identity in deterministic triggered evidence", () => {
    const event = makeEvent();
    const policy = makePolicy();
    const first = evaluatePosShiftCashShortage({ event, policy });
    const second = evaluatePosShiftCashShortage({ event, policy });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      outcome: "triggered",
      evidence: {
        kind: "cash_shortage/v1",
        eventId: event.id,
        organizationId: event.organizationId,
        sourceType: "POSSession",
        sourceId: event.sourceId,
        sourceHash: event.payloadHash,
        closerId: event.actorId,
        cashierId: event.payload.actorId,
        policy: {
          policyId: policy.policyId,
          version: policy.version,
          policyHash: hashBusinessPayload(policy),
          mode: "observe",
        },
      },
    });
  });

  it("uses review wording without an accusation", () => {
    const result = evaluatePosShiftCashShortage({
      event: makeEvent(),
      policy: makePolicy(),
    });

    expect(result.outcome).toBe("triggered");
    expect(JSON.stringify(result)).not.toMatch(/\b(?:fraud|theft)\b/i);
  });

  it("keeps money evaluation on Decimal operations", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "services",
        "leakage",
        "pos-shift-cash-shortage-evaluator.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/\b(?:Number|parseFloat|parseInt)\s*\(/);
  });
});
