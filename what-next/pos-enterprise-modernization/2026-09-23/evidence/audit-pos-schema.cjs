const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { Prisma } = require('@prisma/client');
const dotenv = require('dotenv');
let env = { ...process.env };
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) env = { ...dotenv.parse(fs.readFileSync(file)), ...env };
(async () => {
  const record = JSON.parse(fs.readFileSync(path.join(__dirname, 'postgres-target.json'), 'utf8'));
  const raw = (env.DATABASE_URL || env.DIRECT_URL || '').replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => env[key] || '').replace(/^["']|["']$/g, '').trim();
  const source = new URL(raw);
  if (source.hostname !== 'localhost' || record.host !== 'localhost' || source.pathname !== `/${record.sourceDatabase}` || !/^stoquify_pos_audit_\d{8}_[a-f0-9]+$/.test(record.disposableDatabase)) throw new Error('Unexpected local schema audit target');
  const names = new Set(['LedgerPostingBatch', 'JournalEntry', 'JournalEntryLine', 'AccountingSourceLink', 'LedgerAuditEvent', 'InventoryLevel', 'InventoryTransaction', 'CustomerLedgerEntry', 'CustomerReceivableDocument', 'CustomerReceivableDocumentState', 'BusinessEvent', 'BusinessEventOutbox', 'POSCheckoutWorkspace', 'POSCommitResult', 'SalesOrder', 'SalesOrderLine', 'POSSession', 'CashDrawer', 'CashDrawerTransaction', 'PostingRule', 'PostingRuleLine', 'ChartOfAccount', 'FiscalYear', 'AccountingPeriod', 'TenantModuleConfiguration', 'TenantModuleGrant', 'Item', 'Customer', 'Location', 'POSStation']);
  const models = Prisma.dmmf.datamodel.models.filter(model => names.has(model.name));
  const tables = models.map(model => model.dbName || model.name);
  const results = [];
  for (const database of [record.sourceDatabase, record.disposableDatabase]) {
    const client = new Client({ host: source.hostname, port: Number(source.port || 5432), user: decodeURIComponent(source.username), password: decodeURIComponent(source.password), database });
    await client.connect();
    try {
      await client.query('BEGIN READ ONLY');
      const observed = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[])", [tables]);
      const columns = new Set(observed.rows.map(row => `${row.table_name}.${row.column_name}`));
      const missing = models.flatMap(model => model.fields.filter(field => field.kind !== 'object' && !columns.has(`${model.dbName || model.name}.${field.dbName || field.name}`)).map(field => ({ model: model.name, table: model.dbName || model.name, column: field.dbName || field.name })));
      results.push({ database, checkedModels: models.length, missingColumns: missing });
      await client.query('ROLLBACK');
    } finally { await client.end(); }
  }
  fs.writeFileSync(path.join(__dirname, 'pos-schema-column-audit.json'), JSON.stringify({ checkedAt: new Date().toISOString(), method: 'read-only information_schema comparison against generated Prisma scalar/enum columns; no record reads or writes, indexes and enum values not certified', results }, null, 2));
  console.log(JSON.stringify(results));
})().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connection redacted]')); process.exitCode = 1; });
