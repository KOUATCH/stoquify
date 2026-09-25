#!/usr/bin/env node
"use strict";

// This helper owns one disposable database. It never resets an existing database,
// changes a live tenant, or manufactures authentication sessions.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { Client } = require("pg");
const {
  createNewDatabase, deployMigrations, loadDatabaseUrl, resolveTarget,
} = require("./prisma-local-fresh-bootstrap");

const ROOT = path.resolve(__dirname, "..");
const DATABASE_NAME = "stoquify_local_modern_modules_20260905_01";
const MIGRATION_NAME = "20260905170000_add_tenant_module_composition";
const REQUIRED_MIGRATIONS = [MIGRATION_NAME, "20260905173000_protect_module_configuration_authority", "20260905200000_add_module_lifecycle_command_state", "20260905200100_add_module_lifecycle"];
const BASE_URL = "http://127.0.0.1:3107";
const DIST_DIR = ".next-modern-modules-integration";
const FIXTURE_SOURCE = "local-modern-modules-verification";
const PRIVATE_PATH = path.join(ROOT, "playwright", ".auth", "modern-modules-local.json");
const EVIDENCE_DIR = path.join(ROOT, "what-next", "modern-modules-integration", "2026-09-05-run-01", "evidence");
const CORE = ["dashboard", "settings", "administration"];
const RETAIL_GRANTS = [...CORE, "inventory", "sales", "pos", "cash_drawer", "finance", "accounting", "payment_reconciliation", "reports", "analytics"];
const SERVICE_GRANTS = [...CORE, "sales", "finance", "accounting", "reports", "analytics", "payment_reconciliation"];
const ADMIN_PERMISSIONS = [
  "dashboard.read", "MANAGE_SYSTEM_SETTINGS", "system.settings.update",
  "inventory.items.read", "sales.read", "customers.read", "OPERATE_POS",
  "finance.read", "finance.dashboard.read", "finance.cash-drawer.read", "CASH_DRAWER_READ",
  "accounting.reports.read", "accounting.journal.read", "payments.reconciliation.read", "reports.read",
];
const FIXTURES = [
  { key: "retailer_en_desktop", journey: "retailer", locale: "en", grants: RETAIL_GRANTS, active: [...CORE, "inventory", "sales", "pos", "cash_drawer"] },
  { key: "service_en_desktop", journey: "service", locale: "en", grants: SERVICE_GRANTS, active: [...CORE, "sales", "finance"] },
  { key: "retailer_fr_mobile", journey: "retailer", locale: "fr", grants: RETAIL_GRANTS, active: [...CORE, "inventory", "sales", "pos", "cash_drawer"] },
  { key: "service_fr_mobile", journey: "service", locale: "fr", grants: SERVICE_GRANTS, active: [...CORE, "sales", "finance"] },
  { key: "legacy_en_desktop", journey: "legacy", locale: "en", grants: null, active: [] },
].map((fixture) => ({
  ...fixture,
  organizationId: `org_modules_${fixture.key}`,
  userId: `usr_modules_${fixture.key}`,
  email: `${fixture.key}@modern-modules.stockflow.test`,
}));

function targetUrl(env = process.env) {
  if ([env.NODE_ENV, env.AQSTOQFLOW_ENV, env.VERCEL_ENV].some((value) => value?.toLowerCase() === "production")) {
    throw new Error("Refusing isolated verification with a production environment marker.");
  }
  return resolveTarget({ databaseName: DATABASE_NAME, sourceUrl: loadDatabaseUrl(env), nodeEnv: env.NODE_ENV });
}

async function withTarget(operation) {
  const target = targetUrl();
  const client = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    const result = await client.query("SELECT current_database() AS name");
    if (result.rows[0]?.name !== DATABASE_NAME) throw new Error("Isolated database identity did not match.");
    return await operation(client, target);
  } finally { await client.end(); }
}

async function assertMigration(client) {
  const applied = await client.query(
    'SELECT DISTINCT migration_name FROM "_prisma_migrations" WHERE migration_name = ANY($1::text[]) AND finished_at IS NOT NULL AND rolled_back_at IS NULL',
    [REQUIRED_MIGRATIONS],
  );
  const completed = new Set(applied.rows.map((row) => row.migration_name));
  const missing = REQUIRED_MIGRATIONS.filter((migration) => !completed.has(migration));
  if (missing.length) throw new Error(`Apply ${missing.join(", ")} to the isolated database before verification.`);
}

