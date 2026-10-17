// Inspected local-only rehearsal: new DBs, real migrations/pg_dump/pg_restore,
// synthetic fixtures and loopback HTTP. Retains targets; never resets a DB.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { sourceTarget } = require('./s12-target.cjs');
const { createNewDatabase } = require('./prisma-local-fresh-bootstrap.js');
const { runRestoreRehearsal } = require('./prisma-local-restore-rehearsal.js');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function profileAll(url) {
  const client = new Client({ connectionString: url }); await client.connect();
  try {
    const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const result = [];
    for (const { tablename } of tables) {
      const quoted = '"' + tablename.replaceAll('"', '""') + '"';
      const { rows } = await client.query(`SELECT count(*)::text AS count, md5(coalesce(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text), '')) AS digest FROM public.${quoted} t`);
      result.push({ table: tablename, ...rows[0] });
    }
    return result;
  } finally { await client.end(); }
}
async function main() {
  const [evidence] = process.argv.slice(2), root = process.cwd();
  assert.ok(evidence && fs.statSync(evidence).isDirectory(), 'Existing evidence directory required');
  const suffix = crypto.randomBytes(5).toString('hex'), date = new Date().toISOString().slice(0,10).replaceAll('-', '');
  const sourceName = `stoquify_pos_audit_${date}_${suffix}`, restoreName = `stoquify_restore_s12_${date}_${suffix}`;
  const source = sourceTarget(sourceName), restored = new URL(source); restored.pathname = '/' + restoreName;
  const prefix = path.join(evidence, suffix);
  const report = { sourceName, restoreName, productionTouched: false, sourceClass: 'New synthetic S12 fixture only', startedAt: new Date().toISOString(), checks: [] };
    const envFor = (url, name) => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key))), NODE_ENV: 'test', DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), SHADOW_DATABASE_URL: url.toString(), RUN_S12_REHEARSAL: '1', S12_DATABASE_NAME: name, POS_DISPOSABLE_DATABASE_NAME: name, S12_FIXTURE: prefix + '-fixture.json', S12_RESULT: prefix + '-operations-detail.json', AUTH_SECRET: 'synthetic-s12-auth-secret-not-used-outside-local-rehearsal', NEXTAUTH_URL: 'http://localhost:3000', NEXT_PUBLIC_BASE_URL: 'http://localhost:3000', NEXT_TELEMETRY_DISABLED: '1' });
  function command(args, env, label, timeout = 300000) {
    const started = performance.now();
    const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 8e6, timeout, windowsHide: true });
    fs.writeFileSync(prefix + '-' + label + '.log', ((result.stdout || '') + (result.stderr || '')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]'), { flag: 'wx' });
    report.checks.push({ label, exitCode: result.status, elapsedMs: Math.round(performance.now() - started) });
    console.log(`${label}: exit ${result.status}`);
    assert.equal(result.status, 0, label + ': ' + (result.error?.code || 'failed'));
    return result;
  }
  const jest = (file, env, label) => command(['node_modules/jest/bin/jest.js', '--config', 'jest.s12.config.cjs', '--runInBand', '--no-cache', '--runTestsByPath', file, '--json', '--outputFile=' + prefix + '-' + label + '.json'], env, label);
  try {
    // Catalog is fixed before replay and compared again at completion.
    const migrationFiles = fs.readdirSync('prisma/migrations').filter(n => fs.existsSync(`prisma/migrations/${n}/migration.sql`)).sort();
    report.migrations = migrationFiles.map(name => ({ name, sha256: hash(fs.readFileSync(`prisma/migrations/${name}/migration.sql`)) }));
    // Other chats may edit the shared datamodel. Both sides of the restore
    // comparison must use the same bytes, not two different points in time.
    const frozen = path.join(root, '.codex-tmp', 's12-' + suffix, 'prisma');
    fs.mkdirSync(frozen, { recursive: true });
    fs.copyFileSync('prisma/schema.prisma', path.join(frozen, 'schema.prisma'));
    fs.cpSync('prisma/migrations', path.join(frozen, 'migrations'), { recursive: true });
    report.frozenDatamodelSha256 = hash(fs.readFileSync(path.join(frozen, 'schema.prisma')));
    await createNewDatabase(source, sourceName);
    command(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', path.join(frozen, 'schema.prisma')], envFor(source, sourceName), 'fresh-replay');
    jest('tests/s12/seed.postgres.test.ts', envFor(source, sourceName), 'seed');
    const before = await profileAll(source.toString());
    const restoreStart = performance.now();
    const restoredReport = await runRestoreRehearsal({ root, databaseName: restoreName, out: prefix + '-restore.md', jsonOut: prefix + '-restore.json', pgBin: 'C:\\Program Files\\PostgreSQL\\17\\bin', retainDatabase: true }, {
      loadDatabaseUrl: () => source.toString(), nodeEnv: 'test',
      runSchemaDiff: (_root, url) => {
        const name = new URL(url).pathname.slice(1), label = name === sourceName ? 'source-schema-diff' : 'restored-schema-diff';
        assert.ok([sourceName, restoreName].includes(name));
        return command(['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-schema-datasource', path.join(frozen, 'schema.prisma'), '--to-schema-datamodel', path.join(frozen, 'schema.prisma'), '--script'], envFor(new URL(url), name), label).stdout.replace(/\r\n/g, '\n');
      },
    });
    report.restoreElapsedMs = Math.round(performance.now() - restoreStart);
    assert.equal(restoredReport.ready, true, 'Structural restore failed');
    const afterSource = await profileAll(source.toString()), afterRestore = await profileAll(restored.toString());
    assert.deepEqual(afterSource, before, 'Read-only backup changed source');
    assert.deepEqual(afterRestore, before, 'Restored contents differ');
    report.contentComparison = { allPublicTables: before.length, matched: true, sourceUnchanged: true, nonemptyTables: before.filter(x => x.count !== '0').length };
    fs.writeFileSync(prefix + '-table-profiles.json', JSON.stringify(before, null, 2), { flag: 'wx' });
    jest('tests/s12/operations.postgres.test.ts', envFor(restored, restoreName), 'operations');
    command(['--conditions=react-server', '-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register', 'scripts/s12-auth-probe.ts'], { ...envFor(restored, restoreName), TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' }) }, 'auth');
    assert.deepEqual(migrationFiles, fs.readdirSync('prisma/migrations').filter(n => fs.existsSync(`prisma/migrations/${n}/migration.sql`)).sort(), 'Catalog changed during rehearsal');
    for (const row of report.migrations) assert.equal(hash(fs.readFileSync(`prisma/migrations/${row.name}/migration.sql`)), row.sha256);
    report.currentDatamodelMatchesFrozen = report.frozenDatamodelSha256 === hash(fs.readFileSync('prisma/schema.prisma'));
    report.localRehearsalPassed = true;
  } finally {
    report.completedAt = new Date().toISOString();
    report.releaseReady = false;
    report.limits = ['Synthetic local restore is not deployed PITR/retention or achieved RPO/RTO', 'Current production alert receiver, provider deduplication and required-check policy unverified', 'S06-S11 gates remain open'];
    fs.writeFileSync(prefix + '-rehearsal.json', JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log('Evidence: ' + prefix + '-rehearsal.json');
  }
}
if (require.main === module) main().catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g, '[REDACTED_DATABASE_URL]')); process.exitCode = 1; });
module.exports = { profileAll };
