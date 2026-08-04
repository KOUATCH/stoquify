const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildStatutoryCountryPackDevelopmentReadiness,
  gateResultForReport,
} = require("../statutory-country-pack-development-gate");

function makeTempRepo() {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), "statutory-country-pack-development-gate-"),
  );
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source, "utf8");
}

function writeDevelopmentFixture(root) {
  const artifact = "official candidate statutory source";
  const artifactHash = crypto
    .createHash("sha256")
    .update(artifact)
    .digest("hex");

  write(
    root,
    "services/regulatory/country-packs/schemas.ts",
    "countryPackHeaderSchema legalReferenceSchema effectiveFrom verifiedBy hash: z.string().regex(/^sha256:",
  );
  write(
    root,
    "services/regulatory/country-packs/resolve.ts",
    'pack.header.status === "PUBLISHED" isDateInPackWindow pinnedPackVersion resolutionHash',
  );
  write(
    root,
    "services/regulatory/country-packs/validation.ts",
    "validateCountryPackForPublish requirePublished: true requireNoExpertReview: true GOLDEN_FIXTURE_FAILED",
  );
  write(
    root,
    "services/regulatory/country-packs/cameroon.ts",
    '"compliance.eInvoicing": "REQUIRES_EXPERT_REVIEW" productionAutomationAllowed: false adapterReadiness: "REQUIRES_EXPERT_REVIEW" sandboxOnly: true sourceEvidenceHash: "sha256:candidate-unreviewed-source"',
  );
  write(
    root,
    "services/payroll/payroll-tax-rule-evaluator.ts",
    'PRODUCTION_TAX_CAPABILITY_STATUSES rule.productionCalculationSupported === true status: "BLOCKED_REQUIRES_EXPERT_REVIEW"',
  );
  write(
    root,
    "services/compliance/adapters/registry.ts",
    "fakeSandboxComplianceAdapter cameroonDgiSandboxComplianceAdapter official specifications, sandbox proof, and expert review",
  );
  write(
    root,
    "services/compliance/fiscal-document.service.ts",
    "ComplianceAdapterEnvironment.PRODUCTION Production tax-authority certification is blocked until an official adapter is reviewed and registered.",
  );
  write(
    root,
    "services/compliance/certification-outbox.service.ts",
    'parsed.environment === ComplianceAdapterEnvironment.PRODUCTION submission.environment === ComplianceAdapterEnvironment.PRODUCTION errorCode: "PRODUCTION_ADAPTER_BLOCKED"',
  );
  write(
    root,
    "services/compliance/adapters/fake-sandbox.ts",
    'context.environment !== "FAKE_SANDBOX" productionCertification: false',
  );
  write(
    root,
    "services/compliance/adapters/cameroon-dgi-sandbox.ts",
    'context.environment !== "SANDBOX" SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION',
  );
  write(root, "scripts/regulatory-hardcode-gate.js", "regulatory-hardcode");
  write(
    root,
    "services/payroll/payroll-adapter-registry.service.ts",
    'registryDecision = productionSubmissionSupported "AUTOMATION_BLOCKED" productionPaymentAutomationSupported = "BLOCKED_PROVIDER_ADAPTER_CERTIFICATION_INCOMPLETE" automatedRetriesEnabled: productionPaymentAutomationSupported',
  );
  write(
    root,
    "services/payroll/payroll-country-pack-fixture-runner.ts",
    "validatePayrollCountryPackCalculationFixtures",
  );
  write(
    root,
    "services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts",
    "fails validation when a CNPS scenario output drifts",
  );
  write(
    root,
    "services/regulatory/__tests__/country-pack.service.test.ts",
    "unsupported country must fail closed",
  );
  write(
    root,
    "package.json",
    JSON.stringify({
      scripts: {
        "regulatory:hardcode:fail": "node hardcode",
        "statutory:country-pack:integration:gate": "node integration-gate",
        "statutory:country-pack:dev:gate": "node development-gate",
        "statutory:country-pack:gate": "node production-gate",
        "policy:gates:integration":
          "npm run inventory:boundary:fail && npm run statutory:country-pack:integration:gate",
        "policy:gates":
          "npm run inventory:boundary:fail && npm run statutory:country-pack:gate",
        "verify:repo":
          "npm run typecheck && npm run policy:gates:integration && npm test",
        "verify:release": "npm run verify:repo && npm run policy:gates",
      },
    }),
  );
  write(
    root,
    "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/source.txt",
    artifact,
  );
  write(
    root,
    "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json",
    JSON.stringify({
      reviewStatus: "PENDING_EXPERT_REVIEW",
      productionUseAllowed: false,
      artifacts: [
        {
          file: "source.txt",
          byteLength: Buffer.byteLength(artifact),
          sha256: artifactHash,
          reviewStatus: "PENDING_EXPERT_REVIEW",
          productionUseAllowed: false,
        },
      ],
      requiredApproval: {
        reviewerIdentity: null,
        approvalArtifactFile: null,
        approvalArtifactHash: null,
      },
      nonClaims: [
        "Artifact capture does not certify legal interpretation.",
        "Artifact capture does not constitute qualified reviewer approval.",
      ],
    }),
  );
}

