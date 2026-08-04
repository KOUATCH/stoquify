const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  buildMigrationHistoryHealth,
  classifyTarget,
  gateResultForReport,
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
      readyCount: 8,
      checkCount: 8,
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
