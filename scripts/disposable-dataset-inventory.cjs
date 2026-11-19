'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { Prisma } = require('@prisma/client');
const { OUT, NAME, assertManifestTarget } = require('./disposable-business-dataset.cjs');
const quote = name => '"' + name.replaceAll('"', '""') + '"';
// Prisma generation reformats whitespace and moves block attributes after fields.
// Compare each declaration's complete lines, preserving strings and key order.
const canonicalSchema = source => [...source.matchAll(/^(model|enum|generator|datasource)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)]
  .map(([, kind, name, body]) => [kind, name, body.replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*/g, token => token.startsWith('//') ? '' : token).split('\n').map(line => (line.match(/"(?:\\.|[^"\\])*"|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|[^\s]/g) || []).join(' ')).filter(Boolean).sort()])
  .sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !NAME.test(url.pathname.slice(1)) || url.pathname.slice(1) !== manifest.target.database) throw new Error('Owned local target required');
  assertManifestTarget(url,manifest);
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const generated = fs.readFileSync(path.join(path.dirname(require.resolve('.prisma/client/default')), 'schema.prisma'), 'utf8');
  if (JSON.stringify(canonicalSchema(schema)) !== JSON.stringify(canonicalSchema(generated))) throw new Error('Generated client declarations differ from current source; regenerate before inventory');
  const c = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  await c.connect();
  try {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    if ((await c.query('SELECT current_database() AS name')).rows[0].name !== manifest.target.database) throw new Error('Wrong database');
    const tables = (await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x => x.tablename);
    const constraints = (await c.query(`SELECT t.relname AS table_name, con.conname AS name, con.contype AS type, con.convalidated AS validated, con.condeferrable AS deferrable, r.relname AS references_table, pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class t ON t.oid=con.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace LEFT JOIN pg_class r ON r.oid=con.confrelid WHERE n.nspname='public' ORDER BY t.relname,con.conname`)).rows;
    const triggers = (await c.query(`SELECT c.relname AS table_name,t.tgname AS name,t.tgenabled AS enabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`)).rows;
    const models = Prisma.dmmf.datamodel.models;
    const rows = [];
    for (const table of tables) {
      const model = models.find(m => (m.dbName || m.name) === table);
      const count = Number((await c.query(`SELECT count(*)::text AS n FROM public.${quote(table)}`)).rows[0].n);
      const dependencies = constraints.filter(x => x.table_name === table && x.type === 'f').map(x => x.references_table);
      let disposition = count ? 'POPULATED_REQUIRES_SCENARIO_VALIDATION' : 'PENDING_BUSINESS_SCENARIO';
      let reason = 'Requires explicit scenario implementation and independent domain checks.';
      if (table === '_prisma_migrations') { disposition = 'SYSTEM_MANAGED'; reason = 'Created only by migration replay; never seed manually.'; }
      else if (table.startsWith('legacy_')) { disposition = 'INTENTIONALLY_EMPTY'; reason = 'Retained legacy evidence storage; this new database has no migrated legacy evidence.'; }
      else if (['Session','Verification','PasswordHistory','TwoFactorConfirmation'].includes(model?.name) && count === 0) { disposition = 'WORKFLOW_GENERATED'; reason = 'Security lifecycle data must be generated through authentication, not invented.'; }
      rows.push({ table, model: model?.name || null, scope: model?.fields.some(f => f.name === 'organizationId') ? 'tenant' : 'global_or_relation_scoped', count, dependencies: [...new Set(dependencies)].sort(), disposition, reason });
    }
    const missingModels = models.filter(m => !tables.includes(m.dbName || m.name)).map(m => m.name);
    const report = { generatedAt: new Date().toISOString(), database: manifest.target.database, modelCount: models.length, tableCount: tables.length, missingModels, constraints, triggers, rows };
    fs.writeFileSync(path.join(OUT, 'table-inventory.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(OUT, 'table-coverage.md'), '# Table coverage — current execution evidence\n\nNonzero counts are not workflow certification. PENDING entries remain incomplete.\n\n| Table | Model | Rows | Disposition | Dependencies |\n|---|---|---:|---|---|\n' + rows.map(r => `| ${r.table} | ${r.model || '(SQL/join)'} | ${r.count} | ${r.disposition} | ${r.dependencies.join(', ')} |`).join('\n') + '\n');
    await c.query('ROLLBACK');
    console.log(JSON.stringify({ database: report.database, models: models.length, tables: tables.length, missingModels, constraints: constraints.length, triggers: triggers.length, populated: rows.filter(r => r.count > 0).length }));
    if (missingModels.length) throw new Error('Models missing from migrated database');
  } finally { await c.end(); }
}
main().catch(e => { console.error(e.message || e.code); process.exitCode = 1; });
