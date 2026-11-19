// Read-only provenance/preservation checks. Writes one new receipt; no DB or process mutation.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../../..');
const output = path.join(__dirname, 'final-integrity-retry01.json');
assert(!fs.existsSync(output), 'Preserve the prior final-integrity receipt');
const argv = process.argv.slice(2);
assert.equal(argv.length, 6, 'Usage: --build <receipt.json> --runtime <receipt.json> --db-stop <database/receipt.json>');
assert.deepEqual([argv[0], argv[2], argv[4]], ['--build', '--runtime', '--db-stop']);
const selected = { build: argv[1], runtime: argv[3], databaseStop: argv[5] };
for (const [kind, file] of Object.entries(selected)) {
  assert((kind === 'databaseStop' ? /^database\/[a-zA-Z0-9._-]+\.json$/ : /^[a-zA-Z0-9._-]+\.json$/).test(file), 'Unsafe receipt path');
  assert(!file.includes('..'), 'Unsafe receipt path');
}
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const safeFileHash = file => {
  assert(fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink(), 'Expected regular file: ' + file);
  return hash(fs.readFileSync(file));
};
const report = { startedAt: new Date().toISOString(), evidenceClass: 'source_artifact_preservation_and_receipt_reconciliation',
  selectedReceipts: selected, checks: [], integrityPassed: false, executionReceiptsReconciled: false,
  limitations: ['This script does not query the database, inspect or stop processes, issue HTTP requests, or run a browser.',
    'Database/browser outcomes and cleanup are reconciled from selected receipts, not re-executed.',
    'Independent outcome review and the work-register decision remain separate; this receipt does not promote P04-R02.',
    'Concurrent root drift is recorded separately; no whole-working-tree stability claim is made when drift exists.'] };
