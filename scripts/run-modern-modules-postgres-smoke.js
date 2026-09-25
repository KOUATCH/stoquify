#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { Client } = require("pg");
const { createNewDatabase, deployMigrations } = require("./prisma-local-fresh-bootstrap");
const { targetUrl: browserTargetUrl, REQUIRED_MIGRATIONS } = require("./modern-modules-local-verification");

const ROOT = path.resolve(__dirname, "..");
const DATABASE_NAME = "stoquify_local_modern_modules_controls_20260905_01";
const SOURCE = "local-modern-modules-postgres-controls";

function targetUrl(env = process.env) {
  // Inherits the browser helper's PostgreSQL/loopback/production-marker checks.
  // This distinct database never participates in its five-organization fixture.
  const target = new URL(browserTargetUrl(env));
  target.pathname = `/${DATABASE_NAME}`;
  return target;
}

async function main(command = process.argv[2]) {
  if (!["create", "run"].includes(command) || process.argv.length !== 3) {
    throw new Error("Usage: node scripts/run-modern-modules-postgres-smoke.js create|run");
  }
  process.chdir(ROOT);
  const target = targetUrl();
  if (command === "create") {
    await createNewDatabase(target, DATABASE_NAME);
    const previousDirect = process.env.DIRECT_URL;
    process.env.DIRECT_URL = target.toString();
    try { deployMigrations(target); }
    finally {
      if (previousDirect === undefined) delete process.env.DIRECT_URL;
      else process.env.DIRECT_URL = previousDirect;
    }
    console.log(JSON.stringify({ action: "created_and_migrated", database: DATABASE_NAME, synthetic: true }));
    return;
  }
  const check = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  await check.connect();
  try {
    const identity = await check.query("SELECT current_database() AS name");
    if (identity.rows[0]?.name !== DATABASE_NAME) throw new Error("Controls database identity mismatch.");
    const owners = await check.query('SELECT id, "onboardingSource" FROM "organizations"');
    if (owners.rows.some((row) => row.onboardingSource !== SOURCE || !row.id.startsWith("org_modules_service_smoke_"))) {
      throw new Error("Controls database contains data outside this smoke test's ownership.");
    }
    const migrations = await check.query('SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ANY($1::text[]) AND finished_at IS NOT NULL AND rolled_back_at IS NULL', [
      REQUIRED_MIGRATIONS,
    ]);
    const completed = new Set(migrations.rows.map((row) => row.migration_name));
    if (REQUIRED_MIGRATIONS.some((name) => !completed.has(name))) throw new Error("Apply all module composition and lifecycle migrations to the controls database first.");
  } finally { await check.end(); }

  process.env.DATABASE_URL = target.toString();
  process.env.DIRECT_URL = target.toString();
  process.env.MODERN_MODULES_CONTROLS_DATABASE = DATABASE_NAME;
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs", moduleResolution: "node" });
  const { PrismaClient } = require("@prisma/client");
  // Real services use this isolated client. Quiet logging prevents expected
  // constraint failures from printing statement parameters into evidence.
  globalThis.prisma = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [], transactionOptions: { maxWait: 10000, timeout: 15000 } });
  require("./server-only-node-shim");
  require("ts-node/register/transpile-only");
  require("tsconfig-paths/register");
  const { runModernModulesPostgresSmoke } = require("./modern-modules-postgres-smoke.ts");
  try { await runModernModulesPostgresSmoke(); }
  finally { await globalThis.prisma.$disconnect(); }
}

if (require.main === module) main().catch((error) => {
  console.error(error.code ? `Module PostgreSQL smoke failed (${error.code}).` : String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]"));
  process.exitCode = 1;
});
module.exports = { DATABASE_NAME, SOURCE, targetUrl, main };
