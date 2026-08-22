const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildPrismaMigrationReadiness,
  executeMigration,
  gateResultForReport,
  renderMarkdown,
  renderRiskReviewPacket,
  validateDatabaseTarget,
} = require("../prisma-production-migration-gate");

function makeRepo(sql = 'CREATE TABLE "example" ("id" TEXT PRIMARY KEY);\n') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prisma-migration-gate-"));
  const migration = "prisma/migrations/20260711000000_example/migration.sql";
  fs.mkdirSync(path.dirname(path.join(root, migration)), { recursive: true });
  fs.writeFileSync(path.join(root, migration), sql, "utf8");
  fs.writeFileSync(
    path.join(root, "prisma/migration-risk-approvals.json"),
    JSON.stringify({ version: 2, approvals: [] }),
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      scripts: {
        build:
          "npm run release:secrets:preflight && npm run prisma:migrate:deploy:safe && npm run build:linted",
        "policy:gates":
          "npm run prisma:migration:safety:gate && npm run release:evidence:gate",
        "prisma:migration:history:health":
          "node scripts/prisma-migration-history-health-check.js --mode fail",
        "verify:ci":
          "npm run prisma:migrate:deploy && npm run prisma:migration:history:health && npm run prisma:migrate:status",
        "verify:release":
          "npm run verify:repo && npm run prisma:migration:release:preflight && npm run prisma:migration:history:health",
      },
    }),
    "utf8",
  );
  return { root, migration };
}

function approve(root, overrides = {}) {
  const report = buildPrismaMigrationReadiness(root, {
    environment: "local",
    environmentValues: {},
  });
  const finding = report.findings[0];
  const approval = {
    migration: finding.migration,
    migrationSha256: finding.migrationSha256,
    findingSha256: finding.findingSha256,
    rule: finding.rule,
    humanAuthored: true,
    consequenceAcknowledged: true,
    approvedBy: "finance-platform-owner",
    reviewerRole: "DBA and security owner",
    reason: "Reviewed compatibility and rollback evidence.",
    approvedAt: "2026-07-11T12:00:00Z",
    expiresAt: null,
    revocation: null,
    ...overrides,
  };
  fs.writeFileSync(
    path.join(root, "prisma/migration-risk-approvals.json"),
    JSON.stringify({ version: 2, approvals: [approval] }),
    "utf8",
  );
  return approval;
}

