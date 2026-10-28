import fs from "fs";
import path from "path";

import {
  evaluatePosCashShortageBrowserAuthFixturePreflight,
  POS_CASH_SHORTAGE_BROWSER_AUTH_FIXTURE_REQUIREMENTS,
} from "../pos-cash-shortage-browser-auth-fixture-readiness-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

const CURRENTLY_MISSING_AUTH_FIXTURE_REQUIREMENTS = [
  "auth_state_inventory_present",
  "fixture_manifest_present",
];

describe("POS cash-shortage browser auth and fixture readiness preflight", () => {
  it("blocks current auth and fixture readiness while source posture is prepared", () => {
    const result = evaluatePosCashShortageBrowserAuthFixturePreflight(currentSources());

    expect(result.version).toBe(1);
    expect(result.checkKey).toBe(POS_SHIFT_CASH_SHORTAGE_CHECK_KEY);
    expect(result.status).toBe("blocked");
    expect(result.browserAuthFixtureReady).toBe(false);
    expect(result.activationAuthorized).toBe(false);
    expect(result.satisfiedRequirements).toEqual(
      expect.arrayContaining([
        "smoke_wrapper_requires_incident_id",
        "smoke_wrapper_requires_auth_state",
        "route_uses_assurance_smoke_incident_id",
        "incident_detail_read_is_protected",
        "pos_resolution_action_is_protected",
      ]),
    );
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(CURRENTLY_MISSING_AUTH_FIXTURE_REQUIREMENTS),
    );
  });

  it("certifies a complete future auth inventory and POS cash-shortage fixture manifest", () => {
    const result = evaluatePosCashShortageBrowserAuthFixturePreflight({
      ...currentSources(),
      authStateNames: ["assurance-manager.json"],
      fixtureManifestText: JSON.stringify(completeFixtureManifest()),
    });

    expect(result).toEqual({
      version: 1,
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      status: "certified",
      browserAuthFixtureReady: true,
      activationAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_BROWSER_AUTH_FIXTURE_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("blocks placeholder incident ids and missing source evidence", () => {
    const fixture = {
      ...completeFixtureManifest(),
      incidentId: "__ASSURANCE_INCIDENT_ID_REQUIRED__",
      sourceEventStatus: "RECORDED",
    };

    const result = evaluatePosCashShortageBrowserAuthFixturePreflight({
      ...currentSources(),
      authStateNames: ["assurance-manager.json"],
      fixtureManifestText: JSON.stringify(fixture),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["fixture_manifest_present"]),
    );
  });

  it("blocks fixture manifests that do not prove POS cash-shortage permissions", () => {
    const fixture = {
      ...completeFixtureManifest(),
      resolutionActionPermission: "controls.audit.read",
    };

    const result = evaluatePosCashShortageBrowserAuthFixturePreflight({
      ...currentSources(),
      authStateNames: ["assurance-manager.json"],
      fixtureManifestText: JSON.stringify(fixture),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["fixture_manifest_present"]),
    );
  });

  it("blocks regressions that remove protected POS resolution action posture", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageBrowserAuthFixturePreflight({
      ...sources,
      posResolutionActionSourceText: sources.posResolutionActionSourceText.replace(
        /permission: "controls.manage"|freshAuth: \{ maxAgeSeconds: 300 \}|tenantGuard: "handler-derived"/g,
        "unsafe",
      ),
      authStateNames: ["assurance-manager.json"],
      fixtureManifestText: JSON.stringify(completeFixtureManifest()),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["pos_resolution_action_is_protected"]),
    );
  });

  it("does not add browser execution, database writes, routes, workers, alerts, rollback, AI, or WhatsApp authority", () => {
    const source = read("services/leakage/pos-cash-shortage-browser-auth-fixture-readiness-preflight.ts");

    expect(source).not.toMatch(/chromium\.launch|newContext|page\.goto/i);
    expect(source).not.toMatch(/db\.|prisma\.|createSafeAction|router/i);
    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|sendAlert|dispatchAlert/i);
    expect(source).not.toMatch(/rollback|whatsApp|copilot/i);
  });
});

function currentSources() {
  return {
    smokeWrapperSourceText: read("scripts/workflow-assurance-browser-smoke.js"),
    uiRouteSmokeGateSourceText: read("scripts/ui-route-smoke-gate.js"),
    incidentDetailRouteSourceText: readOptional(
      "app/[locale]/(dashboard)/dashboard/assurance/control-tower/incidents/[incidentId]/page.tsx",
    ),
    controlTowerActionSourceText: read("actions/assurance/workflow-assurance-control-tower.actions.ts"),
    posResolutionActionSourceText: read("actions/assurance/pos-cash-shortage-resolution.actions.ts"),
    authStateNames: listNames("playwright/.auth", /\.json$/i),
    fixtureManifestText: null,
  };
}

function completeFixtureManifest() {
  return {
    routeId: "assurance-incident-detail",
    incidentId: "incident_123",
    checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
    workflow: "pos",
    moduleSlug: "pos",
    sourceType: "POSSession",
    currentSourceHash: "source-hash-123456",
    sourceEventStatus: "APPLIED",
    approvedPolicyEvidence: true,
    resolutionActionPermission: "controls.manage",
    readActionPermission: "controls.audit.read",
  };
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readOptional(relativePath: string) {
  const target = path.join(ROOT, relativePath);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
}

function listNames(relativePath: string, pattern: RegExp) {
  const target = path.join(ROOT, relativePath);
  if (!fs.existsSync(target)) return [];
  return fs.readdirSync(target).filter((name) => pattern.test(name));
}