describe("statutory country-pack development gate", () => {
  it("passes a development-only posture while production remains blocked", () => {
    const root = makeTempRepo();
    writeDevelopmentFixture(root);

    const report = buildStatutoryCountryPackDevelopmentReadiness(root, {
      mode: "fail",
    });

    expect(report.summary).toMatchObject({
      status: "READY_FOR_DEVELOPMENT_TESTING",
      readyCount: 11,
      blockerCount: 0,
    });
    expect(report.scope).toMatchObject({
      productionUseAllowed: false,
      legalApprovalClaimed: false,
      livePaymentsAllowed: false,
      liveDeclarationsAllowed: false,
      liveAuthoritySubmissionsAllowed: false,
    });
    expect(report.productionGate).toMatchObject({ status: "blocked" });
    expect(report.productionGate.blockers).toEqual(
      expect.arrayContaining([
        "source_artifact_hash_verification",
        "source_artifact_expert_approval",
      ]),
    );
    expect(gateResultForReport(report, "fail").exitCode).toBe(0);
  });

  it("accepts the canonical manifest-driven integration runner", () => {
    const root = makeTempRepo();
    writeDevelopmentFixture(root);
    const packagePath = path.join(root, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    packageJson.scripts["policy:gates:integration"] =
      "node scripts/run-policy-gates-integration.js";
    fs.writeFileSync(packagePath, JSON.stringify(packageJson), "utf8");
    write(
      root,
      "scripts/policy-gates-integration-contract.json",
      JSON.stringify({
        version: 1,
        gates: [
          "inventory:boundary:fail",
          "statutory:country-pack:integration:gate",
        ],
      }),
    );

    const report = buildStatutoryCountryPackDevelopmentReadiness(root, {
      mode: "fail",
    });

    expect(report.blockers).not.toContain(
      "development_and_production_ci_commands_are_separate",
    );
    expect(report.summary.status).toBe("READY_FOR_DEVELOPMENT_TESTING");
  });
  it("blocks development readiness when retained source bytes drift", () => {
    const root = makeTempRepo();
    writeDevelopmentFixture(root);
    write(
      root,
      "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/source.txt",
      "mutated statutory source",
    );

    const report = buildStatutoryCountryPackDevelopmentReadiness(root, {
      mode: "fail",
    });

    expect(report.blockers).toContain("development_source_artifact_integrity");
    expect(gateResultForReport(report, "fail").exitCode).toBe(1);
  });

  it("blocks when a pending-review manifest enables production use", () => {
    const root = makeTempRepo();
    writeDevelopmentFixture(root);
    const manifestPath = path.join(
      root,
      "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.productionUseAllowed = true;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), "utf8");

    const report = buildStatutoryCountryPackDevelopmentReadiness(root, {
      mode: "fail",
    });

    expect(report.blockers).toContain("production_use_explicitly_disabled");
  });

  it("blocks when the Cameroon sandbox adapter accepts another environment", () => {
    const root = makeTempRepo();
    writeDevelopmentFixture(root);
    write(
      root,
      "services/compliance/adapters/cameroon-dgi-sandbox.ts",
      "SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION",
    );

    const report = buildStatutoryCountryPackDevelopmentReadiness(root, {
      mode: "fail",
    });

    expect(report.blockers).toContain("sandbox_adapters_enforce_environment");
  });

  it("blocks if the independent production gate is no longer awaiting expert approval", () => {
    const root = makeTempRepo();
    writeDevelopmentFixture(root);
    const manifestPath = path.join(
      root,
      "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const artifactHash = manifest.artifacts[0].sha256;
    const approvalArtifact = "signed qualified reviewer approval";
    const approvalArtifactHash = crypto
      .createHash("sha256")
      .update(approvalArtifact)
      .digest("hex");
    write(
      root,
      "services/regulatory/country-packs/cameroon.ts",
      `const CNPS_CAPABILITY_STATUS = "SUPPORTED" as const; const CNPS_VERIFICATION_STATUS = "EXPERT_REVIEWED" as const; "compliance.eInvoicing": "REQUIRES_EXPERT_REVIEW" productionAutomationAllowed: false adapterReadiness: "REQUIRES_EXPERT_REVIEW" sandboxOnly: true sourceEvidenceHash: "sha256:${artifactHash}"`,
    );
    write(
      root,
      "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/approval.txt",
      approvalArtifact,
    );
    manifest.reviewStatus = "EXPERT_REVIEWED";
    manifest.productionUseAllowed = true;
    manifest.artifacts[0].reviewStatus = "EXPERT_REVIEWED";
    manifest.artifacts[0].productionUseAllowed = true;
    manifest.requiredApproval = {
      reviewerIdentity: "Qualified reviewer",
      reviewedAt: "2026-07-20T00:00:00.000Z",
      effectiveFrom: "2026-01-01",
      approvalArtifactFile: "approval.txt",
      approvalArtifactHash,
      approvedFixtureFamilies: [
        "payroll.cnps.pensionRatesBps",
        "payroll.cnps.familyAllowanceRatesBps",
        "payroll.cnps.occupationalRiskRatesBps",
        "payroll.cnps.employerRules",
      ],
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), "utf8");

    const report = buildStatutoryCountryPackDevelopmentReadiness(root, {
      mode: "fail",
    });

    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "production_use_explicitly_disabled",
        "production_gate_remains_blocked_for_expert_approval",
      ]),
    );
  });
});
