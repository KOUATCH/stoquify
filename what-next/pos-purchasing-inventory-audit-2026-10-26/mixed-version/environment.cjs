// Read-only target, migration, client and source provenance. No connection details emitted.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { PrismaClient } = require('@prisma/client');
const f = JSON.parse(fs.readFileSync('.codex-tmp/workflow-closure-private.json', 'utf8')), u = new URL(f.url);
if (u.hostname !== 'localhost' || u.pathname !== '/stoquify_pos_audit_20261026_d30f') throw Error('Wrong disposable target');
const db = new PrismaClient({ datasourceUrl: f.url }), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// Compare model/enum declarations ignoring whitespace, comments and declaration order;
// quoted defaults and constraint/field argument order remain significant.
function modelHash(file) {
  const blocks = []; let block;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^\s*(model|enum|type|view)\s+\w+\s*\{/.test(line)) block = { name: line.trim().replace(/\s+/g, ' '), fields: [] };
    else if (block && line.trim() === '}') { block.fields.sort(); blocks.push(block); block = null; }
    else if (block) { const normalized = line.replace(/"(?:\\.|[^"\\])*"|\/\/.*$|\s+/g, token => token.startsWith('"') ? token : ''); if (normalized) block.fields.push(normalized); }
  }
  blocks.sort((a, b) => a.name.localeCompare(b.name));
  return crypto.createHash('sha256').update(JSON.stringify(blocks)).digest('hex');
}
(async () => {
  const target = await db.$queryRawUnsafe('SELECT current_database() AS database, version() AS version');
  const migrations = await db.$queryRawUnsafe('SELECT migration_name, checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
  const matches = migrations.map(m => ({ ...m, sourceMatches: fs.existsSync(path.join('prisma/migrations', m.migration_name, 'migration.sql')) && hash(path.join('prisma/migrations', m.migration_name, 'migration.sql')) === m.checksum }));
  if (matches.some(m => !m.sourceMatches)) throw Error('Applied migration/source mismatch');
  const schemas = ['prisma/schema.prisma', 'node_modules/.prisma/client/schema.prisma', '.codex-tmp/mixed-version-baseline/prisma/schema.prisma', '.codex-tmp/mixed-version-baseline/generated/legacy-client/schema.prisma'].map(file => ({ file, sha256: hash(file), normalizedModelSha256: modelHash(file) }));
  if (schemas[0].normalizedModelSha256 !== schemas[1].normalizedModelSha256 || schemas[2].normalizedModelSha256 !== schemas[3].normalizedModelSha256) throw Error('Generated model declarations differ from source');
  fs.writeFileSync(path.join(__dirname, 'environment.json'), JSON.stringify({ at: new Date().toISOString(), target, migrations: matches, schemas, providerCalls: 0, flags: 'Per isolated process only; no deployed/default flag changes' }, null, 2));
  console.log(JSON.stringify({ database: target[0].database, migrations: matches.length, allAppliedChecksumsMatch: true, rawCurrentSchemaMatch: schemas[0].sha256 === schemas[1].sha256, bothGeneratedModelsMatchSource: true }));
})().catch(e => { console.error(String(e.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[redacted URL]')); process.exitCode = 1; }).finally(() => db.$disconnect());
