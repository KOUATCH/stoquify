import { evaluatePosCashShortageBrowserEvidenceManifestPreflight } from "./pos-cash-shortage-browser-evidence-manifest-preflight";

export const POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_REQUIREMENTS = [
  "incident_detail_route_present",
  "protected_incident_detail_read_action",
  "detail_view_composes_incident_actions",
  "product_caller_contract_present",
  "audit_event_preflight_contract_present",
  "assurance_browser_smoke_script_present",
  "assurance_browser_package_script_present",
  "assurance_manager_auth_state_present",
  "assurance_incident_route_id_configured",
  "desktop_mobile_viewports_required",
  "accessibility_layout_evidence_required",
  "screenshots_output_configured",
  "browser_run_does_not_author_truth",
] as const;

export type PosCashShortageBrowserCertificationReadinessRequirement =
  (typeof POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_REQUIREMENTS)[number];

export type PosCashShortageBrowserCertificationReadinessPreflightInput = {
  incidentDetailRouteSourceText: string | null;
  controlTowerActionSourceText: string;
  incidentDetailViewSourceText: string;
  incidentActionsComponentSourceText: string;
  productCallerAuditEventPreflightSourceText: string;
  packageJsonText: string;
  uiRouteSmokeGateSourceText: string;
  browserSmokeScriptNames: readonly string[];
  authStateNames: readonly string[];
  browserEvidenceManifestText: string | null;
};

export type PosCashShortageBrowserCertificationReadinessPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  browserCertificationReady: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageBrowserCertificationReadinessRequirement[];
  missingRequirements: PosCashShortageBrowserCertificationReadinessRequirement[];
};

export function evaluatePosCashShortageBrowserCertificationReadinessPreflight(
  input: PosCashShortageBrowserCertificationReadinessPreflightInput,
): PosCashShortageBrowserCertificationReadinessPreflightResult {
  const satisfiedRequirements: PosCashShortageBrowserCertificationReadinessRequirement[] = [];
  const missingRequirements: PosCashShortageBrowserCertificationReadinessRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_PREFLIGHT_VERSION,
    status: certified ? "certified" : "blocked",
    browserCertificationReady: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageBrowserCertificationReadinessRequirement,
  input: PosCashShortageBrowserCertificationReadinessPreflightInput,
) {
  const routeSource = input.incidentDetailRouteSourceText ?? "";
  const actionSource = input.controlTowerActionSourceText;
  const detailViewSource = input.incidentDetailViewSourceText;
  const incidentActionsSource = input.incidentActionsComponentSourceText;
  const auditEventPreflightSource = input.productCallerAuditEventPreflightSourceText;
  const packageJson = input.packageJsonText;
  const uiRouteSmokeGateSource = input.uiRouteSmokeGateSourceText;
  const smokeNames = input.browserSmokeScriptNames.map((name) => name.toLowerCase());
  const authNames = input.authStateNames.map((name) => name.toLowerCase());
  const manifest = input.browserEvidenceManifestText ?? "";
  const manifestPreflight = evaluatePosCashShortageBrowserEvidenceManifestPreflight({
    manifestText: input.browserEvidenceManifestText,
  });

  switch (requirement) {
    case "incident_detail_route_present":
      return (
        routeSource.includes("requirePermission") &&
        routeSource.includes('resource: "WorkflowAssuranceIncident"') &&
        routeSource.includes("getAssuranceIncidentDetailData") &&
        routeSource.includes("AssuranceIncidentDetailView") &&
        routeSource.includes("incidentId")
      );
    case "protected_incident_detail_read_action":
      return (
        actionSource.includes("const getIncidentDetail = protect") &&
        actionSource.includes('permission: "controls.audit.read"') &&
        actionSource.includes('auditResource: "WorkflowAssuranceIncident"') &&
        actionSource.includes("auditAllowed: true") &&
        actionSource.includes('tenantGuard: "handler-derived"')
      );
    case "detail_view_composes_incident_actions":
      return detailViewSource.includes("<AssuranceIncidentActions incident={incident}");
    case "product_caller_contract_present":
      return (
        incidentActionsSource.includes("resolvePosCashShortageIncidentAction") &&
        incidentActionsSource.includes("currentSourceHash: incident.sourceHash") &&
        incidentActionsSource.includes("resolutionEvidenceHash: evidenceHash.trim()")
      );
    case "audit_event_preflight_contract_present":
      return (
        auditEventPreflightSource.includes("evaluatePosCashShortageProductCallerAuditEventPreflight") &&
        auditEventPreflightSource.includes("generic_resolver_records_event_history") &&
        auditEventPreflightSource.includes("generic_resolver_records_audit_history")
      );
    case "assurance_browser_smoke_script_present":
      return smokeNames.some((name) => /assurance.*browser.*smoke|browser.*assurance.*smoke/.test(name));
    case "assurance_browser_package_script_present":
      return /"ui:smoke:assurance"\s*:/.test(packageJson) || /"test:e2e:assurance/.test(packageJson);
    case "assurance_manager_auth_state_present":
      return authNames.some((name) => /assurance.*(manager|controls|admin).*\.json/.test(name));
    case "assurance_incident_route_id_configured":
      return (
        manifest.includes("assurance-incident-detail") ||
        packageJson.includes("assurance-incident-detail") ||
        uiRouteSmokeGateSource.includes("assurance-incident-detail")
      );
    case "desktop_mobile_viewports_required":
      return (
        manifestPreflight.satisfiedRequirements.includes("mobile_desktop_screenshots") &&
        manifestPreflight.satisfiedRequirements.includes("screenshots_under_referrals")
      );
    case "accessibility_layout_evidence_required":
      return (
        manifestPreflight.satisfiedRequirements.includes("accessibility_zero_serious_critical") &&
        manifestPreflight.satisfiedRequirements.includes("layout_no_overflow_clipping_overlap")
      );
    case "screenshots_output_configured":
      return manifestPreflight.satisfiedRequirements.includes("screenshots_under_referrals");
    case "browser_run_does_not_author_truth":
      return (
        manifestPreflight.satisfiedRequirements.includes("server_confirmed_protected_pos_action_truth") &&
        manifestPreflight.satisfiedRequirements.includes("browser_never_authors_truth")
      );
  }
}
