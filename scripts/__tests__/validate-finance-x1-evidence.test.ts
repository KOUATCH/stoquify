import {
  financeX1EvidenceBinding,
  financeX1EvidenceBindingSchema,
  financeX1RequiredEvidenceRoutes,
} from "../../components/DataTableComponents";
import {
  evaluateFinanceX1EvidenceBinding,
  parseFinanceX1EvidenceArgs,
} from "../validate-finance-x1-evidence";

const approvals = {
  budgetApproval: {
    status: "approved",
    budgetContractVersion: 1,
    approvalReference: "CTRL-2026-0831-001",
    approvedByUserId: "rds_org_001_compliance_user_product_approver",
    approvedByRole: "product_approver",
    approvedAt: "2026-08-31T10:00:00.000Z",
    scope: "X1-finance-accounting-performance-budgets",
  },
  evidenceAuthorization: {
    status: "approved",
    environment: "non-production",
    credentialApprovalReference: "SEC-2026-0831-001",
    seededDataApprovalReference: "DATA-2026-0831-001",
    authorizedFixtureTenantId: "rds_org_001",
    approvedByUserId: "security-control-owner-user-id",
    approvedAt: "2026-08-31T10:05:00.000Z",
  },
};

const artifacts = (["en", "fr"] as const).flatMap((locale) =>
  (["desktop", "tablet", "mobile"] as const).flatMap((viewport) =>
    financeX1RequiredEvidenceRoutes.map((route) => ({
      artifactId: `x1-${route.key}-${locale}-${viewport}`,
      artifactPath: `what-next/evidence/finance-x1/run-001/${route.key}-${locale}-${viewport}.png`,
      runId: "run-001",
      organizationId: "rds_org_001",
      personaRole: "external_accountant",
      locale,
      viewport,
      route: `/${locale}${route.path}`,
      browser: "Microsoft Edge",
      capturedAt: "2026-08-31T10:20:00.000Z",
      authenticated: true,
      checks: {
        routeLoaded: true,
        authorizationVerified: true,
        tenantIsolationVerified: true,
        redactionVerified: true,
        layoutUsable: true,
        accessibilityReviewed: true,
      },
      measurements: {
        viewportWidthPx: viewport === "desktop" ? 1440 : viewport === "tablet" ? 768 : 390,
        renderedRowCount: 25,
        usefulResultMs: 700,
      },
    })),
  ),
);

const completeBinding = financeX1EvidenceBindingSchema.parse({
  ...financeX1EvidenceBinding,
  ...approvals,
  evidenceStatus: "evidence-collected-awaiting-review",
  claims: {
    screenshotsAvailable: true,
    measurementsAvailable: true,
    productionBudgetsApproved: true,
  },
  evidenceArtifactPaths: artifacts.map((artifact) => artifact.artifactPath),
  evidenceArtifacts: artifacts,
});

describe("finance X1 evidence validator", () => {
  it("reports the checked-in intake template as externally blocked", () => {
    const report = evaluateFinanceX1EvidenceBinding(financeX1EvidenceBinding, {
      now: new Date("2026-08-31T12:00:00.000Z"),
    });

    expect(report.status).toBe("blocked");
    expect(report.findings.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "product-budget-approval",
        "evidence-authorization",
        "authenticated-evidence-matrix",
      ]),
    );
    expect(report.certificationClaimed).toBe(false);
  });

  it("advances a complete, file-backed matrix only to human review", () => {
    const report = evaluateFinanceX1EvidenceBinding(completeBinding, {
      root: process.cwd(),
      now: new Date("2026-08-31T12:00:00.000Z"),
      inspectArtifact: () => ({ exists: true, isFile: true, size: 1024 }),
    });

    expect(report).toMatchObject({
      status: "ready-for-human-review",
      bindingStatus: "evidence-collected-awaiting-review",
      artifactCount: financeX1RequiredEvidenceRoutes.length * 6,
      blockerCount: 0,
      certificationClaimed: false,
    });
  });

  it("rejects evidence paths outside the repository", () => {
    const unsafeArtifacts = artifacts.map((artifact, index) =>
      index === 0
        ? { ...artifact, artifactPath: "../outside.png" }
        : artifact,
    );
    const unsafeBinding = {
      ...completeBinding,
      evidenceArtifactPaths: unsafeArtifacts.map(
        (artifact) => artifact.artifactPath,
      ),
      evidenceArtifacts: unsafeArtifacts,
    };

    const report = evaluateFinanceX1EvidenceBinding(unsafeBinding, {
      root: process.cwd(),
      inspectArtifact: () => ({ exists: true, isFile: true, size: 1024 }),
    });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "artifact-outside-workspace" }),
      ]),
    );
  });

  it("parses explicit report and gate inputs", () => {
    expect(
      parseFinanceX1EvidenceArgs([
        "--mode",
        "fail",
        "--manifest",
        "what-next/evidence/finance-x1/run-001/manifest.json",
      ]),
    ).toMatchObject({
      mode: "fail",
      manifest: "what-next/evidence/finance-x1/run-001/manifest.json",
    });
  });
});
