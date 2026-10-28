export const POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_REQUIREMENTS = [
  "generic_transition_transaction_boundary",
  "generic_tenant_scoped_incident_lookup",
  "generic_legal_transition_guard",
  "generic_current_source_hash_conflict_guard",
  "generic_event_and_audit_history",
  "command_readiness_contract_present",
  "protected_execution_preflight_present",
  "pos_command_wrapper_present",
  "pos_command_idempotency_key_required",
  "pos_command_concurrency_guard_required",
  "pos_command_source_recheck_required",
  "pos_command_uses_prepared_command_input",
  "pos_command_avoids_direct_persistence",
] as const;

export type PosCashShortageIdempotentResolutionCommandRequirement =
  (typeof POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_REQUIREMENTS)[number];

export type PosCashShortageIdempotentResolutionCommandPreflightInput = {
  genericIncidentServiceSourceText: string;
  genericIncidentServiceTestSourceText: string;
  commandReadinessSourceText: string;
  protectedResolutionPreflightSourceText: string;
  posResolutionCommandSourceText: string | null;
};

export type PosCashShortageIdempotentResolutionCommandPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  genericTransitionEvidenceCertified: boolean;
  posCommandWrapperCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageIdempotentResolutionCommandRequirement[];
  missingRequirements: PosCashShortageIdempotentResolutionCommandRequirement[];
};

const GENERIC_TRANSITION_REQUIREMENTS: PosCashShortageIdempotentResolutionCommandRequirement[] = [
  "generic_transition_transaction_boundary",
  "generic_tenant_scoped_incident_lookup",
  "generic_legal_transition_guard",
  "generic_current_source_hash_conflict_guard",
  "generic_event_and_audit_history",
  "command_readiness_contract_present",
  "protected_execution_preflight_present",
];

const POS_COMMAND_WRAPPER_REQUIREMENTS: PosCashShortageIdempotentResolutionCommandRequirement[] = [
  "pos_command_wrapper_present",
  "pos_command_idempotency_key_required",
  "pos_command_concurrency_guard_required",
  "pos_command_source_recheck_required",
  "pos_command_uses_prepared_command_input",
  "pos_command_avoids_direct_persistence",
];

