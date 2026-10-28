import { BusinessRuleError } from "@/services/_shared/action-errors";
import type {
  WorkflowAssuranceCheckDefinitionContract,
  WorkflowAssuranceDefinitionExecutionInput,
  WorkflowAssuranceRunInput,
} from "@/services/assurance/assurance-registry-contracts";

import { createPosShiftCashShortageAssuranceOutput } from "./pos-shift-cash-shortage-assurance-adapter";
import {
  loadPosShiftCashShortageEvaluationBatch,
  type PosShiftCashShortageBatchResult,
} from "./pos-shift-cash-shortage-batch.service";
import type {
  ParsedLoadPosShiftCashShortageBatchInput,
  PosShiftCashShortageBatchCursorInput,
} from "./pos-shift-cash-shortage-batch.schemas";
import { buildPosShiftCashShortageBatchInputForAssuranceRun } from "./pos-shift-cash-shortage-runner-input";

export type PosShiftCashShortageDormantRunnerDependencies = {
  loadBatch?: (
    input: ParsedLoadPosShiftCashShortageBatchInput,
  ) => Promise<PosShiftCashShortageBatchResult>;
  createOutput?: (
    batch: PosShiftCashShortageBatchResult,
  ) => WorkflowAssuranceDefinitionExecutionInput;
};

export type PosShiftCashShortageDormantRunnerInput = {
  definition: WorkflowAssuranceCheckDefinitionContract;
  runInput: WorkflowAssuranceRunInput;
  recordedFromInclusive: string | Date;
  recordedThroughExclusive: string | Date;
  cursor?: PosShiftCashShortageBatchCursorInput | null;
  limit?: number;
};

export type PosShiftCashShortageDormantRunnerResult = {
  batchInput: ParsedLoadPosShiftCashShortageBatchInput;
  batchResult: PosShiftCashShortageBatchResult;
  output: WorkflowAssuranceDefinitionExecutionInput;
  activationState: "dormant_unregistered";
};

export function buildPosShiftCashShortageDormantRunnerInputFromWorkflowRun(
  definition: WorkflowAssuranceCheckDefinitionContract,
  runInput: WorkflowAssuranceRunInput,
): PosShiftCashShortageDormantRunnerInput {
  if (!runInput.recordedFromInclusive || !runInput.recordedThroughExclusive) {
    throw new BusinessRuleError(
      "POS cash-shortage runner registration requires an explicit recorded-time window.",
    );
  }

  return {
    definition,
    runInput,
    recordedFromInclusive: runInput.recordedFromInclusive,
    recordedThroughExclusive: runInput.recordedThroughExclusive,
    cursor: parseWorkflowRunCursor(runInput.cursor),
    limit: runInput.limit,
  };
}
export async function runDormantPosShiftCashShortageAssuranceCheck(
  input: PosShiftCashShortageDormantRunnerInput,
  dependencies: PosShiftCashShortageDormantRunnerDependencies = {},
): Promise<PosShiftCashShortageDormantRunnerResult> {
  const batchInput = buildPosShiftCashShortageBatchInputForAssuranceRun(input);
  const loadBatch =
    dependencies.loadBatch ?? loadPosShiftCashShortageEvaluationBatch;
  const createOutput =
    dependencies.createOutput ?? createPosShiftCashShortageAssuranceOutput;
  const batchResult = await loadBatch(batchInput);

  assertBatchMatchesInput(batchInput, batchResult);

  return {
    batchInput,
    batchResult,
    output: createOutput(batchResult),
    activationState: "dormant_unregistered",
  };
}

function parseWorkflowRunCursor(
  cursor: WorkflowAssuranceRunInput["cursor"],
): PosShiftCashShortageBatchCursorInput | null | undefined {
  if (cursor == null) return cursor;
  if (typeof cursor !== "object" || Array.isArray(cursor)) {
    throw new BusinessRuleError(
      "POS cash-shortage runner cursor must be an object with recordedAt and eventId.",
    );
  }

  const candidate = cursor as Record<string, unknown>;
  return {
    recordedAt: new Date(candidate.recordedAt as string | Date),
    eventId: candidate.eventId as string,
  };
}
function assertBatchMatchesInput(
  input: ParsedLoadPosShiftCashShortageBatchInput,
  result: PosShiftCashShortageBatchResult,
) {
  if (
    result.organizationId !== input.organizationId ||
    result.recordedFromInclusive !== input.recordedFromInclusive.toISOString() ||
    result.recordedThroughExclusive !==
      input.recordedThroughExclusive.toISOString()
  ) {
    throw new BusinessRuleError(
      "POS cash-shortage dormant runner received a batch outside the requested assurance window.",
    );
  }
}

