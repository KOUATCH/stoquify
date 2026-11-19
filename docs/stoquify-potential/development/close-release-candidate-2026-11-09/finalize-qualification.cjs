// File-only aggregation after the reviewed build and HTTP stages finish.
// No application startup, database connection, migration, install or deployment.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { root, priorEvidence, digest, hash, read, assertNoLinks, osEnvironment, verifyCandidate, compare } = require('./candidate-validation.cjs');
const receipts = new Map();
const file = name => path.join(__dirname, name);
function bind(absolute, expected) {
  assertNoLinks(absolute); assert(fs.lstatSync(absolute).isFile());
  const sha256 = digest(absolute); if (expected) assert.equal(sha256, expected, 'Bound input changed: ' + path.basename(absolute));
  receipts.set(path.resolve(absolute), { path: path.relative(root, absolute).replaceAll('\\', '/'), sha256 }); return sha256;
}
function json(absolute, expected) { bind(absolute, expected); return read(absolute); }
const local = name => json(file(name));
function ownedEvidence(directory, pattern) {
  assert.equal(path.dirname(directory), __dirname); assert.match(path.basename(directory), pattern); assertNoLinks(directory); return directory;
}
function candidateInputs(files, candidate, manifest) {
  const captured = new Map(manifest.files.map(entry => [entry.path, entry.sha256]));
  for (const entry of files) { assert.equal(captured.get(entry.path), entry.sha256); bind(path.join(candidate, entry.path), entry.sha256); }
}
function jest(result, passed, suites) {
  assert.equal(result.success, true); assert.equal(result.numPassedTests, passed); assert.equal(result.numFailedTests, 0); assert.equal(result.numPendingTests, 0);
  assert.equal(result.numPassedTestSuites, suites); assert.equal(result.numFailedTestSuites, 0); assert.equal(result.testResults.length, suites);
  for (const suite of result.testResults) assert(suite.assertionResults.every(test => test.status === 'passed'));
}
function execution(absolute) { const result = json(absolute); assert.equal(result.exitCode, 0); assert(!result.error); return result; }
function checkUnits(candidate, manifest) {
  const unit = local('UNIT_LATEST.json');
  assert(unit.passed && unit.exitCode === 0 && unit.passedTests === 516 && unit.skipped === 0); assert.equal(unit.sourceManifestSha256, manifest.manifestSha256);
  bind(file('unit-qualification.cjs'), unit.runnerSha256); const directory = ownedEvidence(unit.evidenceDirectory, /^unit-[a-f0-9]{10}$/);
  assert.deepEqual(json(path.join(directory, 'verification.json')), unit); jest(json(path.join(directory, 'results.json')), 516, 5); bind(path.join(directory, 'checks.log'));
  const configIndex = unit.args.indexOf('--config'); assert(configIndex >= 0); bind(unit.args[configIndex + 1], unit.configSha256);
  const files = Object.entries(unit.suiteHashes).map(([name, sha256]) => ({ path: name, sha256 })); assert.equal(files.length, 5); candidateInputs(files, candidate, manifest);
  const selected = local('CONTROL_UNIT_SELECTED.json'); assert(selected.passed); assert.equal(selected.sourceManifestSha256, manifest.manifestSha256);
  const controlDirectory = ownedEvidence(selected.directory, /^control-unit-[a-f0-9]{10}$/);
  assert.equal(path.resolve(__dirname, selected.verification.path), path.join(controlDirectory, 'VERIFICATION.json'));
  const control = json(path.join(controlDirectory, 'VERIFICATION.json'), selected.verification.sha256);
  assert(control.passed && control.frozenSourceUnchanged && control.noApplicationBuildDatabaseMigrationOrBrowser); assert.equal(control.sourceManifestSha256, manifest.manifestSha256);
  assert.deepEqual(control.counts, { passed: 84, failed: 0, pending: 0 }); bind(file('control-unit.cjs'), control.runnerSha256);
  const source = json(path.join(controlDirectory, 'SOURCE_AND_COMMAND.json'), control.commandReceiptSha256);
  assert.equal(source.sourceManifestSha256, manifest.manifestSha256); assert.equal(source.runnerSha256, control.runnerSha256); candidateInputs(source.files, candidate, manifest);
  execution(path.join(controlDirectory, 'execution.json')); bind(path.join(controlDirectory, 'execution.json'), control.executionReceiptSha256);
  assert.equal(control.results.path, 'results.json'); jest(json(path.join(controlDirectory, control.results.path), control.results.sha256), 84, 2); bind(path.join(controlDirectory, 'execution.log'));
  assert.deepEqual(control.suites.map(suite => suite.passed).sort((a, b) => a - b), [17, 67]);
  return { mockedCloseTests: 516, mockedCloseSuites: 5, mockedReleaseControlTests: 84, mockedReleaseControlSuites: 2, skipped: 0 };
}
function checkPostgres(candidate, manifest, database) {
  const selected = local('pg-LATEST.json'); assert(selected.passed && selected.ownedClusterStopped); assert.equal(selected.sourceManifestSha256, manifest.manifestSha256);
  assert.equal(selected.candidate, candidate); assert.deepEqual(selected.target, database); bind(file('db-qualification.cjs'), selected.runnerSha256);
  const directory = ownedEvidence(selected.evidenceDirectory, /^pg-attempt-[a-f0-9]{10}$/), proof = json(path.join(directory, 'pg-RESULT.json'));
  const { evidenceDirectory: ignored, ...rest } = selected; assert.deepEqual(proof, { evidenceDirectory: directory, ...rest });
  const binding = json(path.join(directory, 'pg-SOURCE_BINDING.json')); assert.equal(binding.sourceManifestSha256, manifest.manifestSha256); assert.equal(binding.candidate, candidate);
  bind(file('CANDIDATE_SOURCE_MANIFEST.json'), binding.candidateManifestFileSha256); candidateInputs(binding.files, candidate, manifest); candidateInputs(binding.unchangedAuthorityBindings, candidate, manifest);
  for (const input of binding.inputFiles) bind(input.path, input.sha256);
  const runtime = json(path.join(directory, 'pg-RUNTIME_BINDING.json')); bind(runtime.configPath, runtime.configSha256); bind(runtime.adapter, runtime.adapterSha256);
  for (const input of runtime.inputs) bind(input.path, input.sha256);
  for (const entry of binding.files) bind(path.join(binding.migrationSource, entry.path), entry.sha256);
  bind(path.join(binding.privateClient, 'schema.prisma'), binding.privateClientSchemaSha256);
  const certified = json(path.join(directory, 'pg-fresh-certification.json')); assert(certified.ready && certified.history.ready); assert.equal(certified.status, 'READY_WITH_INTENTIONAL_RESIDUAL_DRIFT');
  assert.equal(certified.databaseName, database.freshDatabase); assert.equal(certified.history.expectedCount, 121); assert.equal(certified.history.appliedCount, 121);
  for (const name of ['missing', 'unknown', 'unfinished', 'checksumMismatches']) assert.deepEqual(certified.history[name], []); assert.deepEqual(certified.drift.unexpected, []);
  const migrations = manifest.files.filter(entry => /^prisma\/migrations\/[^/]+\/migration\.sql$/.test(entry.path)).sort((a, b) => a.path.localeCompare(b.path)); assert.equal(migrations.length, 121);
  const history = json(path.join(directory, 'pg-MIGRATION_HISTORY.json')); assert.equal(history.database, database.freshDatabase); assert.equal(history.rows.length, 121);
  history.rows.forEach((row, index) => { assert.equal(row.migration_name, migrations[index].path.split('/')[2]); assert.equal(row.checksum, migrations[index].sha256); assert(row.finished_at && !row.rolled_back_at); });
  jest(json(path.join(directory, 'pg-helper-tests.results.json')), 40, 1); jest(json(path.join(directory, 'pg-close-services.results.json')), 5, 1);
  const inventory = json(path.join(directory, 'pg-SQL_INVENTORY.json')); assert(inventory.unchanged); assert.deepEqual(inventory.originalInventory, inventory.finalInventory);
  assert.deepEqual(inventory.finalInventory, { triggers: 141, checks: 230, functions: 75 });
  for (const label of ['pg-start', 'pg-full-121-replay', 'pg-helper-tests', 'pg-close-services', 'pg-stop']) {
    execution(path.join(directory, label + '.execution.json')); bind(path.join(directory, label + '.log'));
  }
  const service = json(path.join(directory, 'pg-close-services.json')), workflow = service.checks.find(check => check.name === 'actual-service-workflow');
  assert(workflow.synthetic && workflow.actualAssessmentStatus === 'BLOCKED' && workflow.setupStatus === 'IN_PROGRESS');
  assert.equal(workflow.approvedStatus, 'WAIVED_WITH_APPROVAL'); assert.equal(workflow.final.comments, 1); assert.equal(workflow.final.reviews, 1); assert.equal(workflow.final.exports, 1); assert.equal(workflow.final.certifiedExports, 0);
  for (const name of ['journals', 'sales', 'settlements']) assert.equal(workflow.final[name], 0);
  const denied = service.checks.filter(check => check.name === 'actual-service-committed-revocation'); assert.equal(denied.length, 24); assert(denied.every(check => check.allScopedBusinessCountsUnchanged));
  for (const kind of ['module', 'role', 'session']) assert.equal(denied.filter(check => check.kind === kind).length, 8);
  assert(service.checks.some(check => check.name === 'actual-service-audit-rollback' && check.allScopedBusinessCountsUnchanged));
  const fixture = local('pg-FIXTURE_PUBLIC.json'); assert.deepEqual(fixture, json(path.join(directory, 'pg-FIXTURE_PUBLIC.json'))); assert.equal(fixture.actualAssessmentStatus, 'BLOCKED'); assert.equal(fixture.draftContentHash, workflow.draftContentHash);
  json(path.join(directory, 'pg-helper-probes.json')); bind(path.join(directory, 'pg-fresh-certification.md'));
  return { migrations: 121, schemaCertification: certified.status, realAuthorityTests: 40, realServiceTests: 5, committedRevocationDenials: 24, skipped: 0,
    actualAssessment: 'BLOCKED', actualExports: 'One draft; certification denied', sqlInventoryUnchanged: true, ownedClusterStoppedByRunner: true };
}
function checkBuild(candidate, manifest, database) {
  const dependencies = local('CANDIDATE_DEPENDENCIES.json'); assert(dependencies.passed && dependencies.sourceAndDestinationChecksumsEqual && dependencies.independentRegularFileCopy && dependencies.sourceUnchanged);
  assert.equal(dependencies.cleanInstallPerformed, false); assert.equal(dependencies.candidate, candidate); assert.equal(dependencies.sourceManifestSha256, manifest.manifestSha256);
  assert.equal(dependencies.fileManifest.path, 'DEPENDENCY_COPY_MANIFEST.json');
  const dependencyManifest = json(file(dependencies.fileManifest.path), dependencies.fileManifest.sha256);
  assert.equal(hash(JSON.stringify(dependencyManifest.files)), dependencyManifest.fileListSha256); assert.equal(dependencyManifest.files.length, dependencies.files);
  assert.equal(dependencyManifest.totalBytes, dependencies.totalBytes);
  if (dependencies.externalRecovery) {
    assert.equal(dependencies.externalRecovery.path, 'DEPENDENCY_COPY_RECOVERY.json');
    const recovery = json(file(dependencies.externalRecovery.path), dependencies.externalRecovery.sha256);
    assert(recovery.passed && recovery.originalProcessVerifiedAbsent && recovery.sourceUnchanged && recovery.fullSourceDestinationIdentityEqual && recovery.originalInterruptedCopyRetained && recovery.frozenSourceArchiveAndManifestUnchanged);
    assert.equal(recovery.candidate, candidate); assert.equal(recovery.sourceManifestSha256, manifest.manifestSha256); assert.equal(recovery.originalPid, 18492);
    assert.equal(recovery.sourceFileListSha256, dependencyManifest.fileListSha256); assert.equal(recovery.source, dependencies.previous.source); assert.equal(recovery.destination, dependencies.destination);
    bind(file('resume-dependencies.cjs'), recovery.newRunnerSha256); bind(file('candidate.cjs'), recovery.originalRunnerSha256);
    const started = json(file('DEPENDENCY_RECOVERY_STARTED.json'), recovery.startedReceiptSha256);
    assert.equal(started.originalPid, 18492); assert(started.originalProcessVerifiedAbsent); assert.equal(started.newRunnerSha256, recovery.newRunnerSha256);
    assert.equal(started.sourceManifestSha256, manifest.manifestSha256); assert.equal(started.sourceFileListSha256, dependencyManifest.fileListSha256);
    assert.equal(started.capacityReceiptSha256, recovery.capacityReceiptSha256);
    const capacity = json(file('DEPENDENCY_RESUME_CAPACITY.json'), recovery.capacityReceiptSha256); assert(capacity.passed); assert.deepEqual(recovery.capacity, capacity);
    const interrupted = local('DEPENDENCY_COPY_INTERRUPTED.json'); assert.equal(interrupted.pid, 18492);
    assert(interrupted.stopped && interrupted.partialCopyRetained && interrupted.originalSourceAndFrozenCandidateUnchanged);
    assert.match(interrupted.commandLine, /candidate\.cjs copy-dependencies$/); assert(Date.parse(interrupted.checkedAt) <= Date.parse(started.checkedAt));
  }
  const native = local('CANDIDATE_NATIVE_READINESS.json'); assert(native.passed && native.schemaMatches && native.argon2CorrectWrongPasswordVerified && native.nativeNextSwcLoaded && native.reusedDependencies && native.noGeneration);
  assert.equal(native.prismaVersion.client, '6.19.3'); bind(path.join(candidate, 'node_modules/.prisma/client/query_engine-windows.dll.node'), native.defaultEngineSha256);
  const guarded = local('BUILD_DATABASE_GUARD.json'); assert(guarded.passed && guarded.exactChecksums); assert.equal(guarded.database, database.freshDatabase); assert.equal(guarded.appliedMigrations, 121);
  const qualified = local('ARTIFACT_QUALIFICATION.json'), emitted = local('ARTIFACT_EMITTED_DIGEST.json'), built = local('FULL_ARTIFACT_BUILD_RESULT.json'), planned = local('ARTIFACT_BUILD_TARGET.json');
  assert(qualified.passed && qualified.fullBuildAndTrustedDigestVerificationPassed && qualified.syntheticPrivateConfigExclusionPassed && built.passed && built.exitCode === 0);
  assert.equal(qualified.sourceManifestSha256, manifest.manifestSha256); assert.equal(planned.sourceManifestSha256, manifest.manifestSha256); assert.equal(planned.candidate, candidate);
  assert.equal(planned.artifact, qualified.artifact); assert.equal(emitted.destination, qualified.artifact); assert.equal(built.artifact, qualified.artifact); assert.equal(built.candidate, candidate);
  assert.equal(planned.freshDatabase, database.freshDatabase); bind(planned.privateConfiguration);
  for (const name of ['sha256', 'buildId', 'files']) assert.equal(built.emitted[name], emitted[name]);
  assert.equal(qualified.artifactSha256, emitted.sha256); assert.equal(qualified.buildId, emitted.buildId); assert.equal(qualified.files, emitted.files);
  assert.equal(qualified.nativePlatform, 'win32-x64'); assert.equal(qualified.localPublicOriginBinding, 'https://127.0.0.1:3443'); assert.equal(planned.origin, qualified.localPublicOriginBinding);
  assert.equal(qualified.applicationDeployed, false); assert.equal(qualified.databasePromoted, false);
  bind(path.join(qualified.artifact, 'artifact.json'), emitted.sha256);
  const release = createRequire(path.join(candidate, 'package.json'))(path.join(candidate, 'scripts/release-artifact.cjs'));
  const verified = release.verify(candidate, qualified.artifact, emitted.sha256); assert.equal(verified.buildId, emitted.buildId); assert.equal(verified.files.length, emitted.files); assert.deepEqual(verified.source, manifest.files);
  const supplement = local('PRIVATE_ASSET_INPUT_SUPPLEMENT.json'); assert.equal(supplement.sourceManifestSha256, manifest.manifestSha256); assert.equal(supplement.files.length, 3);
  bind(supplement.privateArchive, supplement.privateArchiveSha256); bind(path.join(candidate, 'config/private-upload-aliases.json'), supplement.policySha256);
  for (const item of supplement.files) { bind(path.join(candidate, item.uploadSource), item.sha256); assert.equal(item.candidateSha256, item.sha256); }
  assert.equal(qualified.privateAssetMappings, 3); assert.equal(qualified.privateAssetAliases, 3);
  execution(file('full-artifact-verify.execution.json')); bind(file('full-artifact-verify.log')); bind(file('full-artifact-build.log'));
  for (const name of ['start', 'stop']) { const record = local('build-pg-' + name + '.json'); assert.equal(record.exitCode, 0); assert.equal(record.cluster, database.directory); }
  const production = local('PRODUCTION_SECRET_PREFLIGHT.json'); assert(production.summary.releaseEnforced && production.summary.status === 'blocked'); assert.equal(production.summary.blockerCount, 2); assert.equal(production.summary.secretValuePrinted, false);
  assert.deepEqual([...production.blockers].sort(), ['accountant_invite_live_delivery_enabled', 'statement_live_delivery_channel_enabled']);
  const preflightExecution = local('production-secrets-preflight.execution.json'); assert.equal(preflightExecution.exitCode, 1); assert(!preflightExecution.error); bind(file('production-secrets-preflight.log'));
  return { qualified, emitted, production, result: { actualFullReleaseBuild: true, trustedDigestAndAllArtifactBytesVerified: true, buildId: emitted.buildId, artifactFiles: emitted.files,
    dependencyMode: 'Independent hash-verified copy of prior installed dependencies', freshCleanInstallPerformed: false, nativePlatform: 'win32-x64', publicOrigin: qualified.localPublicOriginBinding } };
}
function checkHttp(manifest, artifact, database) {
  const runtime = local('RUNTIME_HTTP_RESULT.json'), target = local('RUNTIME_HTTP_TARGET.json');
  assert(runtime.passed && runtime.artifactUnchanged && runtime.clusterStopped && runtime.applicationStopped); assert.equal(runtime.sourceManifestSha256, manifest.manifestSha256);
  assert.equal(target.sourceManifestSha256, manifest.manifestSha256); assert.equal(target.candidate, manifest.candidate); assert.equal(runtime.artifact, artifact.qualified.artifact); assert.equal(target.artifact, runtime.artifact);
  assert.equal(target.clusterDirectory, database.directory); for (const name of ['host', 'port', 'user']) assert.equal(target[name], database[name]);
  assert.equal(runtime.origin, 'https://127.0.0.1:3443'); assert.equal(runtime.database, target.database); assert.match(runtime.database, /^stoquify_runtime_close_20261109_[a-f0-9]{10}$/);
  assert.equal(runtime.certificateSha256, target.certificateSha256); bind(target.cert, target.certificateSha256); bind(file('runtime-http.cjs'), target.runnerSha256); bind(path.join(target.candidate, 'scripts/local-gates-network.cjs'), target.networkPreloadSha256);
  assert.equal(runtime.migrations.count, 121); assert.match(runtime.migrations.historySha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(runtime.artifactBefore, runtime.artifactAfter); assert.deepEqual(runtime.artifactBefore, { sha256: artifact.emitted.sha256, buildId: artifact.emitted.buildId, files: artifact.emitted.files });
  assert.deepEqual(runtime.finalCounts, { comments: 1, exports: 0, sessions: 0, journals: 0, sales: 0, settlements: 0 }); assert.equal(runtime.checks.length, 22);
  const checks = name => runtime.checks.filter(check => check.name === name);
  for (const name of ['actual-sign-in', 'authenticated-close-SSR', 'positive-comment', 'actual-password-step-up']) assert.equal(checks(name).length, 1);
  assert(checks('actual-sign-in')[0].secureSessionCookie && checks('actual-sign-in')[0].persistedSession); assert.equal(checks('actual-sign-in')[0].cookieValuesRecorded, false);
  assert.equal(checks('authenticated-close-SSR')[0].browserRendered, false); assert(checks('positive-comment')[0].persistedAuthorBoundToActualSession && checks('positive-comment')[0].clientAuthorityIgnored);
  assert(checks('actual-password-step-up')[0].persistedOrganizationBoundProof); assert.equal(checks('actual-password-step-up')[0].fabricatedPositiveAssurance, false);
  const expectedActions = ['runCloseAssuranceAction', 'assignCloseFindingAction', 'commentOnCloseFindingAction', 'requestCloseWaiverAction', 'approveCloseWaiverAction', 'updateAccountantReviewAction', 'exportDraftClosePackAction', 'exportCertifiedClosePackAction'].sort();
  for (const [name, count, code, status] of [['module-suspended', 8, 'FORBIDDEN', 403], ['stale-persisted-assurance', 2, 'FRESH_AUTH_REQUIRED', 403], ['revoked-old-cookie', 8, 'AUTH_REQUIRED', 401]]) {
    const selected = checks(name); assert.equal(selected.length, count); assert(selected.every(check => check.code === code && check.status === status && check.businessRowsUnchanged));
    assert.deepEqual(selected.map(check => check.action).sort(), count === 8 ? expectedActions : ['approveCloseWaiverAction', 'exportCertifiedClosePackAction']);
    if (name === 'stale-persisted-assurance') assert(selected.every(check => check.spoofedFreshnessIgnored));
  }
  return { realLoopbackHttpsChecks: 22, authenticatedSsrNotBrowser: true, actualComment: 1, disabledModuleDenials: 8, staleAssuranceDenials: 2, revokedCookieDenials: 8,
    realPasswordStepUp: true, persistedSessionsAfterSignOut: 0, runtimeExports: 0, financialRows: 0, artifactUnchanged: true, applicationAndClusterStoppedByRunner: true };
}
function priorUnchanged(manifest) {
  const old = require(path.join(priorEvidence, 'candidate-validation.cjs')).verifyCandidate();
  const hardening = json(path.join(root, manifest.hardeningEvidence.path)); assert.equal(old.manifest.manifestSha256, hardening.previousCandidateSourceSha256);
  const delta = local('SOURCE_DELTA.json'); assert.equal(delta.beforeSourceManifestSha256, old.manifest.manifestSha256); assert.equal(delta.currentSourceManifestSha256, manifest.manifestSha256);
  const order = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  const applicationChanges = hardening.files.map(entry => ({ path: entry.path, before: entry.previousCandidateSha256, after: entry.sha256 })).sort(order);
  assert.equal(applicationChanges.length, 9); assert.equal(delta.applicationChanges.length, 9); assert.deepEqual([...delta.applicationChanges].sort(order), applicationChanges);
  assert.equal(delta.evidenceChanges.length, 207); assert(delta.evidenceChanges.every(entry => entry.path.startsWith('docs/stoquify-potential/development/')));
  assert.deepEqual([...delta.applicationChanges, ...delta.evidenceChanges].sort(order), compare(old.manifest.files, manifest.files), 'Retained source delta differs from the exact old/new manifests');
  const final = json(path.join(priorEvidence, 'FINAL_QUALIFICATION.json')); assert(final.localQualificationPassed && final.productionReady === false);
  const emitted = json(path.join(priorEvidence, 'ARTIFACT_EMITTED_DIGEST.json')); assert.equal(emitted.sha256, final.artifactSha256);
  const qualified = json(path.join(priorEvidence, 'ARTIFACT_QUALIFICATION.json')); assert.equal(qualified.artifactSha256, emitted.sha256); assert.equal(qualified.sourceManifestSha256, old.manifest.manifestSha256);
  bind(path.join(qualified.artifact, 'artifact.json'), emitted.sha256);
  const release = createRequire(path.join(old.target.candidate, 'package.json'))(path.join(old.target.candidate, 'scripts/release-artifact.cjs'));
  const sealed = release.verify(old.target.candidate, qualified.artifact, emitted.sha256); assert.equal(sealed.buildId, emitted.buildId); assert.deepEqual(sealed.source, old.manifest.files);
  const cleanup = local('CACHE_CLEANUP.json'); assert(cleanup.removed && cleanup.noLinks); assert.equal(cleanup.exactOwnedTarget, path.join(old.target.candidate, '.next/cache/webpack'));
  assert.equal(cleanup.files.length, 10); assert.equal(cleanup.bytes, 1990938514); assert(!fs.existsSync(cleanup.exactOwnedTarget));
  for (const name of ['CANDIDATE_TARGET.json', 'CANDIDATE_SOURCE_MANIFEST.json', 'RAW_SOURCE_MANIFEST.json', 'candidate-validation.cjs']) bind(path.join(priorEvidence, name));
  return { frozenSourceUnchanged: true, artifactTrustedDigestAndBytesUnchanged: true, sourceManifestSha256: old.manifest.manifestSha256, artifactSha256: emitted.sha256,
    sourceDelta: { exactManifestComparison: true, hardeningApplicationChanges: 9, evidenceChanges: 207 },
    authorizedGeneratedCacheRemoval: { files: 10, bytes: cleanup.bytes, scope: '.next/cache/webpack only; excluded from source/artifact identity' } };
}
function bindOwnedReceipts(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name); assert(!entry.isSymbolicLink());
    if (entry.isDirectory()) bindOwnedReceipts(absolute);
    else if (entry.isFile() && (/\.(?:json|log|cjs|ts)$/.test(entry.name)) && !/^FINAL_QUALIFICATION(?:_FAILURE-.*)?\.json$/.test(entry.name)) bind(absolute);
  }
}
function main() {
  assert.equal(process.argv.length, 2, 'No environment or target overrides accepted'); assert(!fs.existsSync(file('FINAL_QUALIFICATION.json')), 'Refusing to replace final evidence');
  const allowed = osEnvironment(); for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, allowed);
  const { target, manifest, rootBinding } = verifyCandidate();
  const database = local('DATABASE_TARGET.json'); assert.equal(database.sourceManifestSha256, manifest.manifestSha256); assert.equal(database.purpose, 'hardened-close-release-candidate');
  const units = checkUnits(target.candidate, manifest), postgres = checkPostgres(target.candidate, manifest, database), artifact = checkBuild(target.candidate, manifest, database), http = checkHttp(manifest, artifact, database);
  const historical = priorUnchanged(manifest); bindOwnedReceipts(__dirname);
  const result = { checkedAt: new Date().toISOString(), status: 'PASS_LOCAL_CANDIDATE_WITH_PRODUCTION_GATES', localCandidateQualificationPassed: true, productionReady: false,
    candidate: target.candidate, sourceFiles: manifest.files.length, sourceManifestSha256: manifest.manifestSha256, artifact: artifact.qualified.artifact, artifactSha256: artifact.emitted.sha256, buildId: artifact.emitted.buildId,
    hardeningFilesBoundToCurrentSource: 9, workspaceBinding: rootBinding, independentEvidence: { units, postgres, artifact: artifact.result, http }, historicalQualificationUnchanged: historical,
    productionBlockers: artifact.production.blockers, productionPreflightExpectedBlocked: true, applicationDeployed: false, databasePromoted: false, earnedCloseCertificate: false,
    cleanupEvidence: 'Database and application stopped according to successful owned-stage receipts; this finalizer performs no network/database/process operation.',
    runnerSha256: digest(__filename), receipts: [...receipts.values()].sort((a, b) => a.path.localeCompare(b.path)),
    limitations: ['Reused checksum-verified installed dependencies; no new clean-install qualification.', 'Windows x64 and synthetic loopback HTTPS origin only; hosted delivery and real providers remain unqualified.',
      'Service workflow deliberately retained BLOCKED setup and one draft export; no earned READY/T4, statutory approval or certified close pack.',
      'HTTP proof uses actual sign-in, password step-up, SSR and server actions; no hydrated browser, visual or accessibility qualification.',
      'This receipt does not approve deployment, production schema promotion or operational recovery objectives.'] };
  fs.writeFileSync(file('FINAL_QUALIFICATION.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: result.status, sourceManifestSha256: result.sourceManifestSha256, artifactSha256: result.artifactSha256, receiptCount: result.receipts.length, productionReady: false }));
}
if (require.main === module) { try { main(); } catch (error) {
  const receipt = { checkedAt: new Date().toISOString(), passed: false, mode: 'File-only final aggregation', failure: error.message, runnerSha256: digest(__filename), receipts: [...receipts.values()] };
  const name = 'FINAL_QUALIFICATION_FAILURE-' + require('node:crypto').randomBytes(5).toString('hex') + '.json'; fs.writeFileSync(file(name), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.error(error.message); process.exitCode = 1;
} }
module.exports = { main };
