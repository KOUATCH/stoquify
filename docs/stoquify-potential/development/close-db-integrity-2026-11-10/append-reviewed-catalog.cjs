// Reviewed catalog append only. Reads source/SQL/private validation receipts;
// writes the existing catalog and one new admission. No DB/app/CLI/network.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalog = require(path.join(root, 'scripts/prisma-migration-catalog-gate.js'));
const { scanMigrationRisks } = require(path.join(root, 'scripts/prisma-production-migration-gate.js'));
function main() {
  assert.equal(process.argv.length, 3); const approvedSqlSha256 = process.argv[2]; assert.match(approvedSqlSha256, /^[a-f0-9]{64}$/);
  const output = path.join(__dirname, 'CATALOG_ADMISSION.json'); assert(!fs.existsSync(output), 'Existing catalog admission is preserved');
  const name = '20261110190000_close_scope_integrity', sqlFile = path.join(root, 'prisma/migrations', name, 'migration.sql');
  assert.equal(digest(sqlFile), approvedSqlSha256, 'Reviewed SQL changed');
  const baselineFile = path.join(__dirname, 'BASELINE_122_CATALOG.json'), baseline = read(baselineFile);
  assert.equal(baseline.migrationCount, 122); assert.equal(baseline.catalogSha256, 'e894a828415592f4c2ab155993b1923ed12245374a21b0184ae8a375495190aa');
  const currentFile = path.join(root, 'prisma/migration-catalog-manifest.json'); assert.deepEqual(read(currentFile), baseline, 'Unexpected catalog edits');
  const clientReceiptFile = path.join(__dirname, 'pg-PRIVATE_CLIENT.json'), client = read(clientReceiptFile);
  assert(client.passed && client.sharedClientUnchanged && client.rootGeneration === false); assert.equal(digest(path.join(root, 'prisma/schema.prisma')), client.sourceSchemaSha256);
  assert.deepEqual(client.validations.map(item => [item.command, item.exitCode]), [['validate', 0], ['generate', 0]]);
  const next = catalog.buildManifest(root); assert.equal(next.migrationCount, 123); assert.deepEqual(next.migrations.slice(0, 122), baseline.migrations); assert.equal(next.migrations[122].name, name);
  for (const migration of baseline.migrations) assert.equal(digest(path.join(root, migration.path)), migration.rawSha256, 'Historical migration changed');
  const risk = scanMigrationRisks(root, { migrationNames: [name] });
  assert.equal(risk.findings.length, 0, 'Lexical migration risks require explicit review');
  catalog.writeManifest(root); const validation = catalog.validateManifest(root); assert.equal(validation.status, 'ready'); assert.deepEqual(read(currentFile), next);
  const report = { passed: true, checkedAt: new Date().toISOString(), previousCount: 122, currentCount: 123, previousCatalogSha256: baseline.catalogSha256, currentCatalogSha256: next.catalogSha256,
    historicalSqlAndCatalogPrefixUnchanged: true, newMigration: name, newMigrationRawSha256: approvedSqlSha256,
    sourceSchemaSha256: client.sourceSchemaSha256, privateClientReceipt: { path: clientReceiptFile, sha256: digest(clientReceiptFile) }, baseline: { path: baselineFile, sha256: digest(baselineFile) },
    catalogFileSha256: digest(currentFile), lexicalRiskFindings: [],
    reviewedOperationalRisks: ['Nine-table ACCESS EXCLUSIVE cohort requires a planned writer-quiescence window.', 'Five-second lock timeout and transactional rollback bound failed lock acquisition; index/validation work still needs target-scale timing.',
      'Legacy scope mismatches abort before indexes/constraints; no records are rewritten or removed.', 'Additional constraints and identity guards require old-writer/deletion/cascade/retention compatibility proof.', 'An automatic lexical scan does not classify constraint tightening or certify production readiness.'],
    rootClientGenerated: false, databaseContacted: false, productionApproved: false, runnerSha256: digest(__filename) };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: true, currentCount: 123, catalogSha256: next.catalogSha256, evidenceFile: output }));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
