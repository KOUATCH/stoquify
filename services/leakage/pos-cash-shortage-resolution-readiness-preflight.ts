import { hashBusinessPayload } from "@/services/events/business-event.service";

import type { PosCashShortageProductionActivationEvidence } from "./pos-cash-shortage-production-activation-preflight";

export const POS_CASH_SHORTAGE_RESOLUTION_READINESS_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS = [
  "pos_lifecycle_policy_present",
  "current_source_hash_guard",
  "pos_session_source_identity",
  "triggered_shortage_evidence",
  "independent_reviewer_guard",
  "resolution_evidence_hash",
  "source_owned_recheck_contract",
  "terminal_command_not_active",
] as const;

export type PosCashShortageResolutionReadinessRequirement =
  (typeof POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS)[number];

export type PosCashShortageResolutionReadinessPreflightInput = {
  posLifecyclePolicySourceText: string;
  sourceRecheckContractSourceText: string | null;
};

export type PosCashShortageResolutionReadinessPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_RESOLUTION_READINESS_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  resolutionReadinessCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageResolutionReadinessRequirement[];
  missingRequirements: PosCashShortageResolutionReadinessRequirement[];
};

export type PosCashShortageResolutionReadinessActivationEvidence = Pick<
  PosCashShortageProductionActivationEvidence,
  "sourceOwnedResolutionReadinessCertified"
> & {
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"resolution_readiness_preflight">;
};