export function evaluatePosCashShortageIdempotentResolutionCommandPreflight(
  input: PosCashShortageIdempotentResolutionCommandPreflightInput,
): PosCashShortageIdempotentResolutionCommandPreflightResult {
  const satisfiedRequirements: PosCashShortageIdempotentResolutionCommandRequirement[] = [];
  const missingRequirements: PosCashShortageIdempotentResolutionCommandRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const genericTransitionEvidenceCertified = GENERIC_TRANSITION_REQUIREMENTS.every((requirement) =>
    satisfiedRequirements.includes(requirement),
  );
  const posCommandWrapperCertified = POS_COMMAND_WRAPPER_REQUIREMENTS.every((requirement) =>
    satisfiedRequirements.includes(requirement),
  );
  const certified = genericTransitionEvidenceCertified && posCommandWrapperCertified;

  return {
    version: POS_CASH_SHORTAGE_IDEMPOTENT_RESOLUTION_COMMAND_PREFLIGHT_VERSION,
    status: certified ? "certified" : "blocked",
    genericTransitionEvidenceCertified,
    posCommandWrapperCertified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageIdempotentResolutionCommandRequirement,
  input: PosCashShortageIdempotentResolutionCommandPreflightInput,
) {
  const genericServiceSource = input.genericIncidentServiceSourceText;
  const genericTransitionSource = extractTransitionSource(genericServiceSource);
  const genericServiceTestSource = input.genericIncidentServiceTestSourceText;
  const commandReadinessSource = input.commandReadinessSourceText;
  const protectedPreflightSource = input.protectedResolutionPreflightSourceText;
  const posCommandSource = input.posResolutionCommandSourceText ?? "";

  switch (requirement) {
    case "generic_transition_transaction_boundary":
      return (
        genericTransitionSource.includes("return " + "d" + "b.$transaction(async (tx)") &&
        genericTransitionSource.includes("const client = tx as unknown as IncidentDbClient")
      );
    case "generic_tenant_scoped_incident_lookup":
      return (
        genericTransitionSource.includes(
          "findIncidentForTenant(client, input.organizationId, input.incidentId)",
        ) &&
        genericServiceSource.includes("organizationId: string, incidentId: string") &&
        genericServiceSource.includes("id: incidentId") &&
        genericServiceSource.includes("organizationId")
      );
    case "generic_legal_transition_guard":
      return (
        genericTransitionSource.includes("FINAL_STATUSES.has(incident.status)") &&
        genericTransitionSource.includes("assertLegalIncidentTransition(incident.status, transition.status)") &&
        genericServiceTestSource.includes("blocks lifecycle transitions that are not legal")
      );
    case "generic_current_source_hash_conflict_guard":
      return (
        genericServiceSource.includes("assertCurrentIncidentSourceHash") &&
        genericServiceSource.includes("new ConflictError") &&
        genericServiceSource.includes("currentSourceHash") &&
        genericServiceTestSource.includes("requires current source hash confirmation before resolving")
      );
    case "generic_event_and_audit_history":
      return (
        genericTransitionSource.includes("recordIncidentEvent(client") &&
        genericTransitionSource.includes("recordAuditLog(client") &&
        genericTransitionSource.includes("WORKFLOW_ASSURANCE_INCIDENT_") &&
        genericServiceTestSource.includes("records resolved state transitions")
      );
    case "command_readiness_contract_present":
      return (
        commandReadinessSource.includes("preparePosCashShortageResolutionCommandReadiness") &&
        commandReadinessSource.includes("commandInput: certified ? commandInput : null") &&
        commandReadinessSource.includes("activationAuthorized: false")
      );
    case "protected_execution_preflight_present":
      return (
        protectedPreflightSource.includes(
          "evaluatePosCashShortageProtectedResolutionExecutionPreflight",
        ) &&
        protectedPreflightSource.includes("ui_binds_current_incident_source_hash") &&
        protectedPreflightSource.includes("activationAuthorized: false")
      );
    case "pos_command_wrapper_present":
      return hasExportedAsyncFunction(posCommandSource, "executePosCashShortageResolutionCommand");
    case "pos_command_idempotency_key_required":
      return (
        posCommandSource.includes("idempotencyKey") &&
        posCommandSource.includes("buildPosCashShortageResolutionIdempotencyKey") &&
        posCommandSource.includes("incidentId") &&
        posCommandSource.includes("currentSourceHash")
      );
    case "pos_command_concurrency_guard_required":
      return (
        posCommandSource.includes("withPosCashShortageResolutionConcurrencyGuard") &&
        posCommandSource.includes("incidentId") &&
        posCommandSource.includes("currentSourceHash")
      );
    case "pos_command_source_recheck_required":
      return (
        posCommandSource.includes("evaluatePosCashShortageResolutionSourceRecheck") &&
        posCommandSource.includes("preparePosCashShortageResolutionCommandReadiness") &&
        posCommandSource.includes("sourceRecheckResult")
      );
    case "pos_command_uses_prepared_command_input":
      return (
        posCommandSource.includes("commandReadiness.commandInput") &&
        posCommandSource.includes(
          "resolve" + "WorkflowAssuranceIncident(commandReadiness.commandInput)",
        )
      );
    case "pos_command_avoids_direct_persistence":
      return !directPersistencePattern().test(posCommandSource);
  }
}

function extractTransitionSource(source: string) {
  const start = source.indexOf("async function transitionWorkflowAssuranceIncident");
  if (start < 0) return "";
  const end = source.indexOf("function assertLegalIncidentTransition", start);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

function hasExportedAsyncFunction(source: string, functionName: string) {
  return new RegExp(`export\\s+async\\s+function\\s+${functionName}\\b`).test(
    source,
  );
}

function directPersistencePattern() {
  return new RegExp(
    [
      "workflowAssuranceIncident\\.(create|update|delete|upsert)",
      "workflowAssuranceIncidentEvent\\.(create|update|delete|upsert)",
      "auditLog\\.(create|update|delete|upsert)",
      "prisma\\.",
      "db\\.",
    ].join("|"),
    "i",
  );
}
