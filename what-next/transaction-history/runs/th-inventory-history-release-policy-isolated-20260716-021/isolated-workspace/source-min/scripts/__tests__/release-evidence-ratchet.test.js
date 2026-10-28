const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  READINESS_ARTIFACTS,
  REQUIRED_POLICY_GATES,
  RUN_REPORTS,
  SUPPORTING_ARTIFACTS,
  buildReleaseEvidence,
  gateResultForReport,
} = require("../release-evidence-ratchet")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "release-evidence-ratchet-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function writeReadyFixture(root) {
  for (const report of RUN_REPORTS) {
    write(root, report.file, "# Run Report\n\nDate: 2026-07-11\n\n## Verification\n\nPassed.\n\n## Next Recommended Skill\n\nNext.\n")
  }
  for (const artifact of READINESS_ARTIFACTS) {
    write(root, artifact.json, JSON.stringify({ summary: { status: "ready", readyCount: 1, checkCount: 1, blockerCount: 0 } }))
    write(root, artifact.markdown, "# Ready\n")
  }
  for (const file of SUPPORTING_ARTIFACTS) write(root, file, file.endsWith(".json") ? "{}" : "# Evidence\n")

  const policy = [...REQUIRED_POLICY_GATES, "release:secrets:preflight", "release:evidence:gate"]
    .map((gate) => "npm run " + gate)
    .join(" && ")
  write(root, "package.json", JSON.stringify({
    scripts: {
      "policy:gates": policy,
      "release:evidence:gate": "node scripts/release-evidence-ratchet.js --mode fail",
      "release:evidence:gate:release": "node scripts/release-evidence-ratchet.js --mode fail --release on",
      "release:secrets:preflight": "node scripts/release-secret-preflight.js --mode fail --release auto",
      "release:secrets:preflight:release": "node scripts/release-secret-preflight.js --mode fail --release on",
      "prisma:migration:safety:gate": "node scripts/prisma-production-migration-gate.js --mode fail --environment local",
      "prisma:migration:release:preflight": "node scripts/prisma-production-migration-gate.js --mode fail --environment production",
      "prisma:migrate:deploy:safe": "node scripts/prisma-production-migration-gate.js --mode execute --environment auto",
      "ci:release:gate": "node scripts/ci-release-readiness-gate.js --mode fail",
      "verify:ci": "npm run ci:release:gate && npm run prisma:migrate:deploy && npm run verify:repo",
      "build": "npm run release:secrets:preflight && npm run prisma:migrate:deploy:safe && npm run build:linted",
      "verify:release": "npm run verify:repo && npm run release:secrets:preflight:release && npm run prisma:migration:release:preflight && npm run public-identity:abuse:gate:release && npm run receipt:token:config-gate:release && npm run release:evidence:gate:release",
    },
  }))
}

describe("release evidence ratchet", () => {
  it("passes structural evidence while reporting missing release secrets as conditional", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildReleaseEvidence(root, { mode: "fail", release: "off", environment: {} })

    expect(report.summary).toMatchObject({ status: "conditional", readyCount: 11, blockerCount: 0, releaseBlockerCount: 3 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks release mode until every environment condition is configured", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildReleaseEvidence(root, { mode: "fail", release: "on", environment: {} })

    expect(report.releaseBlockers).toEqual(["public_identity_hash_secret", "public_receipt_token_secret", "production_database_target"])
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("becomes release-ready when structural evidence and all environment conditions are present", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildReleaseEvidence(root, {
      mode: "fail",
      release: "on",
      environment: {
        PUBLIC_IDENTITY_ABUSE_HASH_SECRET: "identity-secret-value-with-32-characters",
        AQSTOQFLOW_RECEIPT_TOKEN_SECRET: "receipt-secret-value-with-32-characters",
        DATABASE_URL: "postgresql://user:secret@db.example.com:5432/stoquify",
      },
    })

    expect(report.summary.status).toBe("ready")
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("reports missing structural evidence as conditional in dev/test and blocking in release mode", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    fs.unlinkSync(path.join(root, RUN_REPORTS[0].file))

    const devReport = buildReleaseEvidence(root, { mode: "fail", release: "off", environment: {} })
    expect(devReport.summary.status).toBe("conditional")
    expect(devReport.blockers).toContain("all_skill_run_reports_present")
    expect(gateResultForReport(devReport, "fail").exitCode).toBe(0)

    const releaseReport = buildReleaseEvidence(root, { mode: "fail", release: "on", environment: {} })
    expect(releaseReport.summary.status).toBe("blocked")
    expect(releaseReport.blockers).toContain("all_skill_run_reports_present")
    expect(gateResultForReport(releaseReport, "fail").exitCode).toBe(1)
  })
})
