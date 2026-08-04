export const POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_REQUIREMENTS = [
  "generic_resolve_action_present",
  "protected_resolve_action",
  "protected_tenant_actor_context",
  "fresh_auth_required",
  "controls_manage_permission",
  "current_source_hash_schema",
  "ui_binds_current_incident_source_hash",
  "command_readiness_contract_present",
  "pos_resolution_action_not_active",
] as const;

export type PosCashShortageProtectedResolutionRequirement =
  (typeof POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_REQUIREMENTS)[number];

export type PosCashShortageProtectedResolutionExecutionPreflightInput = {
  genericIncidentActionSourceText: string;
  genericIncidentActionTestSourceText: string;
  incidentActionsComponentSourceText: string;
  commandReadinessSourceText: string;
  posResolutionActionSourceText: string | null;
};

export type PosCashShortageProtectedResolutionExecutionPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  protectedResolutionExecutionCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageProtectedResolutionRequirement[];
  missingRequirements: PosCashShortageProtectedResolutionRequirement[];
};

export function evaluatePosCashShortageProtectedResolutionExecutionPreflight(
  input: PosCashShortageProtectedResolutionExecutionPreflightInput,
): PosCashShortageProtectedResolutionExecutionPreflightResult {
  const satisfiedRequirements: PosCashShortageProtectedResolutionRequirement[] = [];
  const missingRequirements: PosCashShortageProtectedResolutionRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_PREFLIGHT_VERSION,
    status: certified ? "certified" : "blocked",
    protectedResolutionExecutionCertified: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageProtectedResolutionRequirement,
  input: PosCashShortageProtectedResolutionExecutionPreflightInput,
) {
  const actionSource = input.genericIncidentActionSourceText;
  const resolveActionSource = extractResolveActionSource(actionSource);
  const actionTestSource = input.genericIncidentActionTestSourceText;
  const componentSource = input.incidentActionsComponentSourceText;
  const commandReadinessSource = input.commandReadinessSourceText;
  const posActionSource = input.posResolutionActionSourceText ?? "";

  switch (requirement) {
    case "generic_resolve_action_present":
      return hasExportedAsyncFunction(
        actionSource,
        "resolve" + "WorkflowAssuranceIncidentAction",
      );
    case "protected_resolve_action":
      return (
        resolveActionSource.includes("const resolveIncident = protect") &&
        actionSource.includes("return resolveIncident(input)")
      );
    case "protected_tenant_actor_context":
      return (
        resolveActionSource.includes("organizationId: ctx.orgId") &&
        resolveActionSource.includes("actorId: ctx.userId") &&
        actionTestSource.includes("organizationId: \"org-session\"") &&
        actionTestSource.includes("actorId: \"user-session\"")
      );
    case "fresh_auth_required":
      return (
        resolveActionSource.includes("freshAuth: { maxAgeSeconds: 300 }") &&
        actionTestSource.includes("fresh-auth controls")
      );
    case "controls_manage_permission":
      return (
        resolveActionSource.includes('permission: "controls.manage"') &&
        resolveActionSource.includes('auditResource: "WorkflowAssuranceIncident"') &&
        resolveActionSource.includes("auditAllowed: true")
      );
    case "current_source_hash_schema":
      return (
        actionSource.includes("const resolveIncidentSchema") &&
        actionSource.includes("currentSourceHash") &&
        actionTestSource.includes("sha256-current-source")
      );
    case "ui_binds_current_incident_source_hash":
      return (
        componentSource.includes("resolvePosCashShortageIncidentAction") &&
        componentSource.includes("resolveWorkflowAssuranceIncidentAction") &&
        countOccurrences(componentSource, "currentSourceHash: incident.sourceHash") >= 2
      );
    case "command_readiness_contract_present":
      return (
        commandReadinessSource.includes(
          "preparePosCashShortageResolutionCommandReadiness",
        ) &&
        commandReadinessSource.includes("commandInput: certified ? commandInput : null") &&
        commandReadinessSource.includes("activationAuthorized: false")
      );
    case "pos_resolution_action_not_active":
      return !directTerminalCommandPattern().test(posActionSource);
  }
}

function countOccurrences(source: string, value: string) {
  return source.split(value).length - 1;
}

function extractResolveActionSource(source: string) {
  const start = source.indexOf("const resolveIncident = protect");
  if (start < 0) return "";
  const end = source.indexOf("const suppressIncident = protect", start);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}
function hasExportedAsyncFunction(source: string, functionName: string) {
  return new RegExp(`export\\s+async\\s+function\\s+${functionName}\\b`).test(
    source,
  );
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
