import { hashBusinessPayload } from "@/services/events/business-event.service";

import type { PosCashShortageProductionActivationEvidence } from "./pos-cash-shortage-production-activation-preflight";

import {
  POS_SHIFT_CASH_SHORTAGE_POLICY_KIND,
  type CashShortagePolicyV1,
} from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_REQUIREMENTS = [
  "approved_policy_evidence_present",
  "approved_policy_contract",
  "observe_only_mode",
  "effective_window_covers_check_time",
  "threshold_ordering_valid",
  "policy_hash_matches",
  "approval_event_binding",
  "resolver_verifies_policy_hash",
  "resolver_verifies_approval_event",
  "batch_resolves_policy_before_evaluation",
  "runner_requires_policy_prerequisite",
  "no_default_policy_or_activation_behavior",
] as const;

export type PosCashShortageProductionPolicyReadinessRequirement =
  (typeof POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_REQUIREMENTS)[number];

export type PosCashShortageProductionPolicyReadinessEvidence = {
  policy: CashShortagePolicyV1;
  policyHash: string;
  approvalEvent: {
    eventType: "cash_shortage.policy.approved";
    schemaVersion: 1;
    status: "APPLIED";
    sourceType: "MANUAL";
    sourceId: string;
    actorId: string;
    documentHash: string;
    payloadHash: string;
    payload: {
      evidenceVersion: 1;
      organizationId: string;
      policy: CashShortagePolicyV1;
      policyHash: string;
    };
  };
  effectiveAt: string;
};

export type PosCashShortageProductionPolicyReadinessPreflightInput = {
  evidence: PosCashShortageProductionPolicyReadinessEvidence | null;
  policyServiceSourceText: string;
  batchServiceSourceText: string;
  runnerInputSourceText: string;
};

export type PosCashShortageProductionPolicyReadinessPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  productionPolicyReadinessCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageProductionPolicyReadinessRequirement[];
  missingRequirements: PosCashShortageProductionPolicyReadinessRequirement[];
};

export type PosCashShortageProductionPolicyReadinessActivationEvidence = Pick<
  PosCashShortageProductionActivationEvidence,
  "productionPolicyReadinessCertified"
> & {
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"production_policy_readiness_preflight">;
};

export function evaluatePosCashShortageProductionPolicyReadinessPreflight(
  input: PosCashShortageProductionPolicyReadinessPreflightInput,
): PosCashShortageProductionPolicyReadinessPreflightResult {
  const satisfiedRequirements: PosCashShortageProductionPolicyReadinessRequirement[] =
    [];
  const missingRequirements: PosCashShortageProductionPolicyReadinessRequirement[] =
    [];

  for (const requirement of POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_PREFLIGHT_VERSION,
    status: certified ? "certified" : "blocked",
    productionPolicyReadinessCertified: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export function composePosCashShortageProductionPolicyReadinessActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageProductionPolicyReadinessPreflightResult,
    "productionPolicyReadinessCertified" | "activationAuthorized"
  >;
}): PosCashShortageProductionPolicyReadinessActivationEvidence {
  const preflightCertified =
    input.preflight.productionPolicyReadinessCertified &&
    input.preflight.activationAuthorized === false;

  return {
    productionPolicyReadinessCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified
      ? []
      : ["production_policy_readiness_preflight"],
  };
}

