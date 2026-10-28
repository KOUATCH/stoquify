import fs from "fs";
import path from "path";

import {
  evaluatePosCashShortageBrowserAuthFixturePreflight,
} from "../pos-cash-shortage-browser-auth-fixture-readiness-preflight";
import {
  composePosCashShortageBrowserCertificationGateActivationEvidence,
  evaluatePosCashShortageBrowserCertificationGatePreflight,
  POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_GATE_REQUIREMENTS,
} from "../pos-cash-shortage-browser-certification-gate-preflight";
import {
  evaluatePosCashShortageBrowserCertificationReadinessPreflight,
} from "../pos-cash-shortage-browser-certification-readiness-preflight";
import {
  evaluatePosCashShortageBrowserEvidenceManifestPreflight,
} from "../pos-cash-shortage-browser-evidence-manifest-preflight";
import { INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS } from "@/services/assurance/assurance-registry-contracts";

import {
  evaluatePosCashShortageProductionActivationPreflight,
  type PosCashShortageProductionActivationEvidence,
} from "../pos-cash-shortage-production-activation-preflight";
import { POS_SHIFT_CASH_SHORTAGE_CHECK_KEY } from "../pos-shift-cash-shortage-contracts";

const ROOT = process.cwd();

describe("POS cash-shortage browser certification gate preflight", () => {
  it("certifies only when browser readiness, auth fixture readiness, and evidence manifest all certify", () => {
    const result = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: completeBrowserReadiness(),
      authFixtureReadiness: completeAuthFixtureReadiness(),
      evidenceManifest: completeEvidenceManifest(),
    });

    expect(result).toEqual({
      version: 1,
      checkKey: POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
      status: "certified",
      browserCertificationGateCertified: true,
      activationAuthorized: false,
      promotionAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_GATE_REQUIREMENTS,
      ],
      missingRequirements: [],
      underlyingStatuses: {
        browserReadiness: "certified",
        authFixtureReadiness: "certified",
        evidenceManifest: "certified",
      },
    });
  });

  it("composes browser gate production activation evidence only from a certified non-promoting gate", () => {
    const gate = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: completeBrowserReadiness(),
      authFixtureReadiness: completeAuthFixtureReadiness(),
      evidenceManifest: completeEvidenceManifest(),
    });

    expect(composePosCashShortageBrowserCertificationGateActivationEvidence({ preflight: gate })).toEqual({
      browserCertificationGateCertified: true,
      activationAuthorized: false,
      preflightCertified: true,
      missingRequirements: [],
    });
  });

  it("keeps browser gate production activation evidence blocked for incomplete gates", () => {
    const gate = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: evaluatePosCashShortageBrowserCertificationReadinessPreflight(currentBrowserSources()),
      authFixtureReadiness: evaluatePosCashShortageBrowserAuthFixturePreflight(currentAuthFixtureSources()),
      evidenceManifest: evaluatePosCashShortageBrowserEvidenceManifestPreflight({ manifestText: null }),
    });

    expect(composePosCashShortageBrowserCertificationGateActivationEvidence({ preflight: gate })).toEqual({
      browserCertificationGateCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["browser_certification_gate_preflight"],
    });
  });

  it("rejects browser gate evidence if the gate claims promotion authority", () => {
    const gate = {
      ...evaluatePosCashShortageBrowserCertificationGatePreflight({
        browserReadiness: completeBrowserReadiness(),
        authFixtureReadiness: completeAuthFixtureReadiness(),
        evidenceManifest: completeEvidenceManifest(),
      }),
      promotionAuthorized: true as false,
    };

    expect(composePosCashShortageBrowserCertificationGateActivationEvidence({ preflight: gate })).toEqual({
      browserCertificationGateCertified: false,
      activationAuthorized: false,
      preflightCertified: false,
      missingRequirements: ["browser_certification_gate_preflight"],
    });
  });

  it("can satisfy only browser certification gate in the production activation preflight", () => {
    const gate = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: completeBrowserReadiness(),
      authFixtureReadiness: completeAuthFixtureReadiness(),
      evidenceManifest: completeEvidenceManifest(),
    });
    const browserGateEvidence = composePosCashShortageBrowserCertificationGateActivationEvidence({
      preflight: gate,
    });

    const result = evaluatePosCashShortageProductionActivationPreflight({
      definition: currentDefinition(),
      evidence: {
        ...emptyProductionEvidence(),
        browserCertificationGateCertified: browserGateEvidence.browserCertificationGateCertified,
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.satisfiedRequirements).toEqual([
      "definition_identity",
      "browser_certification_gate",
    ]);
    expect(result.missingRequirements).not.toContain("browser_certification_gate");
    expect(result.canEnableDefinition).toBe(false);
    expect(result.canRunWorker).toBe(false);
  });
  it("blocks the current live state because auth fixture and browser evidence are not present", () => {
    const result = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: evaluatePosCashShortageBrowserCertificationReadinessPreflight(currentBrowserSources()),
      authFixtureReadiness: evaluatePosCashShortageBrowserAuthFixturePreflight(currentAuthFixtureSources()),
      evidenceManifest: evaluatePosCashShortageBrowserEvidenceManifestPreflight({ manifestText: null }),
    });

    expect(result.status).toBe("blocked");
    expect(result.browserCertificationGateCertified).toBe(false);
    expect(result.activationAuthorized).toBe(false);
    expect(result.promotionAuthorized).toBe(false);
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "browser_certification_readiness_certified",
        "auth_fixture_readiness_certified",
        "evidence_manifest_certified",
      ]),
    );
  });

  it("blocks when only browser readiness is missing", () => {
    const result = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: evaluatePosCashShortageBrowserCertificationReadinessPreflight({
        ...currentBrowserSources(),
        browserEvidenceManifestText: null,
      }),
      authFixtureReadiness: completeAuthFixtureReadiness(),
      evidenceManifest: completeEvidenceManifest(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["browser_certification_readiness_certified"]),
    );
  });

  it("blocks when auth fixture readiness is missing", () => {
    const result = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: completeBrowserReadiness(),
      authFixtureReadiness: evaluatePosCashShortageBrowserAuthFixturePreflight(currentAuthFixtureSources()),
      evidenceManifest: completeEvidenceManifest(),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["auth_fixture_readiness_certified"]),
    );
  });

  it("blocks when the evidence manifest is missing", () => {
    const result = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: completeBrowserReadiness(),
      authFixtureReadiness: completeAuthFixtureReadiness(),
      evidenceManifest: evaluatePosCashShortageBrowserEvidenceManifestPreflight({ manifestText: null }),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["evidence_manifest_certified"]),
    );
  });

  it("blocks if any underlying preflight claims activation authority", () => {
    const evidenceManifest = {
      ...completeEvidenceManifest(),
      activationAuthorized: true as false,
    };

    const result = evaluatePosCashShortageBrowserCertificationGatePreflight({
      browserReadiness: completeBrowserReadiness(),
      authFixtureReadiness: completeAuthFixtureReadiness(),
      evidenceManifest,
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["no_underlying_activation_authority"]),
    );
  });

  it("does not add browser execution, database writes, routes, workers, alerts, rollback, AI, or WhatsApp authority", () => {
    const source = read("services/leakage/pos-cash-shortage-browser-certification-gate-preflight.ts");

    expect(source).not.toMatch(/chromium\.launch|newContext|page\.goto/i);
    expect(source).not.toMatch(/db\.|prisma\.|createSafeAction|router/i);
    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|sendAlert|dispatchAlert/i);
    expect(source).not.toMatch(/rollback|whatsApp|copilot/i);
  });
});

