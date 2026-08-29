const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildMigrationDeploymentHistory,
  buildMigrationHistoryHealth,
  classifyTarget,
  gateResultForReport,
  queryHistoryRows,
  renderMarkdown,
} = require("../prisma-migration-history-health-check");

function makeRepo(names = ["20260701000000_first", "20260702000000_second"]) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "migration-history-health-"),
  );
  const migrations = names.map((name, index) => {
    const sql = `CREATE TABLE "example_${index}" ("id" TEXT PRIMARY KEY);\n`;
    const directory = path.join(root, "prisma", "migrations", name);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "migration.sql"), sql, "utf8");
    return {
      name,
      checksum: crypto.createHash("sha256").update(sql).digest("hex"),
    };
  });
  fs.writeFileSync(
    path.join(root, "prisma", "migration-history-checksum-approvals.json"),
    JSON.stringify({ version: 1, approvals: [] }),
    "utf8",
  );
  return { root, migrations };
}

function completed(migration, overrides = {}) {
  return {
    migration_name: migration.name,
    checksum: migration.checksum,
    started_at: "2026-07-27T00:00:00.000Z",
    finished_at: "2026-07-27T00:00:01.000Z",
    rolled_back_at: null,
    applied_steps_count: 1,
    ...overrides,
  };
}

