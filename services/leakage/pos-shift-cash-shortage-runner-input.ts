import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import type {
  WorkflowAssuranceCheckDefinitionContract,
  WorkflowAssuranceRunInput,
} from "@/services/assurance/assurance-registry-contracts";

import {
  loadPosShiftCashShortageBatchInputSchema,
  type ParsedLoadPosShiftCashShortageBatchInput,
  type PosShiftCashShortageBatchCursorInput,
} from "./pos-shift-cash-shortage-batch.schemas";
import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
} from "./pos-shift-cash-shortage-contracts";

type PosShiftCashShortageRunnerInput = {
  definition: WorkflowAssuranceCheckDefinitionContract;
  runInput: WorkflowAssuranceRunInput;
  recordedFromInclusive: string | Date;
  recordedThroughExclusive: string | Date;
  cursor?: PosShiftCashShortageBatchCursorInput | null;
  limit?: number;
};

export function buildPosShiftCashShortageBatchInputForAssuranceRun({
  definition,
  runInput,
  recordedFromInclusive,
  recordedThroughExclusive,
  cursor,
  limit,
}: PosShiftCashShortageRunnerInput): ParsedLoadPosShiftCashShortageBatchInput {
  assertDormantCashShortageDefinition(definition);
  assertExplicitCashShortageRun(runInput, definition);

  return loadPosShiftCashShortageBatchInputSchema.parse({
    organizationId: runInput.organizationId,
    recordedFromInclusive,
    recordedThroughExclusive,
    cursor,
    limit,
  });
}

function assertDormantCashShortageDefinition(
  definition: WorkflowAssuranceCheckDefinitionContract,
) {
  if (definition.checkKey !== POS_SHIFT_CASH_SHORTAGE_CHECK_KEY) {
    throw new BusinessRuleError(
      "POS cash-shortage runner input requires the POS cash-shortage assurance definition.",
    );
  }

  if (definition.version !== POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION) {
    throw new BusinessRuleError(
      "POS cash-shortage runner input requires the certified definition version.",
    );
  }

  if (definition.enabled || definition.enforceMode) {
    throw new BusinessRuleError(
      "POS cash-shortage assurance must remain disabled and observe-only until runner activation is certified.",
    );
  }

  if (
    definition.workflow !== "pos" ||
    definition.moduleSlug !== "pos" ||
    definition.requiredPermission !== "pos.transactions.read"
  ) {
    throw new BusinessRuleError(
      "POS cash-shortage definition metadata does not match the certified POS boundary.",
    );
  }

  const certifiedPrerequisites = definition.metadata.certifiedPrerequisites;
  const hasRunnerRegistrationPrerequisite =
    Array.isArray(certifiedPrerequisites) && certifiedPrerequisites.includes("runner_registration");
  const hasProductionPolicyPrerequisite =
    Array.isArray(certifiedPrerequisites) && certifiedPrerequisites.includes("production_policy_entry");
  if (
    definition.metadata.stagedDefinitionOnly !== true ||
    definition.metadata.adapter !== "pos-shift-cash-shortage-assurance-adapter" ||
    definition.metadata.productionThresholdConfigured !== true ||
    !hasRunnerRegistrationPrerequisite ||
    !hasProductionPolicyPrerequisite
  ) {
    throw new BusinessRuleError(
      "POS cash-shortage runner input requires disabled staged-definition metadata.",
    );
  }
}

function assertExplicitCashShortageRun(
  runInput: WorkflowAssuranceRunInput,
  definition: WorkflowAssuranceCheckDefinitionContract,
) {
  if (runInput.checkKey !== POS_SHIFT_CASH_SHORTAGE_CHECK_KEY) {
    throw new BusinessRuleError(
      "POS cash-shortage runner input requires an explicit check key.",
    );
  }

  if (
    runInput.sourceType ||
    runInput.sourceId ||
    runInput.periodId ||
    runInput.locationId
  ) {
    throw new BusinessRuleError(
      "POS cash-shortage runner input is window/page based and does not accept source, period, or location narrowing yet.",
    );
  }

  if (!hasRbacPermission(runInput.actorPermissions ?? [], definition.requiredPermission)) {
    throw new BusinessRuleError(
      "POS cash-shortage runner input requires the certified POS read permission.",
    );
  }
}