function completeBrowserReadiness() {
  return evaluatePosCashShortageBrowserCertificationReadinessPreflight({
    ...currentBrowserSources(),
    authStateNames: ["assurance-manager.json"],
    browserEvidenceManifestText: JSON.stringify(completeBrowserEvidenceManifest()),
  });
}

function completeAuthFixtureReadiness() {
  return evaluatePosCashShortageBrowserAuthFixturePreflight({
    ...currentAuthFixtureSources(),
    authStateNames: ["assurance-manager.json"],
    fixtureManifestText: JSON.stringify(completeFixtureManifest()),
  });
}

function completeEvidenceManifest() {
  return evaluatePosCashShortageBrowserEvidenceManifestPreflight({
    manifestText: JSON.stringify(completeBrowserEvidenceManifest()),
  });
}

function currentBrowserSources() {
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

function currentAuthFixtureSources() {
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

function completeBrowserEvidenceManifest() {
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

function currentDefinition() {
  const definition = INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS.find(
    (candidate) => candidate.checkKey === POS_SHIFT_CASH_SHORTAGE_CHECK_KEY,
  );
  if (!definition) throw new Error("POS cash-shortage definition missing.");
  return definition;
}

function emptyProductionEvidence(): PosCashShortageProductionActivationEvidence {
  return {
    serviceActivationCertified: false,
    releaseGateActivationCertified: false,
    workerCheckpointPersistenceCertified: false,
    schedulerPolicyCertified: false,
    incidentCommandIntegrationCertified: false,
    alertDeliveryIntegrationCertified: false,
    rollbackPlanCertified: false,
    observabilityRunbookCertified: false,
    ownerSecurityApprovalCertified: false,
    browserCertificationGateCertified: false,
    productionPolicyReadinessCertified: false,
    sourceOwnedResolutionReadinessCertified: false,
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
