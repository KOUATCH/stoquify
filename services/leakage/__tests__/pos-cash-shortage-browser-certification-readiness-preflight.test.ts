import fs from "fs";
import path from "path";

import {
  evaluatePosCashShortageBrowserCertificationReadinessPreflight,
  POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_REQUIREMENTS,
} from "../pos-cash-shortage-browser-certification-readiness-preflight";

const ROOT = process.cwd();

const CURRENTLY_MISSING_BROWSER_REQUIREMENTS = [
  "assurance_manager_auth_state_present",
  "desktop_mobile_viewports_required",
  "accessibility_layout_evidence_required",
  "screenshots_output_configured",
  "browser_run_does_not_author_truth",
];

describe("POS cash-shortage browser certification readiness preflight", () => {
  it("reports current browser certification as blocked while source route and contracts are ready", () => {
    const result = evaluatePosCashShortageBrowserCertificationReadinessPreflight(currentSources());

    expect(result.version).toBe(1);
    expect(result.status).toBe("blocked");
    expect(result.browserCertificationReady).toBe(false);
    expect(result.activationAuthorized).toBe(false);
    expect(result.satisfiedRequirements).toEqual(
      expect.arrayContaining([
        "incident_detail_route_present",
        "protected_incident_detail_read_action",
        "detail_view_composes_incident_actions",
        "product_caller_contract_present",
        "audit_event_preflight_contract_present",
      ]),
    );
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(CURRENTLY_MISSING_BROWSER_REQUIREMENTS),
    );
  });

  it("certifies a complete browser evidence fixture", () => {
    const result = evaluatePosCashShortageBrowserCertificationReadinessPreflight({
      ...currentSources(),
      browserSmokeScriptNames: ["workflow-assurance-browser-smoke.js"],
      authStateNames: ["assurance-manager.json"],
      packageJsonText: `${currentSources().packageJsonText}\n"ui:smoke:assurance": "node scripts/workflow-assurance-browser-smoke.js"`,
      browserEvidenceManifestText: JSON.stringify(completeManifest()),
    });

    expect(result).toEqual({
      version: 1,
      status: "certified",
      browserCertificationReady: true,
      activationAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("blocks if the incident detail route stops using the protected read action", () => {
    const sources = currentSources();
    const result = evaluatePosCashShortageBrowserCertificationReadinessPreflight({
      ...sources,
      incidentDetailRouteSourceText: sources.incidentDetailRouteSourceText?.replace(
        /requirePermission|resource: "WorkflowAssuranceIncident"|getAssuranceIncidentDetailData/g,
        "loadIncidentDirectly",
      ) ?? null,
    });

    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["incident_detail_route_present"]),
    );
  });

  it("blocks if browser evidence lacks accessibility and layout results", () => {
    const result = evaluatePosCashShortageBrowserCertificationReadinessPreflight({
      ...currentSources(),
      browserSmokeScriptNames: ["workflow-assurance-browser-smoke.js"],
      authStateNames: ["assurance-manager.json"],
      packageJsonText: `${currentSources().packageJsonText}\n"ui:smoke:assurance": "node scripts/workflow-assurance-browser-smoke.js"`,
      browserEvidenceManifestText: JSON.stringify({
        ...completeManifest(),
        accessibility: { serious: 1, critical: 0 },
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["accessibility_layout_evidence_required"]),
    );
  });

  it("does not add browser execution, database writes, routes, workers, alerts, rollback, AI, or WhatsApp authority", () => {
    const source = read("services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts");

    expect(source).not.toMatch(/playwright|chromium\.launch|newContext|page\.goto/i);
    expect(source).not.toMatch(/db\.|prisma\.|createSafeAction|router/i);
    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|sendAlert|dispatchAlert/i);
    expect(source).not.toMatch(/rollback|whatsApp|copilot/i);
  });
});

function currentSources() {
  return {
    incidentDetailRouteSourceText: readOptional(
      "app/[locale]/(dashboard)/dashboard/assurance/control-tower/incidents/[incidentId]/page.tsx",
    ),
    controlTowerActionSourceText: read("actions/assurance/workflow-assurance-control-tower.actions.ts"),
    incidentDetailViewSourceText: read("components/assurance/AssuranceIncidentDetailView.tsx"),
    incidentActionsComponentSourceText: read("components/assurance/AssuranceIncidentActions.tsx"),
    productCallerAuditEventPreflightSourceText: read(
      "services/leakage/pos-cash-shortage-product-caller-audit-event-preflight.ts",
    ),
    packageJsonText: read("package.json"),
    uiRouteSmokeGateSourceText: read("scripts/ui-route-smoke-gate.js"),
    browserSmokeScriptNames: listNames("scripts", /browser.*smoke|smoke.*browser/i),
    authStateNames: listNames("playwright/.auth", /\.json$/i),
    browserEvidenceManifestText: null,
  };
}

function completeManifest() {
  return {
    routeId: "assurance-incident-detail",
    routeIds: ["assurance-incident-detail"],
    incidentId: "incident_123",
    authState: "playwright/.auth/assurance-manager.json",
    screenshots: [
      {
        routeId: "assurance-incident-detail",
        viewport: "mobile",
        ok: true,
        file: "what-next/referrals/screenshots/assurance-incident-detail/assurance-incident-detail-mobile.png",
      },
      {
        routeId: "assurance-incident-detail",
        viewport: "desktop",
        ok: true,
        file: "what-next/referrals/screenshots/assurance-incident-detail/assurance-incident-detail-desktop.png",
      },
    ],
    accessibility: {
      serious: 0,
      critical: 0,
    },
    layout: {
      horizontalOverflow: false,
      clippedControls: false,
      overlappingControls: false,
    },
    serverTruth: {
      serverConfirmed: true,
      protectedPosAction: true,
      currentSourceHashVerified: true,
      browserAuthoredTruth: false,
    },
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
