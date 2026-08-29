#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HASH_CONTRACT = Object.freeze({
  version: "stoquify-migration-sql-sha256-v1",
  approvalIdentity: "canonicalLfSha256",
  transportIdentity: "rawSha256",
  encoding: "UTF-8",
  canonicalization:
    "Decode as UTF-8, normalize CRLF and lone CR line endings to LF, preserve every other byte represented by the decoded text, then SHA-256 hash the UTF-8 result.",
});
const MANIFEST_PATH = "prisma/migration-catalog-manifest.json";
const EXCEPTIONS_PATH = "prisma/migration-catalog-exceptions.json";
const MIGRATION_NAME_PATTERN = /^\d{14}_[a-z0-9_]+$/;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalLf(value) {
  return String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function canonicalCrlf(value) {
  return canonicalLf(value).replace(/\n/g, "\r\n");
}

function migrationHashRecord(target) {
  const bytes = fs.readFileSync(target);
  const source = bytes.toString("utf8");
  return {
    byteLength: bytes.length,
    rawSha256: sha256(bytes),
    canonicalLfSha256: sha256(canonicalLf(source)),
    canonicalCrlfSha256: sha256(canonicalCrlf(source)),
  };
}

function buildCatalog(root = process.cwd()) {
  const migrationsRoot = path.join(root, "prisma", "migrations");
  if (!fs.existsSync(migrationsRoot)) return [];
  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const migrationFile = path.join(migrationsRoot, entry.name, "migration.sql");
      const exists = fs.existsSync(migrationFile);
      return {
        name: entry.name,
        timestamp: entry.name.slice(0, 14),
        path: `prisma/migrations/${entry.name}/migration.sql`,
        exists,
        ...(exists ? migrationHashRecord(migrationFile) : {}),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildManifest(root = process.cwd()) {
  const migrations = buildCatalog(root).map(({ exists: _exists, ...entry }) => entry);
  return {
    schemaVersion: 1,
    hashContract: HASH_CONTRACT,
    catalogSha256: sha256(JSON.stringify(migrations)),
    migrationCount: migrations.length,
    migrations,
  };
}

function readJson(target, fallback) {
  if (!fs.existsSync(target)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    return null;
  }
}

function readExceptions(root = process.cwd()) {
  const parsed = readJson(path.join(root, EXCEPTIONS_PATH), {
    schemaVersion: 1,
    duplicateTimestampGroups: [],
  });
  if (!parsed) {
    return { valid: false, groups: [], errors: ["exceptions_unparseable"] };
  }
  const groups = Array.isArray(parsed.duplicateTimestampGroups)
    ? parsed.duplicateTimestampGroups
    : [];
  const errors = [];
  if (parsed.schemaVersion !== 1) errors.push("exceptions_schema_version");
  for (const group of groups) {
    if (
      !group ||
      !/^\d{14}$/.test(String(group.timestamp || "")) ||
      !Array.isArray(group.migrations) ||
      group.migrations.length < 2 ||
      !group.migrations.every((name) => MIGRATION_NAME_PATTERN.test(name)) ||
      typeof group.reason !== "string" ||
      !group.reason.trim()
    ) {
      errors.push("exceptions_entry_invalid");
    }
  }
  return { valid: errors.length === 0, groups, errors: [...new Set(errors)] };
}

function sameNames(left, right) {
  return (
    left.length === right.length &&
    [...left].sort().every((name, index) => name === [...right].sort()[index])
  );
}

function duplicateTimestampFindings(catalog, exceptions) {
  const grouped = new Map();
  for (const migration of catalog) {
    const names = grouped.get(migration.timestamp) || [];
    names.push(migration.name);
    grouped.set(migration.timestamp, names);
  }
  return [...grouped.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([timestamp, migrations]) => {
      const exception = exceptions.groups.find(
        (candidate) =>
          candidate.timestamp === timestamp &&
          sameNames(candidate.migrations, migrations),
      );
      return {
        timestamp,
        migrations: [...migrations].sort(),
        grandfathered: Boolean(exception),
        reason: exception?.reason || null,
      };
    });
}

function validateManifest(root = process.cwd()) {
  const catalog = buildCatalog(root);
  const manifestTarget = path.join(root, MANIFEST_PATH);
  const manifest = readJson(manifestTarget, undefined);
  const exceptions = readExceptions(root);
  const errors = [...exceptions.errors];

  if (!manifest) errors.push(fs.existsSync(manifestTarget) ? "manifest_unparseable" : "manifest_missing");
  if (catalog.length === 0) errors.push("migration_catalog_empty");
  for (const migration of catalog) {
    if (!MIGRATION_NAME_PATTERN.test(migration.name)) errors.push("migration_name_invalid");
    if (!migration.exists) errors.push("migration_sql_missing");
    if (migration.exists && migration.byteLength === 0) errors.push("migration_sql_empty");
  }

  const duplicates = duplicateTimestampFindings(catalog, exceptions);
  if (duplicates.some((finding) => !finding.grandfathered)) {
    errors.push("duplicate_migration_timestamp_not_grandfathered");
  }

  const liveManifest = buildManifest(root);
  const manifestNames = new Set(manifest?.migrations?.map((entry) => entry.name) || []);
  const liveNames = new Set(liveManifest.migrations.map((entry) => entry.name));
  const unmanifested = liveManifest.migrations
    .filter((entry) => !manifestNames.has(entry.name))
    .map((entry) => entry.name);
  const missingFromCatalog = (manifest?.migrations || [])
    .filter((entry) => !liveNames.has(entry.name))
    .map((entry) => entry.name);
  const changed = liveManifest.migrations
    .filter((entry) => manifestNames.has(entry.name))
    .filter((entry) => {
      const expected = manifest.migrations.find((candidate) => candidate.name === entry.name);
      return (
        expected.path !== entry.path ||
        expected.byteLength !== entry.byteLength ||
        expected.rawSha256 !== entry.rawSha256 ||
        expected.canonicalLfSha256 !== entry.canonicalLfSha256 ||
        expected.canonicalCrlfSha256 !== entry.canonicalCrlfSha256
      );
    })
    .map((entry) => entry.name);

  if (manifest) {
    if (manifest.schemaVersion !== 1) errors.push("manifest_schema_version");
    if (manifest.hashContract?.version !== HASH_CONTRACT.version) errors.push("manifest_hash_contract_version");
    if (manifest.hashContract?.approvalIdentity !== HASH_CONTRACT.approvalIdentity) errors.push("manifest_approval_identity");
    if (manifest.catalogSha256 !== liveManifest.catalogSha256) errors.push("manifest_catalog_hash_mismatch");
    if (manifest.migrationCount !== liveManifest.migrationCount) errors.push("manifest_migration_count_mismatch");
  }
  if (unmanifested.length) errors.push("unmanifested_migration");
  if (missingFromCatalog.length) errors.push("manifested_migration_missing");
  if (changed.length) errors.push("manifested_migration_changed");

  return {
    generatedAt: new Date().toISOString(),
    status: errors.length ? "blocked" : "ready",
    hashContract: HASH_CONTRACT,
    migrationCount: catalog.length,
    manifestPresent: Boolean(manifest),
    manifestSha256: manifest ? sha256(JSON.stringify(manifest)) : null,
    catalogSha256: liveManifest.catalogSha256,
    unmanifested,
    missingFromCatalog,
    changed,
    duplicateTimestamps: duplicates,
    errors: [...new Set(errors)],
    secretValuePrinted: false,
  };
}

function writeManifest(root = process.cwd()) {
  const target = path.join(root, MANIFEST_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(buildManifest(root), null, 2) + "\n", "utf8");
  return target;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = { root: process.cwd(), mode: "fail", out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") options.root = path.resolve(argv[++index]);
    else if (value === "--mode") options.mode = argv[++index];
    else if (value === "--out") options.out = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!["report", "fail", "write"].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }
  return options;
}

function main() {
  const options = parseArgs();
  if (options.mode === "write") writeManifest(options.root);
  const report = validateManifest(options.root);
  const output = JSON.stringify(report, null, 2) + "\n";
  if (options.out) {
    const target = path.resolve(options.root, options.out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, output, "utf8");
  }
  process.stdout.write(output);
  if (options.mode === "fail" && report.status !== "ready") process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  EXCEPTIONS_PATH,
  HASH_CONTRACT,
  MANIFEST_PATH,
  buildCatalog,
  buildManifest,
  canonicalCrlf,
  canonicalLf,
  duplicateTimestampFindings,
  migrationHashRecord,
  parseArgs,
  sha256,
  validateManifest,
  writeManifest,
};
