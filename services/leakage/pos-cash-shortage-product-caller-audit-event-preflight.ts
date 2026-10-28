export const POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_REQUIREMENTS = [
  "product_caller_present",
  "product_caller_pos_check_key_gated",
  "product_caller_binds_current_source_hash",
  "product_caller_sends_resolution_evidence_hash",
  "generic_incidents_remain_generic",
  "protected_action_audit_posture",
  "protected_action_handler_derived_context",
  "protected_action_server_owned_source_loader",
  "protected_action_invokes_pos_command_wrapper",
  "pos_command_uses_prepared_generic_resolver_input",
  "pos_command_avoids_direct_persistence",
  "generic_resolver_records_event_history",
  "generic_resolver_records_audit_history",
  "focused_tests_cover_product_and_action_chain",
] as const;

export type PosCashShortageProductCallerAuditEventRequirement =
  (typeof POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_REQUIREMENTS)[number];

export type PosCashShortageProductCallerAuditEventPreflightInput = {
  incidentActionsComponentSourceText: string;
  incidentActionsComponentTestSourceText: string;
  posResolutionActionSourceText: string;
  posResolutionActionTestSourceText: string;
  posResolutionCommandSourceText: string;
  genericIncidentServiceSourceText: string;
  genericIncidentServiceTestSourceText: string;
};

export type PosCashShortageProductCallerAuditEventPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  productCallerAuditEventCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageProductCallerAuditEventRequirement[];
  missingRequirements: PosCashShortageProductCallerAuditEventRequirement[];
};

export function evaluatePosCashShortageProductCallerAuditEventPreflight(
  input: PosCashShortageProductCallerAuditEventPreflightInput,
): PosCashShortageProductCallerAuditEventPreflightResult {
  const satisfiedRequirements: PosCashShortageProductCallerAuditEventRequirement[] = [];
  const missingRequirements: PosCashShortageProductCallerAuditEventRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_PREFLIGHT_VERSION,
    status: certified ? "certified" : "blocked",
    productCallerAuditEventCertified: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageProductCallerAuditEventRequirement,
  input: PosCashShortageProductCallerAuditEventPreflightInput,
) {
  const componentSource = input.incidentActionsComponentSourceText;
  const componentTestSource = input.incidentActionsComponentTestSourceText;
  const actionSource = input.posResolutionActionSourceText;
  const actionTestSource = input.posResolutionActionTestSourceText;
  const commandSource = input.posResolutionCommandSourceText;
  const genericServiceSource = input.genericIncidentServiceSourceText;
  const genericTransitionSource = extractTransitionSource(genericServiceSource);
  const genericServiceTestSource = input.genericIncidentServiceTestSourceText;

  switch (requirement) {
    case "product_caller_present":
      return (
        componentSource.includes("resolvePosCashShortageIncidentAction") &&
        componentSource.includes("@/actions/assurance/pos-cash-shortage-resolution.actions")
      );
    case "product_caller_pos_check_key_gated":
      return (
        componentSource.includes('POS_CASH_SHORTAGE_CHECK_KEY = "pos.closed_shift_cash_shortage.review"') &&
        componentSource.includes("isPosCashShortageIncident") &&
        componentSource.includes("incident.checkKey === POS_CASH_SHORTAGE_CHECK_KEY")
      );
    case "product_caller_binds_current_source_hash":
      return componentSource.includes("currentSourceHash: incident.sourceHash");
    case "product_caller_sends_resolution_evidence_hash":
      return (
        componentSource.includes("resolutionEvidenceHash: evidenceHash.trim()") &&
        componentSource.includes("setEvidenceHash") &&
        componentSource.includes("minLength={12}")
      );
    case "generic_incidents_remain_generic":
      return (
        componentSource.includes("resolveWorkflowAssuranceIncidentAction") &&
        componentTestSource.includes("keeps generic incidents on the generic Workflow Assurance resolve action") &&
        componentTestSource.includes("expect(mockResolvePosCashShortage).not.toHaveBeenCalled()")
      );
    case "protected_action_audit_posture":
      return (
        actionSource.includes('permission: "controls.manage"') &&
        actionSource.includes('auditResource: "WorkflowAssuranceIncident"') &&
        actionSource.includes("auditAllowed: true") &&
        actionSource.includes("freshAuth: { maxAgeSeconds: 300 }")
      );
    case "protected_action_handler_derived_context":
      return (
        actionSource.includes('tenantGuard: "handler-derived"') &&
        actionSource.includes("organizationId: ctx.orgId") &&
        actionSource.includes("actorId: ctx.userId") &&
        actionSource.includes("actorPermissions: ctx.permissions")
      );
    case "protected_action_server_owned_source_loader":
      return (
        actionSource.includes("getAssuranceIncidentDetailData") &&
        actionSource.includes("loadPosCashShortageResolutionSourceForIncident") &&
        actionSource.includes("source.sourceRecheckInput")
      );
    case "protected_action_invokes_pos_command_wrapper":
      return (
        actionSource.includes("executePosCashShortageResolutionCommand") &&
        !actionSource.includes("resolveWorkflowAssuranceIncident(")
      );
    case "pos_command_uses_prepared_generic_resolver_input":
      return commandSource.includes(
        "resolve" + "WorkflowAssuranceIncident(commandReadiness.commandInput)",
      );
    case "pos_command_avoids_direct_persistence":
      return !directPersistencePattern().test(commandSource);
    case "generic_resolver_records_event_history":
      return (
        genericServiceSource.includes("export async function resolveWorkflowAssuranceIncident") &&
        genericServiceSource.includes('eventType: "resolved"') &&
        genericTransitionSource.includes("recordIncidentEvent(client") &&
        genericServiceTestSource.includes("records resolved state transitions")
      );
    case "generic_resolver_records_audit_history":
      return (
        genericTransitionSource.includes("recordAuditLog(client") &&
        genericTransitionSource.includes("WORKFLOW_ASSURANCE_INCIDENT_") &&
        genericServiceSource.includes("client.auditLog.create")
      );
    case "focused_tests_cover_product_and_action_chain":
      return (
        componentTestSource.includes("routes POS cash-shortage resolution through the protected POS-specific action") &&
        actionTestSource.includes("derives tenant, actor, permissions, incident, and source evidence server-side") &&
        actionTestSource.includes("registers controls.manage, fresh-auth, audit, and handler-derived tenant protection")
      );
  }
}

function extractTransitionSource(source: string) {
  const start = source.indexOf("async function transitionWorkflowAssuranceIncident");
  if (start < 0) return "";
  const end = source.indexOf("function assertLegalIncidentTransition", start);
  return end < 0 ? source.slice(start) : source.slice(start, end);
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