function check(name, work) {
  const row = { name, passed: false }; report.checks.push(row);
  try { row.evidence = work(); row.passed = true; return row.evidence; }
  catch (error) { row.error = String(error.message || error).slice(0, 2500); return null; }
}
function difference(before, after) {
  const old = new Map(before.map(f => [f.path, f.sha256]));
  const current = new Map(after.map(f => [f.path, f.sha256]));
  return {
    added: after.filter(f => !old.has(f.path)).map(f => ({ path: f.path, sha256: f.sha256 })),
    changed: after.filter(f => old.has(f.path) && old.get(f.path) !== f.sha256).map(f => ({ path: f.path, beforeSha256: old.get(f.path), sha256: f.sha256 })),
    removed: before.filter(f => !current.has(f.path)).map(f => ({ path: f.path, beforeSha256: f.sha256 })),
  };
}
function receipt(file) {
  const absolute = path.join(__dirname, file);
  if (!fs.existsSync(absolute)) return { path: file, present: false };
  return { path: file, present: true, sha256: safeFileHash(absolute), data: read(absolute) };
}
function inventoryPaths(directory, prefix = '') {
  assert(!fs.lstatSync(directory).isSymbolicLink(), 'Asset directory link refused');
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) return inventoryPaths(path.join(directory, entry.name), relative + '/');
    assert(entry.isFile() && !entry.isSymbolicLink(), 'Nonregular asset refused');
    return [relative];
  }).sort();
}
try {
  const c = read(path.join(__dirname, 'candidate-context.json'));
  const expectedStorage = path.resolve('D:/p04-r02-fullapp-20261102-r3');
  const externalRuntimeStorage = expectedStorage;
  const actualRuntime = path.join(externalRuntimeStorage, 'runtime-retry01');
  assert.equal(c.root, root); assert.equal(c.storage, expectedStorage);
  for (const field of ['source', 'artifact', 'runtime']) assert.equal(c[field], path.join(expectedStorage, field));
  assert.equal(read(path.join(c.storage, 'ownership.json')).root, root);
  assert.equal(fs.realpathSync(c.source), c.source);
  const frozen = read(path.join(__dirname, 'candidate-source-manifest.json'));
  const rootBefore = read(path.join(__dirname, 'root-source-manifest.json'));
  const { capture } = require(path.join(c.source, 'scripts/candidate-snapshot.cjs'));
  const { verify, filesUnder } = require(path.join(c.source, 'scripts/release-artifact.cjs'));
  report.candidateId = c.candidateId;
  check('frozen-candidate', () => {
    const current = capture(c.source);
    const files = current.files.map(({ path, sha256 }) => ({ path, sha256 }));
    assert.deepEqual(files, frozen.files);
    assert.equal(current.head, frozen.head);
    for (const asset of c.assetAnnex) assert.equal(safeFileHash(path.join(c.source, asset.source)), asset.sha256);
    return { files: files.length, sourceHead: current.head, allSourceHashesUnchanged: true,
      sourceManifestSha256: hash(Buffer.from(JSON.stringify(files))), assetAnnexCount: c.assetAnnex.length };
  });
  const owned = read(path.join(__dirname, '../private-alias-exclusion-20261102/owned-source-tested.json'));
  const browserInputs = read(path.join(__dirname, 'browser/prior-source-review-r2.json'));
  const frozenByPath = new Map(frozen.files.map(f => [f.path, f.sha256]));
  const rootByPath = new Map(rootBefore.files.map(f => [f.path, f.sha256]));
  const selectedInputNames = new Set([...owned, ...browserInputs.priorInputs].map(f => f.path));
  check('current-root-drift', () => {
    const current = capture(root);
    const drift = difference(rootBefore.files, current.files);
    const changedPaths = [...drift.added, ...drift.changed, ...drift.removed].map(f => f.path);
    return { beforeHead: rootBefore.head, currentHead: current.head, headUnchanged: rootBefore.head === current.head,
      beforeFiles: rootBefore.files.length, currentFiles: current.files.length, drift,
      capturedRootSourceUnchanged: rootBefore.head === current.head && changedPaths.length === 0,
      selectedInputDrift: changedPaths.filter(file => selectedInputNames.has(file)),
      unrelatedDriftPreserved: changedPaths.filter(file => !selectedInputNames.has(file)),
      disposition: 'Inspection only. No root application source was restored, removed or rewritten by this recipe.' };
  });
  check('repair-inputs', () => {
    assert.equal(owned.length, 8);
    const rows = owned.map(file => ({ path: file.path, expectedSha256: file.sha256,
      currentRootSha256: safeFileHash(path.join(root, file.path)), candidateSha256: safeFileHash(path.join(c.source, file.path)) }));
    for (const row of rows) { assert.equal(row.currentRootSha256, row.expectedSha256); assert.equal(row.candidateSha256, row.path === c.privateAliasFixture.policyPath ? c.privateAliasFixture.candidatePolicySha256 : row.expectedSha256); }
    return { count: rows.length, rows, allUnchanged: true };
  });
  check('browser-consumer-inputs', () => {
    assert.equal(browserInputs.priorInputs.length, 17);
    const admitted = new Map(frozen.files.map(f => [f.path, f.sha256]));
    const rows = browserInputs.priorInputs.map(file => {
      const currentRootSha256 = safeFileHash(path.join(root, file.path));
      const expectedRootSha256 = rootByPath.get(file.path) || file.sha256;
      assert.equal(currentRootSha256, expectedRootSha256);
      const inCandidate = admitted.has(file.path);
      const candidateSha256 = inCandidate ? safeFileHash(path.join(c.source, file.path)) : null;
      if (inCandidate) { assert.equal(candidateSha256, admitted.get(file.path)); assert.equal(candidateSha256, expectedRootSha256); }
      else assert(file.path.startsWith('plans/'), 'Consumer unexpectedly absent from source candidate');
      return { path: file.path, expectedSha256: expectedRootSha256, historicalSha256: file.sha256, approvedSourceChange: expectedRootSha256 !== file.sha256, currentRootSha256, candidateSha256,
        candidateScope: inCandidate ? 'admitted-source' : 'historical-evidence-outside-source-candidate' };
    });
    return { count: rows.length, rows, allApplicableHashesUnchanged: true };
  });
  check('originals-and-recovery-mirrors', () => {
    const original = read(path.join(__dirname, '../asset-inventory.json'));
    assert.equal(original.assets.length, 3);
    assert.deepEqual(inventoryPaths(path.join(root, 'public/uploads')), original.assets.map(a => a.relativeUploadPath).sort());
    const rows = original.assets.map(asset => {
      const mirrorRelative = path.relative(root, asset.isolatedCopy);
      assert(!mirrorRelative.startsWith('..') && !path.isAbsolute(mirrorRelative), 'Mirror escaped workspace');
      const originalSha256 = safeFileHash(path.join(root, asset.path));
      const mirrorSha256 = safeFileHash(asset.isolatedCopy);
      assert.equal(originalSha256, asset.sha256); assert.equal(mirrorSha256, asset.sha256);
      return { path: asset.path, expectedSha256: asset.sha256, originalSha256, mirrorSha256, contentsServedByThisScript: false };
    });
    return { count: rows.length, inventoryUnchanged: true, rows };
  });
  const build = receipt(selected.build), runtime = receipt(selected.runtime), stop = receipt(selected.databaseStop);
  report.receiptSummary = Object.fromEntries(Object.entries({ build, runtime, databaseStop: stop }).map(([key, value]) =>
    [key, { path: value.path, present: value.present, sha256: value.sha256 || null, passed: value.data?.passed ?? null }]));
  check('runtime-outside-checkout', () => {
    assert.equal(actualRuntime, path.join(c.storage, 'runtime-retry01')); const relative = path.relative(root, actualRuntime); assert(path.isAbsolute(relative) || relative.startsWith('..'));
    return { runtimePath: actualRuntime, outsideCheckout: true };
  });
  let externalRuntimeAdmitted = false;
  if (runtime.present) check('runtime-receipt-path-binding', () => {
    assert.equal(runtime.data.actualRuntimePath, actualRuntime);
    assert.equal(runtime.data.attempt, 'retry01');
    assert.equal(runtime.data.runtimeHarnessSha256, safeFileHash(path.join(__dirname, 'run-runtime-retry01.cjs')));
    assert.equal(runtime.data.runtimeStorage, externalRuntimeStorage);
    assert.equal(runtime.data.plannedRuntimePath, c.runtime);
    return { actualRuntimePath: actualRuntime, runtimeStorage: externalRuntimeStorage, plannedRuntimePath: c.runtime,
      limit: 'Receipt path binding only; filesystem ownership and content proof require the runtime copy to exist.' };
  });
  if (runtime.present && (runtime.data.passed || fs.existsSync(actualRuntime))) check('external-runtime-ownership', () => {
    assert(fs.existsSync(actualRuntime), 'A successful runtime receipt has no runtime directory');
    assert.equal(fs.realpathSync(externalRuntimeStorage), externalRuntimeStorage);
    assert.equal(fs.realpathSync(actualRuntime), actualRuntime);
    assert.equal(path.dirname(externalRuntimeStorage), path.parse(expectedStorage).root);
    const ownerFile = path.join(externalRuntimeStorage, 'runtime-ownership-retry01.json');
    const ownerSha256 = safeFileHash(ownerFile), owner = read(ownerFile);
    assert.equal(owner.root, root); assert.equal(owner.candidateId, c.candidateId);
    assert(build.present && build.data.passed, 'Runtime ownership requires a successful selected build');
    assert.equal(owner.artifactSha256, build.data.artifactSha256);
    assert.equal(runtime.data.artifactSha256, owner.artifactSha256);
    assert.equal(runtime.data.candidateId, owner.candidateId);
    assert.equal(runtime.data.dependencyIsolation?.outsideCheckout, true);
    assert.equal(runtime.data.dependencyIsolation?.nodePathAbsent, true);
    assert.equal(runtime.data.dependencyIsolation?.volumeNodeModulesAbsent, true);
    externalRuntimeAdmitted = true;
    return { runtimeStorage: externalRuntimeStorage, actualRuntimePath: actualRuntime, ownerSha256,
      ownerBinding: { root: owner.root, candidateId: owner.candidateId, artifactSha256: owner.artifactSha256 },
      realPathsMatch: true, dependencyIsolationReceipt: runtime.data.dependencyIsolation };
  });
  else report.externalRuntimeStatus = 'No runtime copy with a selected receipt; external ownership proof not established';
  check('private-alias-fixture-policy', () => {
    const f = c.privateAliasFixture; const decision = read(path.join(__dirname, '../private-alias-exclusion-20261102/asset-decision.json'));
    assert.equal(decision.status, 'resolved_private'); assert.deepEqual(f.rootPolicyRows, decision.assets); assert.equal(f.rootPolicyRows.length, 3);
    assert.equal(safeFileHash(path.join(root, f.policyPath)), f.rootPolicySha256); assert.equal(rootByPath.get(f.policyPath), f.rootPolicySha256);
    assert.equal(safeFileHash(path.join(c.source, f.policyPath)), f.candidatePolicySha256); assert.equal(frozenByPath.get(f.policyPath), f.candidatePolicySha256);
    assert.deepEqual(read(path.join(c.source, f.policyPath)), [...f.rootPolicyRows, f.syntheticAlias]);
    assert.equal(safeFileHash(path.join(c.source, f.syntheticAlias.source)), f.syntheticAlias.sha256);
    for (const a of f.rootPolicyRows) for (const relative of [a.source, a.uploadSource]) assert.equal(safeFileHash(path.join(root, relative)), a.sha256);
    return { originalAliasesPreserved: 3, explicitSyntheticAliases: 1, rootPolicySha256: f.rootPolicySha256, candidatePolicySha256: f.candidatePolicySha256, limit: f.qualificationLimit };
  });
  let artifact;
  if (build.present && build.data.passed) check('sealed-artifact', () => {
    assert.equal(build.data.candidateId, c.candidateId); assert.equal(build.data.candidate, c.source); assert.equal(build.data.artifact, c.artifact);
    artifact = verify(c.source, c.artifact, build.data.artifactSha256);
    assert.equal(artifact.version, 2); assert.deepEqual(artifact.source, frozen.files);
    assert(artifact.files.every(file => file.path.startsWith('runtime/')), 'Artifact entry outside runtime');
    assert.equal(artifact.legacyUploads.length, c.assetAnnex.length);
    assert.deepEqual(artifact.privateUploadAliases, [...c.privateAliasFixture.rootPolicyRows, c.privateAliasFixture.syntheticAlias].map(a => ({ ...a, destination: 'runtime/.private/uploads/' + a.uploadSource.slice('public/uploads/'.length) })));
    for (const alias of artifact.privateUploadAliases) assert(!artifact.files.some(f => f.path === 'runtime/' + alias.source));
    assert(!fs.existsSync(path.join(c.artifact, 'runtime/public/uploads')));
    for (const asset of c.assetAnnex) {
      const mapping = artifact.legacyUploads.find(row => row.source === asset.source);
      assert(mapping); assert.equal(mapping.sha256, asset.sha256);
      assert.equal(mapping.destination, 'runtime/.private/uploads/' + asset.source.slice('public/uploads/'.length));
    }
    return { buildId: artifact.buildId, artifactSha256: build.data.artifactSha256,
      files: artifact.files.length, privateMappings: artifact.legacyUploads, sealedBytesUnchanged: true };
  });
  else report.artifactStatus = 'Not independently qualified: selected build receipt missing or unsuccessful';
  if (artifact && externalRuntimeAdmitted) check('runtime-preservation', () => {
    const expected = new Map(artifact.files.map(f => [f.path.slice('runtime/'.length), f.sha256]));
    const actual = filesUnder(actualRuntime), actualByPath = new Map(actual.map(f => [f.path, f.sha256]));
    for (const [file, sha256] of expected) assert.equal(actualByPath.get(file), sha256, 'Sealed runtime changed: ' + file);
    const additions = actual.filter(file => !expected.has(file.path));
    assert(additions.every(file => file.path.startsWith('.next/cache/images/')), 'Unexpected runtime addition');
    assert(!fs.existsSync(path.join(actualRuntime, 'public/uploads')));
    return { actualRuntimePath: actualRuntime, sealedFiles: expected.size, allSealedBytesUnchanged: true, allowedImageCacheAdditions: additions };
  });
  else report.runtimeStatus = 'Runtime absent, external ownership unproven or no verified artifact; no runtime preservation pass inferred';
  check('selected-outcome-receipts', () => {
    if (runtime.present) {
      assert.equal(runtime.data.candidateId, c.candidateId);
      if (build.present && build.data.passed) assert.equal(runtime.data.artifactSha256, build.data.artifactSha256);
    }
    if (stop.present) { const readiness = read(path.join(__dirname, 'database/resume-20261102-r3-readiness.json')); assert.equal(readiness.passed, true); assert.equal(readiness.candidateId, c.candidateId); assert.equal(stop.data.cluster, path.join(root, '.codex-tmp/p03-grant-20261028-r1/postgres')); assert.equal(stop.data.run, 'resume-20261102-r3'); assert.equal(stop.data.mode, 'stop'); assert.equal(stop.data.postmasterPid, readiness.postmasterPid); }
    return { buildPassed: build.data?.passed === true, runtimePassed: runtime.data?.passed === true,
      runtimePortsReleased: runtime.data?.portsReleased === true, runtimeCleanupErrors: runtime.data?.cleanup || null,
      databaseStopped: stop.data?.passed === true && stop.data?.stopped === true, databasePortAvailable: stop.data?.portAvailable === true,
      evidenceLimit: 'Reconciled receipt claims only; no new runtime or database execution' };
  });
  report.integrityPassed = report.checks.every(row => row.passed);
  report.executionReceiptsReconciled = report.integrityPassed && !!artifact && report.checks.some(row => row.name === 'runtime-preservation' && row.passed) && build.data?.passed === true && runtime.data?.passed === true &&
    runtime.data?.portsReleased === true && Array.isArray(runtime.data?.cleanup) && runtime.data.cleanup.length === 0 &&
    stop.data?.passed === true && stop.data?.stopped === true && stop.data?.portAvailable === true;
} catch (error) { report.error = String(error.message || error).slice(0, 2500); }
finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  if (!report.integrityPassed) process.exitCode = 1;
  console.log(JSON.stringify({ integrityPassed: report.integrityPassed, executionReceiptsReconciled: report.executionReceiptsReconciled,
    failedChecks: report.checks.filter(row => !row.passed).map(row => row.name), error: report.error || null }));
}
