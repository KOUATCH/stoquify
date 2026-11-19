// Mocked control-flow tests only. No database connection, port bind, process termination or private fixture access.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const root = path.resolve('E:/isolated-fixture-root'), storage = path.resolve('D:/p04-r06-fullapp-20261110-r3');
const databaseStorage = path.resolve('D:/p04-r06-fullapp-20261110-r2'), own = path.join(storage, 'private');
const ownerPath = path.join(databaseStorage, 'private/cluster-owner.json');
const target = { cluster: path.join(databaseStorage, 'postgres'), port: 55517, build: 'stoquify_local_p04r06_20261110_build_r3', full: 'stoquify_local_p04r06_20261110_full_r3', bin: 'C:/Program Files/PostgreSQL/17/bin' };
const baseline = { build: 'stoquify_local_p04r06_20261110_build_r2', full: 'stoquify_local_p04r06_20261110_full_r2' };

function guardHarness(options = {}) {
  const context = { root, storage, databaseStorage, databasePort: target.port, candidateId: 'p04-r06-r3-test', databaseTargets: { build: target.build, full: target.full }, baselineDatabaseTargets: { build: baseline.build, full: baseline.full } };
  const owner = { root, storage: databaseStorage, cluster: target.cluster, port: target.port, state: 'running', activeQualification: '20261110-r3', activeCandidateId: context.candidateId, activeDatabaseTargets: context.databaseTargets, preservedBaselineDatabaseTargets: context.baselineDatabaseTargets, ownedPid: 4242 };
  if (options.wrongTargets) owner.activeDatabaseTargets = { build: baseline.build, full: baseline.full };
  const preparation = { passed: true, baselineUnchanged: true, candidateId: context.candidateId, target: { ownedPid: 4242 }, postmasterIdentity: { pid: 4242, cluster: target.cluster, port: target.port, fileStartEpoch: 1700000000, nativeStartEpoch: 1700000000.25, matched: true } };
  const files = new Map(), key = name => path.resolve(name);
  const put = (name, value) => files.set(key(name), Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)));
  put(path.resolve(__dirname, '../candidate-context.json'), context); put(path.join(__dirname, 'preparation.json'), preparation); put(ownerPath, owner);
  const pidPath = path.join(target.cluster, 'postmaster.pid');
  put(pidPath, ['4242', target.cluster, options.reusedPid ? '1700000001' : '1700000000', '55517', ''].join('\n'));
  let starts = 0;
  const fakeFs = {
    readFileSync: name => { assert(files.has(key(name)), 'Unexpected mock read: ' + name); return files.get(key(name)); },
    realpathSync: name => path.resolve(name), existsSync: name => files.has(key(name)),
    writeFileSync: (name, bytes, opts) => { if (opts?.flag === 'wx') assert(!files.has(key(name))); put(name, bytes); },
    openSync: () => 99, closeSync: () => {},
  };
  // readFileSync must honor the encoding requested by the actual pidfile parser.
  const rawRead = fakeFs.readFileSync;
  fakeFs.readFileSync = (name, encoding) => encoding ? rawRead(name).toString(encoding) : rawRead(name);
  const common = { fs: fakeFs, path, assert, root, storage, databaseStorage, ownerPath, own, target, baseline, hash,
    connect: async () => ({ query: async sql => sql.includes('pg_stat_activity') ? { rows: options.otherClient ? [{ pid: 99 }] : [] } : { rows: [{ started: options.nativeMismatch ? 1700000000.5 : 1700000000.25 }] }, end: async () => {} }) };
  const exported = {};
  const contextVm = { module: { exports: exported }, __dirname, Buffer, process: { kill: () => { const error = new Error('absent'); error.code = 'ESRCH'; throw error; } },
    require: name => {
      if (name === './database-common.cjs') return common;
      if (name === 'node:child_process') return { spawnSync: () => { starts++; files.delete(key(pidPath)); return { status: 0, signal: null }; } };
      if (name === 'node:net') return { createServer: () => ({ once() { return this; }, listen(port, host, done) { queueMicrotask(done); }, close(done) { queueMicrotask(done); } }) };
      throw new Error('Unmocked module: ' + name);
    } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'lifecycle-guards.cjs'), 'utf8'), contextVm, { filename: 'lifecycle-guards.cjs' });
  return { api: contextVm.module.exports, terminationCount: () => starts };
}

