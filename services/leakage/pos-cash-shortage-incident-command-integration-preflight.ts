export const POS_CASH_SHORTAGE_INCIDENT_COMMAND_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_INCIDENT_COMMAND_REQUIREMENTS = [
  "generic_resolve_command",
  "generic_current_source_hash_guard",
  "generic_legal_transition_guard",
  "generic_event_history",
  "generic_audit_history",
  "pos_policy_command_input",
  "pos_policy_source_identity",
  "pos_policy_independent_reviewer",
  "pos_policy_resolution_evidence_hash",
  "no_direct_incident_command_invocation",
] as const;

export type PosCashShortageIncidentCommandRequirement =
  (typeof POS_CASH_SHORTAGE_INCIDENT_COMMAND_REQUIREMENTS)[number];

export type PosCashShortageIncidentCommandIntegrationPreflightInput = {
  assuranceIncidentServiceSourceText: string;
  assuranceIncidentContractsSourceText: string;
  posIncidentPolicySourceText: string;
};

export type PosCashShortageIncidentCommandIntegrationPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_INCIDENT_COMMAND_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  incidentCommandIntegrationCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageIncidentCommandRequirement[];
  missingRequirements: PosCashShortageIncidentCommandRequirement[];
};

export type PosCashShortageIncidentCommandIntegrationActivationEvidence = {
  incidentCommandIntegrationCertified: boolean;
  activationAuthorized: false;
  preflightCertified: boolean;
  missingRequirements: Array<"incident_command_integration_preflight">;
};

export function evaluatePosCashShortageIncidentCommandIntegrationPreflight(
  input: PosCashShortageIncidentCommandIntegrationPreflightInput,
): PosCashShortageIncidentCommandIntegrationPreflightResult {
  const satisfiedRequirements: PosCashShortageIncidentCommandRequirement[] = [];
  const missingRequirements: PosCashShortageIncidentCommandRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_INCIDENT_COMMAND_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const ready = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_INCIDENT_COMMAND_PREFLIGHT_VERSION,
    status: ready ? "certified" : "blocked",
    incidentCommandIntegrationCertified: ready,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

export function composePosCashShortageIncidentCommandIntegrationActivationEvidence(input: {
  preflight: Pick<
    PosCashShortageIncidentCommandIntegrationPreflightResult,
    "incidentCommandIntegrationCertified" | "activationAuthorized"
  >;
}): PosCashShortageIncidentCommandIntegrationActivationEvidence {
  const preflightCertified =
    input.preflight.incidentCommandIntegrationCertified &&
    input.preflight.activationAuthorized === false;

  return {
    incidentCommandIntegrationCertified: preflightCertified,
    activationAuthorized: false,
    preflightCertified,
    missingRequirements: preflightCertified
      ? []
      : ["incident_command_integration_preflight"],
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageIncidentCommandRequirement,
  input: PosCashShortageIncidentCommandIntegrationPreflightInput,
) {
  const genericSource = `${input.assuranceIncidentContractsSourceText}\n${input.assuranceIncidentServiceSourceText}`;
  const policySource = input.posIncidentPolicySourceText;

  switch (requirement) {
    case "generic_resolve_command":
      return hasExportedAsyncFunction(
        input.assuranceIncidentServiceSourceText,
        "resolve" + "WorkflowAssuranceIncident",
      );
    case "generic_current_source_hash_guard":
      return ["currentSourceHash", "assert" + "CurrentIncidentSourceHash"].every(
        (marker) => genericSource.includes(marker),
      );
    case "generic_legal_transition_guard":
      return genericSource.includes("assert" + "LegalIncidentTransition");
    case "generic_event_history":
      return [
        "recordIncidentEvent",
        "workflowAssuranceIncidentEvent.create",
      ].every((marker) => input.assuranceIncidentServiceSourceText.includes(marker));
    case "generic_audit_history":
      return input.assuranceIncidentServiceSourceText.includes("auditLog.create");
    case "pos_policy_command_input":
      return [
        "commandInput",
        "organizationId",
        "incidentId",
        "actorId",
        "currentSourceHash",
        "note",
        "metadata",
      ].every((marker) => policySource.includes(marker));
    case "pos_policy_source_identity":
      return [
        "POS_SHIFT_CASH_SHORTAGE_CHECK_KEY",
        "POSSession",
        "sourceId",
        "sourceHash",
      ].every((marker) => policySource.includes(marker));
    case "pos_policy_independent_reviewer":
      return (
        policySource.includes("actorId === evidence.cashierId") &&
        policySource.includes("actorId === evidence.closerId") &&
        policySource.includes("independent reviewer")
      );
    case "pos_policy_resolution_evidence_hash":
      return policySource.includes("resolutionEvidenceHash");
    case "no_direct_incident_command_invocation":
      return !directIncidentCommandPattern().test(policySource);
  }
}

function hasExportedAsyncFunction(source: string, functionName: string) {
  return new RegExp(`export\\s+async\\s+function\\s+${functionName}\\b`).test(source);
}

function directIncidentCommandPattern() {
  return new RegExp(
    [
      "resolve" + "WorkflowAssuranceIncident\\s*\\(",
      "transition" + "WorkflowAssuranceIncident\\s*\\(",
      "upsert" + "WorkflowAssuranceIncidentFromResult\\s*\\(",
      "record" + "WorkflowAssuranceIncident\\s*\\(",
      "db\\.",
      "prisma\\.",
    ].join("|"),
    "i",
  );
}
