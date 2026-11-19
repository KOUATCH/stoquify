// Aggregate distinct evidence classes only after all local gates and shutdown pass.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), net = require('node:net');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const receipts = [];
function read(name) {
  assert(/^[a-zA-Z0-9_.-]+\.json$/.test(name));
  const absolute = path.join(__dirname, name), value = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  receipts.push({ path: name, sha256: sha(absolute) }); return value;
}
async function free(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  await new Promise(resolve => server.close(resolve)); return { port, loopbackListenerAbsent: true };
}
async function main() {
  assert(!fs.existsSync(path.join(__dirname, 'FINAL_QUALIFICATION.json')), 'Refusing to replace final evidence');
  const { target, manifest } = require('./candidate-validation.cjs').verifyCandidate();
  assert.equal(read('MIGRATION_REHEARSAL_RESULT.json').passed, true);
  const kernels = read('migrated-financial-kernels.results.json');
  assert.equal(kernels.numFailedTests, 0); assert.equal(kernels.numPassedTests, 16); assert.equal(kernels.numPendingTests, 1);
  const probes = read('trigger-probes.results.json'); assert.equal(probes.passed, true); assert.equal(probes.probes.length, 13);
  const upgrade = read('UPGRADE_PROOF_RESULT.json'); assert(upgrade.passed && upgrade.preExistingRowsPreserved && upgrade.replayPassed && upgrade.clusterStopped);
  const restore = read('LOCK_RESTORE_SELECTED.json'); assert(restore.passed && restore.ownedClusterStopped);
  const selection = read('CLEAN_INSTALL_SELECTED.json'); assert.equal(sha(path.join(__dirname, selection.result)), selection.sha256);
  const install = read(selection.result); assert(install.passed && install.inputsUnchanged && install.frozenSourceUnchanged);
  assert.equal(read('CANDIDATE_NATIVE_READINESS.json').passed, true);
  const bindings = read('WORKFLOW_SOURCE_BINDING.json'); assert(bindings.passed && bindings.files.length === 6);
  for (const entry of bindings.files) {
    assert.equal(sha(path.join(root, entry.path)), entry.candidateSha256);
    assert.equal(sha(path.join(target.candidate, entry.path)), entry.candidateSha256);
  }
  const mocks = [read('artifact-control-unit.results.json'), read('artifact-private-assets-unit-qualified.results.json')];
  assert(mocks.every(result => result.numFailedTests === 0)); assert.equal(mocks.reduce((total, result) => total + result.numPassedTests, 0), 84);
  const assets = read('PRIVATE_ASSET_INPUT_SUPPLEMENT.json');
  const artifact = read('ARTIFACT_QUALIFICATION.json'), emitted = read('ARTIFACT_EMITTED_DIGEST.json');
  assert(artifact.fullBuildAndTrustedDigestVerificationPassed && artifact.syntheticPrivateConfigExclusionPassed);
  assert.equal(assets.files.length, 3);
  assert.equal(sha(path.join(__dirname, 'PRIVATE_ASSET_INPUT_SUPPLEMENT.json')), artifact.ignoredPrivateAssetSupplementSha256);
  assert.equal(artifact.sourceManifestSha256, manifest.manifestSha256); assert.equal(artifact.artifactSha256, emitted.sha256);
  assert.equal(sha(path.join(artifact.artifact, 'artifact.json')), emitted.sha256);
  const refusal = read('LOCALHOST_PROMOTION_REFUSAL.json'); assert(refusal.passed && refusal.databasePromoted === false && refusal.ownedClusterStoppedBeforeAndAfter);
  const smoke = read('ARTIFACT_HTTP_SMOKE_RESULT.json'); assert(smoke.passed && smoke.artifactUnchanged && smoke.applicationStopped && smoke.clusterStopped);
  assert.equal(smoke.migrationCount, 121); assert(Object.values(smoke.finalTransactionCounts).every(count => count === 0));
  const production = read('PRODUCTION_SECRET_PREFLIGHT.json'); assert.equal(production.summary.status, 'blocked');
  assert.deepEqual([...production.blockers].sort(), ['accountant_invite_live_delivery_enabled', 'statement_live_delivery_channel_enabled']);
  const database = read('DATABASE_TARGET.json'), osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|SYSTEMDRIVE)$/i.test(key)));
  assert.equal(database.directory, database.clusterDirectory); assert.equal(path.dirname(database.directory), path.join(root, '.codex-tmp'));
  assert(/^sales-release-migrations-20261109-[a-f0-9]{10}$/.test(path.basename(database.directory)));
  const status = spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe', ['-D', path.join(database.directory, 'data'), 'status'], { env: osEnv, windowsHide: true, stdio: 'ignore' });
  assert.equal(status.status, 3, 'Owned database must be stopped');
  const listeners = []; for (const port of [database.port, 3296, 3443]) listeners.push(await free(port));
  const result = {
    checkedAt: new Date().toISOString(), status: 'LOCAL_QUALIFICATION_PASSED_PRODUCTION_NOT_APPROVED', localQualificationPassed: true, productionReady: false,
    sourceManifestSha256: manifest.manifestSha256, artifactSha256: emitted.sha256, artifact: artifact.artifact, sourceFiles: manifest.files.length,
    independentEvidence: { realMigratedKernelTests: 16, optionalBrowserIntegrationSkipped: 1, rollbackOnlySqlProbes: 13, mockedArtifactTests: 84,
      migrations: 121, upgradeApplicationTables: upgrade.preUpgrade.length, previousDevelopmentUiRootsBound: 6,
      artifactAuthentication: 'Actual HTTPS credential/session/revocation and protected-route SSR; no browser or financial UI journey in sealed runtime' },
    productionBlockers: production.blockers, ownedClusterStopped: true, listeners, receipts,
    limitations: ['Synthetic financial mappings; no Cameroon statutory or earned close certificate qualification.',
      'Production delivery, hosted artifact promotion, real providers and operational recovery objectives are not qualified.',
      'Three policy-pinned private repository upload assets remain privately mapped in the local artifact.',
      'Populated upgrade used the same frozen writer across the final additive migration, not an older deployed artifact.'],
  };
  fs.writeFileSync(path.join(__dirname, 'FINAL_QUALIFICATION.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: result.status, artifactSha256: result.artifactSha256, ownedClusterStopped: true, listenersAbsent: listeners.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
