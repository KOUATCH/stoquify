// Cleanup of the exact owned cluster only. Other client backends block shutdown.
const { spawnSync } = require('node:child_process');
const net = require('node:net');
const { fs, path, assert, own, target, receipt, connect } = require('./database-common.cjs');
const mode = process.argv[2];
assert(['inspect', 'stop'].includes(mode));
assert.equal(process.argv.length, 3);
const run = 'resume-20261102-r3';
const ownerFile = path.join(own, 'cluster-owner.json');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  ['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC'].includes(key.toUpperCase())));
const report = { at: new Date().toISOString(), mode, run, passed: false, stopped: false,
  cluster: target.cluster, host: target.host, port: target.port,
  connectionEvidence: 'Connection metadata only; no SQL text, application data or environment inspected.',
  admissionLimit: 'Two current client inventories, not a reservation against a new client connecting afterward.' };
function status() {
  return spawnSync(path.join(target.bin, 'pg_ctl.exe'), ['-D', target.cluster, 'status'],
    { env, windowsHide: true, stdio: 'ignore', timeout: 10000 }).status;
}
function bindOwner() {
  const owner = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
  assert.equal(owner.exclusiveOwner, 'qualification_database_r3');
  assert.equal(owner.run, run); assert.equal(owner.state, 'running');
  assert.equal(owner.cluster, target.cluster); assert.equal(owner.port, target.port);
  assert.equal(fs.realpathSync(target.cluster).toLowerCase(), path.resolve(target.cluster).toLowerCase());
  assert.equal(fs.readFileSync(path.join(target.cluster, 'PG_VERSION'), 'utf8').trim(), '17');
  const lines = fs.readFileSync(path.join(target.cluster, 'postmaster.pid'), 'utf8').split(/\r?\n/);
  assert.equal(Number(lines[0]), owner.postmasterPid);
  assert.equal(fs.realpathSync(lines[1]).toLowerCase(), fs.realpathSync(target.cluster).toLowerCase());
  assert.equal(Number(lines[3]), target.port);
  const startedAt = Number(lines[2]) * 1000;
  assert(Number.isFinite(startedAt) && startedAt >= Date.parse(owner.startedAt) - 5000 && startedAt <= Date.now());
  assert.equal(status(), 0);
  return owner;
}
async function main() {
  const owner = bindOwner(); report.postmasterPid = owner.postmasterPid;
  // No PID-only fallback here: unknown client state must block normal shutdown.
  const client = await connect('postgres');
  try {
    const inventory = async () => (await client.query(`
      SELECT pid, datname AS database, application_name AS application,
        client_addr::text AS address, usename AS role, state
      FROM pg_stat_activity
      WHERE backend_type = 'client backend' AND pid <> pg_backend_pid()
      ORDER BY pid`)).rows;
    report.clients = await inventory();
    report.clientCount = report.clients.length;
    assert.equal(report.clientCount, 0, 'Other client backends remain; shutdown refused');
    report.finalClients = await inventory();
    report.finalClientCount = report.finalClients.length;
    assert.equal(report.finalClientCount, 0, 'Other client backends appeared; shutdown refused');
  } finally { await client.end(); }
  assert.deepEqual(bindOwner(), owner, 'Cluster ownership changed during client inspection');
  if (mode === 'stop') {
    const log = path.join(own, run + '-guarded-stop-' + Date.now() + '.log');
    const fd = fs.openSync(log, 'wx'); let result;
    try {
      result = spawnSync(path.join(target.bin, 'pg_ctl.exe'),
        ['-D', target.cluster, '-m', 'fast', '-t', '60', '-w', 'stop'],
        { env, windowsHide: true, stdio: ['ignore', fd, fd], timeout: 75000 });
    } finally { fs.closeSync(fd); }
    report.control = { exitCode: result.status, errorCode: result.error?.code, log };
    assert(!result.error && result.status === 0, 'Owned database shutdown did not complete');
    assert.equal(status(), 3);
    await new Promise((resolve, reject) => {
      const probe = net.createServer(); probe.once('error', reject);
      probe.listen(target.port, target.host, () => probe.close(resolve));
    });
    owner.state = 'stopped'; owner.stoppedAt = new Date().toISOString();
    fs.writeFileSync(ownerFile, JSON.stringify(owner, null, 2));
    report.stopped = true; report.portAvailable = true;
    report.databasesRetained = [target.build, target.full];
  }
  report.passed = true;
}
main().catch(error => { report.error = String(error.message).slice(0, 1000); process.exitCode = 1; })
  .finally(() => {
    report.finishedAt = new Date().toISOString();
    const name = run + '-guarded-' + mode + '-' + Date.now();
    receipt(name, report);
    console.log(JSON.stringify({ passed: report.passed, stopped: report.stopped,
      clientCount: report.clientCount, finalClientCount: report.finalClientCount,
      error: report.error, evidence: name + '.json' }));
  });
