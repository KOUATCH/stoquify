import {
  evaluatePosCashShortageBrowserEvidenceManifestPreflight,
  POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_REQUIREMENTS,
} from "../pos-cash-shortage-browser-evidence-manifest-preflight";

describe("POS cash-shortage browser evidence manifest preflight", () => {
  it("certifies a complete structured browser evidence manifest without authorizing activation", () => {
    const result = evaluatePosCashShortageBrowserEvidenceManifestPreflight({
      manifestText: JSON.stringify(completeManifest()),
    });

    expect(result).toEqual({
      version: 1,
      status: "certified",
      browserEvidenceManifestCertified: true,
      activationAuthorized: false,
      satisfiedRequirements: [
        ...POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_REQUIREMENTS,
      ],
      missingRequirements: [],
    });
  });

  it("blocks missing or non-json manifest evidence", () => {
    const result = evaluatePosCashShortageBrowserEvidenceManifestPreflight({
      manifestText: "assurance-incident-detail desktop mobile screenshots",
    });

    expect(result.status).toBe("blocked");
    expect(result.browserEvidenceManifestCertified).toBe(false);
    expect(result.missingRequirements).toEqual([
      ...POS_CASH_SHORTAGE_BROWSER_EVIDENCE_MANIFEST_REQUIREMENTS,
    ]);
  });

  it("blocks the Slice 47 dry-run harness config because it is not executed browser evidence", () => {
    const result = evaluatePosCashShortageBrowserEvidenceManifestPreflight({
      manifestText: JSON.stringify({
        routeIds: ["assurance-incident-detail"],
        incidentId: null,
        authState: "playwright/.auth/assurance-manager.json",
        screenshotsDir: "what-next/referrals/screenshots/assurance-incident-detail",
        certificationClaimed: false,
      }),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "assurance_incident_route_only",
        "fixture_incident_id",
        "mobile_desktop_screenshots",
        "accessibility_zero_serious_critical",
        "layout_no_overflow_clipping_overlap",
        "server_confirmed_protected_pos_action_truth",
        "browser_never_authors_truth",
      ]),
    );
  });

  it("blocks screenshots outside the referral evidence folder", () => {
    const manifest = completeManifest();
    manifest.screenshots[0].file = "tmp/assurance-incident-detail-mobile.png";

    const result = evaluatePosCashShortageBrowserEvidenceManifestPreflight({
      manifestText: JSON.stringify(manifest),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["screenshots_under_referrals"]),
    );
  });

  it("blocks serious accessibility or layout defects", () => {
    const manifest = completeManifest();
    manifest.accessibility.serious = 1;
    manifest.layout.overlappingControls = true;

    const result = evaluatePosCashShortageBrowserEvidenceManifestPreflight({
      manifestText: JSON.stringify(manifest),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "accessibility_zero_serious_critical",
        "layout_no_overflow_clipping_overlap",
      ]),
    );
  });

  it("blocks browser-authored truth or missing protected POS action confirmation", () => {
    const manifest = completeManifest();
    manifest.serverTruth.protectedPosAction = false;
    manifest.serverTruth.browserAuthoredTruth = true;

    const result = evaluatePosCashShortageBrowserEvidenceManifestPreflight({
      manifestText: JSON.stringify(manifest),
    });

    expect(result.status).toBe("blocked");
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining([
        "server_confirmed_protected_pos_action_truth",
        "browser_never_authors_truth",
      ]),
    );
  });

  it("does not add browser execution, database writes, routes, workers, alerts, rollback, AI, or WhatsApp authority", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        process.cwd(),
        "services/leakage/pos-cash-shortage-browser-evidence-manifest-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/chromium\.launch|newContext|page\.goto/i);
    expect(source).not.toMatch(/db\.|prisma\.|createSafeAction|router/i);
    expect(source).not.toMatch(/CHECK_RUNNERS|scheduleWorkflow|cron|sendAlert|dispatchAlert/i);
    expect(source).not.toMatch(/rollback|whatsApp|copilot/i);
  });
});

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
