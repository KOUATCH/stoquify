jest.mock("server-only", () => ({}));

import fs from "node:fs";
import path from "node:path";

import {
  INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS,
  type WorkflowAssuranceCheckDefinitionContract,
  type WorkflowAssuranceDefinitionExecutionInput,
  type WorkflowAssuranceRunInput,
} from "@/services/assurance/assurance-registry-contracts";

import {
  buildPosShiftCashShortageDormantRunnerInputFromWorkflowRun,
  runDormantPosShiftCashShortageAssuranceCheck,
} from "../pos-shift-cash-shortage-dormant-runner";
import type { PosShiftCashShortageBatchResult } from "../pos-shift-cash-shortage-batch.service";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();
const WINDOW_START = "2026-07-27T00:00:00.000Z";
const WINDOW_END = "2026-07-28T00:00:00.000Z";

describe("runDormantPosShiftCashShortageAssuranceCheck", () => {
  it("builds dormant runner input from an explicit Workflow Assurance recorded window", () => {
    const input = buildPosShiftCashShortageDormantRunnerInputFromWorkflowRun(
      cashShortageDefinition(),
      runInput({
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
        cursor: {
          recordedAt: "2026-07-27T08:00:00.000Z",
          eventId: "event-0",
        },
        limit: 25,
      }),
    );

    expect(input).toMatchObject({
      definition: expect.objectContaining({
        checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      }),
      runInput: expect.objectContaining({
        organizationId: "org-1",
      }),
      recordedFromInclusive: WINDOW_START,
      recordedThroughExclusive: WINDOW_END,
      cursor: {
        recordedAt: new Date("2026-07-27T08:00:00.000Z"),
        eventId: "event-0",
      },
      limit: 25,
    });
  });

  it("rejects registry run input without an explicit recorded-time window", () => {
    expect(() =>
      buildPosShiftCashShortageDormantRunnerInputFromWorkflowRun(
        cashShortageDefinition(),
        runInput(),
      ),
    ).toThrow("requires an explicit recorded-time window");
  });
  it("composes runner input, batch loading, and assurance output without registry activation", async () => {
    const loadBatch = jest.fn().mockResolvedValue(batchResult());
    const createOutput = jest.fn().mockReturnValue(output());

    const result = await runDormantPosShiftCashShortageAssuranceCheck(
      {
        definition: cashShortageDefinition(),
        runInput: runInput(),
        recordedFromInclusive: WINDOW_START,
        recordedThroughExclusive: WINDOW_END,
        cursor: {
          recordedAt: "2026-07-27T08:00:00.000Z",
          eventId: "event-0",
        },
        limit: 25,
      },
      { loadBatch, createOutput },
    );

    expect(loadBatch).toHaveBeenCalledWith({
      organizationId: "org-1",
      recordedFromInclusive: new Date(WINDOW_START),
      recordedThroughExclusive: new Date(WINDOW_END),
      cursor: {
        recordedAt: new Date("2026-07-27T08:00:00.000Z"),
        eventId: "event-0",
      },
      limit: 25,
    });
    expect(createOutput).toHaveBeenCalledWith(batchResult());
    expect(result).toMatchObject({
      activationState: "dormant_unregistered",
      output: output(),
    });
  });

  it("rejects active definitions and missing POS read permission through the certified input gate", async () => {
    await expect(
      runDormantPosShiftCashShortageAssuranceCheck(
        {
          definition: cashShortageDefinition({ enabled: true }),
          runInput: runInput(),
          recordedFromInclusive: WINDOW_START,
          recordedThroughExclusive: WINDOW_END,
        },
        { loadBatch: jest.fn(), createOutput: jest.fn() },
      ),
    ).rejects.toThrow("must remain disabled");

    await expect(
      runDormantPosShiftCashShortageAssuranceCheck(
        {
          definition: cashShortageDefinition(),
          runInput: runInput({ actorPermissions: ["dashboard.read"] }),
          recordedFromInclusive: WINDOW_START,
          recordedThroughExclusive: WINDOW_END,
        },
        { loadBatch: jest.fn(), createOutput: jest.fn() },
      ),
    ).rejects.toThrow("certified POS read permission");
  });

  it("rejects dependency results outside the requested tenant or window", async () => {
    await expect(
      runDormantPosShiftCashShortageAssuranceCheck(
        {
          definition: cashShortageDefinition(),
          runInput: runInput(),
          recordedFromInclusive: WINDOW_START,
          recordedThroughExclusive: WINDOW_END,
        },
        {
          loadBatch: jest
            .fn()
            .mockResolvedValue(batchResult({ organizationId: "other-org" })),
          createOutput: jest.fn(),
        },
      ),
    ).rejects.toThrow("outside the requested assurance window");
  });

  it("is registered only through the disabled registry wrapper without persistence, workers, schedulers, routes, or actions", () => {
    const runnerSource = fs.readFileSync(
      path.join(ROOT, "services/leakage/pos-shift-cash-shortage-dormant-runner.ts"),
      "utf8",
    );
    const registryService = fs.readFileSync(
      path.join(ROOT, "services/assurance/assurance-registry.service.ts"),
      "utf8",
    );

    expect(registryService).toContain(POS_SHIFT_CASH_SHORTAGE_CHECK_KEY);
    expect(registryService).toContain("runDormantPosShiftCashShortageReviewCheck");
    expect(registryService).toContain("enabled: true");
    expect(registryService).not.toContain("loadPosShiftCashShortageEvaluationBatch");
    expect(registryService).not.toContain("buildPosShiftCashShortageBatchInputForAssuranceRun");
    expect(runnerSource).not.toMatch(
      /CHECK_RUNNERS|runWorkflowAssuranceRegistry|persistWorkflowAssurance|workflowAssuranceIncident|createSafeAction|router|schedule/i,
    );
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

function runInput(
  overrides: Partial<WorkflowAssuranceRunInput> = {},
): WorkflowAssuranceRunInput {
  return {
    organizationId: "org-1",
    actorId: "manager-1",
    actorPermissions: ["pos.transactions.read"],
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    ...overrides,
  };
}

function batchResult(
  overrides: Partial<PosShiftCashShortageBatchResult> = {},
): PosShiftCashShortageBatchResult {
  return {
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
    ...overrides,
  };
}

function output(): WorkflowAssuranceDefinitionExecutionInput {
  return {
    aggregate: {
      status: "passed",
      severity: "info",
      message: "No POS cash shortages require review.",
      counts: { scanned: 0, passed: 0 },
      evidenceLinks: [],
      metadata: { dormantRegistryIntegration: true },
    },
    findings: [],
  };
}

