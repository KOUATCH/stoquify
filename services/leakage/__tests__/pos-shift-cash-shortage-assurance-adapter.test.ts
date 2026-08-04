jest.mock("server-only", () => ({}));

import fs from "node:fs";
import path from "node:path";

import {
  INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS,
  normalizeWorkflowAssuranceRunnerOutput,
} from "@/services/assurance/assurance-registry-contracts";
import {
  assertWorkflowAssuranceExecutionReconciled,
} from "@/services/assurance/assurance-registry-persistence-contracts";

import { createPosShiftCashShortageAssuranceOutput } from "../pos-shift-cash-shortage-assurance-adapter";
import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
  type CashShortageBlockedEvaluation,
  type CashShortageEvidenceV1,
  type CashShortageEvaluation,
  type CashShortageTriggeredEvaluation,
} from "../pos-shift-cash-shortage-contracts";
import type {
  PosShiftCashShortageBatchItem,
  PosShiftCashShortageBatchResult,
} from "../pos-shift-cash-shortage-batch.service";

const ROOT = process.cwd();

describe("POS shift cash-shortage assurance adapter", () => {
  it("maps non-triggered evaluations to passed source findings", () => {
    const output = createPosShiftCashShortageAssuranceOutput(
      batch([
        item({
          eventId: "event-1",
          sourceId: "session-1",
          evaluation: {
            outcome: "not_triggered",
            checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
            definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
            reason: "balanced",
            message: "Cash drawer balanced.",
            evidence: evidence({ eventId: "event-1", sourceId: "session-1" }),
          },
        }),
      ]),
    );

    const execution = normalized(output);

    expect(assertWorkflowAssuranceExecutionReconciled(execution)).toMatchObject({
      aggregate: {
        status: "passed",
        severity: "info",
        counts: { scanned: 1, passed: 1 },
      },
      findings: [
        {
          ordinal: 0,
          status: "passed",
          severity: "info",
          sourceType: "POSSession",
          sourceId: "session-1",
        },
      ],
    });
  });

  it("maps warning and high shortages to reconciled warning and failed findings", () => {
    const output = createPosShiftCashShortageAssuranceOutput(
      batch([
        item({
          eventId: "event-1",
          sourceId: "session-1",
          evaluation: triggered({
            eventId: "event-1",
            sourceId: "session-1",
            severity: "warning",
          }),
        }),
        item({
          eventId: "event-2",
          sourceId: "session-2",
          evaluation: triggered({
            eventId: "event-2",
            sourceId: "session-2",
            severity: "high",
          }),
        }),
      ]),
    );

    const execution = normalized(output);

    expect(assertWorkflowAssuranceExecutionReconciled(execution)).toMatchObject({
      aggregate: {
        status: "failed",
        severity: "high",
        counts: { scanned: 2, warning: 1, failed: 1 },
      },
      findings: [
        {
          ordinal: 0,
          status: "warning",
          severity: "warning",
          metadata: expect.objectContaining({
            cashierId: "cashier-1",
            closerId: "closer-1",
          }),
        },
        {
          ordinal: 1,
          status: "failed",
          severity: "high",
          metadata: expect.objectContaining({
            cashierId: "cashier-1",
            closerId: "closer-1",
          }),
        },
      ],
    });
    expect(execution.findings[0].recommendedAction).toMatch(/Review cash shortage/i);
    expect(execution.findings[1].recommendedAction).toMatch(/Review cash shortage/i);
  });

  it("maps blocked evaluations without pretending there is trusted POS session evidence", () => {
    const evaluation: CashShortageBlockedEvaluation = {
      outcome: "blocked",
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
      code: "POLICY_MISSING",
      message: "No approved observe-mode cash-shortage policy was available.",
    };

    const output = createPosShiftCashShortageAssuranceOutput(
      batch([
        item({
          eventId: "event-blocked",
          sourceId: null,
          evaluation,
        }),
      ]),
    );

    const execution = normalized(output);

    expect(assertWorkflowAssuranceExecutionReconciled(execution)).toMatchObject({
      aggregate: {
        status: "blocked",
        severity: "blocking",
        counts: { scanned: 1, blocked: 1 },
      },
      findings: [
        {
          ordinal: 0,
          status: "blocked",
          severity: "blocking",
          sourceType: "BusinessEvent",
          sourceId: "event-blocked",
          metadata: {
            blockCode: "POLICY_MISSING",
          },
        },
      ],
    });
  });

  it("produces deterministic source hashes for identical batch evidence", () => {
    const source = batch([
      item({
        eventId: "event-1",
        sourceId: "session-1",
        evaluation: triggered({
          eventId: "event-1",
          sourceId: "session-1",
          severity: "high",
        }),
      }),
    ]);

    const first = normalized(createPosShiftCashShortageAssuranceOutput(source));
    const second = normalized(createPosShiftCashShortageAssuranceOutput(source));

    expect(first.aggregate.sourceHash).toBe(second.aggregate.sourceHash);
    expect(first.findings[0].sourceHash).toBe(second.findings[0].sourceHash);
  });

  it("keeps the POS cash-shortage check disabled behind the dormant registry wrapper", () => {
    const registryService = fs.readFileSync(
      path.join(ROOT, "services/assurance/assurance-registry.service.ts"),
      "utf8",
    );
    const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
      (candidate) => candidate.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    );

    expect(definition).toEqual(
      expect.objectContaining({
        enabled: false,
        enforceMode: false,
        metadata: expect.objectContaining({ stagedDefinitionOnly: true }),
      }),
    );
    expect(registryService).toContain(POS_SHIFT_CASH_SHORTAGE_CHECK_KEY);
    expect(registryService).toContain("runDormantPosShiftCashShortageReviewCheck");
    expect(registryService).toContain("enabled: true");
    expect(registryService).not.toContain("pos-shift-cash-shortage-evaluation-batch");
    expect(registryService).not.toContain("buildPosShiftCashShortageBatchInputForAssuranceRun");
  });
});