function deployIsolated(target) {
  if (!fs.existsSync(path.join(ROOT, "prisma", "migrations", MIGRATION_NAME, "migration.sql"))) {
    throw new Error(`The integration migration ${MIGRATION_NAME} is not ready.`);
  }
  const previousDirect = process.env.DIRECT_URL;
  process.env.DIRECT_URL = target.toString();
  try { deployMigrations(target); }
  finally {
    if (previousDirect === undefined) delete process.env.DIRECT_URL;
    else process.env.DIRECT_URL = previousDirect;
  }
}

function readPrivateFixture() {
  const value = JSON.parse(fs.readFileSync(PRIVATE_PATH, "utf8"));
  if (value.database !== DATABASE_NAME || value.source !== FIXTURE_SOURCE || typeof value.password !== "string" || !value.authSecret) {
    throw new Error("Private fixture metadata is missing or belongs to another target.");
  }
  return value;
}

function childEnvironment(target, fixture) {
  return {
    ...process.env,
    DATABASE_URL: target.toString(),
    DIRECT_URL: target.toString(),
    NEXTAUTH_URL: BASE_URL,
    NEXT_PUBLIC_BASE_URL: BASE_URL,
    NEXT_DIST_DIR: DIST_DIR,
    AUTH_SECRET: fixture.authSecret,
    NEXTAUTH_SECRET: fixture.authSecret,
    MODERN_MODULES_LOCAL_VERIFICATION: "1",
  };
}

function runNode(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, env, stdio: "inherit", shell: false, windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Verification child exited with code ${code ?? "signal"}.`)));
  });
}

async function seed() {
  await withTarget(async (client, target) => {
    await assertMigration(client);
    const counts = await client.query('SELECT count(*)::int AS count FROM "organizations"');
    if (counts.rows[0].count !== 0) throw new Error("Fixture seeding requires the newly created empty isolated database; existing data will not be replaced.");
    if (fs.existsSync(PRIVATE_PATH)) throw new Error("Private fixture metadata already exists; inspect the prior run before attempting a new seed.");
    const argon2 = require("argon2");
    const { PrismaClient } = require("@prisma/client");
    const password = crypto.randomBytes(24).toString("base64url");
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const prisma = new PrismaClient({ datasources: { db: { url: target.toString() } } });
    try {
      await prisma.$transaction(async (tx) => {
        for (const fixture of FIXTURES) {
          const now = new Date();
          await tx.organization.create({ data: {
            id: fixture.organizationId, name: `Stoquify verification · ${fixture.key}`, slug: `modules-${fixture.key.replaceAll("_", "-")}`,
            industry: "Synthetic isolated verification", country: "Cameroon", countryCode: "CM", currency: "XAF",
            timezone: "Africa/Douala", defaultLocale: fixture.locale.toUpperCase(), requestedModules: [],
            onboardingSource: FIXTURE_SOURCE, onboardingCompletedAt: now, isActive: true,
          } });
          const role = await tx.role.create({ data: {
            organizationId: fixture.organizationId, code: "MODULES_LOCAL_ADMIN", nameEn: "Module verification administrator",
            nameFr: "Administrateur de vérification des modules", description: "Test authority in this isolated fixture only.", permissions: ADMIN_PERMISSIONS,
          } });
          await createUser(tx, fixture, role.id, passwordHash);
          if (fixture.grants) {
            await tx.tenantModuleConfiguration.create({ data: {
              organizationId: fixture.organizationId, revision: 0,
              selectedModules: fixture.active.filter((slug) => !CORE.includes(slug)), activeModules: fixture.active,
              manifestHash: crypto.createHash("sha256").update(`synthetic-fixture:${fixture.key}`).digest("hex"),
            } });
            await tx.tenantModuleGrant.createMany({ data: fixture.grants.map((moduleSlug) => ({
              organizationId: fixture.organizationId, moduleSlug, status: "active", source: "manual_override",
              metadata: { synthetic: true, source: FIXTURE_SOURCE, liveCustomerApproval: false },
            })) });
          }
        }
        const fixture = FIXTURES[0];
        const role = await tx.role.create({ data: {
          organizationId: fixture.organizationId, code: "MODULES_LOCAL_DENIED", nameEn: "Employee without module administration",
          nameFr: "Employé sans administration des modules", permissions: ["dashboard.read"],
        } });
        await createUser(tx, { ...fixture, userId: "usr_modules_denied", email: "denied@modern-modules.stockflow.test" }, role.id, passwordHash);
      }, { timeout: 30000 });
      fs.mkdirSync(path.dirname(PRIVATE_PATH), { recursive: true });
      fs.writeFileSync(PRIVATE_PATH, `${JSON.stringify({
        source: FIXTURE_SOURCE, database: DATABASE_NAME, password, authSecret: crypto.randomBytes(48).toString("base64url"),
        createdAt: new Date().toISOString(), fixtures: FIXTURES.map(({ key, organizationId, email }) => ({ key, organizationId, email })),
      }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    } finally { await prisma.$disconnect(); }
    console.log(JSON.stringify({ action: "seeded", database: DATABASE_NAME, organizations: FIXTURES.length, users: FIXTURES.length + 1, sessionsCreated: 0, synthetic: true, productionEvidence: false }));
  });
}

