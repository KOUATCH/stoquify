import { hashBusinessPayload } from "@/services/events/business-event.service";

import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  type CashShortageEvaluation,
  type CashShortagePolicyV1,
  type PosShiftClosedEventV1,
} from "./pos-shift-cash-shortage-contracts";
import { evaluatePosShiftCashShortage } from "./pos-shift-cash-shortage-evaluator";

export const POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_VERSION = 1;

export const POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_REQUIREMENTS = [
  "pos_session_source_identity",
  "current_source_hash_matches",
  "approved_policy_hash_matches",
  "source_evaluation_recomputed",
  "triggered_shortage_evidence",
  "evaluation_hash_matches",
  "resolution_metadata_matches",
  "terminal_command_not_authorized",
] as const;

export type PosCashShortageResolutionSourceRecheckRequirement =
  (typeof POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_REQUIREMENTS)[number];

export type PosCashShortageResolutionSourceRecheckInput = {
  event: PosShiftClosedEventV1;
  approvedPolicy: CashShortagePolicyV1;
  expected: {
    organizationId: string;
    sourceType: "POSSession";
    sourceId: string;
    currentSourceHash: string;
    approvedPolicyHash: string;
    evaluationHash: string;
    amountAtRisk: string;
    currency: string;
    policyId: string;
  };
};

export type PosCashShortageResolutionSourceRecheckResult = {
  version: typeof POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  status: "certified" | "blocked";
  resolutionSourceRecheckCertified: boolean;
  activationAuthorized: false;
  currentSourceHash: string;
  approvedPolicyHash: string;
  evaluationHash: string;
  evaluationOutcome: CashShortageEvaluation["outcome"];
  satisfiedRequirements: PosCashShortageResolutionSourceRecheckRequirement[];
  missingRequirements: PosCashShortageResolutionSourceRecheckRequirement[];
};

export function recheckPosCashShortageResolutionSource(
  input: PosCashShortageResolutionSourceRecheckInput,
): PosCashShortageResolutionSourceRecheckResult {
  const evaluation = evaluatePosShiftCashShortage({
    event: input.event,
    policy: input.approvedPolicy,
  });
  const currentSourceHash = input.event.payloadHash;
  const approvedPolicyHash = hashBusinessPayload(input.approvedPolicy);
  const evaluationHash = hashBusinessPayload(evaluation);
  const satisfiedRequirements: PosCashShortageResolutionSourceRecheckRequirement[] = [];
  const missingRequirements: PosCashShortageResolutionSourceRecheckRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_REQUIREMENTS) {
    if (
      isRequirementSatisfied(requirement, {
        input,
        evaluation,
        currentSourceHash,
        approvedPolicyHash,
        evaluationHash,
      })
    ) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_RESOLUTION_SOURCE_RECHECK_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    status: certified ? "certified" : "blocked",
    resolutionSourceRecheckCertified: certified,
    activationAuthorized: false,
    currentSourceHash,
    approvedPolicyHash,
    evaluationHash,
    evaluationOutcome: evaluation.outcome,
    satisfiedRequirements,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageResolutionSourceRecheckRequirement,
  context: {
    input: PosCashShortageResolutionSourceRecheckInput;
    evaluation: CashShortageEvaluation;
    currentSourceHash: string;
    approvedPolicyHash: string;
    evaluationHash: string;
  },
) {
  const { input, evaluation, currentSourceHash, approvedPolicyHash, evaluationHash } =
    context;
  const evidence = evaluation.outcome === "triggered" ? evaluation.evidence : null;

  switch (requirement) {
    case "pos_session_source_identity":
      return (
        evidence?.organizationId === input.expected.organizationId &&
        evidence.sourceType === "POSSession" &&
        input.expected.sourceType === "POSSession" &&
        evidence.sourceId === input.expected.sourceId
      );
    case "current_source_hash_matches":
      return (
        currentSourceHash === input.expected.currentSourceHash &&
        evidence?.sourceHash === input.expected.currentSourceHash
      );
    case "approved_policy_hash_matches":
      return (
        approvedPolicyHash === input.expected.approvedPolicyHash &&
        evidence?.policy.policyHash === input.expected.approvedPolicyHash
      );
    case "source_evaluation_recomputed":
      return evaluation.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
    case "triggered_shortage_evidence":
      return evaluation.outcome === "triggered";
    case "evaluation_hash_matches":
      return evaluationHash === input.expected.evaluationHash;
    case "resolution_metadata_matches":
      return (
        evidence?.normalized.amountAtRisk === input.expected.amountAtRisk &&
        evidence.currency === input.expected.currency &&
        evidence.policy.policyId === input.expected.policyId
      );
    case "terminal_command_not_authorized":
      return true;
  }
}
