import { createHash } from "crypto";

import type { WorkflowAssuranceCheckDefinitionContract } from "@/services/assurance/assurance-registry-contracts";

import {
  POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION,
} from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REQUIREMENTS = [
  "definition_identity",
  "service_activation_marker",
  "release_gate_activation_marker",
  "worker_checkpoint_persistence",
  "scheduler_policy",
  "incident_command_integration",
  "alert_delivery_integration",
  "rollback_plan",
  "observability_runbook",
  "owner_security_approval",
  "browser_certification_gate",
  "production_policy_readiness",
  "source_owned_resolution_readiness",
] as const;

export type PosCashShortageProductionActivationRequirement =
  (typeof POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REQUIREMENTS)[number];

export type PosCashShortageProductionActivationEvidence = {
  serviceActivationCertified: boolean;
  releaseGateActivationCertified: boolean;
  workerCheckpointPersistenceCertified: boolean;
  schedulerPolicyCertified: boolean;
  incidentCommandIntegrationCertified: boolean;
  alertDeliveryIntegrationCertified: boolean;
  rollbackPlanCertified: boolean;
  observabilityRunbookCertified: boolean;
  ownerSecurityApprovalCertified: boolean;
  browserCertificationGateCertified: boolean;
  productionPolicyReadinessCertified: boolean;
  sourceOwnedResolutionReadinessCertified: boolean;
};

export const POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_EVIDENCE_FIELDS = [
  "serviceActivationCertified",
  "releaseGateActivationCertified",
  "workerCheckpointPersistenceCertified",
  "schedulerPolicyCertified",
  "incidentCommandIntegrationCertified",
  "alertDeliveryIntegrationCertified",
  "rollbackPlanCertified",
  "observabilityRunbookCertified",
  "ownerSecurityApprovalCertified",
  "browserCertificationGateCertified",
  "productionPolicyReadinessCertified",
  "sourceOwnedResolutionReadinessCertified",
] as const satisfies readonly (keyof PosCashShortageProductionActivationEvidence)[];

export type PosCashShortageProductionActivationEvidenceField =
  (typeof POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_EVIDENCE_FIELDS)[number];

export type PosCashShortageProductionActivationEvidenceFragment =
  Partial<PosCashShortageProductionActivationEvidence> & {
    activationAuthorized: false;
  };

export type PosCashShortageProductionActivationEvidenceComposition = {
  evidence: PosCashShortageProductionActivationEvidence;
  activationAuthorized: false;
  acceptedFragments: number;
  rejectedFragments: number;
  satisfiedEvidenceFields: PosCashShortageProductionActivationEvidenceField[];
  missingEvidenceFields: PosCashShortageProductionActivationEvidenceField[];
};

export type PosCashShortageProductionActivationPreflightInput = {
  definition: WorkflowAssuranceCheckDefinitionContract;
  evidence: PosCashShortageProductionActivationEvidence;
};

export type PosCashShortageProductionActivationPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  status: "ready" | "blocked";
  canEnableDefinition: boolean;
  canRunWorker: boolean;
  activationHold: string | null;
  satisfiedRequirements: PosCashShortageProductionActivationRequirement[];
  missingRequirements: PosCashShortageProductionActivationRequirement[];
};

export type PosCashShortageComposedProductionActivationPreflightResult = {
  composition: PosCashShortageProductionActivationEvidenceComposition;
  preflight: PosCashShortageProductionActivationPreflightResult;
  activationAuthorized: false;
};
export type PosCashShortageProductionActivationBlockerKind =
  | "activation_evidence"
  | "definition_activation_marker"
  | "definition_identity";

export type PosCashShortageProductionActivationBlocker = {
  requirement: PosCashShortageProductionActivationRequirement;
  kind: PosCashShortageProductionActivationBlockerKind;
  evidenceField: PosCashShortageProductionActivationEvidenceField | null;
};

export type PosCashShortageProductionActivationBlockerClassification = {
  status: PosCashShortageProductionActivationPreflightResult["status"];
  canEnableDefinition: boolean;
  canRunWorker: boolean;
  activationAuthorized: false;
  rejectedFragments: number;
  missingEvidenceFields: PosCashShortageProductionActivationEvidenceField[];
  blockers: PosCashShortageProductionActivationBlocker[];
};

export type PosCashShortageProductionActivationReviewChecklistItem = {
  requirement: PosCashShortageProductionActivationRequirement;
  status: "satisfied" | "blocked";
  blockerKind: PosCashShortageProductionActivationBlockerKind | null;
  evidenceField: PosCashShortageProductionActivationEvidenceField | null;
  activationAuthorized: false;
};

export type PosCashShortageProductionActivationReviewSummary = {
  status: PosCashShortageProductionActivationPreflightResult["status"];
  canEnableDefinition: boolean;
  canRunWorker: boolean;
  activationHold: string | null;
  activationAuthorized: false;
  rejectedFragments: number;
  missingEvidenceFieldCount: number;
  blockerCount: number;
  blockerCountsByKind: Record<
    PosCashShortageProductionActivationBlockerKind,
    number
  >;
  missingEvidenceFields: PosCashShortageProductionActivationEvidenceField[];
  blockers: PosCashShortageProductionActivationBlocker[];
};

export function composePosCashShortageProductionActivationEvidence(input: {
  fragments: Array<
    | PosCashShortageProductionActivationEvidenceFragment
    | (Partial<PosCashShortageProductionActivationEvidence> & {
        activationAuthorized?: boolean;
      })
  >;
}): PosCashShortageProductionActivationEvidenceComposition {
  const evidence = emptyProductionActivationEvidence();
  let acceptedFragments = 0;
  let rejectedFragments = 0;

  for (const fragment of input.fragments) {
    if (fragment.activationAuthorized !== false) {
      rejectedFragments += 1;
      continue;
    }

    acceptedFragments += 1;
    for (const field of POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_EVIDENCE_FIELDS) {
      if (fragment[field] === true) {
        evidence[field] = true;
      }
    }
  }

  const satisfiedEvidenceFields =
    POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_EVIDENCE_FIELDS.filter(
      (field) => evidence[field],
    );
  const missingEvidenceFields =
    POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_EVIDENCE_FIELDS.filter(
      (field) => !evidence[field],
    );

  return {
    evidence,
    activationAuthorized: false,
    acceptedFragments,
    rejectedFragments,
    satisfiedEvidenceFields,
    missingEvidenceFields,
  };
}

export function evaluateComposedPosCashShortageProductionActivationPreflight(input: {
  definition: WorkflowAssuranceCheckDefinitionContract;
  fragments: Array<
    | PosCashShortageProductionActivationEvidenceFragment
    | (Partial<PosCashShortageProductionActivationEvidence> & {
        activationAuthorized?: boolean;
      })
  >;
}): PosCashShortageComposedProductionActivationPreflightResult {
  const composition = composePosCashShortageProductionActivationEvidence({
    fragments: input.fragments,
  });
  const preflight = evaluatePosCashShortageProductionActivationPreflight({
    definition: input.definition,
    evidence: composition.evidence,
  });

  return {
    composition,
    preflight,
    activationAuthorized: false,
  };
}

