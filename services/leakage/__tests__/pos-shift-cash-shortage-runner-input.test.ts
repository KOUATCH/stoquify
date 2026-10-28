import fs from "node:fs";
import path from "node:path";

import {
  INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS,
  type WorkflowAssuranceCheckDefinitionContract,
  type WorkflowAssuranceRunInput,
} from "@/services/assurance/assurance-registry-contracts";

import {
  buildPosShiftCashShortageBatchInputForAssuranceRun,
} from "../pos-shift-cash-shortage-runner-input";
import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
} from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();
const WINDOW_START = "2026-07-20T00:00:00.000Z";
const WINDOW_END = "2026-07-21T00:00:00.000Z";

describe("buildPosShiftCashShortageBatchInputForAssuranceRun", () => {
  it("builds the bounded POS cash-shortage batch input for an explicit staged run", () => {
    const result = buildPosShiftCashShortageBatchInputForAssuranceRun({
      definition: cashShortageDefinition(),
      runInput: runInput(),
      recordedFromInclusive: WINDOW_START,
      recordedThroughExclusive: WINDOW_END,
      cursor: {
        recordedAt: "2026-07-20T08:00:00.000Z",
        eventId: "event-1",
      },
      limit: 25,
    });

    expect(result).toEqual({
      organizationId: "org-1",
      recordedFromInclusive: new Date(WINDOW_START),
      recordedThroughExclusive: new Date(WINDOW_END),
      cursor: {
        recordedAt: new Date("2026-07-20T08:00:00.000Z"),
        eventId: "event-1",
      },
      limit: 25,
    });
  });

  it("rejects broad registry input without the explicit POS cash-shortage check key", () => {
    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition(),
        runInput: runInput({ checkKey: undefined }),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
      }),
    ).toThrow("requires an explicit check key");
  });

  it("rejects source, period, and location scoped input until POS lifecycle gating exists", () => {
    for (const narrowing of [
      { sourceType: "POSSession", sourceId: "session-1" },
      { periodId: "period-1" },
      { locationId: "location-1" },
    ]) {
      expect(() =>
        buildPosShiftCashShortageBatchInputForAssuranceRun({
          definition: cashShortageDefinition(),
          runInput: runInput(narrowing),
          recordedFromInclusive: WINDOW_START,
          recordedThroughExclusive: WINDOW_END,
        }),
      ).toThrow("window/page based");
    }
  });

  it("rejects active, enforced, or non-staged definitions", () => {
    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition({ enabled: true }),
        runInput: runInput(),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
      }),
    ).toThrow("must remain disabled");

    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition({ enforceMode: true }),
        runInput: runInput(),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
      }),
    ).toThrow("must remain disabled");

    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition({
          metadata: { stagedDefinitionOnly: false },
        }),
        runInput: runInput(),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
      }),
    ).toThrow("requires disabled staged-definition metadata");

    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition({
          metadata: {
            ...cashShortageDefinition().metadata,
            productionThresholdConfigured: false,
            certifiedPrerequisites: [
              "worker_checkpoint_contract",
              "pos_specific_lifecycle_gating",
              "runner_registration",
            ],
          },
        }),
        runInput: runInput(),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
      }),
    ).toThrow("requires disabled staged-definition metadata");
  });

  it("rejects the wrong check definition and missing POS read permission", () => {
    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: {
          ...cashShortageDefinition(),
          checkKey: "ledger.posted_source_link.required",
        },
        runInput: runInput(),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
      }),
    ).toThrow("requires the POS cash-shortage assurance definition");

    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition(),
        runInput: runInput({ actorPermissions: ["dashboard.read"] }),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
      }),
    ).toThrow("requires the certified POS read permission");
  });

  it("delegates recorded-window, cursor, and limit validation to the batch schema", () => {
    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition(),
        runInput: runInput(),
        recordedFromInclusive: WINDOW_END,
        recordedThroughExclusive: WINDOW_START,
      }),
    ).toThrow("Recorded-through time must be later");

    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition(),
        runInput: runInput(),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
        cursor: {
          recordedAt: "2026-07-22T00:00:00.000Z",
          eventId: "event-1",
        },
      }),
    ).toThrow("Batch cursor must belong");

    expect(() =>
      buildPosShiftCashShortageBatchInputForAssuranceRun({
        definition: cashShortageDefinition(),
        runInput: runInput(),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
        limit: 101,
      }),
    ).toThrow();
  });

  it("keeps direct batch input construction outside the assurance registry runner map", () => {
    const registryService = fs.readFileSync(
      path.join(ROOT, "services/assurance/assurance-registry.service.ts"),
      "utf8",
    );

    expect(registryService).toContain(POS_SHIFT_CASH_SHORTAGE_CHECK_KEY);
    expect(registryService).toContain("runDormantPosShiftCashShortageReviewCheck");
    expect(registryService).toContain("enabled: true");
    expect(registryService).not.toContain("loadPosShiftCashShortageEvaluationBatch");
    expect(registryService).not.toContain("buildPosShiftCashShortageBatchInputForAssuranceRun");
  });
});

function cashShortageDefinition(
  overrides: Partial<WorkflowAssuranceCheckDefinitionContract> = {},
): WorkflowAssuranceCheckDefinitionContract {
  const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
    (candidate) => candidate.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  );
  if (!definition) throw new Error("POS cash-shortage definition missing.");

  return {
    ...definition,
    ...overrides,
    metadata: {
      ...definition.metadata,
      ...(overrides.metadata ?? {}),
    },
  };
}

function runInput(overrides: Partial<WorkflowAssuranceRunInput> = {}): WorkflowAssuranceRunInput {
  return {
    organizationId: "org-1",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    actorId: "user-1",
    actorPermissions: ["pos.transactions.read"],
    runType: "manual",
    ...overrides,
  };
}