export type PosCashShortageProductionPolicyReadinessStatusLine = {
  label: "pos_cash_shortage_production_policy_readiness";
  status: PosCashShortageProductionPolicyReadinessPreflightResult["status"];
  productionPolicyReadinessCertified: boolean;
  missingRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describePosCashShortageProductionPolicyReadinessStatusLine(
  input: PosCashShortageProductionPolicyReadinessPreflightResult,
): PosCashShortageProductionPolicyReadinessStatusLine {
  const text =
    input.status === "certified"
      ? `POS cash-shortage production policy readiness is certified: ${input.satisfiedRequirements.length} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production policy readiness is blocked: ${input.missingRequirements.length} requirements missing, ${input.satisfiedRequirements.length} requirements satisfied, activation not authorized.`;

  return {
    label: "pos_cash_shortage_production_policy_readiness",
    status: input.status,
    productionPolicyReadinessCertified:
      input.productionPolicyReadinessCertified,
    missingRequirementCount: input.missingRequirements.length,
    satisfiedRequirementCount: input.satisfiedRequirements.length,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionPolicyReadinessReviewPacket = {
  version: typeof POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_PREFLIGHT_VERSION;
  preflight: PosCashShortageProductionPolicyReadinessPreflightResult;
  statusLine: PosCashShortageProductionPolicyReadinessStatusLine;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionPolicyReadinessReviewPacket(
  input: PosCashShortageProductionPolicyReadinessPreflightResult,
): PosCashShortageProductionPolicyReadinessReviewPacket {
  return {
    version: input.version,
    preflight: input,
    statusLine:
      describePosCashShortageProductionPolicyReadinessStatusLine(input),
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionPolicyReadinessReviewPacketFingerprint = {
  algorithm: "hashBusinessPayload";
  value: string;
  activationAuthorized: false;
};

export function fingerprintPosCashShortageProductionPolicyReadinessReviewPacket(
  input: PosCashShortageProductionPolicyReadinessPreflightResult,
): PosCashShortageProductionPolicyReadinessReviewPacketFingerprint {
  return {
    algorithm: "hashBusinessPayload",
    value: hashBusinessPayload(
      buildPosCashShortageProductionPolicyReadinessReviewPacket(input),
    ),
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionPolicyReadinessReviewArtifact = {
  packet: PosCashShortageProductionPolicyReadinessReviewPacket;
  fingerprint: PosCashShortageProductionPolicyReadinessReviewPacketFingerprint;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionPolicyReadinessReviewArtifact(
  input: PosCashShortageProductionPolicyReadinessPreflightResult,
): PosCashShortageProductionPolicyReadinessReviewArtifact {
  return {
    packet: buildPosCashShortageProductionPolicyReadinessReviewPacket(input),
    fingerprint:
      fingerprintPosCashShortageProductionPolicyReadinessReviewPacket(input),
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionPolicyReadinessReviewArtifactDigest = {
  status: PosCashShortageProductionPolicyReadinessPreflightResult["status"];
  productionPolicyReadinessCertified: boolean;
  fingerprint: PosCashShortageProductionPolicyReadinessReviewPacketFingerprint;
  missingRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestPosCashShortageProductionPolicyReadinessReviewArtifact(
  input: PosCashShortageProductionPolicyReadinessPreflightResult,
): PosCashShortageProductionPolicyReadinessReviewArtifactDigest {
  const artifact =
    buildPosCashShortageProductionPolicyReadinessReviewArtifact(input);

  return {
    status: artifact.packet.preflight.status,
    productionPolicyReadinessCertified:
      artifact.packet.preflight.productionPolicyReadinessCertified,
    fingerprint: artifact.fingerprint,
    missingRequirementCount: artifact.packet.statusLine.missingRequirementCount,
    satisfiedRequirementCount:
      artifact.packet.statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionPolicyReadinessReviewArtifactStatusLine = {
  label: "pos_cash_shortage_production_policy_readiness_review";
  status: PosCashShortageProductionPolicyReadinessPreflightResult["status"];
  productionPolicyReadinessCertified: boolean;
  fingerprint: PosCashShortageProductionPolicyReadinessReviewPacketFingerprint;
  missingRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine(
  input: PosCashShortageProductionPolicyReadinessPreflightResult,
): PosCashShortageProductionPolicyReadinessReviewArtifactStatusLine {
  const digest =
    digestPosCashShortageProductionPolicyReadinessReviewArtifact(input);
  const text =
    digest.status === "certified"
      ? `POS cash-shortage production policy readiness review is certified: ${digest.satisfiedRequirementCount} requirements satisfied, fingerprint ${digest.fingerprint.algorithm}:${digest.fingerprint.value}, activation not authorized.`
      : `POS cash-shortage production policy readiness review is blocked: ${digest.missingRequirementCount} requirements missing, ${digest.satisfiedRequirementCount} requirements satisfied, fingerprint ${digest.fingerprint.algorithm}:${digest.fingerprint.value}, activation not authorized.`;

  return {
    label: "pos_cash_shortage_production_policy_readiness_review",
    status: digest.status,
    productionPolicyReadinessCertified:
      digest.productionPolicyReadinessCertified,
    fingerprint: digest.fingerprint,
    missingRequirementCount: digest.missingRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionPolicyReadinessReviewEvidenceRow = {
  rowId: "pos_cash_shortage_production_policy_readiness_review";
  label: "pos_cash_shortage_production_policy_readiness_review";
  status: PosCashShortageProductionPolicyReadinessPreflightResult["status"];
  outcome: "ready" | "blocked";
  productionPolicyReadinessCertified: boolean;
  fingerprintAlgorithm: PosCashShortageProductionPolicyReadinessReviewPacketFingerprint["algorithm"];
  fingerprintValue: string;
  missingRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionPolicyReadinessReviewEvidenceRow(
  input: PosCashShortageProductionPolicyReadinessPreflightResult,
): PosCashShortageProductionPolicyReadinessReviewEvidenceRow {
  const statusLine =
    describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_policy_readiness_review",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.productionPolicyReadinessCertified
      ? "ready"
      : "blocked",
    productionPolicyReadinessCertified:
      statusLine.productionPolicyReadinessCertified,
    fingerprintAlgorithm: statusLine.fingerprint.algorithm,
    fingerprintValue: statusLine.fingerprint.value,
    missingRequirementCount: statusLine.missingRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
function isRequirementSatisfied(
  requirement: PosCashShortageProductionPolicyReadinessRequirement,
  input: PosCashShortageProductionPolicyReadinessPreflightInput,
) {
  const evidence = input.evidence;

  switch (requirement) {
    case "approved_policy_evidence_present":
      return Boolean(
        evidence?.policy && evidence.policyHash && evidence.approvalEvent,
      );
    case "approved_policy_contract":
      return (
        evidence?.policy.kind === POS_SHIFT_CASH_SHORTAGE_POLICY_KIND &&
        evidence.policy.approvalStatus === "approved" &&
        Boolean(evidence.policy.approvedAt && evidence.policy.approvedById)
      );
    case "observe_only_mode":
      return evidence?.policy.mode === "observe";
    case "effective_window_covers_check_time":
      return coversEffectiveTime(evidence);
    case "threshold_ordering_valid":
      return hasValidThresholds(evidence?.policy ?? null);
    case "policy_hash_matches":
      return Boolean(
        evidence &&
        hashBusinessPayload(evidence.policy) === evidence.policyHash,
      );
    case "approval_event_binding":
      return hasApprovalEventBinding(evidence);
    case "resolver_verifies_policy_hash":
      return (
        input.policyServiceSourceText.includes("approvedPolicyContract") &&
        input.policyServiceSourceText.includes("hashBusinessPayload(policy)") &&
        input.policyServiceSourceText.includes(
          "Approved cash-shortage policy hash verification failed",
        )
      );
    case "resolver_verifies_approval_event":
      return (
        input.policyServiceSourceText.includes("businessEvent.findUnique") &&
        input.policyServiceSourceText.includes(
          "cash_shortage.policy.approved",
        ) &&
        input.policyServiceSourceText.includes("payloadHash")
      );
    case "batch_resolves_policy_before_evaluation":
      return (
        input.batchServiceSourceText.includes(
          "resolveApprovedCashShortagePolicy",
        ) &&
        input.batchServiceSourceText.indexOf(
          "resolveApprovedCashShortagePolicy",
        ) < input.batchServiceSourceText.indexOf("evaluatePosShiftCashShortage")
      );
    case "runner_requires_policy_prerequisite":
      return (
        input.runnerInputSourceText.includes("productionThresholdConfigured") &&
        input.runnerInputSourceText.includes("production_policy_entry")
      );
    case "no_default_policy_or_activation_behavior":
      return !input.runnerInputSourceText.includes("enabled: true");
  }
}

function coversEffectiveTime(
  evidence: PosCashShortageProductionPolicyReadinessEvidence | null,
) {
  if (!evidence) return false;

  const effectiveAt = new Date(evidence.effectiveAt).getTime();
  const effectiveFrom = new Date(evidence.policy.effectiveFrom).getTime();
  const effectiveTo = evidence.policy.effectiveTo
    ? new Date(evidence.policy.effectiveTo).getTime()
    : null;

  return (
    Number.isFinite(effectiveAt) &&
    Number.isFinite(effectiveFrom) &&
    effectiveFrom <= effectiveAt &&
    (effectiveTo === null || effectiveAt < effectiveTo)
  );
}

function hasValidThresholds(policy: CashShortagePolicyV1 | null) {
  if (!policy) return false;

  const review = Number(policy.reviewThreshold);
  const high = Number(policy.highThreshold);

  return (
    Number.isFinite(review) &&
    Number.isFinite(high) &&
    review > 0 &&
    high >= review &&
    Number.isInteger(policy.minorUnitScale) &&
    policy.minorUnitScale >= 0 &&
    policy.minorUnitScale <= 4
  );
}

function hasApprovalEventBinding(
  evidence: PosCashShortageProductionPolicyReadinessEvidence | null,
) {
  if (!evidence) return false;

  const event = evidence.approvalEvent;
  const payloadHash = hashBusinessPayload(event.payload);

  return (
    event.eventType === "cash_shortage.policy.approved" &&
    event.schemaVersion === 1 &&
    event.status === "APPLIED" &&
    event.sourceType === "MANUAL" &&
    event.sourceId === evidence.policy.policyId &&
    event.actorId === evidence.policy.approvedById &&
    event.documentHash === evidence.policyHash &&
    event.payload.policyHash === evidence.policyHash &&
    hashBusinessPayload(event.payload.policy) === evidence.policyHash &&
    event.payloadHash === payloadHash
  );
}
