// Shared exact-target checks for this local qualification's preflight and shutdown only.
const { fs, path, assert, root, storage, databaseStorage, ownerPath, own, target, baseline, hash, connect } = require('./database-common.cjs');
const { spawnSync } = require('node:child_process');
const net = require('node:net');
const packet = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(file));
function assertReviewed() {
  const admission = read(path.join(packet, 'independent-review/DATABASE-CURRENT-RECIPE-ADMISSION.json'));
  assert.equal(admission.passed, true);
  for (const item of admission.files) assert.equal(hash(fs.readFileSync(path.resolve(packet, item.path))), item.sha256, item.path);
}
function pidIdentity() {
  const rows = fs.readFileSync(path.join(target.cluster, 'postmaster.pid'), 'utf8').split(/\r?\n/);
  const pid = Number(rows[0]), startedAt = Number(rows[2]) * 1000;
  assert(Number.isInteger(pid) && pid > 0 && Number.isFinite(startedAt) && startedAt > 0);
  assert.equal(fs.realpathSync(rows[1]).toLowerCase(), fs.realpathSync(target.cluster).toLowerCase());
  assert.equal(Number(rows[3]), target.port);
  return { pid, startedAt };
}
async function guardCurrentCluster() {
  const context = read(path.join(packet, 'candidate-context.json'));
  const preparationBytes = fs.readFileSync(path.join(__dirname, 'preparation.json'));
  const preparation = JSON.parse(preparationBytes), ownerBytes = fs.readFileSync(ownerPath), owner = JSON.parse(ownerBytes);
  assert(preparation.passed && preparation.baselineUnchanged);
  assert.equal(context.root, root); assert.equal(context.storage, storage); assert.equal(context.databaseStorage, databaseStorage);
  assert.equal(context.databasePort, target.port); assert.equal(preparation.candidateId, context.candidateId);
  const active = { build: target.build, full: target.full }, preserved = { build: baseline.build, full: baseline.full };
  assert.deepEqual(context.databaseTargets, active); assert.deepEqual(context.baselineDatabaseTargets, preserved);
  assert.equal(owner.root, root); assert.equal(owner.storage, databaseStorage); assert.equal(owner.cluster, target.cluster);
  assert.equal(owner.port, target.port); assert.equal(owner.state, 'running'); assert.equal(owner.activeQualification, '20261110-r3');
  assert.equal(owner.activeCandidateId, context.candidateId); assert.deepEqual(owner.activeDatabaseTargets, active);
  assert.deepEqual(owner.preservedBaselineDatabaseTargets, preserved);
  const identity = pidIdentity(); assert.equal(identity.pid, owner.ownedPid); assert.equal(identity.pid, preparation.target.ownedPid);
  const acceptedIdentity = preparation.postmasterIdentity;
  assert.equal(acceptedIdentity.matched, true); assert.equal(acceptedIdentity.pid, identity.pid);
  assert.equal(acceptedIdentity.cluster, target.cluster); assert.equal(acceptedIdentity.port, target.port);
  assert.equal(identity.startedAt, acceptedIdentity.fileStartEpoch * 1000, 'Postmaster differs from accepted preparation');
  const client = await connect('postgres');
  try {
    const native = Number((await client.query('SELECT extract(epoch from pg_postmaster_start_time()) AS started')).rows[0].started);
    assert(Math.abs(native * 1000 - identity.startedAt) < 1000, 'Native postmaster start identity differs');
    assert.equal(native, acceptedIdentity.nativeStartEpoch, 'Native postmaster differs from accepted preparation');
  } finally { await client.end(); }
  return { context, preparation, preparationSha256: hash(preparationBytes), owner, ownerSha256: hash(ownerBytes), nativeStartEpoch: acceptedIdentity.nativeStartEpoch, ...identity };
}
async function freePort(host) {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(target.port, host, resolve); });
  await new Promise(resolve => server.close(resolve));
  return { host, port: target.port, free: true };
}
async function stopOwnedCluster(guard, label, report) {
  assert(/^[a-z0-9-]+$/.test(label));
  assert.equal(hash(fs.readFileSync(ownerPath)), guard.ownerSha256, 'Owner changed before stop');
  assert.deepEqual(pidIdentity(), { pid: guard.pid, startedAt: guard.startedAt });
  const client = await connect('postgres');
  try {
    assert.equal(Number((await client.query('SELECT extract(epoch from pg_postmaster_start_time()) AS started')).rows[0].started), guard.nativeStartEpoch);
    report.remainingClients = (await client.query("SELECT pid,datname,application_name,state FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid() ORDER BY pid")).rows;
    assert.equal(report.remainingClients.length, 0, 'Preserve unexpected clients');
  } finally { await client.end(); }
  assert.deepEqual(pidIdentity(), { pid: guard.pid, startedAt: guard.startedAt });
  fs.writeFileSync(path.join(__dirname, 'cluster-owner-before-' + label + '-stop.json'), fs.readFileSync(ownerPath), { flag: 'wx' });
  const fd = fs.openSync(path.join(own, label + '-stop.log'), 'wx');
  let stopped;
  try { stopped = spawnSync(path.join(target.bin, 'pg_ctl.exe'), ['-D', target.cluster, '-m', 'fast', '-w', 'stop'], { windowsHide: true, timeout: 30000, stdio: ['ignore', fd, fd] }); }
  finally { fs.closeSync(fd); }
  report.stopCommand = { exitCode: stopped.status, signal: stopped.signal, error: stopped.error?.message, errorCode: stopped.error?.code };
  report.launcherCompletedCleanly = stopped.status === 0 && !stopped.error;
  report.postmasterFileAbsent = !fs.existsSync(path.join(target.cluster, 'postmaster.pid'));
  report.ownedPidAbsent = false;
  try { process.kill(guard.pid, 0); } catch (error) { if (error.code === 'ESRCH') report.ownedPidAbsent = true; else report.pidInspectionError = error.code; }
  report.ports = [];
  for (const host of ['127.0.0.1', 'localhost']) {
    try { report.ports.push(await freePort(host)); } catch (error) { report.ports.push({ host, port: target.port, free: false, error: error.code || error.message }); }
  }
  report.portReleased = report.ports.every(row => row.free);
  report.clusterStopped = report.postmasterFileAbsent && report.ownedPidAbsent && report.portReleased;
  report.ownedPid = guard.pid;
  report.databasesRetained = [baseline.build, baseline.full, target.build, target.full];
  if (report.clusterStopped) fs.writeFileSync(ownerPath, JSON.stringify({ ...guard.owner, state: 'stopped', stoppedAt: new Date().toISOString(), stoppedFor: label }, null, 2));
  assert(report.clusterStopped, 'Owned cluster stop is not fully observed; preserve diagnostics');
  assert(report.launcherCompletedCleanly, 'Stop observed but launcher outcome requires reconciliation');
}
module.exports = { packet, read, assertReviewed, guardCurrentCluster, stopOwnedCluster };
