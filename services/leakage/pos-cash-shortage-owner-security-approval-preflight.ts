import type { PosCashShortageProductionActivationEvidence } from "./pos-cash-shortage-production-activation-preflight";

import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
} from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_PREFLIGHT_VERSION = 1;
export const POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_EVIDENCE_VERSION =
  "pos-cash-shortage-owner-security-approval-v1";

export const POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_REQUIREMENTS = [
  "approval_evidence_identity",
  "product_approval_present",
  "security_approval_present",
  "approved_decisions",
  "distinct_product_security_actors",
  "bounded_validity_window",
  "release_binding",
  "evidence_references",
  "no_synthetic_or_test_only_identity",
  "production_preflight_owner_security_requirement",
] as const;

export type PosCashShortageOwnerSecurityApprovalRequirement =
  (typeof POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_REQUIREMENTS)[number];

export type PosCashShortageOwnerSecurityApprovalDecision = {
  decision: "APPROVED" | "REJECTED" | "EXPIRED" | "REVOKED";
  actorDirectoryId: string;
  approvalReference: string;
  decidedAt: string;
  expiresAt: string;
  evidenceReference: string;
  releaseBindingHash: string;
};

export type PosCashShortageOwnerSecurityApprovalEvidence = {
  evidenceVersion: typeof POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_EVIDENCE_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  definitionVersion: typeof POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION;
  generatedAt: string;
  releaseBinding: {
    checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
    definitionVersion: typeof POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION;
    activationRunbookReference: string;
    rollbackRunbookReference: string;
    observabilityRunbookReference: string;
  };
  productApproval?: PosCashShortageOwnerSecurityApprovalDecision | null;
  securityApproval?: PosCashShortageOwnerSecurityApprovalDecision | null;
};

export type PosCashShortageOwnerSecurityApprovalPreflightInput = {
  approvalEvidence: PosCashShortageOwnerSecurityApprovalEvidence | null;
  productionActivationPreflightSourceText: string;
  now?: Date | string;
};

export type PosCashShortageOwnerSecurityApprovalPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  status: "certified" | "blocked";
  ownerSecurityApprovalCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageOwnerSecurityApprovalRequirement[];
  missingRequirements: PosCashShortageOwnerSecurityApprovalRequirement[];
};

export type PosCashShortageOwnerSecurityApprovalActivationEvidence = Pick<
  PosCashShortageProductionActivationEvidence,
  "ownerSecurityApprovalCertified"
> & {
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"owner_security_approval_preflight">;
};

