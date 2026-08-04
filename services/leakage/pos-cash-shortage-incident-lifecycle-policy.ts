import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import { BusinessRuleError } from "@/services/_shared/action-errors";
import type { WorkflowAssuranceIncidentDto } from "@/services/assurance/assurance-incident-contracts";

import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "./pos-shift-cash-shortage-contracts";

const POS_CASH_SHORTAGE_REVIEW_PERMISSION = "pos.transactions.read";
const RESOLVABLE_STATUSES = new Set([
  "open",
  "acknowledged",
  "assigned",
  "in_progress",
  "reopened",
]);

export type PosCashShortageIncidentResolutionPolicyInput = {
  incident: WorkflowAssuranceIncidentDto;
  actorId: string;
  actorPermissions: readonly string[];
  currentSourceHash: string;
  resolutionNote: string;
  resolutionEvidenceHash: string;
};

export type PosCashShortageIncidentResolutionPolicyResult = {
  incidentId: string;
  organizationId: string;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  sourceType: "POSSession";
  sourceId: string;
  sourceHash: string;
  actorId: string;
  currentSourceHash: string;
  resolutionNote: string;
  resolutionEvidenceHash: string;
  policy: "pos_cash_shortage_independent_resolution_v1";
  evidence: {
    eventId: string;
    locationId: string;
    terminalId: string;
    cashDrawerId: string;
    cashierId: string;
    closerId: string;
    amountAtRisk: string;
    currency: string;
    policyId: string;
  };
  commandInput: {
    organizationId: string;
    incidentId: string;
    actorId: string;
    currentSourceHash: string;
    note: string;
    metadata: {
      policy: "pos_cash_shortage_independent_resolution_v1";
      resolutionEvidenceHash: string;
      reviewedSourceType: "POSSession";
      reviewedSourceId: string;
      amountAtRisk: string;
      currency: string;
      policyId: string;
    };
  };
};

export function assertPosCashShortageIncidentResolutionAllowed(
  input: PosCashShortageIncidentResolutionPolicyInput,
): PosCashShortageIncidentResolutionPolicyResult {
  const actorId = requiredText(input.actorId, "Reviewer is required.");
  const currentSourceHash = requiredText(
    input.currentSourceHash,
    "Current source hash confirmation is required.",
  );
  const resolutionNote = requiredText(
    input.resolutionNote,
    "Resolution note is required.",
  );
  const resolutionEvidenceHash = requiredText(
    input.resolutionEvidenceHash,
    "Resolution evidence hash is required.",
  );

  if (
    !hasRbacPermission(
      [...input.actorPermissions],
      POS_CASH_SHORTAGE_REVIEW_PERMISSION,
    )
  ) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution requires the certified POS read permission.",
    );
  }

  const incident = input.incident;
  if (incident.checkKey !== POS_SHIFT_CASH_SHORTAGE_CHECK_KEY) {
    throw new BusinessRuleError(
      "Only POS cash-shortage incidents can use this lifecycle policy.",
    );
  }
  if (incident.sourceType !== "POSSession" || !incident.sourceId.trim()) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution requires a concrete POS session source.",
    );
  }
  if (!RESOLVABLE_STATUSES.has(incident.status)) {
    throw new BusinessRuleError(
      "POS cash-shortage incident is not in a resolvable lifecycle state.",
    );
  }
  if (incident.sourceHash !== currentSourceHash) {
    throw new BusinessRuleError(
      "POS cash-shortage source changed before resolution.",
    );
  }

  const evidence = parseResolutionEvidence(incident.metadata);
  if (actorId === evidence.cashierId || actorId === evidence.closerId) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution requires an independent reviewer.",
    );
  }

  return {
    incidentId: incident.id,
    organizationId: incident.organizationId,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    sourceType: "POSSession",
    sourceId: incident.sourceId,
    sourceHash: incident.sourceHash,
    actorId,
    currentSourceHash,
    resolutionNote,
    resolutionEvidenceHash,
    policy: "pos_cash_shortage_independent_resolution_v1",
    evidence,
    commandInput: {
      organizationId: incident.organizationId,
      incidentId: incident.id,
      actorId,
      currentSourceHash,
      note: resolutionNote,
      metadata: {
        policy: "pos_cash_shortage_independent_resolution_v1",
        resolutionEvidenceHash,
        reviewedSourceType: "POSSession",
        reviewedSourceId: incident.sourceId,
        amountAtRisk: evidence.amountAtRisk,
        currency: evidence.currency,
        policyId: evidence.policyId,
      },
    },
  };
}

function parseResolutionEvidence(metadata: Record<string, unknown>) {
  const resultMetadata = objectRecord(metadata.resultMetadata);
  if (resultMetadata.outcome !== "triggered") {
    throw new BusinessRuleError(
      "POS cash-shortage resolution requires triggered shortage evidence.",
    );
  }

  return {
    eventId: requiredMetadataText(resultMetadata, "eventId"),
    locationId: requiredMetadataText(resultMetadata, "locationId"),
    terminalId: requiredMetadataText(resultMetadata, "terminalId"),
    cashDrawerId: requiredMetadataText(resultMetadata, "cashDrawerId"),
    cashierId: requiredMetadataText(resultMetadata, "cashierId"),
    closerId: requiredMetadataText(resultMetadata, "closerId"),
    amountAtRisk: requiredMetadataText(resultMetadata, "amountAtRisk"),
    currency: requiredMetadataText(resultMetadata, "currency"),
    policyId: requiredMetadataText(resultMetadata, "policyId"),
  };
}

function requiredMetadataText(record: Record<string, unknown>, key: string) {
  return requiredText(
    typeof record[key] === "string" ? record[key] : "",
    `POS cash-shortage resolution evidence is missing ${key}.`,
  );
}

function requiredText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new BusinessRuleError(message);
  return normalized;
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BusinessRuleError(
      "POS cash-shortage resolution requires unredacted result metadata.",
    );
  }
  return value as Record<string, unknown>;
}
