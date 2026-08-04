import type { PosCashShortageProductionActivationEvidence } from "./pos-cash-shortage-production-activation-preflight";
import type { WorkflowAssuranceCheckDefinitionContract } from "@/services/assurance/assurance-registry-contracts";
import type {
  WorkflowAssuranceSchedulerModePolicy,
  WorkflowAssuranceSchedulerPlan,
} from "@/services/assurance/assurance-scheduler-contracts";

import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
} from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_SCHEDULER_POLICY_PREFLIGHT_VERSION = 1;

export type PosCashShortageSchedulerPolicyPreflightBlocker =
  | "definition_identity_mismatch"
  | "scheduler_plan_missing_check"
  | "scheduler_plan_not_release_ready"
  | "must_use_scheduled_scan_mode"
  | "must_use_scheduled_run_type"
  | "must_not_allow_hot_path"
  | "must_be_tenant_scoped"
  | "must_require_source_hash"
  | "must_cursor_by_organization_and_source"
  | "definition_must_remain_activation_held";

export type PosCashShortageSchedulerPolicyPreflightInput = {
  definition: WorkflowAssuranceCheckDefinitionContract;
  schedulerPlan: WorkflowAssuranceSchedulerPlan;
  scheduledScanPolicy: WorkflowAssuranceSchedulerModePolicy;
};

export type PosCashShortageSchedulerPolicyPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_SCHEDULER_POLICY_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  status: "certified" | "blocked";
  schedulerPolicyCertified: boolean;
  activationAuthorized: false;
  plannedCadence: string | null;
  blockers: PosCashShortageSchedulerPolicyPreflightBlocker[];
};

export type PosCashShortageSchedulerPolicyActivationEvidence = Pick<
  PosCashShortageProductionActivationEvidence,
  "schedulerPolicyCertified"
> & {
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"scheduler_policy_preflight">;
};

export function evaluatePosCashShortageSchedulerPolicyPreflight(
  input: PosCashShortageSchedulerPolicyPreflightInput,
): PosCashShortageSchedulerPolicyPreflightResult {
  const blockers: PosCashShortageSchedulerPolicyPreflightBlocker[] = [];
  const planCheck = input.schedulerPlan.checks.find(
    (check) => check.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  );
  const policy = input.scheduledScanPolicy;

  if (!definitionIdentityMatches(input.definition)) {
    blockers.push("definition_identity_mismatch");
  }
  if (!planCheck) {
    blockers.push("scheduler_plan_missing_check");
  } else {
    if (!planCheck.releaseReady) blockers.push("scheduler_plan_not_release_ready");
    if (planCheck.executionMode !== "scheduled_scan") blockers.push("must_use_scheduled_scan_mode");
    if (planCheck.runType !== "scheduled") blockers.push("must_use_scheduled_run_type");
    if (!hasEveryCursorField(planCheck.cursorFields, ["organizationId", "sourceType", "sourceId", "sourceHash"])) {
      blockers.push("must_cursor_by_organization_and_source");
    }
  }

  if (policy.executionMode !== "scheduled_scan") blockers.push("must_use_scheduled_scan_mode");
  if (policy.runType !== "scheduled") blockers.push("must_use_scheduled_run_type");
  if (policy.hotPathAllowed) blockers.push("must_not_allow_hot_path");
  if (!policy.cursorStrategy.tenantScoped) blockers.push("must_be_tenant_scoped");
  if (!policy.cursorStrategy.sourceHashRequired) blockers.push("must_require_source_hash");
  if (!hasEveryCursorField(policy.cursorStrategy.cursorFields, ["organizationId", "sourceType", "sourceId", "sourceHash"])) {
    blockers.push("must_cursor_by_organization_and_source");
  }

  if (input.definition.executionMode !== "scheduled_scan") blockers.push("must_use_scheduled_scan_mode");
  if (input.definition.metadata.productionActivationCertified === true || input.definition.enabled) {
    blockers.push("definition_must_remain_activation_held");
  }

  const uniqueBlockers = [...new Set(blockers)];
  const ready = uniqueBlockers.length === 0;

  return {
    version: POS_CASH_SHORTAGE_SCHEDULER_POLICY_PREFLIGHT_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    status: ready ? "certified" : "blocked",
    schedulerPolicyCertified: ready,
    activationAuthorized: false,
    plannedCadence: planCheck?.cadence ?? null,
    blockers: uniqueBlockers,
  };
}

export function composePosCashShortageSchedulerPolicyActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageSchedulerPolicyPreflightResult,
    "schedulerPolicyCertified" | "activationAuthorized"
  >;
}): PosCashShortageSchedulerPolicyActivationEvidence {
  const preflightCertified =
    input.preflight.schedulerPolicyCertified &&
    input.preflight.activationAuthorized === false;

  return {
    schedulerPolicyCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified ? [] : ["scheduler_policy_preflight"],
  };
}
function definitionIdentityMatches(definition: WorkflowAssuranceCheckDefinitionContract) {
  return (
    definition.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY &&
    definition.version === POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION &&
    definition.workflow === "pos" &&
    definition.moduleSlug === "pos" &&
    definition.requiredPermission === "pos.transactions.read" &&
    definition.enforceMode === false
  );
}

function hasEveryCursorField(actual: readonly string[], expected: readonly string[]) {
  return expected.every((field) => actual.includes(field));
}