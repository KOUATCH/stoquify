import { BusinessRuleError } from "@/services/_shared/action-errors";
import type {
  ResolveWorkflowAssuranceIncidentInput,
  WorkflowAssuranceIncidentDto,
} from "@/services/assurance/assurance-incident-contracts";

import {
  assertPosCashShortageIncidentResolutionAllowed,
  type PosCashShortageIncidentResolutionPolicyResult,
} from "./pos-cash-shortage-incident-lifecycle-policy";
import type { PosCashShortageResolutionSourceRecheckResult } from "./pos-cash-shortage-resolution-source-recheck";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_VERSION = 1;

export const POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_REQUIREMENTS = [
  "source_recheck_certified",
  "source_recheck_activation_hold",
  "lifecycle_policy_allows_resolution",
  "command_input_source_hash_bound",
  "command_input_resolution_evidence_hash_bound",
  "terminal_command_not_invoked",
] as const;

export type PosCashShortageResolutionCommandReadinessRequirement =
  (typeof POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_REQUIREMENTS)[number];

export type PosCashShortageResolutionCommandReadinessInput = {
  incident: WorkflowAssuranceIncidentDto;
  actorId: string;
  actorPermissions: readonly string[];
  sourceRecheck: Pick<
    PosCashShortageResolutionSourceRecheckResult,
    | "resolutionSourceRecheckCertified"
    | "activationAuthorized"
    | "currentSourceHash"
    | "approvedPolicyHash"
    | "evaluationHash"
    | "evaluationOutcome"
    | "missingRequirements"
  >;
  resolutionNote: string;
  resolutionEvidenceHash: string;
};

export type PosCashShortageResolutionCommandReadinessResult = {
  version: typeof POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  status: "certified" | "blocked";
  resolutionCommandReadinessCertified: boolean;
  activationAuthorized: false;
  commandInput: ResolveWorkflowAssuranceIncidentInput | null;
  sourceRecheckEvidence: {
    currentSourceHash: string;
    approvedPolicyHash: string;
    evaluationHash: string;
    evaluationOutcome: string;
  };
  policy: PosCashShortageIncidentResolutionPolicyResult["policy"] | null;
  policyBlocker: string | null;
  satisfiedRequirements: PosCashShortageResolutionCommandReadinessRequirement[];
  missingRequirements: PosCashShortageResolutionCommandReadinessRequirement[];
};

export function preparePosCashShortageResolutionCommandReadiness(
  input: PosCashShortageResolutionCommandReadinessInput,
): PosCashShortageResolutionCommandReadinessResult {
  const policyDecision = evaluateLifecyclePolicy(input);
  const commandInput = policyDecision.ok ? policyDecision.value.commandInput : null;
  const context = {
    input,
    commandInput,
    policyDecision,
  };
  const satisfiedRequirements: PosCashShortageResolutionCommandReadinessRequirement[] = [];
  const missingRequirements: PosCashShortageResolutionCommandReadinessRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, context)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_RESOLUTION_COMMAND_READINESS_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    status: certified ? "certified" : "blocked",
    resolutionCommandReadinessCertified: certified,
    activationAuthorized: false,
    commandInput: certified ? commandInput : null,
    sourceRecheckEvidence: {
      currentSourceHash: input.sourceRecheck.currentSourceHash,
      approvedPolicyHash: input.sourceRecheck.approvedPolicyHash,
      evaluationHash: input.sourceRecheck.evaluationHash,
      evaluationOutcome: input.sourceRecheck.evaluationOutcome,
    },
    policy: policyDecision.ok ? policyDecision.value.policy : null,
    policyBlocker: policyDecision.ok ? null : policyDecision.message,
    satisfiedRequirements,
    missingRequirements,
  };
}

function evaluateLifecyclePolicy(input: PosCashShortageResolutionCommandReadinessInput):
  | { ok: true; value: PosCashShortageIncidentResolutionPolicyResult }
  | { ok: false; message: string } {
  if (
    !input.sourceRecheck.resolutionSourceRecheckCertified ||
    input.sourceRecheck.activationAuthorized !== false
  ) {
    return {
      ok: false,
      message: "Certified source-owned recheck evidence is required.",
    };
  }

  try {
    return {
      ok: true,
      value: assertPosCashShortageIncidentResolutionAllowed({
        incident: input.incident,
        actorId: input.actorId,
        actorPermissions: input.actorPermissions,
        currentSourceHash: input.sourceRecheck.currentSourceHash,
        resolutionNote: input.resolutionNote,
        resolutionEvidenceHash: input.resolutionEvidenceHash,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof BusinessRuleError || error instanceof Error
          ? error.message
          : "POS cash-shortage resolution policy rejected command readiness.",
    };
  }
}

function isRequirementSatisfied(
  requirement: PosCashShortageResolutionCommandReadinessRequirement,
  context: {
    input: PosCashShortageResolutionCommandReadinessInput;
    commandInput: ResolveWorkflowAssuranceIncidentInput | null;
    policyDecision:
      | { ok: true; value: PosCashShortageIncidentResolutionPolicyResult }
      | { ok: false; message: string };
  },
) {
  const { input, commandInput, policyDecision } = context;

  switch (requirement) {
    case "source_recheck_certified":
      return input.sourceRecheck.resolutionSourceRecheckCertified;
    case "source_recheck_activation_hold":
      return input.sourceRecheck.activationAuthorized === false;
    case "lifecycle_policy_allows_resolution":
      return policyDecision.ok;
    case "command_input_source_hash_bound":
      return (
        commandInput?.currentSourceHash === input.sourceRecheck.currentSourceHash &&
        commandInput.metadata?.reviewedSourceType === "POSSession" &&
        commandInput.metadata.reviewedSourceId === input.incident.sourceId
      );
    case "command_input_resolution_evidence_hash_bound":
      return (
        commandInput?.metadata?.resolutionEvidenceHash ===
        input.resolutionEvidenceHash.trim()
      );
    case "terminal_command_not_invoked":
      return true;
  }
}
