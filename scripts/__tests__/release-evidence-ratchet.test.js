const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  READINESS_ARTIFACTS,
  REQUIRED_POLICY_GATES,
  RUN_REPORTS,
  SUPPORTING_ARTIFACTS,
  buildReleaseEvidence,
  gateResultForReport,
  readinessSummaryIsClear,
  readinessSummaryIsReleaseReady,
  renderMarkdown,
} = require("../release-evidence-ratchet");

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("release evidence ratchet", () => {
  it("distinguishes structurally clear evidence from release readiness", () => {
    expect(
      readinessSummaryIsClear({
        status: "ready",
        checkCount: 12,
        readyCount: 12,
        blockerCount: 0,
      }),
    ).toBe(true);
    expect(
      readinessSummaryIsReleaseReady({
        status: "ready",
        checkCount: 12,
        readyCount: 12,
        blockerCount: 0,
      }),
    ).toBe(true);
    expect(
      readinessSummaryIsClear({
        status: "blocked",
        checkCount: 12,
        readyCount: 10,
        blockerCount: 2,
      }),
    ).toBe(true);
    expect(
      readinessSummaryIsReleaseReady({
        status: "blocked",
        checkCount: 12,
        readyCount: 10,
        blockerCount: 2,
      }),
    ).toBe(false);
  });

  it("keeps valid blocked readiness evidence as a hard release blocker", () => {
    const root = completeFixture();
    writeReadiness(root, "statutory-country-pack-production", {
      status: "blocked",
      checkCount: 12,
      readyCount: 10,
      blockerCount: 2,
    });

    const report = buildReleaseEvidence(root, {
      mode: "fail",
      release: "on",
      environment: completeReleaseEnvironment(),
    });

    expect(report.blockers).toEqual([]);
    expect(report.checks).toContainEqual({
      id: "readiness_json_is_parseable_and_clear",
      ready: true,
    });
    expect(report.readinessReleaseBlockers).toEqual([
      "readiness:statutory-country-pack-production",
    ]);
    expect(report.releaseBlockers).toEqual([
      "readiness:statutory-country-pack-production",
    ]);
    expect(report.summary).toEqual(
      expect.objectContaining({
        status: "blocked",
        blockerCount: 0,
        releaseBlockerCount: 1,
        readinessReleaseBlockerCount: 1,
        releaseConditionBlockerCount: 0,
      }),
    );
    expect(gateResultForReport(report, "fail").exitCode).toBe(1);
  });

  it("rejects an ambiguous blocked summary as a structural failure", () => {
    const root = completeFixture();
    writeReadiness(root, "statutory-country-pack-production", {
      status: "blocked",
      checkCount: 12,
      readyCount: 12,
      blockerCount: 0,
    });

    const report = buildReleaseEvidence(root, {
      mode: "fail",
      release: "on",
      environment: completeReleaseEnvironment(),
    });

    expect(report.blockers).toContain("readiness_json_is_parseable_and_clear");
    expect(report.readinessReleaseBlockers).not.toContain(
      "readiness:statutory-country-pack-production",
    );
    expect(report.summary.status).toBe("blocked");
    expect(gateResultForReport(report, "fail").exitCode).toBe(1);
  });

  it("reports ready only when structural, readiness, and environment evidence pass", () => {
    const report = buildReleaseEvidence(completeFixture(), {
      mode: "fail",
      release: "on",
      environment: completeReleaseEnvironment(),
    });

    expect(report.blockers).toEqual([]);
    expect(report.releaseBlockers).toEqual([]);
    expect(report.summary).toEqual(
      expect.objectContaining({
        status: "ready",
        readyCount: 11,
        checkCount: 11,
        blockerCount: 0,
        releaseBlockerCount: 0,
      }),
    );
    expect(gateResultForReport(report, "fail").exitCode).toBe(0);
  });

  it("renders explicit readiness blockers and stays conditional outside release mode", () => {
    const root = completeFixture();
    writeReadiness(root, "prisma-migration-deployment", {
      status: "blocked",
      checkCount: 8,
      readyCount: 7,
      blockerCount: 2,
    });
    const report = buildReleaseEvidence(root, {
      mode: "fail",
      release: "off",
      environment: {},
    });
    const markdown = renderMarkdown(report);

    expect(report.summary.status).toBe("conditional");
    expect(report.releaseBlockers).toEqual(
      expect.arrayContaining([
        "readiness:prisma-migration-deployment",
        "public_identity_hash_secret",
        "public_receipt_token_secret",
        "history_cursor_signing_secret",
        "production_database_target",
      ]),
    );
    expect(gateResultForReport(report, "fail").exitCode).toBe(0);
    expect(markdown).toContain("## Readiness Release Blockers");
    expect(markdown).toContain(
      "- blocked: readiness:prisma-migration-deployment",
    );
    expect(markdown).toContain("- Structural blockers: 0");
    expect(markdown).toContain(
      "Remain on `017-aqstoqflow-enterprise-release-gate`",
    );
  });
});

function completeFixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "stoquify-release-evidence-"),
  );
  roots.push(root);
  writeJson(root, "package.json", packageFixture());

  for (const report of RUN_REPORTS) {
    writeText(
      root,
      report.file,
      [
        "# Skill Run",
        "",
        "Date: 2026-07-11",
        "",
        "## Verification",
        "",
        "Passed.",
        "",
        "## Next",
        "",
        "Continue.",
        "",
      ].join("\n"),
    );
  }
  for (const artifact of READINESS_ARTIFACTS) {
    writeReadiness(root, artifact.id, {
      status: "ready",
      checkCount: 10,
      readyCount: 10,
      blockerCount: 0,
    });
    writeText(root, artifact.markdown, `# ${artifact.id}\n`);
  }
  for (const artifact of SUPPORTING_ARTIFACTS) {
    writeText(root, artifact, "{}\n");
  }
  return root;
}

function writeReadiness(root, id, summary) {
  const artifact = READINESS_ARTIFACTS.find((entry) => entry.id === id);
  if (!artifact) throw new Error(`Unknown readiness artifact: ${id}`);
  writeJson(root, artifact.json, {
    summary: {
      generatedAt: "2026-07-25T12:00:00.000Z",
      mode: "fail",
      warningCount: 0,
      ...summary,
    },
  });
}

function packageFixture() {
  const policyGates = REQUIRED_POLICY_GATES.map(
    (gate) => `npm run ${gate}`,
  ).join(" && ");
  return {
    scripts: {
      build:
        "npm run release:secrets:preflight && npm run prisma:migrate:deploy:safe",
      "policy:gates": `${policyGates} && npm run release:secrets:preflight && npm run release:evidence:gate`,
      "verify:release":
        "npm run public-identity:abuse:gate:release && npm run receipt:token:config-gate:release && npm run release:secrets:preflight:release && npm run prisma:migration:release:preflight && npm run release:evidence:gate:release",
      "verify:ci": "npm run prisma:migrate:deploy && npm run verify:repo",
      "release:secrets:preflight": "node preflight.js",
      "release:secrets:preflight:release": "node preflight.js --release",
      "prisma:migration:safety:gate": "node migration.js",
      "prisma:migration:release:preflight": "node migration.js --release",
      "prisma:migrate:deploy:safe": "node migration.js --execute",
      "ci:release:gate": "node ci.js",
      "release:evidence:gate": "node evidence.js",
      "release:evidence:gate:release": "node evidence.js --release",
    },
  };
}

function completeReleaseEnvironment() {
  return {
    PUBLIC_IDENTITY_ABUSE_HASH_SECRET: "A".repeat(32),
    AQSTOQFLOW_RECEIPT_TOKEN_SECRET: "B".repeat(32),
    AQSTOQFLOW_HISTORY_CURSOR_SECRET: "C".repeat(32),
    DATABASE_URL:
      "postgresql://release-user:release-password@db.example.test:5432/stoquify_release",
  };
}

function writeJson(root, relativePath, value) {
  writeText(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(root, relativePath, value) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, "utf8");
}
