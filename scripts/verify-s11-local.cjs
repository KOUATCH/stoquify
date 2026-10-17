// Disposable-only rehearsal. Creates two NEW localhost databases; never resets/drops a DB.
// Uses the real migration catalog and real Next compiler; does not invoke remote promotion.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { resolveTarget } = require('./s04-s05-target.cjs');
const { createNewDatabase } = require('./prisma-local-fresh-bootstrap.js');
const { prepare, verify, filesUnder } = require('./release-artifact.cjs');
const { withMigrationLock } = require('./promote-release-schema.cjs');
const fixtureBuild = require('./s11-fixture-build.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const root = process.cwd();
const clean = value => String(value || '').replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]');
async function main() {
  const [evidence] = process.argv.slice(2);
  if (!evidence || !fs.statSync(evidence).isDirectory()) throw new Error('Existing evidence directory required');
  const suffix = crypto.randomBytes(5).toString('hex');
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const freshName = `stoquify_pos_audit_${stamp}_${suffix}01`, upgradeName = `stoquify_pos_audit_${stamp}_${suffix}02`;
  const fresh = resolveTarget(freshName), upgrade = resolveTarget(upgradeName);
  const fixture = path.join(root, '.codex-tmp', 's11-' + suffix);
  fs.mkdirSync(fixture, { recursive: false });
  const report = { fixture, freshName, upgradeName, productionTouched: false, checks: [] };
  const prismaCli = path.join(root, 'node_modules/prisma/build/index.js');
  const migrations = fs.readdirSync('prisma/migrations').filter(name => fs.existsSync(path.join('prisma/migrations', name, 'migration.sql'))).sort();
  const additive = migrations.at(-1);
  if (additive !== '20261004130000_purchase_order_authoring') throw new Error('Re-review the upgrade boundary after catalog changes');
  const schemaRoot = path.join(fixture, 'upgrade/prisma');
  fs.mkdirSync(path.join(schemaRoot, 'migrations'), { recursive: true });
  fs.copyFileSync('prisma/schema.prisma', path.join(schemaRoot, 'schema.prisma'));
  fs.copyFileSync('prisma/migrations/migration_lock.toml', path.join(schemaRoot, 'migrations/migration_lock.toml'));
  for (const name of migrations.slice(0, -1)) fs.cpSync(path.join(root, 'prisma/migrations', name), path.join(schemaRoot, 'migrations', name), { recursive: true, errorOnExist: true });
  const migrate = (url, schema, label) => {
    const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), SHADOW_DATABASE_URL: url.toString() };
    const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', schema], { cwd: fixture, env, encoding: 'utf8', timeout: 240000, maxBuffer: 10e6, windowsHide: true });
    fs.writeFileSync(path.join(evidence, `${suffix}-${label}.log`), clean(result.stdout) + clean(result.stderr), { flag: 'wx' });
    assert.equal(result.status, 0, label + ' failed');
  };
  await createNewDatabase(fresh, freshName);
  migrate(fresh, path.join(root, 'prisma/schema.prisma'), 'fresh-replay');
  await createNewDatabase(upgrade, upgradeName);
  migrate(upgrade, path.join(schemaRoot, 'schema.prisma'), 'previous-catalog');
  const db = new PrismaClient({ datasources: { db: { url: upgrade.toString() } } });
  const client = new Client({ connectionString: upgrade.toString() });
  await client.connect();
  try {
    const org = await db.organization.create({ data: { id: 's11-org', name: 'Synthetic upgrade organization', slug: 's11-' + suffix, currency: 'XAF', requestedModules: [] } });
    await db.user.create({ data: { id: 's11-user', email: suffix + '@upgrade.invalid', organizationId: org.id, firstName: 'Old', lastName: 'Client', mfaBackupCodes: [] } });
    const oldRead = () => client.query('SELECT id,"organizationId","firstName","lastName" FROM users WHERE id=$1', ['s11-user']).then(r => r.rows);
    const beforeRows = await oldRead();
    const schemaFingerprint = async () => hash(JSON.stringify((await client.query("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows));
    const beforeSchema = await schemaFingerprint();

    // Run a real failed Next compilation with only disposable credentials and synthetic fixture source.
    const app = path.join(fixture, 'app-fixture');
    fs.mkdirSync(path.join(app, 'app'), { recursive: true }); fs.mkdirSync(path.join(app, 'public'));
    fs.writeFileSync(path.join(app, 'public/probe.txt'), 's11-local-only');
    fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 's11-local-compiler-fixture', private: true }));
    fixtureBuild.configure(root, app);
    fs.writeFileSync(path.join(app, 'app/layout.js'), "export default function Layout({children}) { return <html lang='en'><body>{children}</body></html> }");
    fs.writeFileSync(path.join(app, 'app/page.js'), 'export default function Page( {');
    const fixtureIdentity = () => ['package.json', 'next.config.js', 'app/layout.js', 'app/page.js', 'public/probe.txt'].map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(app, file))) }));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key)));
    Object.assign(env, { NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: upgrade.toString() });
    let buildNumber = 0;
    const compile = async () => {
      const result = fixtureBuild.compile(root, app, env);
      fs.writeFileSync(path.join(evidence, `${suffix}-compile-${++buildNumber}.log`), clean(result.stdout) + clean(result.stderr), { flag: 'wx' });
      if (result.status !== 0) throw new Error('Fixture compilation failed');
    };
    const artifact = path.join(fixture, 'artifact');
    await assert.rejects(prepare(app, artifact, { sourceIdentity: fixtureIdentity, runScript: compile, env }), /compilation failed/);
    assert.equal(fs.existsSync(artifact), false);
    assert.equal(await schemaFingerprint(), beforeSchema); assert.deepEqual(await oldRead(), beforeRows);
    report.checks.push('Failed real Next compilation produced no artifact and left deployment-target schema/data unchanged');
    fs.writeFileSync(path.join(app, 'app/page.js'), "export default function Page() { return <main>S11 local compiler fixture</main> }");
    const sealed = await prepare(app, artifact, { sourceIdentity: fixtureIdentity, runScript: compile, env });
    verify(app, artifact, sealed.sha256, { sourceIdentity: fixtureIdentity });
    report.artifact = { ...sealed, sourceClass: 'Real Next standalone fixture; not the full Stoquify application' };
    assert.equal(await schemaFingerprint(), beforeSchema);

    // Hold one session lock, reject a second migration owner, then prove release after failure.
    let release, entered;
    const ready = new Promise(resolve => { entered = resolve });
    const held = withMigrationLock(new Client({ connectionString: upgrade.toString() }), async () => { entered(); await new Promise(resolve => { release = resolve }); });
    await ready;
    try { await assert.rejects(withMigrationLock(new Client({ connectionString: upgrade.toString() }), async () => { throw new Error('Contender must never run'); }), /already running/); }
    finally { release(); await held; }
    await assert.rejects(withMigrationLock(new Client({ connectionString: upgrade.toString() }), async () => { throw new Error('injected migration failure'); }), /injected/);
    await withMigrationLock(new Client({ connectionString: upgrade.toString() }), async () => 'reacquired');
    report.checks.push('Real PostgreSQL advisory lock excludes concurrent promotion and releases after failure');

    fs.cpSync(path.join(root, 'prisma/migrations', additive), path.join(schemaRoot, 'migrations', additive), { recursive: true, errorOnExist: true });
    await withMigrationLock(new Client({ connectionString: upgrade.toString() }), async () => migrate(upgrade, path.join(schemaRoot, 'schema.prisma'), 'populated-upgrade'));
    assert.deepEqual(await oldRead(), beforeRows);
    await db.purchaseOrderAuthoringDraft.create({ data: { id: 's11-draft', organizationId: org.id, actorId: 's11-user', title: 'Synthetic draft', content: {}, lastSaveHash: 'a'.repeat(64) } });
    await client.query('UPDATE users SET "firstName"=$1 WHERE id=$2', ['Old client after upgrade', 's11-user']);
    assert.equal((await oldRead())[0].firstName, 'Old client after upgrade');
    assert.equal(await db.purchaseOrderAuthoringDraft.count({ where: { id: 's11-draft' } }), 1);
    report.checks.push('Populated additive upgrade preserves legacy rows and old SQL read/write shape after new-table writes (bounded code-rollback compatibility)');
    for (const [label, url] of [['fresh', fresh], ['upgrade', upgrade]]) {
      const probe = new Client({ connectionString: url.toString() }); await probe.connect();
      try {
        const rows = (await probe.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
        assert.deepEqual(rows.map(row => row.migration_name), migrations);
        for (const row of rows) { assert.ok(row.finished_at && !row.rolled_back_at); assert.equal(row.checksum, hash(fs.readFileSync(path.join(root, 'prisma/migrations', row.migration_name, 'migration.sql')))); }
        report[label + 'Migrations'] = { count: rows.length, checksumsMatch: true };
      } finally { await probe.end(); }
    }
    report.checks.push('Fresh replay and populated upgrade both match every current migration checksum');
    fs.writeFileSync(path.join(evidence, `${suffix}-local-rehearsal.json`), JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(report));
  } finally { await db.$disconnect(); await client.end(); }
}
main().catch(error => { console.error(clean(error.message)); process.exitCode = 1; });
