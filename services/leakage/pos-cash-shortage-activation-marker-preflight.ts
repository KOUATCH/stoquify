import type { WorkflowAssuranceCheckDefinitionContract } from "@/services/assurance/assurance-registry-contracts";

import type { PosCashShortageProductionActivationEvidence } from "./pos-cash-shortage-production-activation-preflight";

import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
} from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_ACTIVATION_MARKER_PREFLIGHT_VERSION = 1;
export const POS_CASH_SHORTAGE_ACTIVATION_MARKER_EVIDENCE_VERSION =
  "pos-cash-shortage-activation-marker-v1";

export const POS_CASH_SHORTAGE_ACTIVATION_MARKER_REQUIREMENTS = [
  "marker_evidence_identity",
  "service_activation_marker_present",
  "release_gate_activation_marker_present",
  "certified_marker_decisions",
  "shared_release_binding",
  "distinct_marker_evidence_references",
  "definition_marker_consistency",
  "registry_contract_ratchet",
  "release_gate_ratchet",
  "no_activation_authority",
] as const;

export type PosCashShortageActivationMarkerRequirement =
  (typeof POS_CASH_SHORTAGE_ACTIVATION_MARKER_REQUIREMENTS)[number];

export type PosCashShortageActivationMarkerDecision = {
  certified: boolean;
  markerReference: string;
  evidenceReference: string;
  actorDirectoryId: string;
  certifiedAt: string;
  releaseBindingHash: string;
};

export type PosCashShortageActivationMarkerEvidence = {
  evidenceVersion: typeof POS_CASH_SHORTAGE_ACTIVATION_MARKER_EVIDENCE_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  definitionVersion: typeof POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION;
  generatedAt: string;
  serviceActivationMarker?: PosCashShortageActivationMarkerDecision | null;
  releaseGateActivationMarker?: PosCashShortageActivationMarkerDecision | null;
};

export type PosCashShortageActivationMarkerPreflightInput = {
  definition: WorkflowAssuranceCheckDefinitionContract;
  markerEvidence: PosCashShortageActivationMarkerEvidence | null;
  registryContractSourceText: string;
  releaseGateSourceText: string;
};

export type PosCashShortageActivationMarkerPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_ACTIVATION_MARKER_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  status: "certified" | "blocked";
  serviceActivationMarkerCertified: boolean;
  releaseGateActivationMarkerCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageActivationMarkerRequirement[];
  missingRequirements: PosCashShortageActivationMarkerRequirement[];
};

export type PosCashShortageActivationMarkerActivationEvidence = Pick<
  PosCashShortageProductionActivationEvidence,
  "serviceActivationCertified" | "releaseGateActivationCertified"
> & {
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"activation_marker_preflight">;
};

export function evaluatePosCashShortageActivationMarkerPreflight(
  input: PosCashShortageActivationMarkerPreflightInput,
): PosCashShortageActivationMarkerPreflightResult {
  const satisfiedRequirements: PosCashShortageActivationMarkerRequirement[] = [];
  const missingRequirements: PosCashShortageActivationMarkerRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_ACTIVATION_MARKER_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_ACTIVATION_MARKER_PREFLIGHT_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    status: certified ? "certified" : "blocked",
    serviceActivationMarkerCertified: certified,
    releaseGateActivationMarkerCertified: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export function composePosCashShortageActivationMarkerActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageActivationMarkerPreflightResult,
    | "serviceActivationMarkerCertified"
    | "releaseGateActivationMarkerCertified"
    | "activationAuthorized"
  >;
}): PosCashShortageActivationMarkerActivationEvidence {
  const preflightCertified =
    input.preflight.serviceActivationMarkerCertified &&
    input.preflight.releaseGateActivationMarkerCertified &&
    input.preflight.activationAuthorized === false;

  return {
    serviceActivationCertified: preflightCertified,
    releaseGateActivationCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified ? [] : ["activation_marker_preflight"],
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageActivationMarkerRequirement,
  input: PosCashShortageActivationMarkerPreflightInput,
) {
  const evidence = input.markerEvidence;
  const serviceMarker = evidence?.serviceActivationMarker ?? null;
  const releaseGateMarker = evidence?.releaseGateActivationMarker ?? null;

  switch (requirement) {
    case "marker_evidence_identity":
      return (
        evidence?.evidenceVersion ===
          POS_CASH_SHORTAGE_ACTIVATION_MARKER_EVIDENCE_VERSION &&
        evidence.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY &&
        evidence.definitionVersion === POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION
      );
    case "service_activation_marker_present":
      return isMarkerPresent(serviceMarker);
    case "release_gate_activation_marker_present":
      return isMarkerPresent(releaseGateMarker);
    case "certified_marker_decisions":
      return serviceMarker?.certified === true && releaseGateMarker?.certified === true;
    case "shared_release_binding":
      return hasSharedReleaseBinding(serviceMarker, releaseGateMarker);
    case "distinct_marker_evidence_references":
      return (
        hasMarkerReferences(serviceMarker) &&
        hasMarkerReferences(releaseGateMarker) &&
        serviceMarker?.evidenceReference !== releaseGateMarker?.evidenceReference &&
        serviceMarker?.markerReference !== releaseGateMarker?.markerReference
      );
    case "definition_marker_consistency":
      return (
        input.definition.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY &&
        input.definition.version === POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION &&
        input.definition.enabled === true &&
        input.definition.enforceMode === false &&
        input.definition.metadata.productionActivationCertified === true
      );
    case "registry_contract_ratchet":
      return (
        input.registryContractSourceText.includes("productionActivationCertified") &&
        input.registryContractSourceText.includes(
          "definition.metadata.productionActivationCertified !== true",
        )
      );
    case "release_gate_ratchet":
      return (
        input.releaseGateSourceText.includes("productionActivationCertified") &&
        input.releaseGateSourceText.includes(
          "missing certified POS cash-shortage production activation marker",
        )
      );
    case "no_activation_authority":
      return input.definition.enforceMode === false;
  }
}

function isMarkerPresent(marker: PosCashShortageActivationMarkerDecision | null) {
  return Boolean(
    marker?.markerReference &&
      marker.evidenceReference &&
      marker.actorDirectoryId &&
      marker.certifiedAt &&
      marker.releaseBindingHash,
  );
}

function hasSharedReleaseBinding(
  serviceMarker: PosCashShortageActivationMarkerDecision | null,
  releaseGateMarker: PosCashShortageActivationMarkerDecision | null,
) {
  return Boolean(
    serviceMarker?.releaseBindingHash &&
      releaseGateMarker?.releaseBindingHash &&
      serviceMarker.releaseBindingHash === releaseGateMarker.releaseBindingHash &&
      hasReference(serviceMarker.releaseBindingHash, "hash"),
  );
}

function hasMarkerReferences(marker: PosCashShortageActivationMarkerDecision | null) {
  return Boolean(
    marker &&
      hasReference(marker.markerReference, "marker") &&
      hasReference(marker.evidenceReference, "evidence") &&
      hasReference(marker.actorDirectoryId, "directory") &&
      hasReference(marker.releaseBindingHash, "hash") &&
      isFinite(new Date(marker.certifiedAt).getTime()),
  );
}

function hasReference(value: string | undefined, scheme: string) {
  return new RegExp(`^${scheme}://[A-Za-z0-9._~:/#-]+$`).test(value ?? "");
}