export function evaluatePosCashShortageOwnerSecurityApprovalPreflight(
  input: PosCashShortageOwnerSecurityApprovalPreflightInput,
): PosCashShortageOwnerSecurityApprovalPreflightResult {
  const satisfiedRequirements: PosCashShortageOwnerSecurityApprovalRequirement[] = [];
  const missingRequirements: PosCashShortageOwnerSecurityApprovalRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_PREFLIGHT_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    status: certified ? "certified" : "blocked",
    ownerSecurityApprovalCertified: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export function composePosCashShortageOwnerSecurityApprovalActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageOwnerSecurityApprovalPreflightResult,
    "ownerSecurityApprovalCertified" | "activationAuthorized"
  >;
}): PosCashShortageOwnerSecurityApprovalActivationEvidence {
  const preflightCertified =
    input.preflight.ownerSecurityApprovalCertified &&
    input.preflight.activationAuthorized === false;

  return {
    ownerSecurityApprovalCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified
      ? []
      : ["owner_security_approval_preflight"],
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageOwnerSecurityApprovalRequirement,
  input: PosCashShortageOwnerSecurityApprovalPreflightInput,
) {
  const evidence = input.approvalEvidence;
  const product = evidence?.productApproval ?? null;
  const security = evidence?.securityApproval ?? null;

  switch (requirement) {
    case "approval_evidence_identity":
      return (
        evidence?.evidenceVersion ===
          POS_CASH_SHORTAGE_OWNER_SECURITY_APPROVAL_EVIDENCE_VERSION &&
        evidence.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY &&
        evidence.definitionVersion === POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION
      );
    case "product_approval_present":
      return isDecisionPresent(product);
    case "security_approval_present":
      return isDecisionPresent(security);
    case "approved_decisions":
      return product?.decision === "APPROVED" && security?.decision === "APPROVED";
    case "distinct_product_security_actors":
      return (
        isRealDirectoryIdentity(product?.actorDirectoryId) &&
        isRealDirectoryIdentity(security?.actorDirectoryId) &&
        product?.actorDirectoryId !== security?.actorDirectoryId
      );
    case "bounded_validity_window":
      return isCurrent(product, input.now) && isCurrent(security, input.now);
    case "release_binding":
      return hasReleaseBinding(evidence) && hasMatchingReleaseHash(product, security);
    case "evidence_references":
      return hasDecisionReferences(product) && hasDecisionReferences(security);
    case "no_synthetic_or_test_only_identity":
      return (
        isNonSyntheticIdentity(product?.actorDirectoryId) &&
        isNonSyntheticIdentity(security?.actorDirectoryId)
      );
    case "production_preflight_owner_security_requirement":
      return (
        input.productionActivationPreflightSourceText.includes(
          '"owner_security_approval"',
        ) &&
        input.productionActivationPreflightSourceText.includes(
          "ownerSecurityApprovalCertified",
        )
      );
  }
}

function isDecisionPresent(
  decision: PosCashShortageOwnerSecurityApprovalDecision | null,
) {
  return Boolean(
    decision?.actorDirectoryId &&
      decision.approvalReference &&
      decision.decidedAt &&
      decision.expiresAt &&
      decision.evidenceReference &&
      decision.releaseBindingHash,
  );
}

function isCurrent(
  decision: PosCashShortageOwnerSecurityApprovalDecision | null,
  nowInput: Date | string | undefined,
) {
  if (!decision) return false;

  const now = nowInput ? new Date(nowInput) : new Date();
  const decidedAt = new Date(decision.decidedAt);
  const expiresAt = new Date(decision.expiresAt);

  return (
    isFinite(now.getTime()) &&
    isFinite(decidedAt.getTime()) &&
    isFinite(expiresAt.getTime()) &&
    decidedAt.getTime() <= now.getTime() &&
    now.getTime() < expiresAt.getTime()
  );
}

function hasReleaseBinding(
  evidence: PosCashShortageOwnerSecurityApprovalEvidence | null,
) {
  return Boolean(
    evidence?.releaseBinding.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY &&
      evidence.releaseBinding.definitionVersion ===
        POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION &&
      hasReference(evidence.releaseBinding.activationRunbookReference, "runbook") &&
      hasReference(evidence.releaseBinding.rollbackRunbookReference, "runbook") &&
      hasReference(evidence.releaseBinding.observabilityRunbookReference, "runbook"),
  );
}

function hasMatchingReleaseHash(
  product: PosCashShortageOwnerSecurityApprovalDecision | null,
  security: PosCashShortageOwnerSecurityApprovalDecision | null,
) {
  return Boolean(
    product?.releaseBindingHash &&
      security?.releaseBindingHash &&
      product.releaseBindingHash === security.releaseBindingHash &&
      hasReference(product.releaseBindingHash, "hash"),
  );
}

function hasDecisionReferences(
  decision: PosCashShortageOwnerSecurityApprovalDecision | null,
) {
  return Boolean(
    decision &&
      hasReference(decision.actorDirectoryId, "directory") &&
      hasReference(decision.approvalReference, "approval") &&
      hasReference(decision.evidenceReference, "evidence") &&
      hasReference(decision.releaseBindingHash, "hash"),
  );
}

function isRealDirectoryIdentity(value: string | undefined) {
  return hasReference(value, "directory");
}

function isNonSyntheticIdentity(value: string | undefined) {
  return Boolean(value && !/(test|fixture|fake|mock|synthetic)/i.test(value));
}

function hasReference(value: string | undefined, scheme: string) {
  return new RegExp(`^${scheme}://[A-Za-z0-9._~:/#-]+$`).test(value ?? "");
}