function normalized(output: ReturnType<typeof createPosShiftCashShortageAssuranceOutput>) {
  return normalizeWorkflowAssuranceRunnerOutput({
    organizationId: "org-1",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    output,
  });
}

function batch(items: PosShiftCashShortageBatchItem[]): PosShiftCashShortageBatchResult {
  return {
    organizationId: "org-1",
    recordedFromInclusive: "2026-07-27T00:00:00.000Z",
    recordedThroughExclusive: "2026-07-28T00:00:00.000Z",
    items,
    counts: {
      scanned: items.length,
      blocked: items.filter((candidate) => candidate.evaluation.outcome === "blocked").length,
      notTriggered: items.filter((candidate) => candidate.evaluation.outcome === "not_triggered").length,
      triggered: items.filter((candidate) => candidate.evaluation.outcome === "triggered").length,
      warning: items.filter((candidate) => candidate.evaluation.outcome === "triggered" && candidate.evaluation.severity === "warning").length,
      high: items.filter((candidate) => candidate.evaluation.outcome === "triggered" && candidate.evaluation.severity === "high").length,
    },
    hasMore: false,
    nextCursor: null,
  };
}

function item(input: {
  eventId: string;
  sourceId: string | null;
  evaluation: CashShortageEvaluation;
}): PosShiftCashShortageBatchItem {
  return {
    eventId: input.eventId,
    sourceId: input.sourceId,
    recordedAt: "2026-07-27T10:00:00.000Z",
    evaluation: input.evaluation,
  };
}

function triggered(input: {
  eventId: string;
  sourceId: string;
  severity: "warning" | "high";
}): CashShortageTriggeredEvaluation {
  return {
    outcome: "triggered",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    severity: input.severity,
    title: "Cash shortage requiring review",
    message: "Cash drawer counted below expected balance.",
    recommendedAction: "Review cash shortage with cashier and manager.",
    evidence: evidence(input),
  };
}

function evidence(input: {
  eventId: string;
  sourceId: string;
}): CashShortageEvidenceV1 {
  return {
    kind: "cash_shortage/v1",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    definitionVersion: POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
    eventId: input.eventId,
    organizationId: "org-1",
    sourceType: "POSSession",
    sourceId: input.sourceId,
    sourceHash: `source-hash-${input.eventId}`,
    locationId: "loc-1",
    terminalId: "terminal-1",
    cashDrawerId: "drawer-1",
    closingTransactionId: "close-1",
    cashierId: "cashier-1",
    closerId: "closer-1",
    authorityMode: "SELF",
    currency: "XAF",
    openedAt: "2026-07-27T08:00:00.000Z",
    closedAt: "2026-07-27T10:00:00.000Z",
    explanation: null,
    original: {
      expectedBalance: "10000",
      countedBalance: "9000",
      signedVariance: "-1000",
    },
    normalized: {
      expectedBalance: "10000",
      countedBalance: "9000",
      signedVariance: "-1000",
      amountAtRisk: "1000",
    },
    policy: {
      policyId: "policy-1",
      version: 1,
      policyHash: "policy-hash-1",
      currency: "XAF",
      mode: "observe",
      reviewThreshold: "500",
      highThreshold: "1000",
      minorUnitScale: 0,
      roundingMode: "HALF_UP",
      effectiveFrom: "2026-07-01T00:00:00.000Z",
      effectiveTo: null,
    },
  };
}