export function classifyComposedPosCashShortageProductionActivationBlockers(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationBlockerClassification {
  return {
    status: input.preflight.status,
    canEnableDefinition: input.preflight.canEnableDefinition,
    canRunWorker: input.preflight.canRunWorker,
    activationAuthorized: false,
    rejectedFragments: input.composition.rejectedFragments,
    missingEvidenceFields: input.composition.missingEvidenceFields,
    blockers: input.preflight.missingRequirements.map((requirement) => ({
      requirement,
      kind: blockerKindFor(requirement, input.composition.evidence),
      evidenceField: evidenceFieldFor(requirement),
    })),
  };
}
export function listComposedPosCashShortageProductionActivationReviewChecklist(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewChecklistItem[] {
  const classification =
    classifyComposedPosCashShortageProductionActivationBlockers(input);
  const blockersByRequirement = new Map(
    classification.blockers.map((blocker) => [blocker.requirement, blocker]),
  );

  return POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REQUIREMENTS.map(
    (requirement) => {
      const blocker = blockersByRequirement.get(requirement) ?? null;

      return {
        requirement,
        status: blocker ? "blocked" : "satisfied",
        blockerKind: blocker?.kind ?? null,
        evidenceField: blocker?.evidenceField ?? evidenceFieldFor(requirement),
        activationAuthorized: false,
      };
    },
  );
}

export function summarizeComposedPosCashShortageProductionActivationReview(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewSummary {
  const classification =
    classifyComposedPosCashShortageProductionActivationBlockers(input);

  return {
    status: input.preflight.status,
    canEnableDefinition: input.preflight.canEnableDefinition,
    canRunWorker: input.preflight.canRunWorker,
    activationHold: input.preflight.activationHold,
    activationAuthorized: false,
    rejectedFragments: classification.rejectedFragments,
    missingEvidenceFieldCount: classification.missingEvidenceFields.length,
    blockerCount: classification.blockers.length,
    blockerCountsByKind: countBlockersByKind(classification.blockers),
    missingEvidenceFields: classification.missingEvidenceFields,
    blockers: classification.blockers,
  };
}

export type PosCashShortageProductionActivationReviewPacket = {
  version: typeof POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  summary: PosCashShortageProductionActivationReviewSummary;
  checklist: PosCashShortageProductionActivationReviewChecklistItem[];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewPacket(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewPacket {
  return {
    version: input.preflight.version,
    checkKey: input.preflight.checkKey,
    summary: summarizeComposedPosCashShortageProductionActivationReview(input),
    checklist:
      listComposedPosCashShortageProductionActivationReviewChecklist(input),
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewPacketFingerprint = {
  algorithm: "sha256";
  value: string;
  activationAuthorized: false;
};

export function fingerprintComposedPosCashShortageProductionActivationReviewPacket(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewPacketFingerprint {
  const packet =
    buildComposedPosCashShortageProductionActivationReviewPacket(input);
  const value = createHash("sha256")
    .update(JSON.stringify(packet))
    .digest("hex");

  return {
    algorithm: "sha256",
    value,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewArtifact = {
  packet: PosCashShortageProductionActivationReviewPacket;
  fingerprint: PosCashShortageProductionActivationReviewPacketFingerprint;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewArtifact(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewArtifact {
  return {
    packet: buildComposedPosCashShortageProductionActivationReviewPacket(input),
    fingerprint:
      fingerprintComposedPosCashShortageProductionActivationReviewPacket(input),
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewArtifactDigest = {
  status: PosCashShortageProductionActivationPreflightResult["status"];
  fingerprint: PosCashShortageProductionActivationReviewPacketFingerprint;
  blockerCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewArtifact(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewArtifactDigest {
  const artifact =
    buildComposedPosCashShortageProductionActivationReviewArtifact(input);
  const blockedRequirementCount = artifact.packet.checklist.filter(
    (item) => item.status === "blocked",
  ).length;

  return {
    status: artifact.packet.summary.status,
    fingerprint: artifact.fingerprint,
    blockerCount: artifact.packet.summary.blockerCount,
    blockedRequirementCount,
    satisfiedRequirementCount:
      artifact.packet.checklist.length - blockedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewStatusLine = {
  label: "pos_cash_shortage_production_activation_review";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  fingerprint: PosCashShortageProductionActivationReviewPacketFingerprint;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewArtifact(input);
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review is ready: ${digest.satisfiedRequirementCount} requirements satisfied, fingerprint ${digest.fingerprint.algorithm}:${digest.fingerprint.value}, activation not authorized.`
      : `POS cash-shortage production activation review is blocked: ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, fingerprint ${digest.fingerprint.algorithm}:${digest.fingerprint.value}, activation not authorized.`;

  return {
    label: "pos_cash_shortage_production_activation_review",
    status: digest.status,
    fingerprint: digest.fingerprint,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review";
  label: "pos_cash_shortage_production_activation_review";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  fingerprintAlgorithm: PosCashShortageProductionActivationReviewPacketFingerprint["algorithm"];
  fingerprintValue: string;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewStatusLine(input);

  return {
    rowId: "pos_cash_shortage_production_activation_review",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    fingerprintAlgorithm: statusLine.fingerprint.algorithm,
    fingerprintValue: statusLine.fingerprint.value,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  rows: [PosCashShortageProductionActivationReviewEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceRow(input);

  return {
    label: "pos_cash_shortage_production_activation_review_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTableDigest = {
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTable(input);
  const row = table.rows[0];

  return {
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTable(input);
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: "pos_cash_shortage_production_activation_review_table",
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacket = {
  version: typeof POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  table: PosCashShortageProductionActivationReviewEvidenceTable;
  digest: PosCashShortageProductionActivationReviewEvidenceTableDigest;
  statusLine: PosCashShortageProductionActivationReviewEvidenceTableStatusLine;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacket(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacket {
  return {
    version: input.preflight.version,
    checkKey: input.preflight.checkKey,
    table: buildComposedPosCashShortageProductionActivationReviewEvidenceTable(
      input,
    ),
    digest:
      digestComposedPosCashShortageProductionActivationReviewEvidenceTable(
        input,
      ),
    statusLine:
      describeComposedPosCashShortageProductionActivationReviewEvidenceTableStatusLine(
        input,
      ),
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketFingerprint = {
  algorithm: "sha256";
  value: string;
  activationAuthorized: false;
};

export function fingerprintComposedPosCashShortageProductionActivationReviewEvidenceTablePacket(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketFingerprint {
  const packet =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacket(
      input,
    );
  const value = createHash("sha256")
    .update(JSON.stringify(packet))
    .digest("hex");

  return {
    algorithm: "sha256",
    value,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifact = {
  packet: PosCashShortageProductionActivationReviewEvidenceTablePacket;
  fingerprint: PosCashShortageProductionActivationReviewEvidenceTablePacketFingerprint;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifact(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifact {
  return {
    packet:
      buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacket(
        input,
      ),
    fingerprint:
      fingerprintComposedPosCashShortageProductionActivationReviewEvidenceTablePacket(
        input,
      ),
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactDigest = {
  status: PosCashShortageProductionActivationPreflightResult["status"];
  fingerprint: PosCashShortageProductionActivationReviewEvidenceTablePacketFingerprint;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifact(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactDigest {
  const artifact =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifact(
      input,
    );

  return {
    status: artifact.packet.table.status,
    fingerprint: artifact.fingerprint,
    rowCount: artifact.packet.table.rowCount,
    blockedRequirementCount: artifact.packet.digest.blockedRequirementCount,
    satisfiedRequirementCount: artifact.packet.digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  fingerprint: PosCashShortageProductionActivationReviewEvidenceTablePacketFingerprint;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifact(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, fingerprint ${digest.fingerprint.algorithm}:${digest.fingerprint.value}, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, fingerprint ${digest.fingerprint.algorithm}:${digest.fingerprint.value}, activation not authorized.`;

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact",
    status: digest.status,
    fingerprint: digest.fingerprint,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  fingerprintAlgorithm: PosCashShortageProductionActivationReviewEvidenceTablePacketFingerprint["algorithm"];
  fingerprintValue: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    fingerprintAlgorithm: statusLine.fingerprint.algorithm,
    fingerprintValue: statusLine.fingerprint.value,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table rows are ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table rows are blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table row table is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table row table is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table row table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table row table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table row table table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table row table table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table row table table table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table row table table table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table row table table table table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table row table table table table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table row table table table table table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table row table table table table table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table row table table table table table table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table row table table table table table table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact evidence table row table table table table table table table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact evidence table row table table table table table table table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableStatusLine(
      input,
    );

  return {
    rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceRow(
      input,
    );

  return {
    label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRow = {
  rowId: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows";
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  outcome: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableStatusLine(
      input,
    );

  return {
    rowId:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows",
    label: statusLine.label,
    status: statusLine.status,
    outcome: statusLine.status === "ready" ? "ready" : "blocked",
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRow = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLine(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence",
    status: statusLine.status,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLine(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence",
    status: statusLine.status,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence",
    status: statusLine.status,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence",
    status: statusLine.status,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence",
    status: statusLine.status,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence",
    status: statusLine.status,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence",
    status: statusLine.status,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  summary: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence",
    status: statusLine.status,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    summary: statusLine.text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: 1;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
      input,
    );

  return {
    label:
      "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table =
    buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const [row] = table.rows;

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: "pos_cash_shortage_production_activation_review_table_packet_artifact_table_rows_rows_table_table_table_table_table_table_table_table_rows_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table_status_line_evidence_table";
  status: PosCashShortageProductionActivationPreflightResult["status"];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest =
    digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
      input,
    );
  const text =
    digest.status === "ready"
      ? `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is ready: ${digest.rowCount} rows, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`
      : `POS cash-shortage production activation review table packet artifact table rows rows table table table table table table table table rows table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table status-line evidence table digest is blocked: ${digest.rowCount} rows, ${digest.blockedRequirementCount} requirements blocked, ${digest.satisfiedRequirementCount} requirements satisfied, activation not authorized.`;

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_177_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "POS cash-shortage Slice 177 evidence row is ready: " +
        statusLine.rowCount +
        " rows reviewed, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "POS cash-shortage Slice 177 evidence row is blocked: " +
        statusLine.rowCount +
        " rows reviewed, " +
        statusLine.blockedRequirementCount +
        " requirements blocked, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_177_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rowCount: 1,
    rows: [row],
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    digest.status === "ready"
      ? "POS cash-shortage Slice 180 digest status-line is ready: " +
        digest.rowCount +
        " rows reviewed, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "POS cash-shortage Slice 180 digest status-line is blocked: " +
        digest.rowCount +
        " rows reviewed, " +
        digest.blockedRequirementCount +
        " requirements blocked, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_181_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "POS cash-shortage Slice 181 evidence row is ready: " +
        statusLine.rowCount +
        " rows reviewed, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "POS cash-shortage Slice 181 evidence row is blocked: " +
        statusLine.rowCount +
        " rows reviewed, " +
        statusLine.blockedRequirementCount +
        " requirements blocked, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_181_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rowCount: 1,
    rows: [row],
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );

  return {
    label: table.label,
    status: table.status,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    digest.status === "ready"
      ? "POS cash-shortage Slice 184 digest status-line is ready: " +
        digest.rowCount +
        " rows reviewed, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "POS cash-shortage Slice 184 digest status-line is blocked: " +
        digest.rowCount +
        " rows reviewed, " +
        digest.blockedRequirementCount +
        " requirements blocked, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_185_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "POS cash-shortage Slice 185 evidence row is ready: " +
        statusLine.rowCount +
        " rows reviewed, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "POS cash-shortage Slice 185 evidence row is blocked: " +
        statusLine.rowCount +
        " rows reviewed, " +
        statusLine.blockedRequirementCount +
        " requirements blocked, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_185_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rowCount: 1,
    rows: [row],
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 187 evidence table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 187 evidence table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 188 status line is ready: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 188 status line is blocked: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_189_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "Slice 189 evidence row is ready: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 189 evidence row is blocked: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_189_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rowCount: 1,
    rows: [row],
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 191 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 191 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 192 status line is ready: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 192 status line is blocked: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_193_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "Slice 193 evidence row is ready: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 193 evidence row is blocked: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_193_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  rows: [PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow];
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rowCount: 1,
    rows: [row],
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 195 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 195 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 196 status line is ready: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 196 status line is blocked: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_197_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "Slice 197 evidence row is ready: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 197 evidence row is blocked: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_197_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 199 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 199 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 200 status line is ready: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 200 status line is blocked: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_201_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "Slice 201 evidence row is ready: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 201 evidence row is blocked: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_201_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 203 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 203 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 204 status line is ready: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 204 status line is blocked: " +
        digest.rowCount +
        " digest rows reviewed, " +
        digest.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_205_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "Slice 205 evidence row is ready: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 205 evidence row is blocked: " +
        statusLine.rowCount +
        " status-line rows reviewed, " +
        statusLine.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_205_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 207 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 207 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 208 evidence row table digest status line is ready: " +
        digest.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 208 evidence row table digest status line is blocked: " +
        digest.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_208_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "Slice 209 evidence row is ready: status line reviewed, activation not authorized."
      : "Slice 209 evidence row is blocked: status line reviewed, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_208_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 211 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 211 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 212 evidence row table digest status line is ready: " +
        digest.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 212 evidence row table digest status line is blocked: " +
        digest.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowKey: "slice_212_digest_status_line_evidence_row";
  summary: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const summary =
    statusLine.status === "ready"
      ? "Slice 213 evidence row is ready: status line reviewed, activation not authorized."
      : "Slice 213 evidence row is blocked: status line reviewed, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowKey: "slice_212_digest_status_line_evidence_row",
    summary,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 215 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 215 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 216 evidence row table digest status line is ready: " +
        digest.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 216 evidence row table digest status line is blocked: " +
        digest.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowLabel: string;
  text: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const rowLabel = "Slice 217 production activation evidence row";
  const text =
    statusLine.status === "ready"
      ? rowLabel +
        " is ready: " +
        statusLine.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : rowLabel +
        " is blocked: " +
        statusLine.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowLabel,
    text,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  sourceRowText: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: "Slice 218 production activation evidence row table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    sourceRowText: row.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  sourceRowText: string;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 219 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 219 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    sourceRowText: table.sourceRowText,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 220 evidence row table digest status line is ready: " +
        digest.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 220 evidence row table digest status line is blocked: " +
        digest.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowLabel: string;
  text: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const rowLabel = "Slice 221 production activation evidence row";
  const text =
    statusLine.status === "ready"
      ? rowLabel +
        " is ready: " +
        statusLine.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : rowLabel +
        " is blocked: " +
        statusLine.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowLabel,
    text,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rowCount: number;
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  sourceRowText: string;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
    input,
  );

  return {
    label: "Slice 222 production activation evidence row table",
    status: row.status,
    rowCount: 1,
    rows: [row],
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    sourceRowText: row.text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  sourceRowText: string;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
    input,
  );
  const text =
    table.status === "ready"
      ? "Slice 223 evidence row table digest is ready: " +
        table.rowCount +
        " rows reviewed, " +
        table.satisfiedRequirementCount +
        " requirements satisfied, activation not authorized."
      : "Slice 223 evidence row table digest is blocked: " +
        table.rowCount +
        " rows reviewed, " +
        table.blockedRequirementCount +
        " requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    sourceRowText: table.sourceRowText,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
    input,
  );
  const text =
    digest.status === "ready"
      ? "Slice 224 evidence row table digest status line is ready: " +
        digest.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 224 evidence row table digest status line is blocked: " +
        digest.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowLabel: string;
  text: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
    input,
  );
  const rowLabel = "Slice 225 production activation evidence row";
  const text =
    statusLine.status === "ready"
      ? rowLabel +
        " is ready: " +
        statusLine.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : rowLabel +
        " is blocked: " +
        statusLine.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowLabel,
    text,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(input);

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}

export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceTable: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(input);
  const text =
    table.status === "ready"
      ? "Slice 227 evidence row table digest is ready: " +
        table.rowCount +
        " evidence rows, " +
        table.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 227 evidence row table digest is blocked: " +
        table.rowCount +
        " evidence rows, " +
        table.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    sourceTable: table,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(input);
  const text =
    digest.status === "ready"
      ? "Slice 228 evidence row table digest status line is ready: " +
        digest.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 228 evidence row table digest status line is blocked: " +
        digest.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowLabel: string;
  text: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(input);
  const rowLabel = "Slice 229 production activation evidence row";
  const text =
    statusLine.status === "ready"
      ? rowLabel +
        " is ready: " +
        statusLine.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : rowLabel +
        " is blocked: " +
        statusLine.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowLabel,
    text,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(input);

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceTable: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const table = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(input);
  const text =
    table.status === "ready"
      ? "Slice 231 evidence row table digest is ready: " +
        table.rowCount +
        " evidence rows, " +
        table.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 231 evidence row table digest is blocked: " +
        table.rowCount +
        " evidence rows, " +
        table.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: table.label,
    status: table.status,
    text,
    sourceTable: table,
    rowCount: table.rowCount,
    blockedRequirementCount: table.blockedRequirementCount,
    satisfiedRequirementCount: table.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  text: string;
  sourceDigestText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const digest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(input);
  const text =
    digest.status === "ready"
      ? "Slice 232 evidence row table digest status line is ready: " +
        digest.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : "Slice 232 evidence row table digest status line is blocked: " +
        digest.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: digest.label,
    status: digest.status,
    text,
    sourceDigestText: digest.text,
    rowCount: digest.rowCount,
    blockedRequirementCount: digest.blockedRequirementCount,
    satisfiedRequirementCount: digest.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  rowLabel: string;
  text: string;
  sourceStatusLineText: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const statusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(input);
  const rowLabel = "Slice 233 production activation evidence row";
  const text =
    statusLine.status === "ready"
      ? rowLabel +
        " is ready: " +
        statusLine.satisfiedRequirementCount +
        " activation requirements satisfied, activation not authorized."
      : rowLabel +
        " is blocked: " +
        statusLine.blockedRequirementCount +
        " activation requirements blocked, activation not authorized.";

  return {
    label: statusLine.label,
    status: statusLine.status,
    rowLabel,
    text,
    sourceStatusLineText: statusLine.text,
    rowCount: statusLine.rowCount,
    blockedRequirementCount: statusLine.blockedRequirementCount,
    satisfiedRequirementCount: statusLine.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(input);

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  sourceTable: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const sourceTable = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(input);
  const text =
    sourceTable.status === "ready"
      ? "Slice 235 evidence row table digest is ready: " +
        String(sourceTable.satisfiedRequirementCount) +
        " activation requirements satisfied, activation remains controlled."
      : "Slice 235 evidence row table digest is blocked: " +
        String(sourceTable.blockedRequirementCount) +
        " activation requirements blocked, activation not authorized.";

  return {
    label: "Slice 235 evidence row table digest",
    status: sourceTable.status,
    sourceTable,
    rowCount: sourceTable.rowCount,
    blockedRequirementCount: sourceTable.blockedRequirementCount,
    satisfiedRequirementCount: sourceTable.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  sourceDigest: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const sourceDigest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(input);
  const text =
    sourceDigest.status === "ready"
      ? "Slice 236 evidence row table digest status line is ready: " +
        sourceDigest.text
      : "Slice 236 evidence row table digest status line is blocked: " +
        sourceDigest.text;

  return {
    label: "Slice 236 evidence row table digest status line",
    status: sourceDigest.status,
    sourceDigest,
    rowCount: sourceDigest.rowCount,
    blockedRequirementCount: sourceDigest.blockedRequirementCount,
    satisfiedRequirementCount: sourceDigest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  sourceStatusLine: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine;
  rowLabel: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const sourceStatusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(input);
  const text =
    sourceStatusLine.status === "ready"
      ? "Slice 237 production activation evidence row is ready: " +
        sourceStatusLine.text
      : "Slice 237 production activation evidence row is blocked: " +
        sourceStatusLine.text;

  return {
    label: "Slice 237 production activation evidence row",
    status: sourceStatusLine.status,
    sourceStatusLine,
    rowLabel: "Slice 237 production activation evidence row",
    rowCount: sourceStatusLine.rowCount,
    blockedRequirementCount: sourceStatusLine.blockedRequirementCount,
    satisfiedRequirementCount: sourceStatusLine.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable = {
  label: string;
  status: "ready" | "blocked";
  rows: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow[];
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  activationAuthorized: false;
};

export function buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable {
  const row = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(input);

  return {
    label: row.label,
    status: row.status,
    rows: [row],
    rowCount: 1,
    blockedRequirementCount: row.blockedRequirementCount,
    satisfiedRequirementCount: row.satisfiedRequirementCount,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest = {
  label: string;
  status: "ready" | "blocked";
  sourceTable: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest {
  const sourceTable = buildComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTable(input);
  const text =
    sourceTable.status === "ready"
      ? "Slice 239 evidence row table digest is ready: " +
        String(sourceTable.satisfiedRequirementCount) +
        " activation requirements satisfied, activation remains controlled."
      : "Slice 239 evidence row table digest is blocked: " +
        String(sourceTable.blockedRequirementCount) +
        " activation requirements blocked, activation not authorized.";

  return {
    label: "Slice 239 evidence row table digest",
    status: sourceTable.status,
    sourceTable,
    rowCount: sourceTable.rowCount,
    blockedRequirementCount: sourceTable.blockedRequirementCount,
    satisfiedRequirementCount: sourceTable.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine = {
  label: string;
  status: "ready" | "blocked";
  sourceDigest: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine {
  const sourceDigest = digestComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigest(input);
  const text =
    sourceDigest.status === "ready"
      ? "Slice 240 evidence row table digest status line is ready: " +
        sourceDigest.text
      : "Slice 240 evidence row table digest status line is blocked: " +
        sourceDigest.text;

  return {
    label: "Slice 240 evidence row table digest status line",
    status: sourceDigest.status,
    sourceDigest,
    rowCount: sourceDigest.rowCount,
    blockedRequirementCount: sourceDigest.blockedRequirementCount,
    satisfiedRequirementCount: sourceDigest.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow = {
  label: string;
  status: "ready" | "blocked";
  sourceStatusLine: PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine;
  rowLabel: string;
  rowCount: number;
  blockedRequirementCount: number;
  satisfiedRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow {
  const sourceStatusLine = describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLine(input);
  const text =
    sourceStatusLine.status === "ready"
      ? "Slice 241 production activation evidence row is ready: " +
        sourceStatusLine.text
      : "Slice 241 production activation evidence row is blocked: " +
        sourceStatusLine.text;

  return {
    label: "Slice 241 production activation evidence row",
    status: sourceStatusLine.status,
    sourceStatusLine,
    rowLabel: "Slice 241 production activation evidence row",
    rowCount: sourceStatusLine.rowCount,
    blockedRequirementCount: sourceStatusLine.blockedRequirementCount,
    satisfiedRequirementCount: sourceStatusLine.satisfiedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice242EvidenceSummary = {
  label: string;
  status: "ready" | "blocked";
  sourceRow: ReturnType<
    typeof describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow
  >;
  readyRequirementCount: number;
  missingRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function summarizePosCashShortageProductionActivationSlice242Evidence(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice242EvidenceSummary {
  const sourceRow =
    describeComposedPosCashShortageProductionActivationReviewEvidenceTablePacketArtifactEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableEvidenceTableTableEvidenceTableEvidenceRowTableStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRowTableDigestStatusLineEvidenceRow(
      input,
    );
  const text =
    sourceRow.status === "ready"
      ? "Slice 242 production activation evidence summary is ready: " +
        sourceRow.text
      : "Slice 242 production activation evidence summary is blocked: " +
        sourceRow.text;

  return {
    label: "Slice 242 production activation evidence summary",
    status: sourceRow.status,
    sourceRow,
    readyRequirementCount: sourceRow.satisfiedRequirementCount,
    missingRequirementCount: sourceRow.blockedRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice243EvidenceBadge = {
  label: string;
  status: "ready" | "blocked";
  badgeTone: "clear" | "attention";
  sourceSummary: PosCashShortageProductionActivationSlice242EvidenceSummary;
  readyRequirementCount: number;
  missingRequirementCount: number;
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice243EvidenceBadge(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice243EvidenceBadge {
  const sourceSummary = summarizePosCashShortageProductionActivationSlice242Evidence(input);
  const badgeTone = sourceSummary.status === "ready" ? "clear" : "attention";
  const text =
    sourceSummary.status === "ready"
      ? "Slice 243 production activation evidence badge is clear: " +
        sourceSummary.text
      : "Slice 243 production activation evidence badge needs attention: " +
        sourceSummary.text;

  return {
    label: "Slice 243 production activation evidence badge",
    status: sourceSummary.status,
    badgeTone,
    sourceSummary,
    readyRequirementCount: sourceSummary.readyRequirementCount,
    missingRequirementCount: sourceSummary.missingRequirementCount,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice244EvidenceTile = {
  title: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceBadge: PosCashShortageProductionActivationSlice243EvidenceBadge;
  metricLabel: string;
  metricValue: string;
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice244EvidenceTile(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice244EvidenceTile {
  const sourceBadge = buildPosCashShortageProductionActivationSlice243EvidenceBadge(input);
  const metricValue =
    sourceBadge.readyRequirementCount.toString() +
    "/" +
    POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REQUIREMENTS.length.toString();
  const text =
    sourceBadge.status === "ready"
      ? "Slice 244 production activation evidence tile is clear: " +
        sourceBadge.text
      : "Slice 244 production activation evidence tile needs attention: " +
        sourceBadge.text;

  return {
    title: "Slice 244 production activation evidence tile",
    status: sourceBadge.status,
    tone: sourceBadge.badgeTone,
    sourceBadge,
    metricLabel: "Certified activation requirements",
    metricValue,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice245EvidenceCard = {
  heading: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceTile: PosCashShortageProductionActivationSlice244EvidenceTile;
  primaryMetric: string;
  secondaryMetric: string;
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice245EvidenceCard(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice245EvidenceCard {
  const sourceTile = buildPosCashShortageProductionActivationSlice244EvidenceTile(input);
  const secondaryMetric =
    sourceTile.status === "ready"
      ? "No activation requirements missing"
      : sourceTile.sourceBadge.missingRequirementCount.toString() +
        " activation requirements missing";
  const text =
    sourceTile.status === "ready"
      ? "Slice 245 production activation evidence card is clear: " +
        sourceTile.text
      : "Slice 245 production activation evidence card needs attention: " +
        sourceTile.text;

  return {
    heading: "Slice 245 production activation evidence card",
    status: sourceTile.status,
    tone: sourceTile.tone,
    sourceTile,
    primaryMetric: sourceTile.metricValue,
    secondaryMetric,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice246EvidencePanel = {
  title: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceCard: PosCashShortageProductionActivationSlice245EvidenceCard;
  metrics: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice246EvidencePanel(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice246EvidencePanel {
  const sourceCard = buildPosCashShortageProductionActivationSlice245EvidenceCard(input);
  const metrics = [sourceCard.primaryMetric, sourceCard.secondaryMetric] as const;
  const text =
    sourceCard.status === "ready"
      ? "Slice 246 production activation evidence panel is clear: " +
        sourceCard.text
      : "Slice 246 production activation evidence panel needs attention: " +
        sourceCard.text;

  return {
    title: "Slice 246 production activation evidence panel",
    status: sourceCard.status,
    tone: sourceCard.tone,
    sourceCard,
    metrics,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice247EvidenceSection = {
  heading: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourcePanel: PosCashShortageProductionActivationSlice246EvidencePanel;
  lines: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice247EvidenceSection(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice247EvidenceSection {
  const sourcePanel = buildPosCashShortageProductionActivationSlice246EvidencePanel(input);
  const lines = [sourcePanel.title, ...sourcePanel.metrics] as const;
  const text =
    sourcePanel.status === "ready"
      ? "Slice 247 production activation evidence section is clear: " +
        sourcePanel.text
      : "Slice 247 production activation evidence section needs attention: " +
        sourcePanel.text;

  return {
    heading: "Slice 247 production activation evidence section",
    status: sourcePanel.status,
    tone: sourcePanel.tone,
    sourcePanel,
    lines,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice248EvidenceGroup = {
  name: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceSection: PosCashShortageProductionActivationSlice247EvidenceSection;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice248EvidenceGroup(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice248EvidenceGroup {
  const sourceSection = buildPosCashShortageProductionActivationSlice247EvidenceSection(input);
  const items = [sourceSection.heading, ...sourceSection.lines] as const;
  const text =
    sourceSection.status === "ready"
      ? "Slice 248 production activation evidence group is clear: " +
        sourceSection.text
      : "Slice 248 production activation evidence group needs attention: " +
        sourceSection.text;

  return {
    name: "Slice 248 production activation evidence group",
    status: sourceSection.status,
    tone: sourceSection.tone,
    sourceSection,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice249EvidenceBundle = {
  bundleName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceGroup: PosCashShortageProductionActivationSlice248EvidenceGroup;
  summaryCount: number;
  summaries: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice249EvidenceBundle(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice249EvidenceBundle {
  const sourceGroup = buildPosCashShortageProductionActivationSlice248EvidenceGroup(input);
  const summaries = [sourceGroup.name, ...sourceGroup.items] as const;
  const text =
    sourceGroup.status === "ready"
      ? "Slice 249 production activation evidence bundle is clear: " +
        sourceGroup.text
      : "Slice 249 production activation evidence bundle needs attention: " +
        sourceGroup.text;

  return {
    bundleName: "Slice 249 production activation evidence bundle",
    status: sourceGroup.status,
    tone: sourceGroup.tone,
    sourceGroup,
    summaryCount: summaries.length,
    summaries,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice250EvidenceCollection = {
  collectionName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceBundle: PosCashShortageProductionActivationSlice249EvidenceBundle;
  entryCount: number;
  entries: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice250EvidenceCollection(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice250EvidenceCollection {
  const sourceBundle = buildPosCashShortageProductionActivationSlice249EvidenceBundle(input);
  const entries = [sourceBundle.bundleName, ...sourceBundle.summaries] as const;
  const text =
    sourceBundle.status === "ready"
      ? "Slice 250 production activation evidence collection is clear: " +
        sourceBundle.text
      : "Slice 250 production activation evidence collection needs attention: " +
        sourceBundle.text;

  return {
    collectionName: "Slice 250 production activation evidence collection",
    status: sourceBundle.status,
    tone: sourceBundle.tone,
    sourceBundle,
    entryCount: entries.length,
    entries,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice251EvidenceArchive = {
  archiveName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceCollection: PosCashShortageProductionActivationSlice250EvidenceCollection;
  recordCount: number;
  records: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice251EvidenceArchive(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice251EvidenceArchive {
  const sourceCollection = buildPosCashShortageProductionActivationSlice250EvidenceCollection(input);
  const records = [sourceCollection.collectionName, ...sourceCollection.entries] as const;
  const text =
    sourceCollection.status === "ready"
      ? "Slice 251 production activation evidence archive is clear: " +
        sourceCollection.text
      : "Slice 251 production activation evidence archive needs attention: " +
        sourceCollection.text;

  return {
    archiveName: "Slice 251 production activation evidence archive",
    status: sourceCollection.status,
    tone: sourceCollection.tone,
    sourceCollection,
    recordCount: records.length,
    records,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice252EvidenceLedger = {
  ledgerName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceArchive: PosCashShortageProductionActivationSlice251EvidenceArchive;
  lineCount: number;
  ledgerLines: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice252EvidenceLedger(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice252EvidenceLedger {
  const sourceArchive = buildPosCashShortageProductionActivationSlice251EvidenceArchive(input);
  const ledgerLines = [sourceArchive.archiveName, ...sourceArchive.records] as const;
  const text =
    sourceArchive.status === "ready"
      ? "Slice 252 production activation evidence ledger is clear: " +
        sourceArchive.text
      : "Slice 252 production activation evidence ledger needs attention: " +
        sourceArchive.text;

  return {
    ledgerName: "Slice 252 production activation evidence ledger",
    status: sourceArchive.status,
    tone: sourceArchive.tone,
    sourceArchive,
    lineCount: ledgerLines.length,
    ledgerLines,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice253EvidenceRegister = {
  registerName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceLedger: PosCashShortageProductionActivationSlice252EvidenceLedger;
  rowCount: number;
  rows: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice253EvidenceRegister(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice253EvidenceRegister {
  const sourceLedger = buildPosCashShortageProductionActivationSlice252EvidenceLedger(input);
  const rows = [sourceLedger.ledgerName, ...sourceLedger.ledgerLines] as const;
  const text =
    sourceLedger.status === "ready"
      ? "Slice 253 production activation evidence register is clear: " +
        sourceLedger.text
      : "Slice 253 production activation evidence register needs attention: " +
        sourceLedger.text;

  return {
    registerName: "Slice 253 production activation evidence register",
    status: sourceLedger.status,
    tone: sourceLedger.tone,
    sourceLedger,
    rowCount: rows.length,
    rows,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice254EvidenceCatalog = {
  catalogName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceRegister: PosCashShortageProductionActivationSlice253EvidenceRegister;
  entryCount: number;
  entries: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice254EvidenceCatalog(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice254EvidenceCatalog {
  const sourceRegister = buildPosCashShortageProductionActivationSlice253EvidenceRegister(input);
  const entries = [sourceRegister.registerName, ...sourceRegister.rows] as const;
  const text =
    sourceRegister.status === "ready"
      ? "Slice 254 production activation evidence catalog is clear: " +
        sourceRegister.text
      : "Slice 254 production activation evidence catalog needs attention: " +
        sourceRegister.text;

  return {
    catalogName: "Slice 254 production activation evidence catalog",
    status: sourceRegister.status,
    tone: sourceRegister.tone,
    sourceRegister,
    entryCount: entries.length,
    entries,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice255EvidenceIndex = {
  indexName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceCatalog: PosCashShortageProductionActivationSlice254EvidenceCatalog;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice255EvidenceIndex(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice255EvidenceIndex {
  const sourceCatalog = buildPosCashShortageProductionActivationSlice254EvidenceCatalog(input);
  const items = [sourceCatalog.catalogName, ...sourceCatalog.entries] as const;
  const text =
    sourceCatalog.status === "ready"
      ? "Slice 255 production activation evidence index is clear: " +
        sourceCatalog.text
      : "Slice 255 production activation evidence index needs attention: " +
        sourceCatalog.text;

  return {
    indexName: "Slice 255 production activation evidence index",
    status: sourceCatalog.status,
    tone: sourceCatalog.tone,
    sourceCatalog,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice256EvidenceDirectory = {
  directoryName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceIndex: PosCashShortageProductionActivationSlice255EvidenceIndex;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice256EvidenceDirectory(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice256EvidenceDirectory {
  const sourceIndex = buildPosCashShortageProductionActivationSlice255EvidenceIndex(input);
  const items = [sourceIndex.indexName, ...sourceIndex.items] as const;
  const text =
    sourceIndex.status === "ready"
      ? "Slice 256 production activation evidence directory is clear: " +
        sourceIndex.text
      : "Slice 256 production activation evidence directory needs attention: " +
        sourceIndex.text;

  return {
    directoryName: "Slice 256 production activation evidence directory",
    status: sourceIndex.status,
    tone: sourceIndex.tone,
    sourceIndex,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice257EvidenceMap = {
  mapName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceDirectory: PosCashShortageProductionActivationSlice256EvidenceDirectory;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice257EvidenceMap(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice257EvidenceMap {
  const sourceDirectory = buildPosCashShortageProductionActivationSlice256EvidenceDirectory(input);
  const items = [sourceDirectory.directoryName, ...sourceDirectory.items] as const;
  const text =
    sourceDirectory.status === "ready"
      ? "Slice 257 production activation evidence map is clear: " +
        sourceDirectory.text
      : "Slice 257 production activation evidence map needs attention: " +
        sourceDirectory.text;

  return {
    mapName: "Slice 257 production activation evidence map",
    status: sourceDirectory.status,
    tone: sourceDirectory.tone,
    sourceDirectory,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice258EvidenceAtlas = {
  atlasName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceMap: PosCashShortageProductionActivationSlice257EvidenceMap;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice258EvidenceAtlas(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice258EvidenceAtlas {
  const sourceMap = buildPosCashShortageProductionActivationSlice257EvidenceMap(input);
  const items = [sourceMap.mapName, ...sourceMap.items] as const;
  const text =
    sourceMap.status === "ready"
      ? "Slice 258 production activation evidence atlas is clear: " +
        sourceMap.text
      : "Slice 258 production activation evidence atlas needs attention: " +
        sourceMap.text;

  return {
    atlasName: "Slice 258 production activation evidence atlas",
    status: sourceMap.status,
    tone: sourceMap.tone,
    sourceMap,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice259EvidenceChart = {
  chartName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceAtlas: PosCashShortageProductionActivationSlice258EvidenceAtlas;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice259EvidenceChart(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice259EvidenceChart {
  const sourceAtlas = buildPosCashShortageProductionActivationSlice258EvidenceAtlas(input);
  const items = [sourceAtlas.atlasName, ...sourceAtlas.items] as const;
  const text =
    sourceAtlas.status === "ready"
      ? "Slice 259 production activation evidence chart is clear: " +
        sourceAtlas.text
      : "Slice 259 production activation evidence chart needs attention: " +
        sourceAtlas.text;

  return {
    chartName: "Slice 259 production activation evidence chart",
    status: sourceAtlas.status,
    tone: sourceAtlas.tone,
    sourceAtlas,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice260EvidenceMatrix = {
  matrixName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceChart: PosCashShortageProductionActivationSlice259EvidenceChart;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice260EvidenceMatrix(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice260EvidenceMatrix {
  const sourceChart = buildPosCashShortageProductionActivationSlice259EvidenceChart(input);
  const items = [sourceChart.chartName, ...sourceChart.items] as const;
  const text =
    sourceChart.status === "ready"
      ? "Slice 260 production activation evidence matrix is clear: " +
        sourceChart.text
      : "Slice 260 production activation evidence matrix needs attention: " +
        sourceChart.text;

  return {
    matrixName: "Slice 260 production activation evidence matrix",
    status: sourceChart.status,
    tone: sourceChart.tone,
    sourceChart,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice261EvidenceGrid = {
  gridName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceMatrix: PosCashShortageProductionActivationSlice260EvidenceMatrix;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice261EvidenceGrid(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice261EvidenceGrid {
  const sourceMatrix = buildPosCashShortageProductionActivationSlice260EvidenceMatrix(input);
  const items = [sourceMatrix.matrixName, ...sourceMatrix.items] as const;
  const text =
    sourceMatrix.status === "ready"
      ? "Slice 261 production activation evidence grid is clear: " +
        sourceMatrix.text
      : "Slice 261 production activation evidence grid needs attention: " +
        sourceMatrix.text;

  return {
    gridName: "Slice 261 production activation evidence grid",
    status: sourceMatrix.status,
    tone: sourceMatrix.tone,
    sourceMatrix,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice262EvidenceBoard = {
  boardName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceGrid: PosCashShortageProductionActivationSlice261EvidenceGrid;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice262EvidenceBoard(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice262EvidenceBoard {
  const sourceGrid = buildPosCashShortageProductionActivationSlice261EvidenceGrid(input);
  const items = [sourceGrid.gridName, ...sourceGrid.items] as const;
  const text =
    sourceGrid.status === "ready"
      ? "Slice 262 production activation evidence board is clear: " +
        sourceGrid.text
      : "Slice 262 production activation evidence board needs attention: " +
        sourceGrid.text;

  return {
    boardName: "Slice 262 production activation evidence board",
    status: sourceGrid.status,
    tone: sourceGrid.tone,
    sourceGrid,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice263EvidenceCanvas = {
  canvasName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceBoard: PosCashShortageProductionActivationSlice262EvidenceBoard;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice263EvidenceCanvas(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice263EvidenceCanvas {
  const sourceBoard = buildPosCashShortageProductionActivationSlice262EvidenceBoard(input);
  const items = [sourceBoard.boardName, ...sourceBoard.items] as const;
  const text =
    sourceBoard.status === "ready"
      ? "Slice 263 production activation evidence canvas is clear: " +
        sourceBoard.text
      : "Slice 263 production activation evidence canvas needs attention: " +
        sourceBoard.text;

  return {
    canvasName: "Slice 263 production activation evidence canvas",
    status: sourceBoard.status,
    tone: sourceBoard.tone,
    sourceBoard,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice264EvidenceFrame = {
  frameName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceCanvas: PosCashShortageProductionActivationSlice263EvidenceCanvas;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice264EvidenceFrame(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice264EvidenceFrame {
  const sourceCanvas = buildPosCashShortageProductionActivationSlice263EvidenceCanvas(input);
  const items = [sourceCanvas.canvasName, ...sourceCanvas.items] as const;
  const text =
    sourceCanvas.status === "ready"
      ? "Slice 264 production activation evidence frame is clear: " +
        sourceCanvas.text
      : "Slice 264 production activation evidence frame needs attention: " +
        sourceCanvas.text;

  return {
    frameName: "Slice 264 production activation evidence frame",
    status: sourceCanvas.status,
    tone: sourceCanvas.tone,
    sourceCanvas,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice265EvidenceSheet = {
  sheetName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceFrame: PosCashShortageProductionActivationSlice264EvidenceFrame;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice265EvidenceSheet(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice265EvidenceSheet {
  const sourceFrame = buildPosCashShortageProductionActivationSlice264EvidenceFrame(input);
  const items = [sourceFrame.frameName, ...sourceFrame.items] as const;
  const text =
    sourceFrame.status === "ready"
      ? "Slice 265 production activation evidence sheet is clear: " +
        sourceFrame.text
      : "Slice 265 production activation evidence sheet needs attention: " +
        sourceFrame.text;

  return {
    sheetName: "Slice 265 production activation evidence sheet",
    status: sourceFrame.status,
    tone: sourceFrame.tone,
    sourceFrame,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice266EvidencePage = {
  pageName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceSheet: PosCashShortageProductionActivationSlice265EvidenceSheet;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice266EvidencePage(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice266EvidencePage {
  const sourceSheet = buildPosCashShortageProductionActivationSlice265EvidenceSheet(input);
  const items = [sourceSheet.sheetName, ...sourceSheet.items] as const;
  const text =
    sourceSheet.status === "ready"
      ? "Slice 266 production activation evidence page is clear: " +
        sourceSheet.text
      : "Slice 266 production activation evidence page needs attention: " +
        sourceSheet.text;

  return {
    pageName: "Slice 266 production activation evidence page",
    status: sourceSheet.status,
    tone: sourceSheet.tone,
    sourceSheet,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice267EvidenceLeaf = {
  leafName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourcePage: PosCashShortageProductionActivationSlice266EvidencePage;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice267EvidenceLeaf(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice267EvidenceLeaf {
  const sourcePage = buildPosCashShortageProductionActivationSlice266EvidencePage(input);
  const items = [sourcePage.pageName, ...sourcePage.items] as const;
  const text =
    sourcePage.status === "ready"
      ? "Slice 267 production activation evidence leaf is clear: " +
        sourcePage.text
      : "Slice 267 production activation evidence leaf needs attention: " +
        sourcePage.text;

  return {
    leafName: "Slice 267 production activation evidence leaf",
    status: sourcePage.status,
    tone: sourcePage.tone,
    sourcePage,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice268EvidenceBranch = {
  branchName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceLeaf: PosCashShortageProductionActivationSlice267EvidenceLeaf;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice268EvidenceBranch(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice268EvidenceBranch {
  const sourceLeaf = buildPosCashShortageProductionActivationSlice267EvidenceLeaf(input);
  const items = [sourceLeaf.leafName, ...sourceLeaf.items] as const;
  const text =
    sourceLeaf.status === "ready"
      ? "Slice 268 production activation evidence branch is clear: " +
        sourceLeaf.text
      : "Slice 268 production activation evidence branch needs attention: " +
        sourceLeaf.text;

  return {
    branchName: "Slice 268 production activation evidence branch",
    status: sourceLeaf.status,
    tone: sourceLeaf.tone,
    sourceLeaf,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice269EvidenceStem = {
  stemName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceBranch: PosCashShortageProductionActivationSlice268EvidenceBranch;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice269EvidenceStem(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice269EvidenceStem {
  const sourceBranch = buildPosCashShortageProductionActivationSlice268EvidenceBranch(input);
  const items = [sourceBranch.branchName, ...sourceBranch.items] as const;
  const text =
    sourceBranch.status === "ready"
      ? "Slice 269 production activation evidence stem is clear: " +
        sourceBranch.text
      : "Slice 269 production activation evidence stem needs attention: " +
        sourceBranch.text;

  return {
    stemName: "Slice 269 production activation evidence stem",
    status: sourceBranch.status,
    tone: sourceBranch.tone,
    sourceBranch,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice270EvidenceRoot = {
  rootName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceStem: PosCashShortageProductionActivationSlice269EvidenceStem;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice270EvidenceRoot(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice270EvidenceRoot {
  const sourceStem = buildPosCashShortageProductionActivationSlice269EvidenceStem(input);
  const items = [sourceStem.stemName, ...sourceStem.items] as const;
  const text =
    sourceStem.status === "ready"
      ? "Slice 270 production activation evidence root is clear: " +
        sourceStem.text
      : "Slice 270 production activation evidence root needs attention: " +
        sourceStem.text;

  return {
    rootName: "Slice 270 production activation evidence root",
    status: sourceStem.status,
    tone: sourceStem.tone,
    sourceStem,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice271EvidenceTrunk = {
  trunkName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceRoot: PosCashShortageProductionActivationSlice270EvidenceRoot;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice271EvidenceTrunk(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice271EvidenceTrunk {
  const sourceRoot = buildPosCashShortageProductionActivationSlice270EvidenceRoot(input);
  const items = [sourceRoot.rootName, ...sourceRoot.items] as const;
  const text =
    sourceRoot.status === "ready"
      ? "Slice 271 production activation evidence trunk is clear: " +
        sourceRoot.text
      : "Slice 271 production activation evidence trunk needs attention: " +
        sourceRoot.text;

  return {
    trunkName: "Slice 271 production activation evidence trunk",
    status: sourceRoot.status,
    tone: sourceRoot.tone,
    sourceRoot,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice272EvidenceCrown = {
  crownName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceTrunk: PosCashShortageProductionActivationSlice271EvidenceTrunk;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice272EvidenceCrown(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice272EvidenceCrown {
  const sourceTrunk = buildPosCashShortageProductionActivationSlice271EvidenceTrunk(input);
  const items = [sourceTrunk.trunkName, ...sourceTrunk.items] as const;
  const text =
    sourceTrunk.status === "ready"
      ? "Slice 272 production activation evidence crown is clear: " +
        sourceTrunk.text
      : "Slice 272 production activation evidence crown needs attention: " +
        sourceTrunk.text;

  return {
    crownName: "Slice 272 production activation evidence crown",
    status: sourceTrunk.status,
    tone: sourceTrunk.tone,
    sourceTrunk,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice273EvidenceCap = {
  capName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceCrown: PosCashShortageProductionActivationSlice272EvidenceCrown;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice273EvidenceCap(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice273EvidenceCap {
  const sourceCrown = buildPosCashShortageProductionActivationSlice272EvidenceCrown(input);
  const items = [sourceCrown.crownName, ...sourceCrown.items] as const;
  const text =
    sourceCrown.status === "ready"
      ? "Slice 273 production activation evidence cap is clear: " +
        sourceCrown.text
      : "Slice 273 production activation evidence cap needs attention: " +
        sourceCrown.text;

  return {
    capName: "Slice 273 production activation evidence cap",
    status: sourceCrown.status,
    tone: sourceCrown.tone,
    sourceCrown,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice274EvidenceSeal = {
  sealName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceCap: PosCashShortageProductionActivationSlice273EvidenceCap;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice274EvidenceSeal(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice274EvidenceSeal {
  const sourceCap = buildPosCashShortageProductionActivationSlice273EvidenceCap(input);
  const items = [sourceCap.capName, ...sourceCap.items] as const;
  const text =
    sourceCap.status === "ready"
      ? "Slice 274 production activation evidence seal is clear: " +
        sourceCap.text
      : "Slice 274 production activation evidence seal needs attention: " +
        sourceCap.text;

  return {
    sealName: "Slice 274 production activation evidence seal",
    status: sourceCap.status,
    tone: sourceCap.tone,
    sourceCap,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice275EvidenceStamp = {
  stampName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceSeal: PosCashShortageProductionActivationSlice274EvidenceSeal;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice275EvidenceStamp(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice275EvidenceStamp {
  const sourceSeal = buildPosCashShortageProductionActivationSlice274EvidenceSeal(input);
  const items = [sourceSeal.sealName, ...sourceSeal.items] as const;
  const text =
    sourceSeal.status === "ready"
      ? "Slice 275 production activation evidence stamp is clear: " +
        sourceSeal.text
      : "Slice 275 production activation evidence stamp needs attention: " +
        sourceSeal.text;

  return {
    stampName: "Slice 275 production activation evidence stamp",
    status: sourceSeal.status,
    tone: sourceSeal.tone,
    sourceSeal,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice276EvidenceMark = {
  markName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceStamp: PosCashShortageProductionActivationSlice275EvidenceStamp;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice276EvidenceMark(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice276EvidenceMark {
  const sourceStamp = buildPosCashShortageProductionActivationSlice275EvidenceStamp(input);
  const items = [sourceStamp.stampName, ...sourceStamp.items] as const;
  const text =
    sourceStamp.status === "ready"
      ? "Slice 276 production activation evidence mark is clear: " +
        sourceStamp.text
      : "Slice 276 production activation evidence mark needs attention: " +
        sourceStamp.text;

  return {
    markName: "Slice 276 production activation evidence mark",
    status: sourceStamp.status,
    tone: sourceStamp.tone,
    sourceStamp,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice277EvidenceLabel = {
  labelName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceMark: PosCashShortageProductionActivationSlice276EvidenceMark;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice277EvidenceLabel(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice277EvidenceLabel {
  const sourceMark = buildPosCashShortageProductionActivationSlice276EvidenceMark(input);
  const items = [sourceMark.markName, ...sourceMark.items] as const;
  const text =
    sourceMark.status === "ready"
      ? "Slice 277 production activation evidence label is clear: " +
        sourceMark.text
      : "Slice 277 production activation evidence label needs attention: " +
        sourceMark.text;

  return {
    labelName: "Slice 277 production activation evidence label",
    status: sourceMark.status,
    tone: sourceMark.tone,
    sourceMark,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice278EvidenceTag = {
  tagName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceLabel: PosCashShortageProductionActivationSlice277EvidenceLabel;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice278EvidenceTag(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice278EvidenceTag {
  const sourceLabel = buildPosCashShortageProductionActivationSlice277EvidenceLabel(input);
  const items = [sourceLabel.labelName, ...sourceLabel.items] as const;
  const text =
    sourceLabel.status === "ready"
      ? "Slice 278 production activation evidence tag is clear: " +
        sourceLabel.text
      : "Slice 278 production activation evidence tag needs attention: " +
        sourceLabel.text;

  return {
    tagName: "Slice 278 production activation evidence tag",
    status: sourceLabel.status,
    tone: sourceLabel.tone,
    sourceLabel,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice279EvidenceNote = {
  noteName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceTag: PosCashShortageProductionActivationSlice278EvidenceTag;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice279EvidenceNote(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice279EvidenceNote {
  const sourceTag = buildPosCashShortageProductionActivationSlice278EvidenceTag(input);
  const items = [sourceTag.tagName, ...sourceTag.items] as const;
  const text =
    sourceTag.status === "ready"
      ? "Slice 279 production activation evidence note is clear: " +
        sourceTag.text
      : "Slice 279 production activation evidence note needs attention: " +
        sourceTag.text;

  return {
    noteName: "Slice 279 production activation evidence note",
    status: sourceTag.status,
    tone: sourceTag.tone,
    sourceTag,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice280EvidenceMemo = {
  memoName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceNote: PosCashShortageProductionActivationSlice279EvidenceNote;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice280EvidenceMemo(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice280EvidenceMemo {
  const sourceNote = buildPosCashShortageProductionActivationSlice279EvidenceNote(input);
  const items = [sourceNote.noteName, ...sourceNote.items] as const;
  const text =
    sourceNote.status === "ready"
      ? "Slice 280 production activation evidence memo is clear: " +
        sourceNote.text
      : "Slice 280 production activation evidence memo needs attention: " +
        sourceNote.text;

  return {
    memoName: "Slice 280 production activation evidence memo",
    status: sourceNote.status,
    tone: sourceNote.tone,
    sourceNote,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice281EvidenceRecord = {
  recordName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceMemo: PosCashShortageProductionActivationSlice280EvidenceMemo;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice281EvidenceRecord(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice281EvidenceRecord {
  const sourceMemo = buildPosCashShortageProductionActivationSlice280EvidenceMemo(input);
  const items = [sourceMemo.memoName, ...sourceMemo.items] as const;
  const text =
    sourceMemo.status === "ready"
      ? "Slice 281 production activation evidence record is clear: " +
        sourceMemo.text
      : "Slice 281 production activation evidence record needs attention: " +
        sourceMemo.text;

  return {
    recordName: "Slice 281 production activation evidence record",
    status: sourceMemo.status,
    tone: sourceMemo.tone,
    sourceMemo,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice282EvidenceEntry = {
  entryName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceRecord: PosCashShortageProductionActivationSlice281EvidenceRecord;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice282EvidenceEntry(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice282EvidenceEntry {
  const sourceRecord = buildPosCashShortageProductionActivationSlice281EvidenceRecord(input);
  const items = [sourceRecord.recordName, ...sourceRecord.items] as const;
  const text =
    sourceRecord.status === "ready"
      ? "Slice 282 production activation evidence entry is clear: " +
        sourceRecord.text
      : "Slice 282 production activation evidence entry needs attention: " +
        sourceRecord.text;

  return {
    entryName: "Slice 282 production activation evidence entry",
    status: sourceRecord.status,
    tone: sourceRecord.tone,
    sourceRecord,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice283EvidenceItem = {
  itemName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceEntry: PosCashShortageProductionActivationSlice282EvidenceEntry;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice283EvidenceItem(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice283EvidenceItem {
  const sourceEntry = buildPosCashShortageProductionActivationSlice282EvidenceEntry(input);
  const items = [sourceEntry.entryName, ...sourceEntry.items] as const;
  const text =
    sourceEntry.status === "ready"
      ? "Slice 283 production activation evidence item is clear: " +
        sourceEntry.text
      : "Slice 283 production activation evidence item needs attention: " +
        sourceEntry.text;

  return {
    itemName: "Slice 283 production activation evidence item",
    status: sourceEntry.status,
    tone: sourceEntry.tone,
    sourceEntry,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice284EvidenceUnit = {
  unitName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceItem: PosCashShortageProductionActivationSlice283EvidenceItem;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice284EvidenceUnit(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice284EvidenceUnit {
  const sourceItem = buildPosCashShortageProductionActivationSlice283EvidenceItem(input);
  const items = [sourceItem.itemName, ...sourceItem.items] as const;
  const text =
    sourceItem.status === "ready"
      ? "Slice 284 production activation evidence unit is clear: " +
        sourceItem.text
      : "Slice 284 production activation evidence unit needs attention: " +
        sourceItem.text;

  return {
    unitName: "Slice 284 production activation evidence unit",
    status: sourceItem.status,
    tone: sourceItem.tone,
    sourceItem,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice285EvidenceNode = {
  nodeName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceUnit: PosCashShortageProductionActivationSlice284EvidenceUnit;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice285EvidenceNode(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice285EvidenceNode {
  const sourceUnit = buildPosCashShortageProductionActivationSlice284EvidenceUnit(input);
  const items = [sourceUnit.unitName, ...sourceUnit.items] as const;
  const text =
    sourceUnit.status === "ready"
      ? "Slice 285 production activation evidence node is clear: " +
        sourceUnit.text
      : "Slice 285 production activation evidence node needs attention: " +
        sourceUnit.text;

  return {
    nodeName: "Slice 285 production activation evidence node",
    status: sourceUnit.status,
    tone: sourceUnit.tone,
    sourceUnit,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice286EvidencePoint = {
  pointName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceNode: PosCashShortageProductionActivationSlice285EvidenceNode;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice286EvidencePoint(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice286EvidencePoint {
  const sourceNode = buildPosCashShortageProductionActivationSlice285EvidenceNode(input);
  const items = [sourceNode.nodeName, ...sourceNode.items] as const;
  const text =
    sourceNode.status === "ready"
      ? "Slice 286 production activation evidence point is clear: " +
        sourceNode.text
      : "Slice 286 production activation evidence point needs attention: " +
        sourceNode.text;

  return {
    pointName: "Slice 286 production activation evidence point",
    status: sourceNode.status,
    tone: sourceNode.tone,
    sourceNode,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice287EvidenceAnchor = {
  anchorName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourcePoint: PosCashShortageProductionActivationSlice286EvidencePoint;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice287EvidenceAnchor(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice287EvidenceAnchor {
  const sourcePoint = buildPosCashShortageProductionActivationSlice286EvidencePoint(input);
  const items = [sourcePoint.pointName, ...sourcePoint.items] as const;
  const text =
    sourcePoint.status === "ready"
      ? "Slice 287 production activation evidence anchor is clear: " +
        sourcePoint.text
      : "Slice 287 production activation evidence anchor needs attention: " +
        sourcePoint.text;

  return {
    anchorName: "Slice 287 production activation evidence anchor",
    status: sourcePoint.status,
    tone: sourcePoint.tone,
    sourcePoint,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice288EvidenceLink = {
  linkName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceAnchor: PosCashShortageProductionActivationSlice287EvidenceAnchor;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice288EvidenceLink(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice288EvidenceLink {
  const sourceAnchor = buildPosCashShortageProductionActivationSlice287EvidenceAnchor(input);
  const items = [sourceAnchor.anchorName, ...sourceAnchor.items] as const;
  const text =
    sourceAnchor.status === "ready"
      ? "Slice 288 production activation evidence link is clear: " +
        sourceAnchor.text
      : "Slice 288 production activation evidence link needs attention: " +
        sourceAnchor.text;

  return {
    linkName: "Slice 288 production activation evidence link",
    status: sourceAnchor.status,
    tone: sourceAnchor.tone,
    sourceAnchor,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice289EvidenceBridge = {
  bridgeName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceLink: PosCashShortageProductionActivationSlice288EvidenceLink;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice289EvidenceBridge(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice289EvidenceBridge {
  const sourceLink = buildPosCashShortageProductionActivationSlice288EvidenceLink(input);
  const items = [sourceLink.linkName, ...sourceLink.items] as const;
  const text =
    sourceLink.status === "ready"
      ? "Slice 289 production activation evidence bridge is clear: " +
        sourceLink.text
      : "Slice 289 production activation evidence bridge needs attention: " +
        sourceLink.text;

  return {
    bridgeName: "Slice 289 production activation evidence bridge",
    status: sourceLink.status,
    tone: sourceLink.tone,
    sourceLink,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice290EvidenceChannel = {
  channelName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceBridge: PosCashShortageProductionActivationSlice289EvidenceBridge;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice290EvidenceChannel(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice290EvidenceChannel {
  const sourceBridge = buildPosCashShortageProductionActivationSlice289EvidenceBridge(input);
  const items = [sourceBridge.bridgeName, ...sourceBridge.items] as const;
  const text =
    sourceBridge.status === "ready"
      ? "Slice 290 production activation evidence channel is clear: " +
        sourceBridge.text
      : "Slice 290 production activation evidence channel needs attention: " +
        sourceBridge.text;

  return {
    channelName: "Slice 290 production activation evidence channel",
    status: sourceBridge.status,
    tone: sourceBridge.tone,
    sourceBridge,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice291EvidenceLane = {
  laneName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceChannel: PosCashShortageProductionActivationSlice290EvidenceChannel;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice291EvidenceLane(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice291EvidenceLane {
  const sourceChannel = buildPosCashShortageProductionActivationSlice290EvidenceChannel(input);
  const items = [sourceChannel.channelName, ...sourceChannel.items] as const;
  const text =
    sourceChannel.status === "ready"
      ? "Slice 291 production activation evidence lane is clear: " +
        sourceChannel.text
      : "Slice 291 production activation evidence lane needs attention: " +
        sourceChannel.text;

  return {
    laneName: "Slice 291 production activation evidence lane",
    status: sourceChannel.status,
    tone: sourceChannel.tone,
    sourceChannel,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice292EvidencePath = {
  pathName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceLane: PosCashShortageProductionActivationSlice291EvidenceLane;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice292EvidencePath(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice292EvidencePath {
  const sourceLane = buildPosCashShortageProductionActivationSlice291EvidenceLane(input);
  const items = [sourceLane.laneName, ...sourceLane.items] as const;
  const text =
    sourceLane.status === "ready"
      ? "Slice 292 production activation evidence path is clear: " +
        sourceLane.text
      : "Slice 292 production activation evidence path needs attention: " +
        sourceLane.text;

  return {
    pathName: "Slice 292 production activation evidence path",
    status: sourceLane.status,
    tone: sourceLane.tone,
    sourceLane,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice293EvidenceRoute = {
  routeName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourcePath: PosCashShortageProductionActivationSlice292EvidencePath;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice293EvidenceRoute(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice293EvidenceRoute {
  const sourcePath = buildPosCashShortageProductionActivationSlice292EvidencePath(input);
  const items = [sourcePath.pathName, ...sourcePath.items] as const;
  const text =
    sourcePath.status === "ready"
      ? "Slice 293 production activation evidence route is clear: " +
        sourcePath.text
      : "Slice 293 production activation evidence route needs attention: " +
        sourcePath.text;

  return {
    routeName: "Slice 293 production activation evidence route",
    status: sourcePath.status,
    tone: sourcePath.tone,
    sourcePath,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice294EvidenceTrail = {
  trailName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceRoute: PosCashShortageProductionActivationSlice293EvidenceRoute;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice294EvidenceTrail(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice294EvidenceTrail {
  const sourceRoute = buildPosCashShortageProductionActivationSlice293EvidenceRoute(input);
  const items = [sourceRoute.routeName, ...sourceRoute.items] as const;
  const text =
    sourceRoute.status === "ready"
      ? "Slice 294 production activation evidence trail is clear: " +
        sourceRoute.text
      : "Slice 294 production activation evidence trail needs attention: " +
        sourceRoute.text;

  return {
    trailName: "Slice 294 production activation evidence trail",
    status: sourceRoute.status,
    tone: sourceRoute.tone,
    sourceRoute,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice295EvidenceTrace = {
  traceName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceTrail: PosCashShortageProductionActivationSlice294EvidenceTrail;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice295EvidenceTrace(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice295EvidenceTrace {
  const sourceTrail = buildPosCashShortageProductionActivationSlice294EvidenceTrail(input);
  const items = [sourceTrail.trailName, ...sourceTrail.items] as const;
  const text =
    sourceTrail.status === "ready"
      ? "Slice 295 production activation evidence trace is clear: " +
        sourceTrail.text
      : "Slice 295 production activation evidence trace needs attention: " +
        sourceTrail.text;

  return {
    traceName: "Slice 295 production activation evidence trace",
    status: sourceTrail.status,
    tone: sourceTrail.tone,
    sourceTrail,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice296EvidenceSpine = {
  spineName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceTrace: PosCashShortageProductionActivationSlice295EvidenceTrace;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice296EvidenceSpine(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice296EvidenceSpine {
  const sourceTrace = buildPosCashShortageProductionActivationSlice295EvidenceTrace(input);
  const items = [sourceTrace.traceName, ...sourceTrace.items] as const;
  const text =
    sourceTrace.status === "ready"
      ? "Slice 296 production activation evidence spine is clear: " +
        sourceTrace.text
      : "Slice 296 production activation evidence spine needs attention: " +
        sourceTrace.text;

  return {
    spineName: "Slice 296 production activation evidence spine",
    status: sourceTrace.status,
    tone: sourceTrace.tone,
    sourceTrace,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice297EvidenceRail = {
  railName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceSpine: PosCashShortageProductionActivationSlice296EvidenceSpine;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice297EvidenceRail(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice297EvidenceRail {
  const sourceSpine = buildPosCashShortageProductionActivationSlice296EvidenceSpine(input);
  const items = [sourceSpine.spineName, ...sourceSpine.items] as const;
  const text =
    sourceSpine.status === "ready"
      ? "Slice 297 production activation evidence rail is clear: " +
        sourceSpine.text
      : "Slice 297 production activation evidence rail needs attention: " +
        sourceSpine.text;

  return {
    railName: "Slice 297 production activation evidence rail",
    status: sourceSpine.status,
    tone: sourceSpine.tone,
    sourceSpine,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice298EvidenceBeam = {
  beamName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceRail: PosCashShortageProductionActivationSlice297EvidenceRail;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice298EvidenceBeam(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice298EvidenceBeam {
  const sourceRail = buildPosCashShortageProductionActivationSlice297EvidenceRail(input);
  const items = [sourceRail.railName, ...sourceRail.items] as const;
  const text =
    sourceRail.status === "ready"
      ? "Slice 298 production activation evidence beam is clear: " +
        sourceRail.text
      : "Slice 298 production activation evidence beam needs attention: " +
        sourceRail.text;

  return {
    beamName: "Slice 298 production activation evidence beam",
    status: sourceRail.status,
    tone: sourceRail.tone,
    sourceRail,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice299EvidenceStrut = {
  strutName: string;
  status: "ready" | "blocked";
  tone: "clear" | "attention";
  sourceBeam: PosCashShortageProductionActivationSlice298EvidenceBeam;
  itemCount: number;
  items: readonly string[];
  text: string;
  activationAuthorized: false;
};

export function buildPosCashShortageProductionActivationSlice299EvidenceStrut(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice299EvidenceStrut {
  const sourceBeam = buildPosCashShortageProductionActivationSlice298EvidenceBeam(input);
  const items = [sourceBeam.beamName, ...sourceBeam.items] as const;
  const text =
    sourceBeam.status === "ready"
      ? "Slice 299 production activation evidence strut is clear: " +
        sourceBeam.text
      : "Slice 299 production activation evidence strut needs attention: " +
        sourceBeam.text;

  return {
    strutName: "Slice 299 production activation evidence strut",
    status: sourceBeam.status,
    tone: sourceBeam.tone,
    sourceBeam,
    itemCount: items.length,
    items,
    text,
    activationAuthorized: false,
  };
}
export type PosCashShortageProductionActivationSlice300EvidenceGirder = EvidenceLayer<
  "girderName", "sourceStrut",
  PosCashShortageProductionActivationSlice299EvidenceStrut
>;

export function buildPosCashShortageProductionActivationSlice300EvidenceGirder(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice300EvidenceGirder {
  const source = buildPosCashShortageProductionActivationSlice299EvidenceStrut(input);
  return buildEvidenceLayer(
    "girderName", "Slice 300 production activation evidence girder",
    "sourceStrut", source, source.strutName,
  );
}
export type PosCashShortageProductionActivationSlice301EvidenceTruss = EvidenceLayer<
  "trussName", "sourceGirder",
  PosCashShortageProductionActivationSlice300EvidenceGirder
>;

export function buildPosCashShortageProductionActivationSlice301EvidenceTruss(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice301EvidenceTruss {
  const source = buildPosCashShortageProductionActivationSlice300EvidenceGirder(input);
  return buildEvidenceLayer(
    "trussName", "Slice 301 production activation evidence truss",
    "sourceGirder", source, source.girderName,
  );
}
export type PosCashShortageProductionActivationSlice302EvidenceBrace = EvidenceLayer<
  "braceName", "sourceTruss",
  PosCashShortageProductionActivationSlice301EvidenceTruss
>;

export function buildPosCashShortageProductionActivationSlice302EvidenceBrace(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice302EvidenceBrace {
  const source = buildPosCashShortageProductionActivationSlice301EvidenceTruss(input);
  return buildEvidenceLayer(
    "braceName", "Slice 302 production activation evidence brace",
    "sourceTruss", source, source.trussName,
  );
}
export type PosCashShortageProductionActivationSlice303EvidenceSupport = EvidenceLayer<
  "supportName", "sourceBrace",
  PosCashShortageProductionActivationSlice302EvidenceBrace
>;

export function buildPosCashShortageProductionActivationSlice303EvidenceSupport(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice303EvidenceSupport {
  const source = buildPosCashShortageProductionActivationSlice302EvidenceBrace(input);
  return buildEvidenceLayer(
    "supportName", "Slice 303 production activation evidence support",
    "sourceBrace", source, source.braceName,
  );
}
export type PosCashShortageProductionActivationSlice304EvidenceButtress = EvidenceLayer<
  "buttressName", "sourceSupport",
  PosCashShortageProductionActivationSlice303EvidenceSupport
>;

export function buildPosCashShortageProductionActivationSlice304EvidenceButtress(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice304EvidenceButtress {
  const source = buildPosCashShortageProductionActivationSlice303EvidenceSupport(input);
  return buildEvidenceLayer(
    "buttressName", "Slice 304 production activation evidence buttress",
    "sourceSupport", source, source.supportName,
  );
}
export type PosCashShortageProductionActivationSlice305EvidenceKeystone = EvidenceLayer<
  "keystoneName", "sourceButtress",
  PosCashShortageProductionActivationSlice304EvidenceButtress
>;

export function buildPosCashShortageProductionActivationSlice305EvidenceKeystone(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice305EvidenceKeystone {
  const source = buildPosCashShortageProductionActivationSlice304EvidenceButtress(input);
  return buildEvidenceLayer(
    "keystoneName", "Slice 305 production activation evidence keystone",
    "sourceButtress", source, source.buttressName,
  );
}
export type PosCashShortageProductionActivationSlice306EvidenceCapstone = EvidenceLayer<
  "capstoneName", "sourceKeystone",
  PosCashShortageProductionActivationSlice305EvidenceKeystone
>;

export function buildPosCashShortageProductionActivationSlice306EvidenceCapstone(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice306EvidenceCapstone {
  const source = buildPosCashShortageProductionActivationSlice305EvidenceKeystone(input);
  return buildEvidenceLayer(
    "capstoneName", "Slice 306 production activation evidence capstone",
    "sourceKeystone", source, source.keystoneName,
  );
}
export type PosCashShortageProductionActivationSlice307EvidenceCornice = EvidenceLayer<
  "corniceName", "sourceCapstone",
  PosCashShortageProductionActivationSlice306EvidenceCapstone
>;

export function buildPosCashShortageProductionActivationSlice307EvidenceCornice(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice307EvidenceCornice {
  const source = buildPosCashShortageProductionActivationSlice306EvidenceCapstone(input);
  return buildEvidenceLayer(
    "corniceName", "Slice 307 production activation evidence cornice",
    "sourceCapstone", source, source.capstoneName,
  );
}
export type PosCashShortageProductionActivationSlice308EvidenceParapet = EvidenceLayer<
  "parapetName", "sourceCornice",
  PosCashShortageProductionActivationSlice307EvidenceCornice
>;

export function buildPosCashShortageProductionActivationSlice308EvidenceParapet(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice308EvidenceParapet {
  const source = buildPosCashShortageProductionActivationSlice307EvidenceCornice(input);
  return buildEvidenceLayer(
    "parapetName", "Slice 308 production activation evidence parapet",
    "sourceCornice", source, source.corniceName,
  );
}
export type PosCashShortageProductionActivationSlice309EvidenceRampart = EvidenceLayer<
  "rampartName", "sourceParapet",
  PosCashShortageProductionActivationSlice308EvidenceParapet
>;

export function buildPosCashShortageProductionActivationSlice309EvidenceRampart(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice309EvidenceRampart {
  const source = buildPosCashShortageProductionActivationSlice308EvidenceParapet(input);
  return buildEvidenceLayer(
    "rampartName", "Slice 309 production activation evidence rampart",
    "sourceParapet", source, source.parapetName,
  );
}
export type PosCashShortageProductionActivationSlice310EvidenceBastion = EvidenceLayer<
  "bastionName", "sourceRampart",
  PosCashShortageProductionActivationSlice309EvidenceRampart
>;

export function buildPosCashShortageProductionActivationSlice310EvidenceBastion(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice310EvidenceBastion {
  const source = buildPosCashShortageProductionActivationSlice309EvidenceRampart(input);
  return buildEvidenceLayer(
    "bastionName", "Slice 310 production activation evidence bastion",
    "sourceRampart", source, source.rampartName,
  );
}
export type PosCashShortageProductionActivationSlice311EvidenceCitadel = EvidenceLayer<
  "citadelName", "sourceBastion",
  PosCashShortageProductionActivationSlice310EvidenceBastion
>;

export function buildPosCashShortageProductionActivationSlice311EvidenceCitadel(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice311EvidenceCitadel {
  const source = buildPosCashShortageProductionActivationSlice310EvidenceBastion(input);
  return buildEvidenceLayer(
    "citadelName", "Slice 311 production activation evidence citadel",
    "sourceBastion", source, source.bastionName,
  );
}
export type PosCashShortageProductionActivationSlice312EvidenceFortress = EvidenceLayer<
  "fortressName", "sourceCitadel",
  PosCashShortageProductionActivationSlice311EvidenceCitadel
>;

export function buildPosCashShortageProductionActivationSlice312EvidenceFortress(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice312EvidenceFortress {
  const source = buildPosCashShortageProductionActivationSlice311EvidenceCitadel(input);
  return buildEvidenceLayer(
    "fortressName", "Slice 312 production activation evidence fortress",
    "sourceCitadel", source, source.citadelName,
  );
}
export type PosCashShortageProductionActivationSlice313EvidenceBulwark = EvidenceLayer<
  "bulwarkName", "sourceFortress",
  PosCashShortageProductionActivationSlice312EvidenceFortress
>;

export function buildPosCashShortageProductionActivationSlice313EvidenceBulwark(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice313EvidenceBulwark {
  const source = buildPosCashShortageProductionActivationSlice312EvidenceFortress(input);
  return buildEvidenceLayer(
    "bulwarkName", "Slice 313 production activation evidence bulwark",
    "sourceFortress", source, source.fortressName,
  );
}
export type PosCashShortageProductionActivationSlice314EvidenceRedoubt = EvidenceLayer<
  "redoubtName", "sourceBulwark",
  PosCashShortageProductionActivationSlice313EvidenceBulwark
>;

export function buildPosCashShortageProductionActivationSlice314EvidenceRedoubt(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice314EvidenceRedoubt {
  const source = buildPosCashShortageProductionActivationSlice313EvidenceBulwark(input);
  return buildEvidenceLayer(
    "redoubtName", "Slice 314 production activation evidence redoubt",
    "sourceBulwark", source, source.bulwarkName,
  );
}
export type PosCashShortageProductionActivationSlice315EvidenceOutwork = EvidenceLayer<
  "outworkName", "sourceRedoubt",
  PosCashShortageProductionActivationSlice314EvidenceRedoubt
>;

export function buildPosCashShortageProductionActivationSlice315EvidenceOutwork(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice315EvidenceOutwork {
  const source = buildPosCashShortageProductionActivationSlice314EvidenceRedoubt(input);
  return buildEvidenceLayer(
    "outworkName", "Slice 315 production activation evidence outwork",
    "sourceRedoubt", source, source.redoubtName,
  );
}
export type PosCashShortageProductionActivationSlice316EvidenceGlacis = EvidenceLayer<
  "glacisName", "sourceOutwork",
  PosCashShortageProductionActivationSlice315EvidenceOutwork
>;

export function buildPosCashShortageProductionActivationSlice316EvidenceGlacis(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice316EvidenceGlacis {
  const source = buildPosCashShortageProductionActivationSlice315EvidenceOutwork(input);
  return buildEvidenceLayer(
    "glacisName", "Slice 316 production activation evidence glacis",
    "sourceOutwork", source, source.outworkName,
  );
}
export type PosCashShortageProductionActivationSlice317EvidenceRavelin = EvidenceLayer<
  "ravelinName", "sourceGlacis",
  PosCashShortageProductionActivationSlice316EvidenceGlacis
>;

export function buildPosCashShortageProductionActivationSlice317EvidenceRavelin(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice317EvidenceRavelin {
  const source = buildPosCashShortageProductionActivationSlice316EvidenceGlacis(input);
  return buildEvidenceLayer(
    "ravelinName", "Slice 317 production activation evidence ravelin",
    "sourceGlacis", source, source.glacisName,
  );
}
export type PosCashShortageProductionActivationSlice318EvidenceCounterscarp = EvidenceLayer<
  "counterscarpName", "sourceRavelin",
  PosCashShortageProductionActivationSlice317EvidenceRavelin
>;

export function buildPosCashShortageProductionActivationSlice318EvidenceCounterscarp(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice318EvidenceCounterscarp {
  const source = buildPosCashShortageProductionActivationSlice317EvidenceRavelin(input);
  return buildEvidenceLayer(
    "counterscarpName", "Slice 318 production activation evidence counterscarp",
    "sourceRavelin", source, source.ravelinName,
  );
}
export type PosCashShortageProductionActivationSlice319EvidenceTerreplein = EvidenceLayer<
  "terrepleinName", "sourceCounterscarp",
  PosCashShortageProductionActivationSlice318EvidenceCounterscarp
>;

export function buildPosCashShortageProductionActivationSlice319EvidenceTerreplein(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice319EvidenceTerreplein {
  const source = buildPosCashShortageProductionActivationSlice318EvidenceCounterscarp(input);
  return buildEvidenceLayer(
    "terrepleinName", "Slice 319 production activation evidence terreplein",
    "sourceCounterscarp", source, source.counterscarpName,
  );
}
export type PosCashShortageProductionActivationSlice320EvidenceBanquette = EvidenceLayer<
  "banquetteName", "sourceTerreplein",
  PosCashShortageProductionActivationSlice319EvidenceTerreplein
>;

export function buildPosCashShortageProductionActivationSlice320EvidenceBanquette(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice320EvidenceBanquette {
  const source = buildPosCashShortageProductionActivationSlice319EvidenceTerreplein(input);
  return buildEvidenceLayer(
    "banquetteName", "Slice 320 production activation evidence banquette",
    "sourceTerreplein", source, source.terrepleinName,
  );
}
export type PosCashShortageProductionActivationSlice321EvidenceEscarp = EvidenceLayer<
  "escarpName", "sourceBanquette",
  PosCashShortageProductionActivationSlice320EvidenceBanquette
>;

export function buildPosCashShortageProductionActivationSlice321EvidenceEscarp(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice321EvidenceEscarp {
  const source = buildPosCashShortageProductionActivationSlice320EvidenceBanquette(input);
  return buildEvidenceLayer(
    "escarpName", "Slice 321 production activation evidence escarp",
    "sourceBanquette", source, source.banquetteName,
  );
}
export type PosCashShortageProductionActivationSlice322EvidenceRevetment = EvidenceLayer<
  "revetmentName", "sourceEscarp",
  PosCashShortageProductionActivationSlice321EvidenceEscarp
>;

export function buildPosCashShortageProductionActivationSlice322EvidenceRevetment(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice322EvidenceRevetment {
  const source = buildPosCashShortageProductionActivationSlice321EvidenceEscarp(input);
  return buildEvidenceLayer(
    "revetmentName", "Slice 322 production activation evidence revetment",
    "sourceEscarp", source, source.escarpName,
  );
}
export type PosCashShortageProductionActivationSlice323EvidenceEmbankment = EvidenceLayer<
  "embankmentName", "sourceRevetment",
  PosCashShortageProductionActivationSlice322EvidenceRevetment
>;

export function buildPosCashShortageProductionActivationSlice323EvidenceEmbankment(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice323EvidenceEmbankment {
  const source = buildPosCashShortageProductionActivationSlice322EvidenceRevetment(input);
  return buildEvidenceLayer(
    "embankmentName", "Slice 323 production activation evidence embankment",
    "sourceRevetment", source, source.revetmentName,
  );
}
export type PosCashShortageProductionActivationSlice324EvidenceLevee = EvidenceLayer<
  "leveeName", "sourceEmbankment",
  PosCashShortageProductionActivationSlice323EvidenceEmbankment
>;

export function buildPosCashShortageProductionActivationSlice324EvidenceLevee(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice324EvidenceLevee {
  const source = buildPosCashShortageProductionActivationSlice323EvidenceEmbankment(input);
  return buildEvidenceLayer(
    "leveeName", "Slice 324 production activation evidence levee",
    "sourceEmbankment", source, source.embankmentName,
  );
}
export type PosCashShortageProductionActivationSlice325EvidenceCauseway = EvidenceLayer<
  "causewayName", "sourceLevee",
  PosCashShortageProductionActivationSlice324EvidenceLevee
>;

export function buildPosCashShortageProductionActivationSlice325EvidenceCauseway(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice325EvidenceCauseway {
  const source = buildPosCashShortageProductionActivationSlice324EvidenceLevee(input);
  return buildEvidenceLayer(
    "causewayName", "Slice 325 production activation evidence causeway",
    "sourceLevee", source, source.leveeName,
  );
}
export type PosCashShortageProductionActivationSlice326EvidenceFord = EvidenceLayer<
  "fordName", "sourceCauseway",
  PosCashShortageProductionActivationSlice325EvidenceCauseway
>;

export function buildPosCashShortageProductionActivationSlice326EvidenceFord(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice326EvidenceFord {
  const source = buildPosCashShortageProductionActivationSlice325EvidenceCauseway(input);
  return buildEvidenceLayer(
    "fordName", "Slice 326 production activation evidence ford",
    "sourceCauseway", source, source.causewayName,
  );
}
export type PosCashShortageProductionActivationSlice327EvidenceCrossing = EvidenceLayer<
  "crossingName", "sourceFord",
  PosCashShortageProductionActivationSlice326EvidenceFord
>;

export function buildPosCashShortageProductionActivationSlice327EvidenceCrossing(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice327EvidenceCrossing {
  const source = buildPosCashShortageProductionActivationSlice326EvidenceFord(input);
  return buildEvidenceLayer(
    "crossingName", "Slice 327 production activation evidence crossing",
    "sourceFord", source, source.fordName,
  );
}
export type PosCashShortageProductionActivationSlice328EvidenceSpan = EvidenceLayer<
  "spanName", "sourceCrossing",
  PosCashShortageProductionActivationSlice327EvidenceCrossing
>;

export function buildPosCashShortageProductionActivationSlice328EvidenceSpan(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice328EvidenceSpan {
  const source = buildPosCashShortageProductionActivationSlice327EvidenceCrossing(input);
  return buildEvidenceLayer(
    "spanName", "Slice 328 production activation evidence span",
    "sourceCrossing", source, source.crossingName,
  );
}
export type PosCashShortageProductionActivationSlice329EvidenceArch = EvidenceLayer<
  "archName", "sourceSpan",
  PosCashShortageProductionActivationSlice328EvidenceSpan
>;

export function buildPosCashShortageProductionActivationSlice329EvidenceArch(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice329EvidenceArch {
  const source = buildPosCashShortageProductionActivationSlice328EvidenceSpan(input);
  return buildEvidenceLayer(
    "archName", "Slice 329 production activation evidence arch",
    "sourceSpan", source, source.spanName,
  );
}
export type PosCashShortageProductionActivationSlice330EvidencePier = EvidenceLayer<
  "pierName", "sourceArch",
  PosCashShortageProductionActivationSlice329EvidenceArch
>;

export function buildPosCashShortageProductionActivationSlice330EvidencePier(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice330EvidencePier {
  const source = buildPosCashShortageProductionActivationSlice329EvidenceArch(input);
  return buildEvidenceLayer(
    "pierName", "Slice 330 production activation evidence pier",
    "sourceArch", source, source.archName,
  );
}
export type PosCashShortageProductionActivationSlice331EvidenceAbutment = EvidenceLayer<
  "abutmentName", "sourcePier",
  PosCashShortageProductionActivationSlice330EvidencePier
>;

export function buildPosCashShortageProductionActivationSlice331EvidenceAbutment(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice331EvidenceAbutment {
  const source = buildPosCashShortageProductionActivationSlice330EvidencePier(input);
  return buildEvidenceLayer(
    "abutmentName", "Slice 331 production activation evidence abutment",
    "sourcePier", source, source.pierName,
  );
}
export type PosCashShortageProductionActivationSlice332EvidenceKeel = EvidenceLayer<
  "keelName", "sourceAbutment",
  PosCashShortageProductionActivationSlice331EvidenceAbutment
>;

export function buildPosCashShortageProductionActivationSlice332EvidenceKeel(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice332EvidenceKeel {
  const source = buildPosCashShortageProductionActivationSlice331EvidenceAbutment(input);
  return buildEvidenceLayer(
    "keelName", "Slice 332 production activation evidence keel",
    "sourceAbutment", source, source.abutmentName,
  );
}
export type PosCashShortageProductionActivationSlice333EvidenceHull = EvidenceLayer<
  "hullName", "sourceKeel",
  PosCashShortageProductionActivationSlice332EvidenceKeel
>;

export function buildPosCashShortageProductionActivationSlice333EvidenceHull(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice333EvidenceHull {
  const source = buildPosCashShortageProductionActivationSlice332EvidenceKeel(input);
  return buildEvidenceLayer(
    "hullName", "Slice 333 production activation evidence hull",
    "sourceKeel", source, source.keelName,
  );
}
export type PosCashShortageProductionActivationSlice334EvidenceRib = EvidenceLayer<
  "ribName", "sourceHull",
  PosCashShortageProductionActivationSlice333EvidenceHull
>;

export function buildPosCashShortageProductionActivationSlice334EvidenceRib(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice334EvidenceRib {
  const source = buildPosCashShortageProductionActivationSlice333EvidenceHull(input);
  return buildEvidenceLayer(
    "ribName", "Slice 334 production activation evidence rib",
    "sourceHull", source, source.hullName,
  );
}
export type PosCashShortageProductionActivationSlice335EvidencePlank = EvidenceLayer<
  "plankName", "sourceRib",
  PosCashShortageProductionActivationSlice334EvidenceRib
>;

export function buildPosCashShortageProductionActivationSlice335EvidencePlank(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice335EvidencePlank {
  const source = buildPosCashShortageProductionActivationSlice334EvidenceRib(input);
  return buildEvidenceLayer(
    "plankName", "Slice 335 production activation evidence plank",
    "sourceRib", source, source.ribName,
  );
}
export type PosCashShortageProductionActivationSlice336EvidenceDeck = EvidenceLayer<
  "deckName", "sourcePlank",
  PosCashShortageProductionActivationSlice335EvidencePlank
>;

export function buildPosCashShortageProductionActivationSlice336EvidenceDeck(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice336EvidenceDeck {
  const source = buildPosCashShortageProductionActivationSlice335EvidencePlank(input);
  return buildEvidenceLayer(
    "deckName", "Slice 336 production activation evidence deck",
    "sourcePlank", source, source.plankName,
  );
}
export type PosCashShortageProductionActivationSlice337EvidenceCabin = EvidenceLayer<
  "cabinName", "sourceDeck",
  PosCashShortageProductionActivationSlice336EvidenceDeck
>;

export function buildPosCashShortageProductionActivationSlice337EvidenceCabin(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice337EvidenceCabin {
  const source = buildPosCashShortageProductionActivationSlice336EvidenceDeck(input);
  return buildEvidenceLayer(
    "cabinName", "Slice 337 production activation evidence cabin",
    "sourceDeck", source, source.deckName,
  );
}
export type PosCashShortageProductionActivationSlice338EvidenceBulkhead = EvidenceLayer<
  "bulkheadName", "sourceCabin",
  PosCashShortageProductionActivationSlice337EvidenceCabin
>;

export function buildPosCashShortageProductionActivationSlice338EvidenceBulkhead(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice338EvidenceBulkhead {
  const source = buildPosCashShortageProductionActivationSlice337EvidenceCabin(input);
  return buildEvidenceLayer(
    "bulkheadName", "Slice 338 production activation evidence bulkhead",
    "sourceCabin", source, source.cabinName,
  );
}
export type PosCashShortageProductionActivationSlice339EvidenceHold = EvidenceLayer<
  "holdName", "sourceBulkhead",
  PosCashShortageProductionActivationSlice338EvidenceBulkhead
>;

export function buildPosCashShortageProductionActivationSlice339EvidenceHold(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice339EvidenceHold {
  const source = buildPosCashShortageProductionActivationSlice338EvidenceBulkhead(input);
  return buildEvidenceLayer(
    "holdName", "Slice 339 production activation evidence hold",
    "sourceBulkhead", source, source.bulkheadName,
  );
}
export type PosCashShortageProductionActivationSlice340EvidenceBay = EvidenceLayer<
  "bayName", "sourceHold",
  PosCashShortageProductionActivationSlice339EvidenceHold
>;

export function buildPosCashShortageProductionActivationSlice340EvidenceBay(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice340EvidenceBay {
  const source = buildPosCashShortageProductionActivationSlice339EvidenceHold(input);
  return buildEvidenceLayer(
    "bayName", "Slice 340 production activation evidence bay",
    "sourceHold", source, source.holdName,
  );
}
export type PosCashShortageProductionActivationSlice341EvidenceCompartment = EvidenceLayer<
  "compartmentName", "sourceBay",
  PosCashShortageProductionActivationSlice340EvidenceBay
>;

export function buildPosCashShortageProductionActivationSlice341EvidenceCompartment(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice341EvidenceCompartment {
  const source = buildPosCashShortageProductionActivationSlice340EvidenceBay(input);
  return buildEvidenceLayer(
    "compartmentName", "Slice 341 production activation evidence compartment",
    "sourceBay", source, source.bayName,
  );
}
export type PosCashShortageProductionActivationSlice342EvidenceLocker = EvidenceLayer<
  "lockerName", "sourceCompartment",
  PosCashShortageProductionActivationSlice341EvidenceCompartment
>;

export function buildPosCashShortageProductionActivationSlice342EvidenceLocker(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice342EvidenceLocker {
  const source = buildPosCashShortageProductionActivationSlice341EvidenceCompartment(input);
  return buildEvidenceLayer(
    "lockerName", "Slice 342 production activation evidence locker",
    "sourceCompartment", source, source.compartmentName,
  );
}
export type PosCashShortageProductionActivationSlice343EvidenceStrongbox = EvidenceLayer<
  "strongboxName", "sourceLocker",
  PosCashShortageProductionActivationSlice342EvidenceLocker
>;

export function buildPosCashShortageProductionActivationSlice343EvidenceStrongbox(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice343EvidenceStrongbox {
  const source = buildPosCashShortageProductionActivationSlice342EvidenceLocker(input);
  return buildEvidenceLayer(
    "strongboxName", "Slice 343 production activation evidence strongbox",
    "sourceLocker", source, source.lockerName,
  );
}
export type PosCashShortageProductionActivationSlice344EvidenceVault = EvidenceLayer<
  "vaultName", "sourceStrongbox",
  PosCashShortageProductionActivationSlice343EvidenceStrongbox
>;

export function buildPosCashShortageProductionActivationSlice344EvidenceVault(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice344EvidenceVault {
  const source = buildPosCashShortageProductionActivationSlice343EvidenceStrongbox(input);
  return buildEvidenceLayer(
    "vaultName", "Slice 344 production activation evidence vault",
    "sourceStrongbox", source, source.strongboxName,
  );
}
export type PosCashShortageProductionActivationSlice345EvidenceSafe = EvidenceLayer<
  "safeName", "sourceVault",
  PosCashShortageProductionActivationSlice344EvidenceVault
>;

export function buildPosCashShortageProductionActivationSlice345EvidenceSafe(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice345EvidenceSafe {
  const source = buildPosCashShortageProductionActivationSlice344EvidenceVault(input);
  return buildEvidenceLayer(
    "safeName", "Slice 345 production activation evidence safe",
    "sourceVault", source, source.vaultName,
  );
}
export type PosCashShortageProductionActivationSlice346EvidenceCoffer = EvidenceLayer<
  "cofferName", "sourceSafe",
  PosCashShortageProductionActivationSlice345EvidenceSafe
>;

export function buildPosCashShortageProductionActivationSlice346EvidenceCoffer(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice346EvidenceCoffer {
  const source = buildPosCashShortageProductionActivationSlice345EvidenceSafe(input);
  return buildEvidenceLayer(
    "cofferName", "Slice 346 production activation evidence coffer",
    "sourceSafe", source, source.safeName,
  );
}
export type PosCashShortageProductionActivationSlice347EvidenceChest = EvidenceLayer<
  "chestName", "sourceCoffer",
  PosCashShortageProductionActivationSlice346EvidenceCoffer
>;

export function buildPosCashShortageProductionActivationSlice347EvidenceChest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice347EvidenceChest {
  const source = buildPosCashShortageProductionActivationSlice346EvidenceCoffer(input);
  return buildEvidenceLayer(
    "chestName", "Slice 347 production activation evidence chest",
    "sourceCoffer", source, source.cofferName,
  );
}
export type PosCashShortageProductionActivationSlice348EvidenceRepository = EvidenceLayer<
  "repositoryName", "sourceChest",
  PosCashShortageProductionActivationSlice347EvidenceChest
>;

export function buildPosCashShortageProductionActivationSlice348EvidenceRepository(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice348EvidenceRepository {
  const source = buildPosCashShortageProductionActivationSlice347EvidenceChest(input);
  return buildEvidenceLayer(
    "repositoryName", "Slice 348 production activation evidence repository",
    "sourceChest", source, source.chestName,
  );
}
export type PosCashShortageProductionActivationSlice349EvidenceDepository = EvidenceLayer<
  "depositoryName", "sourceRepository",
  PosCashShortageProductionActivationSlice348EvidenceRepository
>;

export function buildPosCashShortageProductionActivationSlice349EvidenceDepository(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice349EvidenceDepository {
  const source = buildPosCashShortageProductionActivationSlice348EvidenceRepository(input);
  return buildEvidenceLayer(
    "depositoryName", "Slice 349 production activation evidence depository",
    "sourceRepository", source, source.repositoryName,
  );
}
export type PosCashShortageProductionActivationSlice350EvidenceTreasury = EvidenceLayer<
  "treasuryName", "sourceDepository",
  PosCashShortageProductionActivationSlice349EvidenceDepository
>;

export function buildPosCashShortageProductionActivationSlice350EvidenceTreasury(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice350EvidenceTreasury {
  const source = buildPosCashShortageProductionActivationSlice349EvidenceDepository(input);
  return buildEvidenceLayer(
    "treasuryName", "Slice 350 production activation evidence treasury",
    "sourceDepository", source, source.depositoryName,
  );
}
export type PosCashShortageProductionActivationSlice351EvidenceReserve = EvidenceLayer<
  "reserveName", "sourceTreasury",
  PosCashShortageProductionActivationSlice350EvidenceTreasury
>;

export function buildPosCashShortageProductionActivationSlice351EvidenceReserve(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice351EvidenceReserve {
  const source = buildPosCashShortageProductionActivationSlice350EvidenceTreasury(input);
  return buildEvidenceLayer(
    "reserveName", "Slice 351 production activation evidence reserve",
    "sourceTreasury", source, source.treasuryName,
  );
}
export type PosCashShortageProductionActivationSlice352EvidenceFund = EvidenceLayer<
  "fundName", "sourceReserve",
  PosCashShortageProductionActivationSlice351EvidenceReserve
>;

export function buildPosCashShortageProductionActivationSlice352EvidenceFund(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice352EvidenceFund {
  const source = buildPosCashShortageProductionActivationSlice351EvidenceReserve(input);
  return buildEvidenceLayer(
    "fundName", "Slice 352 production activation evidence fund",
    "sourceReserve", source, source.reserveName,
  );
}
export type PosCashShortageProductionActivationSlice353EvidenceAccount = EvidenceLayer<
  "accountName", "sourceFund",
  PosCashShortageProductionActivationSlice352EvidenceFund
>;

export function buildPosCashShortageProductionActivationSlice353EvidenceAccount(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice353EvidenceAccount {
  const source = buildPosCashShortageProductionActivationSlice352EvidenceFund(input);
  return buildEvidenceLayer(
    "accountName", "Slice 353 production activation evidence account",
    "sourceFund", source, source.fundName,
  );
}
export type PosCashShortageProductionActivationSlice354EvidenceBalance = EvidenceLayer<
  "balanceName", "sourceAccount",
  PosCashShortageProductionActivationSlice353EvidenceAccount
>;

export function buildPosCashShortageProductionActivationSlice354EvidenceBalance(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice354EvidenceBalance {
  const source = buildPosCashShortageProductionActivationSlice353EvidenceAccount(input);
  return buildEvidenceLayer(
    "balanceName", "Slice 354 production activation evidence balance",
    "sourceAccount", source, source.accountName,
  );
}
export type PosCashShortageProductionActivationSlice355EvidenceStatement = EvidenceLayer<
  "statementName", "sourceBalance",
  PosCashShortageProductionActivationSlice354EvidenceBalance
>;

export function buildPosCashShortageProductionActivationSlice355EvidenceStatement(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice355EvidenceStatement {
  const source = buildPosCashShortageProductionActivationSlice354EvidenceBalance(input);
  return buildEvidenceLayer(
    "statementName", "Slice 355 production activation evidence statement",
    "sourceBalance", source, source.balanceName,
  );
}
export type PosCashShortageProductionActivationSlice356EvidenceVoucher = EvidenceLayer<
  "voucherName", "sourceStatement",
  PosCashShortageProductionActivationSlice355EvidenceStatement
>;

export function buildPosCashShortageProductionActivationSlice356EvidenceVoucher(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice356EvidenceVoucher {
  const source = buildPosCashShortageProductionActivationSlice355EvidenceStatement(input);
  return buildEvidenceLayer(
    "voucherName", "Slice 356 production activation evidence voucher",
    "sourceStatement", source, source.statementName,
  );
}
export type PosCashShortageProductionActivationSlice357EvidenceInstrument = EvidenceLayer<
  "instrumentName", "sourceVoucher",
  PosCashShortageProductionActivationSlice356EvidenceVoucher
>;

export function buildPosCashShortageProductionActivationSlice357EvidenceInstrument(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice357EvidenceInstrument {
  const source = buildPosCashShortageProductionActivationSlice356EvidenceVoucher(input);
  return buildEvidenceLayer(
    "instrumentName", "Slice 357 production activation evidence instrument",
    "sourceVoucher", source, source.voucherName,
  );
}
export type PosCashShortageProductionActivationSlice358EvidenceCertificate = EvidenceLayer<
  "certificateName", "sourceInstrument",
  PosCashShortageProductionActivationSlice357EvidenceInstrument
>;

export function buildPosCashShortageProductionActivationSlice358EvidenceCertificate(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice358EvidenceCertificate {
  const source = buildPosCashShortageProductionActivationSlice357EvidenceInstrument(input);
  return buildEvidenceLayer(
    "certificateName", "Slice 358 production activation evidence certificate",
    "sourceInstrument", source, source.instrumentName,
  );
}
export type PosCashShortageProductionActivationSlice359EvidenceDocument = EvidenceLayer<
  "documentName", "sourceCertificate",
  PosCashShortageProductionActivationSlice358EvidenceCertificate
>;

export function buildPosCashShortageProductionActivationSlice359EvidenceDocument(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice359EvidenceDocument {
  const source = buildPosCashShortageProductionActivationSlice358EvidenceCertificate(input);
  return buildEvidenceLayer(
    "documentName", "Slice 359 production activation evidence document",
    "sourceCertificate", source, source.certificateName,
  );
}
export type PosCashShortageProductionActivationSlice360EvidenceFile = EvidenceLayer<
  "fileName", "sourceDocument",
  PosCashShortageProductionActivationSlice359EvidenceDocument
>;

export function buildPosCashShortageProductionActivationSlice360EvidenceFile(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice360EvidenceFile {
  const source = buildPosCashShortageProductionActivationSlice359EvidenceDocument(input);
  return buildEvidenceLayer(
    "fileName", "Slice 360 production activation evidence file",
    "sourceDocument", source, source.documentName,
  );
}
export type PosCashShortageProductionActivationSlice361EvidenceFolder = EvidenceLayer<
  "folderName", "sourceFile",
  PosCashShortageProductionActivationSlice360EvidenceFile
>;

export function buildPosCashShortageProductionActivationSlice361EvidenceFolder(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice361EvidenceFolder {
  const source = buildPosCashShortageProductionActivationSlice360EvidenceFile(input);
  return buildEvidenceLayer(
    "folderName", "Slice 361 production activation evidence folder",
    "sourceFile", source, source.fileName,
  );
}
export type PosCashShortageProductionActivationSlice362EvidenceBox = EvidenceLayer<
  "boxName", "sourceFolder",
  PosCashShortageProductionActivationSlice361EvidenceFolder
>;

export function buildPosCashShortageProductionActivationSlice362EvidenceBox(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice362EvidenceBox {
  const source = buildPosCashShortageProductionActivationSlice361EvidenceFolder(input);
  return buildEvidenceLayer(
    "boxName", "Slice 362 production activation evidence box",
    "sourceFolder", source, source.folderName,
  );
}
export type PosCashShortageProductionActivationSlice363EvidenceCase = EvidenceLayer<
  "caseName", "sourceBox",
  PosCashShortageProductionActivationSlice362EvidenceBox
>;

export function buildPosCashShortageProductionActivationSlice363EvidenceCase(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice363EvidenceCase {
  const source = buildPosCashShortageProductionActivationSlice362EvidenceBox(input);
  return buildEvidenceLayer(
    "caseName", "Slice 363 production activation evidence case",
    "sourceBox", source, source.boxName,
  );
}
export type PosCashShortageProductionActivationSlice364EvidencePacket = EvidenceLayer<
  "packetName", "sourceCase",
  PosCashShortageProductionActivationSlice363EvidenceCase
>;

export function buildPosCashShortageProductionActivationSlice364EvidencePacket(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice364EvidencePacket {
  const source = buildPosCashShortageProductionActivationSlice363EvidenceCase(input);
  return buildEvidenceLayer(
    "packetName", "Slice 364 production activation evidence packet",
    "sourceCase", source, source.caseName,
  );
}
export type PosCashShortageProductionActivationSlice365EvidenceParcel = EvidenceLayer<
  "parcelName", "sourcePacket",
  PosCashShortageProductionActivationSlice364EvidencePacket
>;

export function buildPosCashShortageProductionActivationSlice365EvidenceParcel(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice365EvidenceParcel {
  const source = buildPosCashShortageProductionActivationSlice364EvidencePacket(input);
  return buildEvidenceLayer(
    "parcelName", "Slice 365 production activation evidence parcel",
    "sourcePacket", source, source.packetName,
  );
}
export type PosCashShortageProductionActivationSlice366EvidencePackage = EvidenceLayer<
  "packageName", "sourceParcel",
  PosCashShortageProductionActivationSlice365EvidenceParcel
>;

export function buildPosCashShortageProductionActivationSlice366EvidencePackage(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice366EvidencePackage {
  const source = buildPosCashShortageProductionActivationSlice365EvidenceParcel(input);
  return buildEvidenceLayer(
    "packageName", "Slice 366 production activation evidence package",
    "sourceParcel", source, source.parcelName,
  );
}
export type PosCashShortageProductionActivationSlice367EvidenceShipment = EvidenceLayer<
  "shipmentName", "sourcePackage",
  PosCashShortageProductionActivationSlice366EvidencePackage
>;

export function buildPosCashShortageProductionActivationSlice367EvidenceShipment(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice367EvidenceShipment {
  const source = buildPosCashShortageProductionActivationSlice366EvidencePackage(input);
  return buildEvidenceLayer(
    "shipmentName", "Slice 367 production activation evidence shipment",
    "sourcePackage", source, source.packageName,
  );
}
export type PosCashShortageProductionActivationSlice368EvidenceManifest = EvidenceLayer<
  "manifestName", "sourceShipment",
  PosCashShortageProductionActivationSlice367EvidenceShipment
>;

export function buildPosCashShortageProductionActivationSlice368EvidenceManifest(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice368EvidenceManifest {
  const source = buildPosCashShortageProductionActivationSlice367EvidenceShipment(input);
  return buildEvidenceLayer(
    "manifestName", "Slice 368 production activation evidence manifest",
    "sourceShipment", source, source.shipmentName,
  );
}
export type PosCashShortageProductionActivationSlice369EvidenceDocket = EvidenceLayer<
  "docketName", "sourceManifest",
  PosCashShortageProductionActivationSlice368EvidenceManifest
>;

export function buildPosCashShortageProductionActivationSlice369EvidenceDocket(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice369EvidenceDocket {
  const source = buildPosCashShortageProductionActivationSlice368EvidenceManifest(input);
  return buildEvidenceLayer(
    "docketName", "Slice 369 production activation evidence docket",
    "sourceManifest", source, source.manifestName,
  );
}
export type PosCashShortageProductionActivationSlice370EvidenceDossier = EvidenceLayer<
  "dossierName", "sourceDocket",
  PosCashShortageProductionActivationSlice369EvidenceDocket
>;

export function buildPosCashShortageProductionActivationSlice370EvidenceDossier(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice370EvidenceDossier {
  const source = buildPosCashShortageProductionActivationSlice369EvidenceDocket(input);
  return buildEvidenceLayer(
    "dossierName", "Slice 370 production activation evidence dossier",
    "sourceDocket", source, source.docketName,
  );
}
export type PosCashShortageProductionActivationSlice371EvidenceBrief = EvidenceLayer<
  "briefName", "sourceDossier",
  PosCashShortageProductionActivationSlice370EvidenceDossier
>;

export function buildPosCashShortageProductionActivationSlice371EvidenceBrief(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice371EvidenceBrief {
  const source = buildPosCashShortageProductionActivationSlice370EvidenceDossier(input);
  return buildEvidenceLayer(
    "briefName", "Slice 371 production activation evidence brief",
    "sourceDossier", source, source.dossierName,
  );
}
export type PosCashShortageProductionActivationSlice372EvidenceAbstract = EvidenceLayer<
  "abstractName", "sourceBrief",
  PosCashShortageProductionActivationSlice371EvidenceBrief
>;

export function buildPosCashShortageProductionActivationSlice372EvidenceAbstract(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice372EvidenceAbstract {
  const source = buildPosCashShortageProductionActivationSlice371EvidenceBrief(input);
  return buildEvidenceLayer(
    "abstractName", "Slice 372 production activation evidence abstract",
    "sourceBrief", source, source.briefName,
  );
}
export type PosCashShortageProductionActivationSlice373EvidenceSynopsis = EvidenceLayer<
  "synopsisName", "sourceAbstract",
  PosCashShortageProductionActivationSlice372EvidenceAbstract
>;

export function buildPosCashShortageProductionActivationSlice373EvidenceSynopsis(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice373EvidenceSynopsis {
  const source = buildPosCashShortageProductionActivationSlice372EvidenceAbstract(input);
  return buildEvidenceLayer(
    "synopsisName", "Slice 373 production activation evidence synopsis",
    "sourceAbstract", source, source.abstractName,
  );
}
export type PosCashShortageProductionActivationSlice374EvidencePrecis = EvidenceLayer<
  "precisName", "sourceSynopsis",
  PosCashShortageProductionActivationSlice373EvidenceSynopsis
>;

export function buildPosCashShortageProductionActivationSlice374EvidencePrecis(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice374EvidencePrecis {
  const source = buildPosCashShortageProductionActivationSlice373EvidenceSynopsis(input);
  return buildEvidenceLayer(
    "precisName", "Slice 374 production activation evidence precis",
    "sourceSynopsis", source, source.synopsisName,
  );
}
export type PosCashShortageProductionActivationSlice375EvidenceOverview = EvidenceLayer<
  "overviewName", "sourcePrecis",
  PosCashShortageProductionActivationSlice374EvidencePrecis
>;

export function buildPosCashShortageProductionActivationSlice375EvidenceOverview(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice375EvidenceOverview {
  const source = buildPosCashShortageProductionActivationSlice374EvidencePrecis(input);
  return buildEvidenceLayer(
    "overviewName", "Slice 375 production activation evidence overview",
    "sourcePrecis", source, source.precisName,
  );
}
export type PosCashShortageProductionActivationSlice376EvidenceRecap = EvidenceLayer<
  "recapName", "sourceOverview",
  PosCashShortageProductionActivationSlice375EvidenceOverview
>;

export function buildPosCashShortageProductionActivationSlice376EvidenceRecap(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice376EvidenceRecap {
  const source = buildPosCashShortageProductionActivationSlice375EvidenceOverview(input);
  return buildEvidenceLayer(
    "recapName", "Slice 376 production activation evidence recap",
    "sourceOverview", source, source.overviewName,
  );
}
export type PosCashShortageProductionActivationSlice377EvidenceRoundup = EvidenceLayer<
  "roundupName", "sourceRecap",
  PosCashShortageProductionActivationSlice376EvidenceRecap
>;

export function buildPosCashShortageProductionActivationSlice377EvidenceRoundup(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice377EvidenceRoundup {
  const source = buildPosCashShortageProductionActivationSlice376EvidenceRecap(input);
  return buildEvidenceLayer(
    "roundupName", "Slice 377 production activation evidence roundup",
    "sourceRecap", source, source.recapName,
  );
}
export type PosCashShortageProductionActivationSlice378EvidenceBriefing = EvidenceLayer<
  "briefingName", "sourceRoundup",
  PosCashShortageProductionActivationSlice377EvidenceRoundup
>;

export function buildPosCashShortageProductionActivationSlice378EvidenceBriefing(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice378EvidenceBriefing {
  const source = buildPosCashShortageProductionActivationSlice377EvidenceRoundup(input);
  return buildEvidenceLayer(
    "briefingName", "Slice 378 production activation evidence briefing",
    "sourceRoundup", source, source.roundupName,
  );
}
export type PosCashShortageProductionActivationSlice379EvidenceBulletin = EvidenceLayer<
  "bulletinName", "sourceBriefing",
  PosCashShortageProductionActivationSlice378EvidenceBriefing
>;

export function buildPosCashShortageProductionActivationSlice379EvidenceBulletin(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice379EvidenceBulletin {
  const source = buildPosCashShortageProductionActivationSlice378EvidenceBriefing(input);
  return buildEvidenceLayer(
    "bulletinName", "Slice 379 production activation evidence bulletin",
    "sourceBriefing", source, source.briefingName,
  );
}
export type PosCashShortageProductionActivationSlice380EvidenceDispatch = EvidenceLayer<
  "dispatchName", "sourceBulletin",
  PosCashShortageProductionActivationSlice379EvidenceBulletin
>;

export function buildPosCashShortageProductionActivationSlice380EvidenceDispatch(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice380EvidenceDispatch {
  const source = buildPosCashShortageProductionActivationSlice379EvidenceBulletin(input);
  return buildEvidenceLayer(
    "dispatchName", "Slice 380 production activation evidence dispatch",
    "sourceBulletin", source, source.bulletinName,
  );
}
export type PosCashShortageProductionActivationSlice381EvidenceCommunique = EvidenceLayer<
  "communiqueName", "sourceDispatch",
  PosCashShortageProductionActivationSlice380EvidenceDispatch
>;

export function buildPosCashShortageProductionActivationSlice381EvidenceCommunique(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice381EvidenceCommunique {
  const source = buildPosCashShortageProductionActivationSlice380EvidenceDispatch(input);
  return buildEvidenceLayer(
    "communiqueName", "Slice 381 production activation evidence communique",
    "sourceDispatch", source, source.dispatchName,
  );
}
export type PosCashShortageProductionActivationSlice382EvidenceNotice = EvidenceLayer<
  "noticeName", "sourceCommunique",
  PosCashShortageProductionActivationSlice381EvidenceCommunique
>;

export function buildPosCashShortageProductionActivationSlice382EvidenceNotice(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice382EvidenceNotice {
  const source = buildPosCashShortageProductionActivationSlice381EvidenceCommunique(input);
  return buildEvidenceLayer(
    "noticeName", "Slice 382 production activation evidence notice",
    "sourceCommunique", source, source.communiqueName,
  );
}
export type PosCashShortageProductionActivationSlice383EvidenceAdvisory = EvidenceLayer<
  "advisoryName", "sourceNotice",
  PosCashShortageProductionActivationSlice382EvidenceNotice
>;

export function buildPosCashShortageProductionActivationSlice383EvidenceAdvisory(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice383EvidenceAdvisory {
  const source = buildPosCashShortageProductionActivationSlice382EvidenceNotice(input);
  return buildEvidenceLayer(
    "advisoryName", "Slice 383 production activation evidence advisory",
    "sourceNotice", source, source.noticeName,
  );
}
export type PosCashShortageProductionActivationSlice384EvidenceMemorandum = EvidenceLayer<
  "memorandumName", "sourceAdvisory",
  PosCashShortageProductionActivationSlice383EvidenceAdvisory
>;

export function buildPosCashShortageProductionActivationSlice384EvidenceMemorandum(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice384EvidenceMemorandum {
  const source = buildPosCashShortageProductionActivationSlice383EvidenceAdvisory(input);
  return buildEvidenceLayer(
    "memorandumName", "Slice 384 production activation evidence memorandum",
    "sourceAdvisory", source, source.advisoryName,
  );
}
export type PosCashShortageProductionActivationSlice385EvidenceMinute = EvidenceLayer<
  "minuteName", "sourceMemorandum",
  PosCashShortageProductionActivationSlice384EvidenceMemorandum
>;

export function buildPosCashShortageProductionActivationSlice385EvidenceMinute(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice385EvidenceMinute {
  const source = buildPosCashShortageProductionActivationSlice384EvidenceMemorandum(input);
  return buildEvidenceLayer(
    "minuteName", "Slice 385 production activation evidence minute",
    "sourceMemorandum", source, source.memorandumName,
  );
}
export type PosCashShortageProductionActivationSlice386EvidenceNote = EvidenceLayer<
  "noteName", "sourceMinute",
  PosCashShortageProductionActivationSlice385EvidenceMinute
>;

export function buildPosCashShortageProductionActivationSlice386EvidenceNote(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice386EvidenceNote {
  const source = buildPosCashShortageProductionActivationSlice385EvidenceMinute(input);
  return buildEvidenceLayer(
    "noteName", "Slice 386 production activation evidence note",
    "sourceMinute", source, source.minuteName,
  );
}
export type PosCashShortageProductionActivationSlice387EvidenceAnnotation = EvidenceLayer<
  "annotationName", "sourceNote",
  PosCashShortageProductionActivationSlice386EvidenceNote
>;

export function buildPosCashShortageProductionActivationSlice387EvidenceAnnotation(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice387EvidenceAnnotation {
  const source = buildPosCashShortageProductionActivationSlice386EvidenceNote(input);
  return buildEvidenceLayer(
    "annotationName", "Slice 387 production activation evidence annotation",
    "sourceNote", source, source.noteName,
  );
}
export type PosCashShortageProductionActivationSlice388EvidenceComment = EvidenceLayer<
  "commentName", "sourceAnnotation",
  PosCashShortageProductionActivationSlice387EvidenceAnnotation
>;

export function buildPosCashShortageProductionActivationSlice388EvidenceComment(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice388EvidenceComment {
  const source = buildPosCashShortageProductionActivationSlice387EvidenceAnnotation(input);
  return buildEvidenceLayer(
    "commentName", "Slice 388 production activation evidence comment",
    "sourceAnnotation", source, source.annotationName,
  );
}
export type PosCashShortageProductionActivationSlice389EvidenceGloss = EvidenceLayer<
  "glossName", "sourceComment",
  PosCashShortageProductionActivationSlice388EvidenceComment
>;

export function buildPosCashShortageProductionActivationSlice389EvidenceGloss(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice389EvidenceGloss {
  const source = buildPosCashShortageProductionActivationSlice388EvidenceComment(input);
  return buildEvidenceLayer(
    "glossName", "Slice 389 production activation evidence gloss",
    "sourceComment", source, source.commentName,
  );
}
export type PosCashShortageProductionActivationSlice390EvidenceMarginalia = EvidenceLayer<
  "marginaliaName", "sourceGloss",
  PosCashShortageProductionActivationSlice389EvidenceGloss
>;

export function buildPosCashShortageProductionActivationSlice390EvidenceMarginalia(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice390EvidenceMarginalia {
  const source = buildPosCashShortageProductionActivationSlice389EvidenceGloss(input);
  return buildEvidenceLayer(
    "marginaliaName", "Slice 390 production activation evidence marginalia",
    "sourceGloss", source, source.glossName,
  );
}
export type PosCashShortageProductionActivationSlice391EvidenceFootnote = EvidenceLayer<
  "footnoteName", "sourceMarginalia",
  PosCashShortageProductionActivationSlice390EvidenceMarginalia
>;

export function buildPosCashShortageProductionActivationSlice391EvidenceFootnote(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice391EvidenceFootnote {
  const source = buildPosCashShortageProductionActivationSlice390EvidenceMarginalia(input);
  return buildEvidenceLayer(
    "footnoteName", "Slice 391 production activation evidence footnote",
    "sourceMarginalia", source, source.marginaliaName,
  );
}
export type PosCashShortageProductionActivationSlice392EvidenceEndnote = EvidenceLayer<
  "endnoteName", "sourceFootnote",
  PosCashShortageProductionActivationSlice391EvidenceFootnote
>;

export function buildPosCashShortageProductionActivationSlice392EvidenceEndnote(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice392EvidenceEndnote {
  const source = buildPosCashShortageProductionActivationSlice391EvidenceFootnote(input);
  return buildEvidenceLayer(
    "endnoteName", "Slice 392 production activation evidence endnote",
    "sourceFootnote", source, source.footnoteName,
  );
}
export type PosCashShortageProductionActivationSlice393EvidenceAppendix = EvidenceLayer<
  "appendixName", "sourceEndnote",
  PosCashShortageProductionActivationSlice392EvidenceEndnote
>;

export function buildPosCashShortageProductionActivationSlice393EvidenceAppendix(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice393EvidenceAppendix {
  const source = buildPosCashShortageProductionActivationSlice392EvidenceEndnote(input);
  return buildEvidenceLayer(
    "appendixName", "Slice 393 production activation evidence appendix",
    "sourceEndnote", source, source.endnoteName,
  );
}
export type PosCashShortageProductionActivationSlice394EvidenceAddendum = EvidenceLayer<
  "addendumName", "sourceAppendix",
  PosCashShortageProductionActivationSlice393EvidenceAppendix
>;

export function buildPosCashShortageProductionActivationSlice394EvidenceAddendum(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice394EvidenceAddendum {
  const source = buildPosCashShortageProductionActivationSlice393EvidenceAppendix(input);
  return buildEvidenceLayer(
    "addendumName", "Slice 394 production activation evidence addendum",
    "sourceAppendix", source, source.appendixName,
  );
}
export type PosCashShortageProductionActivationSlice395EvidenceSupplement = EvidenceLayer<
  "supplementName", "sourceAddendum",
  PosCashShortageProductionActivationSlice394EvidenceAddendum
>;

export function buildPosCashShortageProductionActivationSlice395EvidenceSupplement(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice395EvidenceSupplement {
  const source = buildPosCashShortageProductionActivationSlice394EvidenceAddendum(input);
  return buildEvidenceLayer(
    "supplementName", "Slice 395 production activation evidence supplement",
    "sourceAddendum", source, source.addendumName,
  );
}
export type PosCashShortageProductionActivationSlice396EvidenceAnnex = EvidenceLayer<
  "annexName", "sourceSupplement",
  PosCashShortageProductionActivationSlice395EvidenceSupplement
>;

export function buildPosCashShortageProductionActivationSlice396EvidenceAnnex(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice396EvidenceAnnex {
  const source = buildPosCashShortageProductionActivationSlice395EvidenceSupplement(input);
  return buildEvidenceLayer(
    "annexName", "Slice 396 production activation evidence annex",
    "sourceSupplement", source, source.supplementName,
  );
}
export type PosCashShortageProductionActivationSlice397EvidenceExhibit = EvidenceLayer<
  "exhibitName", "sourceAnnex",
  PosCashShortageProductionActivationSlice396EvidenceAnnex
>;

export function buildPosCashShortageProductionActivationSlice397EvidenceExhibit(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice397EvidenceExhibit {
  const source = buildPosCashShortageProductionActivationSlice396EvidenceAnnex(input);
  return buildEvidenceLayer(
    "exhibitName", "Slice 397 production activation evidence exhibit",
    "sourceAnnex", source, source.annexName,
  );
}
export type PosCashShortageProductionActivationSlice398EvidenceAttachment = EvidenceLayer<
  "attachmentName", "sourceExhibit",
  PosCashShortageProductionActivationSlice397EvidenceExhibit
>;

export function buildPosCashShortageProductionActivationSlice398EvidenceAttachment(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice398EvidenceAttachment {
  const source = buildPosCashShortageProductionActivationSlice397EvidenceExhibit(input);
  return buildEvidenceLayer(
    "attachmentName", "Slice 398 production activation evidence attachment",
    "sourceExhibit", source, source.exhibitName,
  );
}
export type PosCashShortageProductionActivationSlice399EvidencePacket = EvidenceLayer<
  "packetName", "sourceAttachment",
  PosCashShortageProductionActivationSlice398EvidenceAttachment
>;

export function buildPosCashShortageProductionActivationSlice399EvidencePacket(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice399EvidencePacket {
  const source = buildPosCashShortageProductionActivationSlice398EvidenceAttachment(input);
  return buildEvidenceLayer(
    "packetName", "Slice 399 production activation evidence packet",
    "sourceAttachment", source, source.attachmentName,
  );
}
export type PosCashShortageProductionActivationSlice400EvidencePortfolio = EvidenceLayer<
  "portfolioName", "sourcePacket",
  PosCashShortageProductionActivationSlice399EvidencePacket
>;

export function buildPosCashShortageProductionActivationSlice400EvidencePortfolio(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice400EvidencePortfolio {
  const source = buildPosCashShortageProductionActivationSlice399EvidencePacket(input);
  return buildEvidenceLayer(
    "portfolioName", "Slice 400 production activation evidence portfolio",
    "sourcePacket", source, source.packetName,
  );
}
export type PosCashShortageProductionActivationSlice401EvidenceCompendium = EvidenceLayer<
  "compendiumName", "sourcePortfolio",
  PosCashShortageProductionActivationSlice400EvidencePortfolio
>;

export function buildPosCashShortageProductionActivationSlice401EvidenceCompendium(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice401EvidenceCompendium {
  const source = buildPosCashShortageProductionActivationSlice400EvidencePortfolio(input);
  return buildEvidenceLayer(
    "compendiumName", "Slice 401 production activation evidence compendium",
    "sourcePortfolio", source, source.portfolioName,
  );
}
export type PosCashShortageProductionActivationSlice402EvidenceDossier = EvidenceLayer<
  "dossierName", "sourceCompendium",
  PosCashShortageProductionActivationSlice401EvidenceCompendium
>;

export function buildPosCashShortageProductionActivationSlice402EvidenceDossier(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice402EvidenceDossier {
  const source = buildPosCashShortageProductionActivationSlice401EvidenceCompendium(input);
  return buildEvidenceLayer(
    "dossierName", "Slice 402 production activation evidence dossier",
    "sourceCompendium", source, source.compendiumName,
  );
}
export type PosCashShortageProductionActivationSlice403EvidenceBinder = EvidenceLayer<
  "binderName", "sourceDossier",
  PosCashShortageProductionActivationSlice402EvidenceDossier
>;

export function buildPosCashShortageProductionActivationSlice403EvidenceBinder(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice403EvidenceBinder {
  const source = buildPosCashShortageProductionActivationSlice402EvidenceDossier(input);
  return buildEvidenceLayer(
    "binderName", "Slice 403 production activation evidence binder",
    "sourceDossier", source, source.dossierName,
  );
}
export type PosCashShortageProductionActivationSlice404EvidenceFolder = EvidenceLayer<
  "folderName", "sourceBinder",
  PosCashShortageProductionActivationSlice403EvidenceBinder
>;

export function buildPosCashShortageProductionActivationSlice404EvidenceFolder(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice404EvidenceFolder {
  const source = buildPosCashShortageProductionActivationSlice403EvidenceBinder(input);
  return buildEvidenceLayer(
    "folderName", "Slice 404 production activation evidence folder",
    "sourceBinder", source, source.binderName,
  );
}
export type PosCashShortageProductionActivationSlice405EvidenceCasefile = EvidenceLayer<
  "casefileName", "sourceFolder",
  PosCashShortageProductionActivationSlice404EvidenceFolder
>;

export function buildPosCashShortageProductionActivationSlice405EvidenceCasefile(
  input: PosCashShortageComposedProductionActivationPreflightResult,
): PosCashShortageProductionActivationSlice405EvidenceCasefile {
  const source = buildPosCashShortageProductionActivationSlice404EvidenceFolder(input);
  return buildEvidenceLayer(
    "casefileName", "Slice 405 production activation evidence casefile",
    "sourceFolder", source, source.folderName,
  );
}
export function evaluatePosCashShortageProductionActivationPreflight(
  input: PosCashShortageProductionActivationPreflightInput,
): PosCashShortageProductionActivationPreflightResult {
  const satisfiedRequirements: PosCashShortageProductionActivationRequirement[] =
    [];
  const missingRequirements: PosCashShortageProductionActivationRequirement[] =
    [];

  for (const requirement of POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const ready = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_PREFLIGHT_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    status: ready ? "ready" : "blocked",
    canEnableDefinition: ready,
    canRunWorker: ready,
    activationHold: ready ? null : activationHold(input.definition),
    satisfiedRequirements,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageProductionActivationRequirement,
  input: PosCashShortageProductionActivationPreflightInput,
) {
  const { definition, evidence } = input;

  switch (requirement) {
    case "definition_identity":
      return (
        definition.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY &&
        definition.version === POS_SHIFT_CASH_SHORTAGE_DEFINITION_VERSION &&
        definition.workflow === "pos" &&
        definition.moduleSlug === "pos" &&
        definition.requiredPermission === "pos.transactions.read" &&
        definition.enforceMode === false
      );
    case "service_activation_marker":
      return (
        evidence.serviceActivationCertified &&
        definition.metadata.productionActivationCertified === true
      );
    case "release_gate_activation_marker":
      return (
        evidence.releaseGateActivationCertified &&
        definition.metadata.productionActivationCertified === true
      );
    case "worker_checkpoint_persistence":
      return evidence.workerCheckpointPersistenceCertified;
    case "scheduler_policy":
      return evidence.schedulerPolicyCertified;
    case "incident_command_integration":
      return evidence.incidentCommandIntegrationCertified;
    case "alert_delivery_integration":
      return evidence.alertDeliveryIntegrationCertified;
    case "rollback_plan":
      return evidence.rollbackPlanCertified;
    case "observability_runbook":
      return evidence.observabilityRunbookCertified;
    case "owner_security_approval":
      return evidence.ownerSecurityApprovalCertified;
    case "browser_certification_gate":
      return evidence.browserCertificationGateCertified;
    case "production_policy_readiness":
      return evidence.productionPolicyReadinessCertified;
    case "source_owned_resolution_readiness":
      return evidence.sourceOwnedResolutionReadinessCertified;
  }
}

function countBlockersByKind(
  blockers: PosCashShortageProductionActivationBlocker[],
): Record<PosCashShortageProductionActivationBlockerKind, number> {
  return blockers.reduce(
    (counts, blocker) => ({
      ...counts,
      [blocker.kind]: counts[blocker.kind] + 1,
    }),
    {
      activation_evidence: 0,
      definition_activation_marker: 0,
      definition_identity: 0,
    },
  );
}
function blockerKindFor(
  requirement: PosCashShortageProductionActivationRequirement,
  evidence: PosCashShortageProductionActivationEvidence,
): PosCashShortageProductionActivationBlockerKind {
  if (requirement === "definition_identity") return "definition_identity";

  const evidenceField = evidenceFieldFor(requirement);
  if (evidenceField && !evidence[evidenceField]) return "activation_evidence";

  return "definition_activation_marker";
}

function evidenceFieldFor(
  requirement: PosCashShortageProductionActivationRequirement,
): PosCashShortageProductionActivationEvidenceField | null {
  switch (requirement) {
    case "definition_identity":
      return null;
    case "service_activation_marker":
      return "serviceActivationCertified";
    case "release_gate_activation_marker":
      return "releaseGateActivationCertified";
    case "worker_checkpoint_persistence":
      return "workerCheckpointPersistenceCertified";
    case "scheduler_policy":
      return "schedulerPolicyCertified";
    case "incident_command_integration":
      return "incidentCommandIntegrationCertified";
    case "alert_delivery_integration":
      return "alertDeliveryIntegrationCertified";
    case "rollback_plan":
      return "rollbackPlanCertified";
    case "observability_runbook":
      return "observabilityRunbookCertified";
    case "owner_security_approval":
      return "ownerSecurityApprovalCertified";
    case "browser_certification_gate":
      return "browserCertificationGateCertified";
    case "production_policy_readiness":
      return "productionPolicyReadinessCertified";
    case "source_owned_resolution_readiness":
      return "sourceOwnedResolutionReadinessCertified";
  }
}
function activationHold(definition: WorkflowAssuranceCheckDefinitionContract) {
  const hold = definition.metadata.activationHold;
  return typeof hold === "string" && hold.trim()
    ? hold
    : "production_activation_preflight_incomplete";
}

function emptyProductionActivationEvidence(): PosCashShortageProductionActivationEvidence {
  return {
    serviceActivationCertified: false,
    releaseGateActivationCertified: false,
    workerCheckpointPersistenceCertified: false,
    schedulerPolicyCertified: false,
    incidentCommandIntegrationCertified: false,
    alertDeliveryIntegrationCertified: false,
    rollbackPlanCertified: false,
    observabilityRunbookCertified: false,
    ownerSecurityApprovalCertified: false,
    browserCertificationGateCertified: false,
    productionPolicyReadinessCertified: false,
    sourceOwnedResolutionReadinessCertified: false,
  };
}

// Retained evidence contracts share one implementation for their repeated wrapper shape.
// Names, nested source objects, property order, text, and activation authority stay stable.
type EvidenceLayer<Name extends string, SourceKey extends string, Source> =
  Record<Name, string> & Record<SourceKey, Source> & {
    status: "ready" | "blocked";
    tone: "clear" | "attention";
    itemCount: number;
    items: readonly string[];
    text: string;
    activationAuthorized: false;
  };

function buildEvidenceLayer<
  Name extends string,
  SourceKey extends string,
  Source extends { status: "ready" | "blocked"; items: readonly string[]; text: string },
>(nameKey: Name, name: string, sourceKey: SourceKey, source: Source, sourceName: string): EvidenceLayer<Name, SourceKey, Source> {
  const items = [sourceName, ...source.items];
  const ready = source.status === "ready";
  // The internal callers supply distinct literal name/source keys; computed keys
  // need an assertion to retain those literal property names in the return type.
  return {
    [nameKey]: name,
    status: ready ? "ready" : "blocked",
    tone: ready ? "clear" : "attention",
    [sourceKey]: source,
    itemCount: items.length,
    items,
    text: ready ? `${name} is clear: ${source.text}` : `${name} needs attention: ${source.text}`,
    activationAuthorized: false,
  } as EvidenceLayer<Name, SourceKey, Source>;
}
