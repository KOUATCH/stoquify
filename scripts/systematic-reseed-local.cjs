#!/usr/bin/env node
// Local-only orchestration. Secrets and database backups stay in .seed-artifacts.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { Client } = require('pg');
require('dotenv').config({ quiet: true });

const ROOT = path.resolve(__dirname, '..');
const RUN = '2026-09-27-systematic-1500';
const OUT = path.join(ROOT, 'what-next', 'database-reseed', RUN);
const PRIVATE = path.join(ROOT, '.seed-artifacts', RUN);
const CANDIDATE = 'stoquify_reseed_local_20260927_1500';
const PG_BIN = process.env.AQSTOQFLOW_PG_BIN || 'C:\\Program Files\\PostgreSQL\\17\\bin';
const q = name => '"' + name.replaceAll('"', '""') + '"';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const save = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); };
function sourceUrl() {
  const raw = process.env.DATABASE_URL || '';
  const url = new URL(raw.replace(/\$\{([^}]+)\}/g, (_, key) => process.env[key] || ''));
  if (process.env.NODE_ENV === 'production' || !['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/(dev|test|local|replay|disposable)/i.test(url.pathname)) throw new Error('An explicitly local development database is required.');
  return url;
}
function candidateUrl() { const url = sourceUrl(); url.pathname = '/' + CANDIDATE; return url; }
function envFor(url) {
  return { ...process.env, PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), DATABASE_URL: url.toString() };
}
async function connect(url) { const c = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000, statement_timeout: 120000, application_name: 'stoquify_systematic_reseed' }); await c.connect(); return c; }
function binary(name, args, url) {
  const result = spawnSync(path.join(PG_BIN, name + '.exe'), args, { cwd: ROOT, env: envFor(url), encoding: 'utf8', windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${name} failed: ${(result.error?.message || result.stderr || '').replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED_URL]')}`);
}
async function profile(url, label) {
  const c = await connect(url);
  try {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tables = (await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => r.tablename);
    const counts = [];
    for (const table of tables) counts.push({ table, count: Number((await c.query(`SELECT count(*)::text AS count FROM public.${q(table)}`)).rows[0].count) });
    const preserve = {};
    const identityTables = ['organizations', 'users', 'roles', 'locations', 'customers', 'suppliers', 'items', 'payroll_employees', 'accounts', '_UserRoles'];
    const fields = new Set(['id','name','nameEn','nameFr','firstName','lastName','displayName','email','code','slug','sku','organizationId','userId','employeeId','locationId','managerId','permissions','isActive','isDisabled','isVerified','emailVerified','isLocked','lockReason','lockedUntil','twoFactorEnabled','isTwoFactorEnabled','twoFactorSecret','requestedModules','deletedAt','password','providerId','accountId','A','B']);
    for (const table of identityTables.filter(t => tables.includes(t))) {
      const cols = (await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table])).rows.map(r=>r.column_name).filter(x=>fields.has(x));
      if (cols.length) preserve[table] = (await c.query(`SELECT ${cols.map(q).join(',')} FROM public.${q(table)} ORDER BY ${cols.includes('id') ? q('id') : cols.map(q).join(',')}`)).rows;
    }
    save(path.join(PRIVATE, label + '-preservation.json'), preserve);
    const history = (await c.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations ORDER BY migration_name')).rows;
    const stock = (await c.query(`SELECT i.id, i."organizationId", i."nameEn", i."trackInventory", i."isActive", i."deletedAt", count(l.id)::int AS levels, coalesce(sum(l."quantityOnHand"),0)::text AS on_hand, coalesce(sum(l."quantityAvailable"),0)::text AS available FROM items i LEFT JOIN inventory_levels l ON l."itemId"=i.id GROUP BY i.id ORDER BY i."organizationId",i.id`)).rows;
    const refs = {};
    for (const table of ['units', 'tax_rates']) refs[table] = (await c.query(`SELECT * FROM public.${q(table)} ORDER BY "organizationId",id`)).rows;
    const summary = { generatedAt: new Date().toISOString(), target: { host: url.hostname, database: url.pathname.slice(1) }, tableCount: tables.length, totalRows: counts.reduce((s,x)=>s+x.count,0), counts, preservation: Object.fromEntries(Object.entries(preserve).map(([t,rows])=>[t,{count:rows.length,sha256:sha(JSON.stringify(rows))}])), migrationCount:history.length, unfinished:history.filter(x=>!x.finished_at&&!x.rolled_back_at).map(x=>x.migration_name), stock: { items:stock.length, below1500:stock.filter(x=>Number(x.on_hand)<1500).length, missingLevels:stock.filter(x=>!x.levels).length, minimum:Math.min(...stock.map(x=>Number(x.on_hand))) } };
    save(path.join(OUT, label + '-profile.json'), summary);
    save(path.join(OUT, label + '-stock.json'), stock);
    save(path.join(OUT, label + '-reference-data.json'), refs);
    await c.query('ROLLBACK');
    return summary;
  } finally { await c.end(); }
}
async function backupRestore() {
  fs.mkdirSync(PRIVATE, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
  const source = sourceUrl(); const candidate = candidateUrl();
  const dump = path.join(PRIVATE, 'source-before.dump');
  if (fs.existsSync(dump)) throw new Error('Backup exists; refusing to overwrite the original recovery point.');
  const baseline = await profile(source, 'baseline');
  binary('pg_dump', ['--format=custom','--no-owner','--no-privileges','--file='+dump], source);
  binary('pg_restore', ['--list',dump], source);
  const adminUrl = new URL(source); adminUrl.pathname = '/postgres';
  const admin = await connect(adminUrl);
  try {
    if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[CANDIDATE])).rowCount) throw new Error('Candidate already exists; refusing to replace it.');
    await admin.query(`CREATE DATABASE ${q(CANDIDATE)}`);
  } finally { await admin.end(); }
  binary('pg_restore', ['--exit-on-error','--no-owner','--no-privileges','--dbname='+CANDIDATE,dump], candidate);
  const restored = await profile(candidate,'restored');
  const report = { generatedAt:new Date().toISOString(), source:baseline.target, candidate:restored.target, dumpBytes:fs.statSync(dump).size, dumpSha256:sha(fs.readFileSync(dump)), tableCountsMatch:JSON.stringify(baseline.counts)===JSON.stringify(restored.counts), preservedIdentityMatches:JSON.stringify(baseline.preservation)===JSON.stringify(restored.preservation), backupRetained:true, originalDatabaseRetained:true };
  save(path.join(OUT,'backup-restore.json'),report);
  console.log(JSON.stringify(report,null,2));
  if (!report.tableCountsMatch || !report.preservedIdentityMatches) throw new Error('Restore comparison differs; investigate concurrent source writes before proceeding.');
}
async function main() {
  const mode=process.argv[2];
  if(mode==='backup') return backupRestore();
  if(mode==='profile') { const candidate=process.argv.includes('--candidate'); const label=process.argv[3]&&!process.argv[3].startsWith('--') ? process.argv[3] : 'current'; const p=await profile(candidate?candidateUrl():sourceUrl(),label); console.log(JSON.stringify({target:p.target,tableCount:p.tableCount,totalRows:p.totalRows,stock:p.stock},null,2)); return; }
  throw new Error('Usage: node scripts/systematic-reseed-local.cjs backup | profile [label] [--candidate]');
}
if(require.main===module) main().catch(e=>{ console.error(e.message.replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_URL]')); process.exitCode=1; });
module.exports={ROOT,RUN,OUT,PRIVATE,CANDIDATE,sourceUrl,candidateUrl,envFor,connect,profile,save,binary};