async function runShutdown(file, options = {}) {
  const calls = { stops: 0, queries: [], guard: 0 }, fakeProcess = { argv: ['node', file], exitCode: 0 };
  let result;
  const guard = { context: { candidateId: 'p04-r06-r3-test' }, preparationSha256: 'prepared', preparation: { baselineAfter: {} } };
  const common = { path, assert, target, hash, quote: value => '"' + value + '"',
    fs: { existsSync: name => options.runtimeStarted && name.endsWith('execution-started.json'), readFileSync: () => {
      if (options.missingCleanup) throw new Error('Cleanup receipt unavailable');
      return Buffer.from(JSON.stringify({ passed: true, candidateId: guard.context.candidateId, database: target.full }));
    } },
    receipt: (name, value) => { result = JSON.parse(JSON.stringify(value)); },
    checkMigrations: async () => { if (options.migrationFailure) throw new Error('New database inspection failed'); return { count: 123 }; },
    connect: async () => ({
      query: async sql => {
        calls.queries.push(sql);
        if (options.sessionFailure && sql.includes('FROM sessions')) throw new Error('Session count unavailable');
        if (sql.includes('pg_tables')) return { rows: [{ tablename: 'sessions' }, { tablename: 'users' }] };
        if (sql.includes('count(*)')) return { rows: [{ n: 0 }] };
        return { rows: [] };
      }, end: async () => {},
    }),
  };
  const lifecycle = { packet: path.resolve(__dirname, '..'), assertReviewed: () => {},
    guardCurrentCluster: async () => { calls.guard++; if (options.wrongOwner) throw new Error('Owner mismatch'); return guard; },
    stopOwnedCluster: async (received, label, report) => { assert.equal(received, guard); calls.stops++; Object.assign(report, { clusterStopped: true, launcherCompletedCleanly: true }); },
  };
  const baselineApi = { inspectBaseline: async () => { if (options.baselineFailure) throw new Error('Old baseline differs'); return {}; }, assertBaselineUnchanged: () => {} };
  const contextVm = { __dirname, process: fakeProcess, console: { log() {} },
    require: name => { if (name === './database-common.cjs') return common; if (name === './lifecycle-guards.cjs') return lifecycle; if (name === './baseline-snapshot.cjs') return baselineApi; throw new Error('Unmocked module: ' + name); } };
  await vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), contextVm, { filename: file });
  assert(result); return { report: result, calls, exitCode: fakeProcess.exitCode };
}

test('accepted preparation start identity permits owned shutdown', async () => { const h = guardHarness(); const guard = await h.api.guardCurrentCluster(); const report = {}; await h.api.stopOwnedCluster(guard, 'test', report); assert.equal(h.terminationCount(), 1); assert.equal(report.clusterStopped, true); });
test('PID reuse with a changed start epoch is denied before termination', async () => { const h = guardHarness({ reusedPid: true }); await assert.rejects(h.api.guardCurrentCluster(), /accepted preparation/); assert.equal(h.terminationCount(), 0); });
test('native start drift is denied despite matching PID file seconds', async () => { const h = guardHarness({ nativeMismatch: true }); await assert.rejects(h.api.guardCurrentCluster(), /accepted preparation/); assert.equal(h.terminationCount(), 0); });
test('old baseline cannot masquerade as the active write targets', async () => { const h = guardHarness({ wrongTargets: true }); await assert.rejects(h.api.guardCurrentCluster()); assert.equal(h.terminationCount(), 0); });
test('unexpected connected client prevents termination', async () => { const h = guardHarness({ otherClient: true }); const guard = await h.api.guardCurrentCluster(); await assert.rejects(h.api.stopOwnedCluster(guard, 'test', {}), /unexpected clients/); assert.equal(h.terminationCount(), 0); });
test('normal shutdown retains failed session-query evidence while stopping owned cluster', async () => { const r = await runShutdown('stop.cjs', { sessionFailure: true }); assert.equal(r.calls.stops, 1); assert.equal(r.report.passed, false); assert.equal(r.report.clusterStopped, true); assert.equal(r.exitCode, 1); });
test('normal shutdown retains missing cleanup evidence while stopping owned cluster', async () => { const r = await runShutdown('stop.cjs', { missingCleanup: true }); assert.equal(r.calls.stops, 1); assert.equal(r.report.passed, false); assert.match(r.report.cleanupReceiptError, /unavailable/); });
test('prequalification shutdown retains failed database inspection without deleting rows', async () => { const r = await runShutdown('stop-before-qualification.cjs', { migrationFailure: true }); assert.equal(r.calls.stops, 1); assert.equal(r.report.passed, false); assert.equal(r.report.databaseInspectionErrors.length, 2); assert(r.calls.queries.every(sql => !/\b(DELETE|UPDATE|INSERT|CREATE|ALTER|DROP)\b/i.test(sql))); });
test('runtime-start marker prevents the prequalification shutdown path', async () => { const r = await runShutdown('stop-before-qualification.cjs', { runtimeStarted: true }); assert.equal(r.calls.guard, 0); assert.equal(r.calls.stops, 0); assert.equal(r.report.passed, false); });
test('unknown owner never reaches the shutdown operation', async () => { const r = await runShutdown('stop.cjs', { wrongOwner: true }); assert.equal(r.calls.stops, 0); assert.equal(r.report.passed, false); });
test('baseline preservation failure never becomes a qualified cleanup', async () => { const r = await runShutdown('stop.cjs', { baselineFailure: true }); assert.equal(r.calls.stops, 1); assert.equal(r.report.baselineUnchanged, false); assert.equal(r.report.passed, false); });
