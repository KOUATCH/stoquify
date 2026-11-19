// Reviewed read-only cleanup reconciliation for one completed attempt.
// Does not start a database, write financial data or replace failed receipts.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), net = require('node:net');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
const attempt = path.join(__dirname, 'pg-attempt-ece011f832');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digest = file => hash(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const pin = file => ({ path: file, sha256: digest(file), bytes: fs.statSync(file).size });
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(key)));
const phases = ['actual-setup-pos-cash-shift', 'assessment-before-schedules', 'assessment-after-schedules', 'actual-independent-schedules-and-ready', 'actual-independent-certification-retention', 'actual-seal-and-reopen', 'assessment-after-correction-before-new-schedules', 'actual-correction-and-historical-recovery', 'assessment-corrected-current', 'actual-recertification-and-reseal'];
const counts = { certifiedExports: 2, periodCloseEvents: 2, periodReopenEvents: 1, journals: 3, providerAccounts: 0, payrollRuns: 0, statutoryCertifiedDocuments: 0 };
async function main() {
  assert.deepEqual(process.argv.slice(2), ['check']);
  const originalFile = path.join(attempt, 'pg-RESULT.json'), original = read(originalFile), originalBinding = pin(originalFile);
  const latestFile = path.join(__dirname, 'pg-LATEST.json'), latestBinding = pin(latestFile);
  assert.equal(digest(latestFile), originalBinding.sha256);
  assert.equal(original.passed, false); assert(!original.failure); assert.equal(original.cleanupFailure, 'pg-stop failed; retained evidence available');
  assert.equal(original.database, 'stoquify_replay_close_earned_20261109_ece011f832');
  const target = read(path.join(attempt, 'pg-TARGET.json'));
  assert.equal(target.port, 58033); assert.equal(target.host, 'localhost'); assert.equal(target.user, 'sales_release_fixture');
  assert.equal(target.directory, path.join(root, '.codex-tmp/sales-release-migrations-20261109-44a94875d5'));
  const identity = read(path.join(attempt, 'pg-IDENTITY.json'));
  assert.equal(fs.realpathSync(identity.directory).toLowerCase(), fs.realpathSync(path.join(target.directory, 'data')).toLowerCase());
  assert.equal(identity.port, target.port); assert.equal(identity.host, '127.0.0.1'); assert.equal(identity.actor, target.user);
  const status = spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe', ['-D', path.join(target.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore', timeout: 30000 });
  assert.equal(status.status, 3); assert(!status.error); assert.equal(fs.existsSync(path.join(target.directory, 'data/postmaster.pid')), false);
  await new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen({ host: '127.0.0.1', port: 58033, exclusive: true }, () => server.close(error => error ? reject(error) : resolve())); });
  const logs = fs.readFileSync(path.join(target.directory, 'postgres.log'), 'utf8').split(/\r?\n/);
  const shutdown = logs.filter(line => (/\[24780\].*received fast shutdown request|\[24552\].*checkpoint (?:starting: shutdown immediate|complete:)|\[24780\].*database system is shut down/).test(line));
  assert.equal(shutdown.length, 4); assert(shutdown[3].includes('21:49:27.646 CET'));
  const cleanup = { checkedAt: new Date().toISOString(), passed: true, status: 'OWNED_CLUSTER_STOP_CONFIRMED_AFTER_PG_CTL_WAIT_TIMEOUT', originalReceipt: originalBinding,
    target: { directory: target.directory, host: '127.0.0.1', port: 58033, database: original.database }, pgCtlStatusExitCode: status.status, postmasterPidAbsent: true, portReleased: true,
    safeShutdownLogLines: shutdown, observation: 'Checkpoint log records total88.006s including sync84.034s; original pg_ctl wait returned1 before clean shutdown. C-drive free217MiB and E-drive2.06GiB were observed later; no causal attribution is made.' };
  const cleanupFile = path.join(attempt, 'pg-DELAYED_CLEANUP.json');
  fs.writeFileSync(cleanupFile, JSON.stringify(cleanup, null, 2) + '\n', { flag: 'wx' });
  const manifestFile = path.join(attempt, 'pg-SOURCE_MANIFEST.json'), manifest = read(manifestFile);
  for (const entry of manifest.files) { assert.equal(digest(path.join(root, entry.path)), entry.sha256); assert.equal(digest(path.join(original.source, entry.path)), entry.sha256); }
  assert.equal(digest(path.join(root, 'prisma/schema.prisma')), manifest.schemaSha256); assert.equal(digest(path.join(root, 'prisma/migration-catalog-manifest.json')), manifest.catalogFileSha256);
  for (const entry of manifest.privateClientFiles) assert.equal(digest(path.join(manifest.privateClient, entry.path)), entry.sha256);
  assert.equal(digest(path.join(__dirname, 'pg-earned-close-qualification.cjs')), original.runnerSha256);
  const executionFile = path.join(attempt, 'pg-earned-close-lifecycle.execution.json'), execution = read(executionFile);
  assert.equal(execution.exitCode, 0); assert.equal(execution.error, null); assert.equal(execution.signal, null);
  for (const entry of execution.privateOutputs) { assert.equal(digest(entry.path), entry.sha256); assert.equal(fs.statSync(entry.path).size, entry.bytes); }
  const testsFile = path.join(attempt, 'pg-earned-close-tests.summary.json'), tests = read(testsFile), detailed = read(tests.privateResults.path);
  assert.equal(tests.success, true); assert.equal(tests.passed, 6); assert.equal(tests.total, 6); assert.equal(tests.failed, 0); assert.equal(tests.pending, 0); assert.equal(tests.todo, 0); assert(tests.outcomes.every(row => row.status === 'passed'));
  assert.equal(detailed.success, true); assert.equal(detailed.numPassedTests, 6); assert.equal(detailed.numTotalTests, 6); assert.equal(detailed.numFailedTests, 0); assert.equal(detailed.numPendingTests, 0); assert.equal(detailed.numTodoTests, 0);
  const serviceFile = path.join(attempt, 'pg-earned-close-service.summary.json'), service = read(serviceFile), privateService = read(service.privateEvidence.path);
  assert.equal(service.passed, true); assert.deepEqual(service.checks.map(row => row.name), phases); assert(service.checks.every(row => row.passed)); assert.deepEqual(service.counts, counts);
  assert.deepEqual(privateService.checks.map(row => row.name), phases); assert.deepEqual(privateService.counts, counts); assert.equal(privateService.earnedTerminalStates, true); assert.equal(privateService.seededTerminalStates, false);
  const inventoryFile = path.join(attempt, 'pg-SQL_INVENTORY.json'), inventory = read(inventoryFile);
  assert.equal(inventory.unchanged, true); assert.deepEqual(inventory.before, { triggers: 142, checks: 231, functions: 76 }); assert.deepEqual(inventory.after, inventory.before);
  const replayFile = path.join(attempt, 'pg-fresh122.json'), replay = read(replayFile); assert(replay.ready && replay.history.ready && replay.history.appliedCount === 122);
  assert.equal(read(path.join(attempt, 'pg-fresh122.execution.json')).exitCode, 0);
  const fixtureFile = path.join(attempt, 'pg-PRIVATE_FIXTURE.json'), fixtureBinding = read(fixtureFile);
  assert.equal(digest(fixtureBinding.path), fixtureBinding.sha256); for (const pack of fixtureBinding.packs) { assert.equal(digest(pack.path), pack.sha256); assert.equal(fs.statSync(pack.path).size, pack.bytes); }
  assert.equal(digest(originalFile), originalBinding.sha256); assert.equal(digest(latestFile), latestBinding.sha256);
  const admission = { checkedAt: new Date().toISOString(), passed: true, status: 'PASS_SERVICE_QUALIFICATION_WITH_CLEANUP_SUPPLEMENT', reason: 'All earned service/migration/provenance assertions passed; original60-second pg_ctl stop wait failed before eventual clean shutdown. Original failure receipts remain unchanged.',
    originalReceipt: originalBinding, originalLatestPreserved: latestBinding, cleanupSupplement: pin(cleanupFile), evidenceDirectory: original.evidenceDirectory, directory: original.directory, database: original.database, source: original.source, privateClient: original.privateClient,
    admittedTests: 6, admittedNamedPhases: 10, expectedCounts: counts, ownedClusterStopped: true, sourceAndPrivateClientRechecked: true,
    evidence: [manifestFile, executionFile, testsFile, serviceFile, inventoryFile, replayFile, fixtureFile].map(pin), runner: pin(__filename), limitation: original.limitation };
  fs.writeFileSync(path.join(__dirname, 'QUALIFICATION_ADMISSION.json'), JSON.stringify(admission, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: admission.status, admittedTests: 6, admittedNamedPhases: 10, ownedClusterStopped: true, originalFailurePreserved: true }));
}
main().catch(error => { console.error(error.message || 'Cleanup admission refused'); process.exitCode = 1; });
