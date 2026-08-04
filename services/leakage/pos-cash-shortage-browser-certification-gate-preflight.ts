import type { PosCashShortageBrowserAuthFixturePreflightResult } from "./pos-cash-shortage-browser-auth-fixture-readiness-preflight";
import type { PosCashShortageBrowserCertificationReadinessPreflightResult } from "./pos-cash-shortage-browser-certification-readiness-preflight";
import type { PosCashShortageBrowserEvidenceManifestPreflightResult } from "./pos-cash-shortage-browser-evidence-manifest-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_GATE_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_GATE_REQUIREMENTS = [
  "browser_certification_readiness_certified",
  "auth_fixture_readiness_certified",
  "evidence_manifest_certified",
  "no_underlying_activation_authority",
] as const;

export type PosCashShortageBrowserCertificationGateRequirement =
  (typeof POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_GATE_REQUIREMENTS)[number];

export type PosCashShortageBrowserCertificationGatePreflightInput = {
  browserReadiness: PosCashShortageBrowserCertificationReadinessPreflightResult;
  authFixtureReadiness: PosCashShortageBrowserAuthFixturePreflightResult;
  evidenceManifest: PosCashShortageBrowserEvidenceManifestPreflightResult;
};

export type PosCashShortageBrowserCertificationGateActivationEvidence = {
  browserCertificationGateCertified: boolean;
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"browser_certification_gate_preflight">;
};
export type PosCashShortageBrowserCertificationGatePreflightResult = {
  version: typeof POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_GATE_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  status: "certified" | "blocked";
  browserCertificationGateCertified: boolean;
  activationAuthorized: false;
  promotionAuthorized: false;
  satisfiedRequirements: PosCashShortageBrowserCertificationGateRequirement[];
  missingRequirements: PosCashShortageBrowserCertificationGateRequirement[];
  underlyingStatuses: {
    browserReadiness: "certified" | "blocked";
    authFixtureReadiness: "certified" | "blocked";
    evidenceManifest: "certified" | "blocked";
  };
};

export function evaluatePosCashShortageBrowserCertificationGatePreflight(
  input: PosCashShortageBrowserCertificationGatePreflightInput,
): PosCashShortageBrowserCertificationGatePreflightResult {
  const satisfiedRequirements: PosCashShortageBrowserCertificationGateRequirement[] = [];
  const missingRequirements: PosCashShortageBrowserCertificationGateRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_GATE_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_GATE_PREFLIGHT_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    status: certified ? "certified" : "blocked",
    browserCertificationGateCertified: certified,
    activationAuthorized: false,
    promotionAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
    underlyingStatuses: {
      browserReadiness: input.browserReadiness.status,
      authFixtureReadiness: input.authFixtureReadiness.status,
      evidenceManifest: input.evidenceManifest.status,
    },
  };
}

export function composePosCashShortageBrowserCertificationGateActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageBrowserCertificationGatePreflightResult,
    "browserCertificationGateCertified" | "activationAuthorized" | "promotionAuthorized"
  >;
}): PosCashShortageBrowserCertificationGateActivationEvidence {
  const preflightCertified =
    input.preflight.browserCertificationGateCertified &&
    input.preflight.activationAuthorized === false &&
    input.preflight.promotionAuthorized === false;

  return {
    browserCertificationGateCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified
      ? []
      : ["browser_certification_gate_preflight"],
  };
}
function isRequirementSatisfied(
  requirement: PosCashShortageBrowserCertificationGateRequirement,
  input: PosCashShortageBrowserCertificationGatePreflightInput,
) {
  switch (requirement) {
    case "browser_certification_readiness_certified":
      return (
        input.browserReadiness.status === "certified" &&
        input.browserReadiness.browserCertificationReady === true
      );
    case "auth_fixture_readiness_certified":
      return (
        input.authFixtureReadiness.status === "certified" &&
        input.authFixtureReadiness.browserAuthFixtureReady === true
      );
    case "evidence_manifest_certified":
      return (
        input.evidenceManifest.status === "certified" &&
        input.evidenceManifest.browserEvidenceManifestCertified === true
      );
    case "no_underlying_activation_authority":
      return (
        input.browserReadiness.activationAuthorized === false &&
        input.authFixtureReadiness.activationAuthorized === false &&
        input.evidenceManifest.activationAuthorized === false
      );
  }
}