export function evaluatePosCashShortageResolutionReadinessPreflight(
  input: PosCashShortageResolutionReadinessPreflightInput,
): PosCashShortageResolutionReadinessPreflightResult {
  const satisfiedRequirements: PosCashShortageResolutionReadinessRequirement[] =
    [];
  const missingRequirements: PosCashShortageResolutionReadinessRequirement[] =
    [];

  for (const requirement of POS_CASH_SHORTAGE_RESOLUTION_READINESS_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_RESOLUTION_READINESS_PREFLIGHT_VERSION,
    status: certified ? "certified" : "blocked",
    resolutionReadinessCertified: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export type PosCashShortageResolutionReadinessStatusLine = {
  label: "pos_cash_shortage_resolution_readiness";
  status: PosCashShortageResolutionReadinessPreflightResult["status"];
  resolutionReadinessCertified: boolean;
  missingRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describePosCashShortageResolutionReadinessStatusLine(
  input: PosCashShortageResolutionReadinessPreflightResult,
): PosCashShortageResolutionReadinessStatusLine {
  const text =
    input.status === "certified"
      ? `POS cash-shortage source-owned resolution readiness is certified: ${input.satisfiedRequirements.length} requirements satisfied, terminal resolution not authorized.`
      : `POS cash-shortage source-owned resolution readiness is blocked: ${input.missingRequirements.length} requirements missing, ${input.satisfiedRequirements.length} requirements satisfied, terminal resolution not authorized.`;

  return {
    label: "pos_cash_shortage_resolution_readiness",
    status: input.status,
    resolutionReadinessCertified: input.resolutionReadinessCertified,
    missingRequirementCount: input.missingRequirements.length,
    satisfiedRequirementCount: input.satisfiedRequirements.length,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageResolutionReadinessReviewPacket = {
  version: typeof POS_CASH_SHORTAGE_RESOLUTION_READINESS_PREFLIGHT_VERSION;
  preflight: PosCashShortageResolutionReadinessPreflightResult;
  statusLine: PosCashShortageResolutionReadinessStatusLine;
  activationAuthorized: false;
};

export function buildPosCashShortageResolutionReadinessReviewPacket(
  input: PosCashShortageResolutionReadinessPreflightResult,
): PosCashShortageResolutionReadinessReviewPacket {
  return {
    version: input.version,
    preflight: input,
    statusLine: describePosCashShortageResolutionReadinessStatusLine(input),
    activationAuthorized: false,
  };
}
export type PosCashShortageResolutionReadinessReviewPacketFingerprint = {
  algorithm: "hashBusinessPayload";
  value: string;
  activationAuthorized: false;
};

export function fingerprintPosCashShortageResolutionReadinessReviewPacket(
  input: PosCashShortageResolutionReadinessPreflightResult,
): PosCashShortageResolutionReadinessReviewPacketFingerprint {
  return {
    algorithm: "hashBusinessPayload",
    value: hashBusinessPayload(
      buildPosCashShortageResolutionReadinessReviewPacket(input),
    ),
    activationAuthorized: false,
  };
}
export type PosCashShortageResolutionReadinessReviewArtifact = {
  packet: PosCashShortageResolutionReadinessReviewPacket;
  fingerprint: PosCashShortageResolutionReadinessReviewPacketFingerprint;
  activationAuthorized: false;
};

export function buildPosCashShortageResolutionReadinessReviewArtifact(
  input: PosCashShortageResolutionReadinessPreflightResult,
): PosCashShortageResolutionReadinessReviewArtifact {
  return {
    packet: buildPosCashShortageResolutionReadinessReviewPacket(input),
    fingerprint:
      fingerprintPosCashShortageResolutionReadinessReviewPacket(input),
    activationAuthorized: false,
  };
}
export type PosCashShortageResolutionReadinessReviewArtifactDigest = {
  status: PosCashShortageResolutionReadinessPreflightResult["status"];
  resolutionReadinessCertified: boolean;
  fingerprint: PosCashShortageResolutionReadinessReviewPacketFingerprint;
  missingRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestPosCashShortageResolutionReadinessReviewArtifact(
  input: PosCashShortageResolutionReadinessPreflightResult,
): PosCashShortageResolutionReadinessReviewArtifactDigest {
  const artifact = buildPosCashShortageResolutionReadinessReviewArtifact(input);

  return {
    status: artifact.packet.preflight.status,
    resolutionReadinessCertified:
      artifact.packet.preflight.resolutionReadinessCertified,
    fingerprint: artifact.fingerprint,
    missingRequirementCount: artifact.packet.statusLine.missingRequirementCount,
    satisfiedRequirementCount:
      artifact.packet.statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageResolutionReadinessReviewArtifactStatusLine = {
  label: "pos_cash_shortage_resolution_readiness_review";
  status: PosCashShortageResolutionReadinessPreflightResult["status"];
  resolutionReadinessCertified: boolean;
  fingerprint: PosCashShortageResolutionReadinessReviewPacketFingerprint;
  missingRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describePosCashShortageResolutionReadinessReviewArtifactStatusLine(
  input: PosCashShortageResolutionReadinessPreflightResult,
): PosCashShortageResolutionReadinessReviewArtifactStatusLine {
  const digest = digestPosCashShortageResolutionReadinessReviewArtifact(input);
  const text =
    digest.status === "certified"
      ? `POS cash-shortage source-owned resolution readiness review is certified: ${digest.satisfiedRequirementCount} requirements satisfied, fingerprint ${digest.fingerprint.algorithm}:${digest.fingerprint.value}, terminal resolution not authorized.`
      : `POS cash-shortage source-owned resolution readiness review is blocked: ${digest.missingRequirementCount} requirements missing, ${digest.satisfiedRequirementCount} requirements satisfied, fingerprint ${digest.fingerprint.algorithm}:${digest.fingerprint.value}, terminal resolution not authorized.`;

  return {
    label: "pos_cash_shortage_resolution_readiness_review",
    status: digest.status,
    resolutionReadinessCertified: digest.resolutionReadinessCertified,
    fingerprint: digest.fingerprint,
    missingRequirementCount: digest.missingRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageResolutionReadinessReviewEvidenceRow = {
  rowId: "pos_cash_shortage_resolution_readiness_review";
  label: "pos_cash_shortage_resolution_readiness_review";
  status: PosCashShortageResolutionReadinessPreflightResult["status"];
  outcome: "ready" | "blocked";
  resolutionReadinessCertified: boolean;
  fingerprintAlgorithm: PosCashShortageResolutionReadinessReviewPacketFingerprint["algorithm"];
  fingerprintValue: string;
  missingRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildPosCashShortageResolutionReadinessReviewEvidenceRow(
  input: PosCashShortageResolutionReadinessPreflightResult,
): PosCashShortageResolutionReadinessReviewEvidenceRow {
  const statusLine =
    describePosCashShortageResolutionReadinessReviewArtifactStatusLine(input);

  return {
    rowId: "pos_cash_shortage_resolution_readiness_review",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.resolutionReadinessCertified ? "ready" : "blocked",
    resolutionReadinessCertified: statusLine.resolutionReadinessCertified,
    fingerprintAlgorithm: statusLine.fingerprint.algorithm,
    fingerprintValue: statusLine.fingerprint.value,
    missingRequirementCount: statusLine.missingRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}export function composePosCashShortageResolutionReadinessActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageResolutionReadinessPreflightResult,
    "resolutionReadinessCertified" | "activationAuthorized"
  >;
}): PosCashShortageResolutionReadinessActivationEvidence {
  const preflightCertified =
    input.preflight.resolutionReadinessCertified &&
    input.preflight.activationAuthorized === false;

  return {
    sourceOwnedResolutionReadinessCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified
      ? []
      : ["resolution_readiness_preflight"],
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageResolutionReadinessRequirement,
  input: PosCashShortageResolutionReadinessPreflightInput,
) {
  const lifecycleSource = input.posLifecyclePolicySourceText;
  const sourceRecheckSource = input.sourceRecheckContractSourceText ?? "";

  switch (requirement) {
    case "pos_lifecycle_policy_present":
      return lifecycleSource.includes(
        "assertPosCashShortageIncidentResolutionAllowed",
      );
    case "current_source_hash_guard":
      return (
        lifecycleSource.includes("currentSourceHash") &&
        lifecycleSource.includes("source changed before resolution")
      );
    case "pos_session_source_identity":
      return (
        lifecycleSource.includes("POS_SHIFT_CASH_SHORTAGE_CHECK_KEY") &&
        lifecycleSource.includes("POSSession") &&
        lifecycleSource.includes("sourceId") &&
        lifecycleSource.includes("sourceHash")
      );
    case "triggered_shortage_evidence":
      return (
        lifecycleSource.includes('outcome !== "triggered"') &&
        lifecycleSource.includes("amountAtRisk") &&
        lifecycleSource.includes("policyId")
      );
    case "independent_reviewer_guard":
      return (
        lifecycleSource.includes("actorId === evidence.cashierId") &&
        lifecycleSource.includes("actorId === evidence.closerId") &&
        lifecycleSource.includes("independent reviewer")
      );
    case "resolution_evidence_hash":
      return lifecycleSource.includes("resolutionEvidenceHash");
    case "source_owned_recheck_contract":
      return (
        sourceRecheckSource.includes(
          "recheckPosCashShortageResolutionSource",
        ) &&
        sourceRecheckSource.includes("POSSession") &&
        sourceRecheckSource.includes("currentSourceHash") &&
        sourceRecheckSource.includes("approvedPolicyHash") &&
        sourceRecheckSource.includes("evaluationHash")
      );
    case "terminal_command_not_active":
      return !directTerminalCommandPattern().test(lifecycleSource);
  }
}

function directTerminalCommandPattern() {
  return new RegExp(
    [
      "resolve" + "WorkflowAssuranceIncident\\s*\\(",
      "transition" + "WorkflowAssuranceIncident\\s*\\(",
      "record" + "WorkflowAssuranceIncident\\s*\\(",
      "upsert" + "WorkflowAssuranceIncidentFromResult\\s*\\(",
      "db\\.",
      "prisma\\.",
    ].join("|"),
    "i",
  );
}
