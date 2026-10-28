import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "./pos-shift-cash-shortage-contracts";

export const POS_CASH_SHORTAGE_BROWSER_AUTH_FIXTURE_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_BROWSER_AUTH_FIXTURE_REQUIREMENTS = [
  "smoke_wrapper_requires_incident_id",
  "smoke_wrapper_requires_auth_state",
  "route_uses_assurance_smoke_incident_id",
  "incident_detail_read_is_protected",
  "pos_resolution_action_is_protected",
  "auth_state_inventory_present",
  "fixture_manifest_present",
] as const;

export type PosCashShortageBrowserAuthFixtureRequirement =
  (typeof POS_CASH_SHORTAGE_BROWSER_AUTH_FIXTURE_REQUIREMENTS)[number];

export type PosCashShortageBrowserAuthFixturePreflightInput = {
  smokeWrapperSourceText: string;
  uiRouteSmokeGateSourceText: string;
  incidentDetailRouteSourceText: string | null;
  controlTowerActionSourceText: string;
  posResolutionActionSourceText: string;
  authStateNames: readonly string[];
  fixtureManifestText: string | null;
};

export type PosCashShortageBrowserAuthFixturePreflightResult = {
  version: typeof POS_CASH_SHORTAGE_BROWSER_AUTH_FIXTURE_PREFLIGHT_VERSION;
  checkKey: typeof POS_SHIFT_CASH_SHORTAGE_CHECK_KEY;
  status: "certified" | "blocked";
  browserAuthFixtureReady: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageBrowserAuthFixtureRequirement[];
  missingRequirements: PosCashShortageBrowserAuthFixtureRequirement[];
};

type FixtureManifest = Record<string, unknown>;

export function evaluatePosCashShortageBrowserAuthFixturePreflight(
  input: PosCashShortageBrowserAuthFixturePreflightInput,
): PosCashShortageBrowserAuthFixturePreflightResult {
  const satisfiedRequirements: PosCashShortageBrowserAuthFixtureRequirement[] = [];
  const missingRequirements: PosCashShortageBrowserAuthFixtureRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_BROWSER_AUTH_FIXTURE_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, input)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_BROWSER_AUTH_FIXTURE_PREFLIGHT_VERSION,
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    status: certified ? "certified" : "blocked",
    browserAuthFixtureReady: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

function isRequirementSatisfied(
  requirement: PosCashShortageBrowserAuthFixtureRequirement,
  input: PosCashShortageBrowserAuthFixturePreflightInput,
) {
  switch (requirement) {
    case "smoke_wrapper_requires_incident_id":
      return (
        input.smokeWrapperSourceText.includes("ensureRunPrerequisites") &&
        input.smokeWrapperSourceText.includes("ASSURANCE_SMOKE_INCIDENT_ID") &&
        input.smokeWrapperSourceText.includes("__ASSURANCE_INCIDENT_ID_REQUIRED__")
      );
    case "smoke_wrapper_requires_auth_state":
      return (
        input.smokeWrapperSourceText.includes("fsImpl.existsSync(args.storageState)") &&
        input.smokeWrapperSourceText.includes("tenant-scoped assurance manager")
      );
    case "route_uses_assurance_smoke_incident_id":
      return (
        input.uiRouteSmokeGateSourceText.includes("assurance-incident-detail") &&
        input.uiRouteSmokeGateSourceText.includes("ASSURANCE_SMOKE_INCIDENT_ID") &&
        input.uiRouteSmokeGateSourceText.includes("__ASSURANCE_INCIDENT_ID_REQUIRED__")
      );
    case "incident_detail_read_is_protected": {
      const routeSource = input.incidentDetailRouteSourceText ?? "";
      return (
        routeSource.includes("requirePermission") &&
        routeSource.includes('resource: "WorkflowAssuranceIncident"') &&
        input.controlTowerActionSourceText.includes("const getIncidentDetail = protect") &&
        input.controlTowerActionSourceText.includes('permission: "controls.audit.read"') &&
        input.controlTowerActionSourceText.includes('auditResource: "WorkflowAssuranceIncident"') &&
        input.controlTowerActionSourceText.includes('tenantGuard: "handler-derived"')
      );
    }
    case "pos_resolution_action_is_protected":
      return (
        input.posResolutionActionSourceText.includes("const resolvePosCashShortageIncident = protect") &&
        input.posResolutionActionSourceText.includes('permission: "controls.manage"') &&
        input.posResolutionActionSourceText.includes('auditResource: "WorkflowAssuranceIncident"') &&
        input.posResolutionActionSourceText.includes("freshAuth: { maxAgeSeconds: 300 }") &&
        input.posResolutionActionSourceText.includes('tenantGuard: "handler-derived"') &&
        input.posResolutionActionSourceText.includes("loadPosCashShortageResolutionSourceForIncident")
      );
    case "auth_state_inventory_present":
      return input.authStateNames.some((name) =>
        /^assurance-(manager|controls|admin)[^/]*\.json$/i.test(name),
      );
    case "fixture_manifest_present":
      return isCertifiedFixtureManifest(input.fixtureManifestText);
  }
}

function isCertifiedFixtureManifest(fixtureManifestText: string | null) {
  const manifest = parseFixtureManifest(fixtureManifestText);
  if (!manifest) return false;

  return (
    manifest.routeId === "assurance-incident-detail" &&
    manifest.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY &&
    manifest.workflow === "pos" &&
    manifest.moduleSlug === "pos" &&
    manifest.sourceType === "POSSession" &&
    typeof manifest.incidentId === "string" &&
    manifest.incidentId.trim().length > 0 &&
    manifest.incidentId !== "__ASSURANCE_INCIDENT_ID_REQUIRED__" &&
    typeof manifest.currentSourceHash === "string" &&
    manifest.currentSourceHash.trim().length >= 12 &&
    manifest.sourceEventStatus === "APPLIED" &&
    manifest.approvedPolicyEvidence === true &&
    manifest.resolutionActionPermission === "controls.manage" &&
    manifest.readActionPermission === "controls.audit.read"
  );
}

function parseFixtureManifest(fixtureManifestText: string | null): FixtureManifest | null {
  if (!fixtureManifestText) return null;

  try {
    const parsed: unknown = JSON.parse(fixtureManifestText);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is FixtureManifest {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
