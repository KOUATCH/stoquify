export const POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_PREFLIGHT_VERSION = 1;

export const POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_REQUIREMENTS = [
  "valid_json_manifest",
  "assurance_incident_route_only",
  "tenant_scoped_auth_state",
  "fixture_incident_id",
  "mobile_desktop_screenshots",
  "screenshots_under_referrals",
  "accessibility_zero_serious_critical",
  "layout_no_overflow_clipping_overlap",
  "server_confirmed_protected_pos_action_truth",
  "browser_never_authors_truth",
] as const;

export type PosCashShortageBrowserEvidenceManifestRequirement =
  (typeof POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_REQUIREMENTS)[number];

export type PosCashShortageBrowserEvidenceManifestPreflightInput = {
  manifestText: string | null;
};

export type PosCashShortageBrowserEvidenceManifestPreflightResult = {
  version: typeof POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_PREFLIGHT_VERSION;
  status: "certified" | "blocked";
  browserEvidenceManifestCertified: boolean;
  activationAuthorized: false;
  satisfiedRequirements: PosCashShortageBrowserEvidenceManifestRequirement[];
  missingRequirements: PosCashShortageBrowserEvidenceManifestRequirement[];
};

type ManifestRecord = Record<string, unknown>;

export function evaluatePosCashShortageBrowserEvidenceManifestPreflight(
  input: PosCashShortageBrowserEvidenceManifestPreflightInput,
): PosCashShortageBrowserEvidenceManifestPreflightResult {
  const manifest = parseManifest(input.manifestText);
  const satisfiedRequirements: PosCashShortageBrowserEvidenceManifestRequirement[] = [];
  const missingRequirements: PosCashShortageBrowserEvidenceManifestRequirement[] = [];

  for (const requirement of POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_REQUIREMENTS) {
    if (isRequirementSatisfied(requirement, manifest)) {
      satisfiedRequirements.push(requirement);
    } else {
      missingRequirements.push(requirement);
    }
  }

  const certified = missingRequirements.length === 0;

  return {
    version: POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_PREFLIGHT_VERSION,
    status: certified ? "certified" : "blocked",
    browserEvidenceManifestCertified: certified,
    activationAuthorized: false,
    satisfiedRequirements,
    missingRequirements,
  };
}

function parseManifest(manifestText: string | null): ManifestRecord | null {
  if (!manifestText) return null;

  try {
    const parsed: unknown = JSON.parse(manifestText);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRequirementSatisfied(
  requirement: PosCashShortageBrowserEvidenceManifestRequirement,
  manifest: ManifestRecord | null,
) {
  if (requirement === "valid_json_manifest") return Boolean(manifest);
  if (!manifest) return false;

  switch (requirement) {
    case "assurance_incident_route_only":
      return (
        manifest.routeId === "assurance-incident-detail" &&
        Array.isArray(manifest.routeIds) &&
        manifest.routeIds.length === 1 &&
        manifest.routeIds[0] === "assurance-incident-detail"
      );
    case "tenant_scoped_auth_state":
      return (
        typeof manifest.authState === "string" &&
        /^playwright\/\.auth\/assurance-(manager|controls|admin)[^/]*\.json$/i.test(
          manifest.authState,
        )
      );
    case "fixture_incident_id":
      return (
        typeof manifest.incidentId === "string" &&
        manifest.incidentId.trim().length > 0 &&
        manifest.incidentId !== "__ASSURANCE_INCIDENT_ID_REQUIRED__"
      );
    case "mobile_desktop_screenshots":
      return hasScreenshotFor(manifest, "mobile") && hasScreenshotFor(manifest, "desktop");
    case "screenshots_under_referrals": {
      const screenshots = screenshotRows(manifest);
      return screenshots.length > 0 && screenshots.every(
        (row) =>
          row.ok === true &&
          typeof row.file === "string" &&
          row.file.startsWith("what-next/referrals/screenshots/assurance-incident-detail/"),
      );
    }
    case "accessibility_zero_serious_critical":
      return (
        countAt(manifest, ["accessibility", "serious"]) === 0 &&
        countAt(manifest, ["accessibility", "critical"]) === 0
      );
    case "layout_no_overflow_clipping_overlap":
      return (
        valueAt(manifest, ["layout", "horizontalOverflow"]) === false &&
        valueAt(manifest, ["layout", "clippedControls"]) === false &&
        valueAt(manifest, ["layout", "overlappingControls"]) === false
      );
    case "server_confirmed_protected_pos_action_truth":
      return (
        valueAt(manifest, ["serverTruth", "serverConfirmed"]) === true &&
        valueAt(manifest, ["serverTruth", "protectedPosAction"]) === true &&
        valueAt(manifest, ["serverTruth", "currentSourceHashVerified"]) === true
      );
    case "browser_never_authors_truth":
      return valueAt(manifest, ["serverTruth", "browserAuthoredTruth"]) === false;
  }
}

function hasScreenshotFor(manifest: ManifestRecord, viewport: "mobile" | "desktop") {
  return screenshotRows(manifest).some(
    (row) =>
      row.routeId === "assurance-incident-detail" &&
      row.viewport === viewport &&
      row.ok === true &&
      typeof row.file === "string" &&
      row.file.endsWith(`-${viewport}.png`),
  );
}

function screenshotRows(manifest: ManifestRecord) {
  const screenshots = manifest.screenshots;
  if (!Array.isArray(screenshots)) return [];
  return screenshots.filter(isRecord);
}

function countAt(record: ManifestRecord, path: readonly string[]) {
  const value = valueAt(record, path);
  return Number.isInteger(value) ? value : null;
}

function valueAt(record: ManifestRecord, path: readonly string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined;
    return current[key];
  }, record);
}

function isRecord(value: unknown): value is ManifestRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
