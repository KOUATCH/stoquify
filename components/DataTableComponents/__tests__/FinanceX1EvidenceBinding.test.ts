import {
  financeX1EvidenceBinding,
  financeX1EvidenceBindingSchema,
  financeX1RequiredEvidenceRoutes,
} from "..";

const approvedBudget = {
  status: "approved",
  budgetContractVersion: 1,
  approvalReference: "approval-product-2026-08-31-001",
  approvedByUserId: "product-approver-user-id",
  approvedByRole: "product_approver",
  approvedAt: "2026-08-31T10:00:00.000Z",
  scope: "X1-finance-accounting-performance-budgets",
};

const approvedEvidenceAuthorization = {
  status: "approved",
  environment: "non-production",
  credentialApprovalReference: "approval-credentials-2026-08-31-001",
  seededDataApprovalReference: "approval-seed-2026-08-31-001",
  authorizedFixtureTenantId: "approved-fixture-tenant-id",
  approvedByUserId: "security-owner-user-id",
  approvedAt: "2026-08-31T10:05:00.000Z",
};

const evidenceArtifacts = (["en", "fr"] as const).flatMap((locale) =>
  (["desktop", "tablet", "mobile"] as const).flatMap((viewport) =>
    financeX1RequiredEvidenceRoutes.map((route) => ({
      artifactId: `x1-${route.key}-${locale}-${viewport}`,
      artifactPath: `what-next/evidence/x1/${route.key}-${locale}-${viewport}.png`,
      runId: "x1-authenticated-run-001",
      organizationId: "approved-fixture-tenant-id",
      personaRole: "external_accountant",
      locale,
      viewport,
      route: `/${locale}${route.path}`,
      browser: "Microsoft Edge",
      capturedAt: "2026-08-31T10:15:00.000Z",
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
        usefulResultMs: 650,
      },
    })),
  ),
);

const collectedEvidenceBinding = {
  ...financeX1EvidenceBinding,
  budgetApproval: approvedBudget,
  evidenceAuthorization: approvedEvidenceAuthorization,
  evidenceStatus: "evidence-collected-awaiting-review",
  claims: {
    screenshotsAvailable: true,
    measurementsAvailable: true,
    productionBudgetsApproved: true,
  },
  evidenceArtifactPaths: evidenceArtifacts.map(
    (artifact) => artifact.artifactPath,
  ),
  evidenceArtifacts,
};

describe("Finance X1 evidence binding", () => {
  it("binds the finance route family to implementation, pilot, and test artifacts", () => {
    expect(financeX1EvidenceBinding.routeFamily).toBe(
      "RF-05-finance-accounting",
    );
    expect(financeX1EvidenceBinding.schemaVersion).toBe(1);
    expect(financeX1EvidenceBinding.implementationFiles).toContain(
      "components/DataTableComponents/finance-accounting-contracts.ts",
    );
    expect(financeX1EvidenceBinding.pilotFiles).toEqual(
      expect.arrayContaining([
        "components/finance/AROpenItemsHistoryWorkbench.tsx",
        "components/purchasing/APHistoryWorkbench.tsx",
      ]),
    );
    expect(financeX1EvidenceBinding.focusedTestFiles).toEqual(
      expect.arrayContaining([
        "components/DataTableComponents/__tests__/NextPhaseContracts.test.ts",
        "actions/accounting/__tests__/finance-statement-export.actions.test.ts",
      ]),
    );
  });

  it("cannot represent unauthenticated or unapproved certification evidence", () => {
    expect(financeX1EvidenceBinding.authentication).toEqual({
      authenticatedRequired: true,
      credentialsApprovalRequired: true,
      seededDataApprovalRequired: true,
    });
    expect(financeX1EvidenceBinding.requiredLocales).toEqual(["en", "fr"]);
    expect(financeX1EvidenceBinding.requiredViewports).toEqual([
      "desktop",
      "tablet",
      "mobile",
    ]);
    expect(financeX1EvidenceBinding.requiredPersonaRoles).toEqual([
      "external_accountant",
    ]);
    expect(financeX1EvidenceBinding.requiredRoutes).toEqual(
      financeX1RequiredEvidenceRoutes.map((route) => route.path),
    );
    expect(financeX1EvidenceBinding.budgetApproval).toEqual({
      status: "pending",
      budgetContractVersion: 1,
    });
    expect(financeX1EvidenceBinding.evidenceAuthorization).toEqual({
      status: "pending",
    });
    expect(financeX1EvidenceBinding.evidenceArtifactPaths).toEqual([]);
    expect(financeX1EvidenceBinding.evidenceArtifacts).toEqual([]);
    expect(financeX1EvidenceBinding.claims).toEqual({
      screenshotsAvailable: false,
      measurementsAvailable: false,
      productionBudgetsApproved: false,
    });
  });

  it("accepts traceable approvals and a complete authenticated evidence matrix", () => {
    expect(() =>
      financeX1EvidenceBindingSchema.parse(collectedEvidenceBinding),
    ).not.toThrow();
  });

  it("preserves separately measured readiness, audit, and screenshot timings", () => {
    const measurements = {
      ...evidenceArtifacts[0].measurements,
      measurementVersion: 2,
      resultKind: "summary",
      renderedRowCount: 0,
      navigationMs: 100,
      authCheckMs: 200,
      accessibilityMs: 400,
      screenshotMs: 150,
      captureElapsedMs: 1500,
    };
    const binding = financeX1EvidenceBindingSchema.parse({
      ...collectedEvidenceBinding,
      evidenceArtifacts: evidenceArtifacts.map((artifact, index) => index === 0 ? { ...artifact, measurements } : artifact),
    });
    expect(binding.evidenceArtifacts[0].measurements).toEqual(measurements);
  });

  it("rejects an incomplete locale and viewport evidence matrix", () => {
    const incompleteArtifacts = evidenceArtifacts.slice(0, -1);

    expect(() =>
      financeX1EvidenceBindingSchema.parse({
        ...collectedEvidenceBinding,
        evidenceArtifactPaths: incompleteArtifacts.map(
          (artifact) => artifact.artifactPath,
        ),
        evidenceArtifacts: incompleteArtifacts,
      }),
    ).toThrow();
  });

  it("rejects a binding that claims production certification", () => {
    expect(() =>
      financeX1EvidenceBindingSchema.parse({
        ...financeX1EvidenceBinding,
        evidenceStatus: "certified",
      }),
    ).toThrow();
  });
});