describe("Prisma production migration gate", () => {
  it("passes static checks and skips local database mutation", () => {
    const { root } = makeRepo();
    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });

    expect(report.summary).toMatchObject({
      status: "ready",
      readyCount: 9,
      checkCount: 9,
      blockerCount: 0,
    });
    expect(report.deployment).toMatchObject({
      shouldDeploy: false,
      reason: "non_production_default_skip",
    });
    expect(report.execution.status).toBe("skipped");
  });

  it("skips preview migration by default even when DATABASE_URL exists", () => {
    const { root } = makeRepo();
    const report = buildPrismaMigrationReadiness(root, {
      environment: "preview",
      environmentValues: {
        DATABASE_URL:
          "postgresql://user:preview-secret@db.example.com:5432/preview",
      },
    });

    expect(report.summary.status).toBe("ready");
    expect(report.deployment.shouldDeploy).toBe(false);
    expect(report.deployment.databaseConfigured).toBe(false);
  });

  it("blocks production when DATABASE_URL is missing or local", () => {
    const { root } = makeRepo();
    const missing = buildPrismaMigrationReadiness(root, {
      environment: "production",
      environmentValues: {},
    });
    const local = buildPrismaMigrationReadiness(root, {
      environment: "production",
      environmentValues: {
        DATABASE_URL: "postgresql://user:password@localhost:5432/stoquify",
      },
    });

    expect(missing.blockers).toContain("database_url_missing");
    expect(local.blockers).toContain("database_target_is_local");
    expect(gateResultForReport(missing, "fail").exitCode).toBe(1);
  });

  it("executes Prisma deploy for a safe production target", () => {
    const { root } = makeRepo();
    const environmentValues = {
      DATABASE_URL:
        "postgresql://user:production-secret@db.example.com:5432/stoquify",
    };
    const report = buildPrismaMigrationReadiness(root, {
      environment: "production",
      environmentValues,
    });
    const calls = [];

    executeMigration(report, {
      root,
      environmentValues,
      runner(command, args, options) {
        calls.push({ command, args, options });
        return { status: 0 };
      },
    });

    expect(report.execution).toMatchObject({
      attempted: true,
      deployStatus: "succeeded",
      historyCheckAttempted: true,
      historyCheckStatus: "succeeded",
      status: "succeeded",
      exitCode: 0,
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].args).toEqual(["run", "prisma:migrate:deploy"]);
    expect(calls[1].args).toEqual(["run", "prisma:migration:history:health"]);
  });

  it("fails the safe deploy when direct migration-history health fails", () => {
    const { root } = makeRepo();
    const environmentValues = {
      DATABASE_URL:
        "postgresql://user:production-secret@db.example.com:5432/stoquify",
    };
    const report = buildPrismaMigrationReadiness(root, {
      environment: "production",
      environmentValues,
    });
    const runner = jest
      .fn()
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 1 });

    executeMigration(report, { root, environmentValues, runner });

    expect(report.execution).toMatchObject({
      deployStatus: "succeeded",
      historyCheckAttempted: true,
      historyCheckStatus: "failed",
      status: "failed",
      exitCode: 1,
    });
    expect(report.blockers).toContain("migration_history_health_failed");
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("blocks unapproved destructive SQL", () => {
    const sql = 'ALTER TABLE "items" DROP COLUMN "legacy_name";\n';
    const { root } = makeRepo(sql);
    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });

    expect(report.findings).toEqual([
      expect.objectContaining({ rule: "drop_column", approved: false }),
    ]);
    expect(report.blockers).toContain("destructive_sql_is_exact_hash_approved");
  });

  it("accepts a reviewed destructive operation only for the exact file hash", () => {
    const sql = 'ALTER TABLE "items" DROP COLUMN "legacy_name";\n';
    const { root, migration } = makeRepo(sql);
    approve(root);

    const approved = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });
    expect(approved.summary.status).toBe("ready");
    expect(approved.findings[0].approved).toBe(true);

    fs.appendFileSync(
      path.join(root, migration),
      "-- changed after approval\n",
      "utf8",
    );
    const changed = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });
    expect(changed.blockers).toEqual(
      expect.arrayContaining([
        "destructive_sql_is_exact_hash_approved",
        "stale_migration_risk_approval",
      ]),
    );
  });

  it("uses canonical LF hashing across Windows and CI checkouts", () => {
    const sql = 'ALTER TABLE "items" DROP COLUMN "legacy_name";\r\n';
    const { root, migration } = makeRepo(sql);
    approve(root);

    fs.writeFileSync(path.join(root, migration), sql.replace(/\r\n/g, "\n"));
    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });

    expect(report.findings[0].approvalStatus).toBe("approved");
    expect(report.staleApprovals).toEqual([]);
  });

  it("records the exact clause, consequence, and independent finding hash", () => {
    const sql =
      'ALTER TABLE "accounts" DROP COLUMN "access_token",\nDROP COLUMN "refresh_token";\n';
    const { root } = makeRepo(sql);
    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });

    expect(report.findings).toHaveLength(2);
    expect(report.findings[0]).toMatchObject({
      clause: 'DROP COLUMN "access_token"',
      approvalStatus: "pending",
      approved: false,
    });
    expect(report.findings[0].consequence).toContain(
      '"accounts"."access_token"',
    );
    expect(report.findings[0].findingSha256).not.toBe(
      report.findings[1].findingSha256,
    );
  });

  it("keeps a revoked human decision in the audit trail but blocks the finding", () => {
    const sql = 'DROP TABLE "auth_sessions";\n';
    const { root } = makeRepo(sql);
    approve(root, {
      revocation: {
        humanAuthored: true,
        revokedBy: "security-owner",
        revokedAt: "2026-07-12T09:30:00Z",
        reason: "Target evidence changed; review must be repeated.",
      },
    });

    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });

    expect(report.findings[0]).toMatchObject({
      approvalStatus: "revoked",
      approved: false,
    });
    expect(report.revokedApprovals).toHaveLength(1);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "destructive_sql_is_exact_hash_approved",
        "revoked_migration_risk_approval",
      ]),
    );
  });

  it("detects an expired approval as stale", () => {
    const sql = 'DROP TABLE "auth_sessions";\n';
    const { root } = makeRepo(sql);
    approve(root, { expiresAt: "2026-07-12T00:00:00Z" });

    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
      now: "2026-07-13T00:00:00Z",
    });

    expect(report.findings[0].approvalStatus).toBe("stale");
    expect(report.staleApprovals).toEqual([
      expect.objectContaining({ reason: "approval_expired" }),
    ]);
    expect(report.blockers).toContain("stale_migration_risk_approval");
  });

  it("rejects machine-authored or placeholder approval attestations", () => {
    const sql = 'DROP TABLE "auth_sessions";\n';
    const { root } = makeRepo(sql);
    approve(root, {
      humanAuthored: false,
      approvedBy: "REQUIRED_ACCOUNTABLE_REVIEWER",
    });

    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });

    expect(report.findings[0].approved).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "risk_approval_registry_valid",
        "approval_registry_entry_invalid",
        "destructive_sql_is_exact_hash_approved",
      ]),
    );
  });

  it("renders a non-approving review packet with exact clauses and consequences", () => {
    const sql = 'DROP TABLE "auth_sessions";\n';
    const { root } = makeRepo(sql);
    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });
    const packet = renderRiskReviewPacket(report);

    expect(packet).toContain('`DROP TABLE "auth_sessions";`');
    expect(packet).toContain(
      'Permanently removes "auth_sessions" and all of its rows',
    );
    expect(packet).toContain("The generator never writes");
    expect(packet).toContain(report.findings[0].findingSha256);
    expect(report.summary.approvedRiskCount).toBe(0);
  });

  it("requires explicit isolated-target attestation for forced preview deploys", () => {
    const { root } = makeRepo();
    const environmentValues = {
      AQSTOQFLOW_DEPLOY_MIGRATIONS: "1",
      AQSTOQFLOW_DATABASE_TARGET: "production",
      DATABASE_URL: "postgresql://user:secret@db.example.com:5432/stoquify",
    };
    const report = buildPrismaMigrationReadiness(root, {
      environment: "preview",
      environmentValues,
    });

    expect(report.blockers).toContain(
      "preview_database_must_be_attested_isolated",
    );
  });

  it("rejects approval paths and rule ids outside the migration contract", () => {
    const { root } = makeRepo();
    fs.writeFileSync(
      path.join(root, "prisma/migration-risk-approvals.json"),
      JSON.stringify({
        version: 2,
        approvals: [
          {
            migration: "../../outside.sql",
            sha256: "a".repeat(64),
            rules: ["not_a_rule"],
            approvedBy: "reviewer",
            reason: "Invalid fixture.",
            approvedAt: "2026-07-11",
          },
        ],
      }),
      "utf8",
    );

    const report = buildPrismaMigrationReadiness(root, {
      environment: "local",
      environmentValues: {},
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "risk_approval_registry_valid",
        "approval_registry_entry_invalid",
      ]),
    );
  });
  it("never writes database credentials into evidence", () => {
    const { root } = makeRepo();
    const databaseUrl =
      "postgresql://user:do-not-print-this@db.example.com:5432/stoquify";
    const report = buildPrismaMigrationReadiness(root, {
      environment: "production",
      environmentValues: { DATABASE_URL: databaseUrl },
    });
    const evidence = renderMarkdown(report, "fail") + JSON.stringify(report);

    expect(validateDatabaseTarget(databaseUrl).safe).toBe(true);
    expect(evidence).not.toContain(databaseUrl);
    expect(evidence).not.toContain("do-not-print-this");
    expect(report.summary.secretValuePrinted).toBe(false);
  });
});