async function createUser(tx, fixture, roleId, passwordHash) {
  await tx.user.create({ data: {
    id: fixture.userId, email: fixture.email, name: "Module verification user", firstName: "Module", lastName: "Verifier",
    password: passwordHash, emailVerified: true, isVerified: true, isActive: true, isLocked: false,
    preferredLocale: fixture.locale.toUpperCase(), organizationId: fixture.organizationId, roles: { connect: { id: roleId } },
  } });
  await tx.account.create({ data: { accountId: fixture.userId, providerId: "credential", userId: fixture.userId, password: passwordHash } });
}

async function main(command = process.argv[2]) {
  if (!["create", "migrate", "seed", "start", "test", "status"].includes(command) || process.argv.length > 3) {
    throw new Error("Usage: node scripts/modern-modules-local-verification.js create|migrate|seed|start|test|status");
  }
  process.chdir(ROOT);
  if (command === "create") {
    const target = targetUrl();
    if (!fs.existsSync(path.join(ROOT, "prisma", "migrations", MIGRATION_NAME, "migration.sql"))) {
      throw new Error(`The integration migration ${MIGRATION_NAME} is not ready.`);
    }
    await createNewDatabase(target, DATABASE_NAME);
    deployIsolated(target);
    console.log(JSON.stringify({ action: "created_and_migrated", database: DATABASE_NAME }));
    return;
  }
  if (command === "migrate") {
    await withTarget(async (_client, target) => deployIsolated(target));
    return;
  }
  if (command === "seed") return seed();
  await withTarget(async (client, target) => {
    await assertMigration(client);
    const organizations = await client.query('SELECT id, "onboardingSource" FROM "organizations"');
    if (command === "status") {
      console.log(JSON.stringify({ database: DATABASE_NAME, migrationReady: true, completedMigrations: REQUIRED_MIGRATIONS, fixtureCount: organizations.rowCount, exclusivelyOwned: organizations.rows.every((row) => row.onboardingSource === FIXTURE_SOURCE), baseURL: BASE_URL }));
      return;
    }
    if (organizations.rowCount !== FIXTURES.length || organizations.rows.some((row) => row.onboardingSource !== FIXTURE_SOURCE || !FIXTURES.some((fixture) => fixture.organizationId === row.id))) {
      throw new Error("Isolated fixture ownership/count check failed; refusing to start or test.");
    }
    const env = childEnvironment(target, readPrivateFixture());
    if (command === "start") {
      await runNode([path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "dev", "-H", "127.0.0.1", "-p", "3107"], env);
    } else {
      const args = [path.join(ROOT, "node_modules", "@playwright", "test", "cli.js"), "test", "--config=playwright.modern-modules.config.ts"];
      if (env.MODERN_MODULES_TEST_PROJECT) {
        if (!["desktop-en", "mobile-fr"].includes(env.MODERN_MODULES_TEST_PROJECT)) throw new Error("Unknown isolated browser project.");
        args.push("--project", env.MODERN_MODULES_TEST_PROJECT);
      }
      if (env.MODERN_MODULES_TEST_GREP) args.push("--grep", env.MODERN_MODULES_TEST_GREP);
      await runNode(args, env);
    }
  });
}

if (require.main === module) main().catch((error) => {
  // Never print connection strings, Prisma invocation arguments or credential data.
  console.error(error.code ? `Local verification failed (${error.code}).` : String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]"));
  process.exitCode = 1;
});

module.exports = { DATABASE_NAME, BASE_URL, DIST_DIR, FIXTURE_SOURCE, PRIVATE_PATH, EVIDENCE_DIR, FIXTURES, CORE, REQUIRED_MIGRATIONS, targetUrl, readPrivateFixture, main };
