"use strict";

// Verification only: direct Next build, unique output, read-only synthetic DB.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../..");
const { targetUrl, DATABASE_NAME, BASE_URL, readPrivateFixture } = require(path.join(ROOT, "scripts/modern-modules-local-verification"));
const { runDirectNextBuild } = require(path.join(ROOT, "scripts/build-app-safe"));
const { PrismaClient } = require(path.join(ROOT, "node_modules/@prisma/client"));
const DIST = ".next-modern-modules-build-run02";
const RAW = path.join(ROOT, "playwright/.auth/modern-modules-build-run02-validated.log");
const OUT = path.join(__dirname, "evidence");
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex");
const binding = () => {
  const old = JSON.parse(fs.readFileSync(path.join(ROOT, "what-next/modern-modules-integration/2026-09-05-run-01/evidence/source-binding.json"), "utf8"));
  const sources = old.sources || old.files || [];
  const files = Array.isArray(sources) ? sources.map((value) => typeof value === "string" ? value : value.path || value.file) : Object.keys(sources);
  const extra = ["components/finance/FinanceCommandCenterDashboard.tsx", "next.config.mjs", "tsconfig.json", "next-env.d.ts", "prisma/schema.prisma", "package.json", "package-lock.json", "services/modules/module-operational-dependencies.ts", "app/[locale]/(dashboard)/dashboard/accounting/journals/new/page.tsx", "app/[locale]/(dashboard)/dashboard/accounting/journals/new/ManualJournalDraftForm.tsx"];
  return Object.fromEntries([...new Set([...files.filter(Boolean), ...extra.filter(file => fs.existsSync(path.join(ROOT, file)))])].map((file) => [file, hash(file)]));
};

async function main() {
  if (fs.existsSync(RAW)) throw new Error("This isolated build output already exists; preserve it and choose a new recorded attempt.");
  const target = targetUrl();
  target.searchParams.set("options", "-c default_transaction_read_only=on");
  const fixture = readPrivateFixture();
  const client = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
  try {
    const rows = await client.$queryRawUnsafe("SELECT current_database() AS name, current_setting('transaction_read_only') AS readonly, current_setting('default_transaction_read_only') AS default_readonly");
    if (rows[0]?.name !== DATABASE_NAME || rows[0]?.readonly !== "on" || rows[0]?.default_readonly !== "on") throw new Error("Prisma did not verify the exact read-only synthetic target.");
  } finally { await client.$disconnect(); }

  // Keep process/runtime settings, suppress unrelated provider credentials.
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(PATH|PATHEXT|SystemRoot|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|COMMONPROGRAMFILES|HOMEDRIVE|HOMEPATH|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)) env[key] = value;
  }
  for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    const absolute = path.join(ROOT, file);
    if (!fs.existsSync(absolute)) continue;
    for (const match of fs.readFileSync(absolute, "utf8").matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) env[match[1]] = "";
  }
  Object.assign(env, {
    NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", NEXT_DIST_DIR: DIST,
    // Installed Next's config-shared.js computes max(1, CIRCLE_NODE_TOTAL - 1).
    // Bound build page workers on this memory-constrained local machine.
    CIRCLE_NODE_TOTAL: "2",
    DATABASE_URL: target.toString(), DIRECT_URL: target.toString(),
    AUTH_SECRET: fixture.authSecret, NEXTAUTH_SECRET: fixture.authSecret,
    NEXTAUTH_URL: BASE_URL, NEXT_PUBLIC_BASE_URL: BASE_URL, NEXT_PUBLIC_APP_URL: BASE_URL,
    MODERN_MODULES_LOCAL_VERIFICATION: "1",
  });
  fs.mkdirSync(OUT, { recursive: true });
  const startedAt = new Date().toISOString();
  const before = binding();
  const originalTsconfig = fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf8");
  const originalNextEnv = fs.readFileSync(path.join(ROOT, "next-env.d.ts"), "utf8");
  fs.writeFileSync(path.join(OUT, "isolated-build-validated-start.json"), JSON.stringify({ startedAt, database: DATABASE_NAME, readOnlyVerifiedByPrisma: true, output: DIST, command: "node node_modules/next/dist/bin/next build", migrationOrSeedInvoked: false, unrelatedProviderCredentialsInherited: false, sources: before }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: "started", startedAt, database: DATABASE_NAME, readOnly: true, output: DIST }));
  const descriptor = fs.openSync(RAW, "wx", 0o600);
  let result;
  try { result = await runDirectNextBuild({ root: ROOT, env, timeoutMs: 30 * 60 * 1000, stdio: ["ignore", descriptor, descriptor] }); }
  finally { fs.closeSync(descriptor); }
  let log = fs.readFileSync(RAW, "utf8");
  for (const secret of [target.toString(), fixture.password, fixture.authSecret, decodeURIComponent(target.password)].filter(Boolean)) log = log.split(secret).join("[redacted]");
  log = log.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[redacted-database-url]");
  fs.writeFileSync(path.join(OUT, "isolated-build-validated.log"), log, { flag: "wx" });
  const generatedConfigRestoration = [];
  const restore = (relative, value) => {
    const file = path.join(ROOT, relative);
    const adjacent = file + ".build-verification-new";
    fs.writeFileSync(adjacent, value, { flag: "wx" });
    fs.renameSync(adjacent, file);
    generatedConfigRestoration.push(relative);
  };
  const tsconfigNow = fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf8");
  if (tsconfigNow !== originalTsconfig) {
    const parsed = JSON.parse(tsconfigNow);
    parsed.include = parsed.include.filter(value => value !== `${DIST}/types/**/*.ts`);
    if (JSON.stringify(parsed) === JSON.stringify(JSON.parse(originalTsconfig))) restore("tsconfig.json", originalTsconfig);
  }
  const nextEnvNow = fs.readFileSync(path.join(ROOT, "next-env.d.ts"), "utf8");
  if (nextEnvNow !== originalNextEnv) {
    const routeReference = /\/\/\/ <reference path="[^"\r\n]*\/types\/routes\.d\.ts"\s*\/?>\r?\n/g;
    if (nextEnvNow.replace(routeReference, "") === originalNextEnv.replace(routeReference, "")) restore("next-env.d.ts", originalNextEnv);
  }
  const after = binding();
  const changedDuringBuild = Object.keys(before).filter((file) => before[file] !== after[file]);
  const receipt = { startedAt, finishedAt: new Date().toISOString(), database: DATABASE_NAME, readOnlyVerifiedByPrisma: true, command: "node node_modules/next/dist/bin/next build", output: DIST, pageWorkers: 1, reusedIsolatedCache: true, generatedConfigRestoration, ...result, changedDuringBuild, sourcesBefore: before, sourcesAfter: after, productionReleaseEvidence: false };
  fs.writeFileSync(path.join(OUT, "isolated-build-validated-receipt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: result.timedOut ? "timed-out" : result.exitCode === 0 ? "passed" : "failed", exitCode: result.exitCode, changedDuringBuild, receipt: "evidence/isolated-build-validated-receipt.json" }));
  process.exitCode = result.exitCode === 0 && !result.timedOut ? 0 : 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
