// Source-only, one-entry catalog update. No database or child process access.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.cwd();
const catalog = require(path.join(root, 'scripts/prisma-migration-catalog-gate.js'));
const safety = require(path.join(root, 'scripts/prisma-production-migration-gate.js'));
const evidence = 'what-next/workflow-modernization/2026-09-05-run-01/evidence';
const baselinePath = `${evidence}/fractional-zero-credit-migration-before-2026-10-01.json`;
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const manifestFile = 'prisma/migration-catalog-manifest.json';
const name = '20260930231500_supplier_credit_zero_value_evidence';
const migrationFile = `prisma/migrations/${name}/migration.sql`;
for (const row of baseline.files) {
  assert.equal(catalog.sha256(Buffer.from(row.content, 'utf8')), row.sha256, `Invalid retained bytes: ${row.file}`);
  assert.equal(catalog.sha256(fs.readFileSync(row.file)), row.sha256, `Changed since snapshot: ${row.file}`);
}
const before = JSON.parse(baseline.files.find(row => row.file === manifestFile).content);
const next = catalog.buildManifest(root);
const added = next.migrations.filter(row => !before.migrations.some(old => old.name === row.name));
assert.deepEqual(added.map(row => row.name), [name]);
assert.equal(next.migrations.length, before.migrations.length + 1);
for (const old of before.migrations) assert.deepEqual(next.migrations.find(row => row.name === old.name), old, `Historical catalog changed: ${old.name}`);
const risks = safety.scanMigrationRisks(root, { migrationNames: [name] });
assert.equal(risks.findings.length, 0, 'New migration requires destructive-risk review');
const manifestBytes = JSON.stringify(next, null, 2) + '\n';
fs.writeFileSync(manifestFile, manifestBytes, 'utf8');
const validation = catalog.validateManifest(root);
assert.equal(validation.status, 'ready', JSON.stringify(validation));
const output = `${evidence}/fractional-zero-credit-migration-preparation-2026-10-01.json`;
const report = {
  recordedAt: new Date().toISOString(), scope: 'Prepared source and catalog only; no database applied or connected',
  baseline: { path: baselinePath, sha256: catalog.sha256(fs.readFileSync(baselinePath)) },
  migration: added[0],
  manifest: { file: manifestFile, before: catalog.sha256(Buffer.from(baseline.files.find(row => row.file === manifestFile).content)), after: catalog.sha256(Buffer.from(manifestBytes)), previousEntriesPreserved: before.migrations.length },
  changes: [
    { table: 'supplier_credit_notes', constraint: 'supplier_credit_nonnegative_amounts', before: 'total > 0', after: 'total >= 0', preserved: 'subtotal >= 0 AND taxAmount >= 0 AND subtotal + taxAmount = total' },
    { table: 'supplier_credit_note_lines', constraint: 'supplier_credit_line_nonnegative_amounts', before: 'lineTotal > 0', after: 'lineTotal >= 0', preserved: 'unitCost >= 0 AND taxRate >= 0 AND taxAmount >= 0; separate quantity > 0 check unchanged' }
  ],
  unchanged: ['All prior migration SQL bytes', 'All 89 previous manifest entries', 'Migration exceptions and approval registry', 'Source and reversal validation triggers', 'Append-only UPDATE/DELETE triggers', 'Foreign keys, source uniqueness and tenant references', 'Prisma schema'],
  staticRiskScan: { migrationNames: [name], findings: risks.findings, limitation: 'The repository scanner has no DROP CONSTRAINT risk category; exact CHECK deltas were manually compared above. This is not deployment authorization.' },
  catalogValidation: validation,
  runtime: { databaseApplied: false, databaseTestsRun: false, lockTimeout: '5s', transaction: 'BEGIN/COMMIT; both CHECK replacements succeed or neither does' },
  rollback: {
    policy: 'Prefer reviewed fix-forward. Keep the additive relaxation during application rollback if legitimate zero-value evidence exists. Never remove or modify retained records to make rollback pass.',
    prerequisite: 'In a controlled window, begin a transaction and take ACCESS EXCLUSIVE locks on supplier_credit_notes then supplier_credit_note_lines. Abort if EXISTS(total = 0) OR EXISTS(lineTotal = 0). Keep locks through any reviewed future tightening migration so concurrent zero inserts cannot invalidate the check.',
    allowedOnlyWhen: 'Both zero-row checks are false; review exact > 0 constraint SQL as a NEW migration. Preserve every other clause and all migration history. Any lock timeout or constraint failure rolls back.'
  },
  isolatedApplyControls: [
    'Use the existing owned verification runtime and its exact host/database/organization guard before any DDL; do not use a live customer target or ordinary application build.',
    'Read _prisma_migrations and pg_constraint. Verify predecessor checks and all exact pending migration hashes; if unrelated pending migrations exist, stop and review the pending set rather than letting migrate deploy apply them incidentally.',
    'An isolated restored/scratch database is the only proposed rehearsal target. Parent/operator must explicitly authorize its mutation. Use the repository controlled migration process; do not edit history, use resolve to pretend SQL ran, reset, or seed.',
    'After apply, record successful migration/checksum history and pg_get_constraintdef for both amount checks and the unchanged positive-quantity check. Verify source/append-only triggers remain.',
    'Run source-owned fractional return and reversal fixtures including valid zero credits, negative amount and nonpositive quantity rejection, exact aggregate equality, replay, stock projection and class-3 tie-out. No general deployment or accounting certification follows from local results.'
  ]
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, sha256: catalog.sha256(fs.readFileSync(output)), migration: added[0], catalogStatus: validation.status, historicalEntriesPreserved: before.migrations.length, databaseApplied: false }));