describe("Prisma migration history health check", () => {
  it("passes only when every repository migration has one exact successful row", () => {
    const { root, migrations } = makeRepo();
    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@db.example.com:5432/stoquify",
      querySucceeded: true,
      rows: migrations.map((migration) => completed(migration)),
    });

    expect(report.summary).toMatchObject({
      status: "ready",
      readyCount: 9,
      checkCount: 9,
      blockerCount: 0,
    });
    expect(gateResultForReport(report, "fail").exitCode).toBe(0);
  });

  it("accepts a line-ending-only checksum equivalent", () => {
    const { root, migrations } = makeRepo(["20260701000000_first"]);
    const file = path.join(
      root,
      "prisma",
      "migrations",
      migrations[0].name,
      "migration.sql",
    );
    const source = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, source.replace(/\n/g, "\r\n"), "utf8");
    const lfChecksum = crypto.createHash("sha256").update(source).digest("hex");

    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@db.example.com:5432/stoquify",
      querySucceeded: true,
      rows: [completed({ name: migrations[0].name, checksum: lfChecksum })],
    });

    expect(report.summary.status).toBe("ready");
    expect(report.findings.checksumMismatches).toEqual([]);
  });

  it("accepts only an exact evidence-backed legacy checksum approval", () => {
    const { root, migrations } = makeRepo(["20260701000000_first"]);
    const databaseChecksum = "9".repeat(64);
    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@db.example.com:5432/stoquify",
      querySucceeded: true,
      rows: [completed(migrations[0], { checksum: databaseChecksum })],
      approvalRegistry: {
        exists: true,
        valid: true,
        errors: [],
        approvals: [
          {
            migration: migrations[0].name,
            databaseChecksum,
            repositoryChecksums: [migrations[0].checksum],
            approvedBy: "DBA Example",
            approvedAt: "2026-08-09T00:00:00.000Z",
            reason: "Verified against archived deployment evidence.",
          },
        ],
      },
    });

    expect(report.summary.status).toBe("ready");
    expect(report.findings.checksumMismatches).toEqual([]);
    expect(report.findings.approvedChecksumMismatches).toEqual([
      migrations[0].name,
    ]);
  });

  it("rejects a checksum approval stale against repository content", () => {
    const { root, migrations } = makeRepo(["20260701000000_first"]);
    const databaseChecksum = "9".repeat(64);
    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@db.example.com:5432/stoquify",
      querySucceeded: true,
      rows: [completed(migrations[0], { checksum: databaseChecksum })],
      approvalRegistry: {
        exists: true,
        valid: true,
        errors: [],
        approvals: [
          {
            migration: migrations[0].name,
            databaseChecksum,
            repositoryChecksums: ["8".repeat(64)],
            approvedBy: "DBA Example",
            approvedAt: "2026-08-09T00:00:00.000Z",
            reason: "Stale evidence.",
          },
        ],
      },
    });

    expect(report.summary.status).toBe("blocked");
    expect(report.findings.checksumMismatches).toEqual([migrations[0].name]);
    expect(report.checksumApprovals.staleApprovals).toEqual([
      migrations[0].name,
    ]);
    expect(report.blockers).toContain(
      "migration_checksum_approval_registry_valid",
    );
  });

  it("detects an unfinished row even when all migration names are present", () => {
    const { root, migrations } = makeRepo();
    const rows = migrations.map((migration) => completed(migration));
    rows[1] = completed(migrations[1], {
      finished_at: null,
      applied_steps_count: 0,
    });
    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@localhost:5432/dev",
      querySucceeded: true,
      rows,
    });

    expect(report.findings.unfinished).toEqual([migrations[1].name]);
    expect(report.findings.missing).toEqual([migrations[1].name]);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "migration_history_has_no_unfinished_rows",
        "all_repository_migrations_successfully_applied",
      ]),
    );
    expect(gateResultForReport(report, "fail").exitCode).toBe(1);
  });

  it("treats missing repository migrations as a pending deploy set when history integrity is otherwise healthy", () => {
    const { root, migrations } = makeRepo();
    const report = buildMigrationDeploymentHistory(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@db.example.com:5432/stoquify",
      querySucceeded: true,
      rows: [completed(migrations[0])],
    });

    expect(report.summary).toMatchObject({
      phase: "pre_deploy",
      status: "ready",
      pendingMigrationCount: 1,
    });
    expect(report.pendingMigrationNames).toEqual([migrations[1].name]);
    expect(report.blockers).toEqual([]);
  });

  it("still blocks pending-set calculation when applied history has checksum or unknown-row defects", () => {
    const { root, migrations } = makeRepo();
    const report = buildMigrationDeploymentHistory(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@db.example.com:5432/stoquify",
      querySucceeded: true,
      rows: [
        completed(migrations[0], { checksum: "0".repeat(64) }),
        completed({ name: "20260601000000_unknown", checksum: "1".repeat(64) }),
      ],
    });

    expect(report.summary.status).toBe("blocked");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "applied_migration_checksums_match_repository",
        "database_has_no_unknown_successful_migrations",
      ]),
    );
  });

  it("blocks missing, unknown, duplicate, and checksum-mismatched success rows", () => {
    const { root, migrations } = makeRepo();
    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@db.example.com:5432/stoquify",
      querySucceeded: true,
      rows: [
        completed(migrations[0], { checksum: "0".repeat(64) }),
        completed(migrations[0], { checksum: "1".repeat(64) }),
        completed({ name: "20260601000000_removed", checksum: "2".repeat(64) }),
      ],
    });

    expect(report.findings).toMatchObject({
      missing: [migrations[1].name],
      checksumMismatches: [migrations[0].name],
      unknown: ["20260601000000_removed"],
      duplicateSuccesses: [migrations[0].name],
    });
    expect(report.summary.status).toBe("blocked");
  });

  it("allows a rolled-back attempt when a later exact successful row exists", () => {
    const { root, migrations } = makeRepo(["20260701000000_first"]);
    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: "postgresql://user:secret@db.example.com:5432/stoquify",
      querySucceeded: true,
      rows: [
        completed(migrations[0], {
          finished_at: null,
          rolled_back_at: "2026-07-27T00:00:02.000Z",
          applied_steps_count: 0,
        }),
        completed(migrations[0]),
      ],
    });

    expect(report.summary.status).toBe("ready");
    expect(report.summary.rolledBackRowCount).toBe(1);
  });

  it("fails closed when the database is missing or history cannot be queried", () => {
    const { root } = makeRepo();
    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl: "",
      querySucceeded: false,
      queryErrorCode: "database_url_missing",
      rows: [],
    });

    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "database_url_configured",
        "migration_history_query_succeeded",
      ]),
    );
  });

  it("queries migration history through the native PostgreSQL driver", async () => {
    const rows = [{ migration_name: "20260701000000_first" }];
    const client = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ rows }),
      end: jest.fn().mockResolvedValue(undefined),
    };
    const clientFactory = jest.fn(() => client);

    await expect(
      queryHistoryRows(
        "postgresql://user:secret@localhost:5432/stoquify",
        clientFactory,
      ),
    ).resolves.toEqual({ rows, succeeded: true, errorCode: null });
    expect(clientFactory).toHaveBeenCalledWith(
      "postgresql://user:secret@localhost:5432/stoquify",
    );
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM "_prisma_migrations"'),
    );
    expect(client.end).toHaveBeenCalledTimes(1);
  });

  it("is wired after migration deployment in protected verification commands", () => {
    const packageJson = require("../../package.json");
    const verifyCi = packageJson.scripts["verify:ci"];
    const verifyRelease = packageJson.scripts["verify:release"];

    expect(packageJson.scripts["prisma:migration:history:health"]).toContain(
      "prisma-migration-history-health-check.js --mode fail",
    );
    expect(verifyCi.indexOf("npm run prisma:migrate:deploy")).toBeLessThan(
      verifyCi.indexOf("npm run prisma:migration:history:health"),
    );
    expect(
      verifyCi.indexOf("npm run prisma:migration:history:health"),
    ).toBeLessThan(verifyCi.indexOf("npm run prisma:migrate:status"));
    expect(
      verifyRelease.indexOf("npm run prisma:migration:release:preflight"),
    ).toBeLessThan(
      verifyRelease.indexOf("npm run prisma:migration:history:health"),
    );
  });
  it("never includes the database URL, password, or migration logs in evidence", () => {
    const { root, migrations } = makeRepo(["20260701000000_first"]);
    const databaseUrl =
      "postgresql://user:do-not-print-this@db.example.com:5432/stoquify";
    const report = buildMigrationHistoryHealth(root, {
      mode: "fail",
      databaseUrl,
      querySucceeded: true,
      rows: [completed(migrations[0])],
    });
    const evidence = renderMarkdown(report) + JSON.stringify(report);

    expect(classifyTarget(databaseUrl)).toEqual({
      configured: true,
      targetClass: "remote",
    });
    expect(evidence).not.toContain(databaseUrl);
    expect(evidence).not.toContain("do-not-print-this");
    expect(report.safety.migrationLogsRetained).toBe(false);
    expect(report.summary.secretValuePrinted).toBe(false);
    expect(report.summary.migrationLogPrinted).toBe(false);
  });
});
