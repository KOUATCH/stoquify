#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const DEFAULT_MARKDOWN_OUT = "what-next/prisma-migration-history-health.md";
const DEFAULT_JSON_OUT = "what-next/prisma-migration-history-health.json";
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    mode: "report",
    out: DEFAULT_MARKDOWN_OUT,
    jsonOut: DEFAULT_JSON_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else if (value === "--json-out") options.jsonOut = argv[++index];
    else throw new Error("Unknown argument: " + value);
  }
  if (!["report", "fail"].includes(options.mode)) {
    throw new Error("Unsupported mode: " + options.mode);
  }
  return options;
}

function expandDatabaseUrl(environment = process.env) {
  if (environment.DATABASE_URL?.includes("${")) {
    environment.DATABASE_URL = environment.DATABASE_URL.replace(
      /\$\{([^}]+)\}/g,
      (_match, key) => environment[key] || "",
    );
  }
  return environment.DATABASE_URL || "";
}

function classifyTarget(rawUrl) {
  if (!rawUrl) return { configured: false, targetClass: "unconfigured" };
  try {
    const parsed = new URL(rawUrl);
    const protocolOk = ["postgres:", "postgresql:"].includes(parsed.protocol);
    return {
      configured: true,
      targetClass:
        protocolOk && LOCAL_HOSTS.has(parsed.hostname.toLowerCase())
          ? "local"
          : protocolOk
            ? "remote"
            : "unsupported",
    };
  } catch {
    return { configured: true, targetClass: "invalid" };
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function migrationCatalog(root = process.cwd()) {
  const migrationsRoot = path.join(root, "prisma", "migrations");
  if (!fs.existsSync(migrationsRoot)) return [];
  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const migrationFile = path.join(
        migrationsRoot,
        entry.name,
        "migration.sql",
      );
      if (!fs.existsSync(migrationFile)) return null;
      const bytes = fs.readFileSync(migrationFile);
      const source = bytes.toString("utf8");
      const acceptedChecksums = [
        sha256(bytes),
        sha256(source.replace(/\r\n/g, "\n")),
        sha256(source.replace(/\r?\n/g, "\r\n")),
      ];
      return {
        name: entry.name,
        checksum: acceptedChecksums[0],
        acceptedChecksums: [...new Set(acceptedChecksums)],
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function isCompleted(row) {
  return Boolean(row.finished_at) && !row.rolled_back_at;
}

function isUnfinished(row) {
  return !row.finished_at && !row.rolled_back_at;
}

function buildMigrationHistoryHealth(root = process.cwd(), options = {}) {
  const catalog = migrationCatalog(root);
  const rows = Array.isArray(options.rows) ? options.rows : [];
  const database = classifyTarget(options.databaseUrl || "");
  const querySucceeded = options.querySucceeded === true;

  const completed = rows.filter(isCompleted);
  const unfinished = rows.filter(isUnfinished);
  const rolledBack = rows.filter((row) => Boolean(row.rolled_back_at));
  const catalogByName = new Map(
    catalog.map((migration) => [migration.name, migration]),
  );
  const completedByName = new Map();

  for (const row of completed) {
    const existing = completedByName.get(row.migration_name) || [];
    existing.push(row);
    completedByName.set(row.migration_name, existing);
  }

  const missing = catalog
    .filter((migration) => !completedByName.has(migration.name))
    .map((migration) => migration.name);
  const checksumMismatches = catalog
    .filter((migration) => {
      const successes = completedByName.get(migration.name) || [];
      return (
        successes.length > 0 &&
        !successes.some((row) =>
          migration.acceptedChecksums.includes(row.checksum),
        )
      );
    })
    .map((migration) => migration.name);
  const unknown = [
    ...new Set(
      completed
        .filter((row) => !catalogByName.has(row.migration_name))
        .map((row) => row.migration_name),
    ),
  ].sort();
  const duplicateSuccesses = [...completedByName.entries()]
    .filter(([, successes]) => successes.length > 1)
    .map(([name]) => name)
    .sort();

  const checks = [
    { id: "database_url_configured", ready: database.configured },
    { id: "migration_catalog_present", ready: catalog.length > 0 },
    { id: "migration_history_query_succeeded", ready: querySucceeded },
    {
      id: "migration_history_has_no_unfinished_rows",
      ready: unfinished.length === 0,
    },
    {
      id: "all_repository_migrations_successfully_applied",
      ready: missing.length === 0,
    },
    {
      id: "applied_migration_checksums_match_repository",
      ready: checksumMismatches.length === 0,
    },
    {
      id: "database_has_no_unknown_successful_migrations",
      ready: unknown.length === 0,
    },
    {
      id: "database_has_no_duplicate_successful_migrations",
      ready: duplicateSuccesses.length === 0,
    },
  ];
  const blockers = checks
    .filter((check) => !check.ready)
    .map((check) => check.id);

  return {
    summary: {
      generatedAt: new Date().toISOString(),
      mode: options.mode || "report",
      status: blockers.length ? "blocked" : "ready",
      checkCount: checks.length,
      readyCount: checks.filter((check) => check.ready).length,
      blockerCount: blockers.length,
      repositoryMigrationCount: catalog.length,
      completedRowCount: completed.length,
      unfinishedRowCount: unfinished.length,
      rolledBackRowCount: rolledBack.length,
      secretValuePrinted: false,
      migrationLogPrinted: false,
    },
    database,
    query: {
      succeeded: querySucceeded,
      errorCode: querySucceeded
        ? null
        : options.queryErrorCode || "not_attempted",
    },
    checks,
    findings: {
      unfinished: unfinished.map((row) => row.migration_name).sort(),
      missing,
      checksumMismatches,
      unknown,
      duplicateSuccesses,
    },
    blockers,
    safety: {
      readOnly: true,
      databaseUrlRetained: false,
      migrationLogsRetained: false,
    },
  };
}

function renderMarkdown(report) {
  return [
    "# Prisma Migration History Health",
    "",
    `Generated: ${report.summary.generatedAt}`,
    `Mode: \`${report.summary.mode}\``,
    `Status: \`${report.summary.status}\``,
    "",
    "## Summary",
    "",
    `- Checks ready: ${report.summary.readyCount}/${report.summary.checkCount}`,
    `- Repository migrations: ${report.summary.repositoryMigrationCount}`,
    `- Completed history rows: ${report.summary.completedRowCount}`,
    `- Unfinished history rows: ${report.summary.unfinishedRowCount}`,
    `- Rolled-back history rows: ${report.summary.rolledBackRowCount}`,
    "- Secret values printed: no",
    "- Migration logs printed: no",
    "",
    "## Target",
    "",
    `- Database configured: ${report.database.configured ? "yes" : "no"}`,
    `- Target class: \`${report.database.targetClass}\``,
    `- History query succeeded: ${report.query.succeeded ? "yes" : "no"}`,
    "",
    "## Checks",
    "",
    ...report.checks.map(
      (check) => `- ${check.ready ? "ready" : "blocked"}: ${check.id}`,
    ),
    "",
    "## Findings",
    "",
    `- Unfinished: ${report.findings.unfinished.length ? report.findings.unfinished.join(", ") : "none"}`,
    `- Missing: ${report.findings.missing.length ? report.findings.missing.join(", ") : "none"}`,
    `- Checksum mismatches: ${report.findings.checksumMismatches.length ? report.findings.checksumMismatches.join(", ") : "none"}`,
    `- Unknown successful migrations: ${report.findings.unknown.length ? report.findings.unknown.join(", ") : "none"}`,
    `- Duplicate successful migrations: ${report.findings.duplicateSuccesses.length ? report.findings.duplicateSuccesses.join(", ") : "none"}`,
    "",
    "## Blockers",
    "",
    ...(report.blockers.length
      ? report.blockers.map((blocker) => `- ${blocker}`)
      : ["- None"]),
    "",
    "## Safety",
    "",
    "- This gate performs a read-only query of `_prisma_migrations`.",
    "- It does not print or retain the database URL or migration error logs.",
    "- It compares successful history rows with the exact repository migration file checksums.",
    "- It does not resolve, apply, roll back, or mutate a migration.",
    "",
  ].join("\n");
}

function wait(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function writeFileWithRetry(target, value, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, value, "utf8");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) wait(500 * attempt);
    }
  }
  throw lastError;
}

function writeReport(root, options, report) {
  writeFileWithRetry(path.resolve(root, options.out), renderMarkdown(report));
  writeFileWithRetry(
    path.resolve(root, options.jsonOut),
    JSON.stringify(report, null, 2) + "\n",
  );
}

function gateResultForReport(report, mode = "report") {
  return {
    status: report.summary.status,
    exitCode: mode === "fail" && report.blockers.length ? 1 : 0,
  };
}

async function queryHistoryRows(databaseUrl) {
  if (!databaseUrl)
    return { rows: [], succeeded: false, errorCode: "database_url_missing" };
  const { PrismaClient } = require("@prisma/client");
  const client = new PrismaClient();
  try {
    const rows = await client.$queryRawUnsafe(
      'SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count FROM "_prisma_migrations" ORDER BY started_at',
    );
    return { rows, succeeded: true, errorCode: null };
  } catch (error) {
    return {
      rows: [],
      succeeded: false,
      errorCode:
        typeof error?.code === "string"
          ? `query_failed_${error.code}`
          : "migration_history_query_failed",
    };
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const options = parseArgs();
  const root = path.resolve(options.root);
  const databaseUrl = expandDatabaseUrl();
  const query = await queryHistoryRows(databaseUrl);
  const report = buildMigrationHistoryHealth(root, {
    mode: options.mode,
    databaseUrl,
    rows: query.rows,
    querySucceeded: query.succeeded,
    queryErrorCode: query.errorCode,
  });
  writeReport(root, options, report);
  console.log(renderMarkdown(report));
  process.exitCode = gateResultForReport(report, options.mode).exitCode;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  buildMigrationHistoryHealth,
  classifyTarget,
  expandDatabaseUrl,
  gateResultForReport,
  migrationCatalog,
  parseArgs,
  queryHistoryRows,
  renderMarkdown,
  writeFileWithRetry,
};
