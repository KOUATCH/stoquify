'use strict';
// Read-only source admission reconciliation. The only write is a new evidence receipt.
// Run only after candidate-admission.json passes. Does not import app/browser/DB code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../../..');
const attempt = path.resolve(__dirname, '..');
const storage = path.resolve('D:/p04-r02-fullapp-20261102-r3');
const source = path.join(storage, 'source');
const repair = path.resolve(attempt, '../private-alias-exclusion-20261102');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const fileHash = file => hash(fs.readFileSync(file));
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--attempt' && ['retry01', 'retry02'].includes(args[1])), 'Only --attempt retry01 or retry02 is admitted');
const retryAttempt = args.length ? args[1] : null;
const output = path.join(__dirname, 'source-review-20261102-r3' + (retryAttempt ? '-' + retryAttempt : '') + '.json');
const historyName = 'prior-source-review-r2.json';
const historySha256 = '6efbb245b6563267a88b1ebe530b215900e941aa618101f8a0568a400fe53da6';
const evidenceOnly = 'plans/stoquify-production-readiness-2026-10-28/execution/P03/run-final-browser.cjs';
const policyPath = 'config/private-upload-aliases.json';
const approved = [
  { path: policyPath, sha256: '9cc5f6ee3f72c4a6d5eed6759b9e8ad8ab7fab90f11a7010374419fb7a4778fc' },
  { path: 'lib/media/legacy-upload-routing.ts', sha256: '6db25cc3f3486854115529b46d2eb6e60031708bbe5dac298c6c0a8ca31660f0' },
  { path: 'lib/media/__tests__/legacy-upload-routing.test.ts', sha256: '7b385f84c2111316b7340caec3c6ea583b5b1e7e1a9b1780fab190353e26e56c' },
  { path: 'app/api/uploads/[...path]/__tests__/route.test.ts', sha256: '19aea14cbb9b714a995d03338f388ea4d8b36485595e38e193447381f84f01ed' },
  { path: 'next.config.mjs', sha256: '26d86f5d38d19237d95338f4f16df7404677843bb0c7ec927a946b2d359ac5bf' },
  { path: 'docs/ecc/command-registry.json', sha256: 'e01ded2be9c2d9a26d62ce8bb290f8b1c1d5577405a60ceefede1323d576e381' },
  { path: 'scripts/release-artifact.cjs', sha256: 'f2c4e8ec0b3ec1197266eecb60efce9a63a9806abe2b1fba9c43c0f62919e42c' },
  { path: 'tests/s10-s11/release-artifact-private-uploads.test.js', sha256: 'bfcc0856cec266fe71f727b1da4a5eb7c7231babb33889c4c72208d8f7f1be73' },
];
const approvedAliases = [
  { source: 'public/images/cabin-1.jpg', uploadSource: 'public/uploads/cmp_org_005/a032d164-c607-4d66-9050-367cf45f0008.jpg', sha256: 'd1e189c5e05a7f1b135f6c84bf085d2e474fe2bd5ed975b2112fa826466d1225' },
  { source: 'public/images/cabin-2.jpg', uploadSource: 'public/uploads/cmp_org_005/f2f43248-c73b-4104-a865-e0f02c2b0ace.jpg', sha256: '447974bd44d3bf2a74cec021b1e27a3f26cb5f2e7bedafa0502790eee69b7519' },
  { source: 'public/images/profile.jpg', uploadSource: 'public/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg', sha256: '79b124faf6ee6312dd34ba999455e9d09ecb5c4d93ed63e494a414fd74f8a6d2' },
];
const syntheticAlias = { source: 'public/images/p04-private-alias.png', uploadSource: 'public/uploads/p04-upload-a/sentinel.png', sha256: '5502427f9ce2e61b2a69910fb9092462f0d0f49136d3097eefa946a6f6638b5d' };

// Missing admission is not a failed execution receipt: refuse before any output write.
assert.equal(root, path.resolve('E:/ohada saas/Focused projects/stoquify'));
assert(!fs.existsSync(output), 'Historical source review must not be overwritten');
const admissionFile = path.join(attempt, 'candidate-admission.json');
const admission = read(admissionFile);
assert.equal(admission.passed, true, 'Passed candidate admission is required');
const c = read(path.join(attempt, 'candidate-context.json'));
assert.equal(admission.candidateId, c.candidateId, 'Candidate identity changed');
assert.equal(c.root, root);
assert.equal(c.storage, storage);
assert.equal(c.source, source);
assert.equal(admission.source, source);
assert.equal(fs.realpathSync(source), source);
const owner = read(path.join(storage, 'ownership.json'));
assert.equal(owner.root, root);
assert.equal(owner.noDeployment, true);
const report = {
  startedAt: new Date().toISOString(), passed: false,
  evidenceClass: 'candidate_bound_source_provenance_and_syntax_not_application_execution',
  candidateId: c.candidateId, root, source,
  attempt: retryAttempt || 'initial',
  admission: { file: '../candidate-admission.json', sha256: fileHash(admissionFile), passed: true },
  historicalReview: { file: historyName, sha256: historySha256, preserved: true },
  priorInputs: [], additionalInputs: [], approvedChanges: [], checks: [],
  executed: { application: false, browser: false, database: false, syntaxOnlyNodeChildren: true },
  limit: 'This scoped review does not claim the whole working tree is unchanged, a clean install, a successful application build, or an authorized-read/denial browser gate. The four-entry fixture policy is not deployable production policy.',
};
function check(name, fn) {
  try { const details = fn(); report.checks.push({ name, passed: true, details }); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); }
}
try {
  const rootManifestFile = path.join(attempt, 'root-source-manifest.json');
  const candidateManifestFile = path.join(attempt, 'candidate-source-manifest.json');
  const rootManifest = read(rootManifestFile);
  const candidateManifest = read(candidateManifestFile);
  const rootFiles = new Map(rootManifest.files.map(f => [f.path, f.sha256]));
  const candidateFiles = new Map(candidateManifest.files.map(f => [f.path, f.sha256]));
  const fixture = c.privateAliasFixture;
  check('admitted-manifest-binding', () => {
    assert.equal(rootFiles.size, rootManifest.files.length);
    assert.equal(candidateFiles.size, candidateManifest.files.length);
    assert.equal(rootFiles.size, 9134);
    assert.equal(candidateFiles.size, 9136);
    assert.equal(candidateManifest.head, rootManifest.head);
    assert.equal(hash(JSON.stringify(candidateManifest.files)), admission.sourceManifestSha256);
    assert.equal(c.candidateId, 'p04-r02-full-' + admission.sourceManifestSha256.slice(0, 12));
    assert.equal(admission.sourceFiles, candidateFiles.size);
    assert.deepEqual(admission.privateAliasFixture, fixture);
    assert.deepEqual(candidateManifest.fixtureSourceOverrides, [fixture]);
    assert.deepEqual(candidateManifest.fixtureSourceAdditions, ['public/p04-public-control.png', syntheticAlias.source]);
    assert.deepEqual(candidateManifest.ignoredAssetAnnex, c.assetAnnex);
    assert.equal(admission.assetAnnexCount, c.assetAnnex.length);
    assert.deepEqual([...candidateFiles.keys()].filter(p => !rootFiles.has(p)).sort(), ['public/p04-public-control.png', syntheticAlias.source].sort());
    assert([...rootFiles.keys()].every(p => candidateFiles.has(p)), 'Candidate dropped captured root source');
    assert.deepEqual([...rootFiles.keys()].filter(p => rootFiles.get(p) !== candidateFiles.get(p)), [policyPath]);
    return { rootManifestSha256: fileHash(rootManifestFile), candidateManifestSha256: fileHash(candidateManifestFile), rootFiles: rootFiles.size, candidateFiles: candidateFiles.size, head: candidateManifest.head };
  });
  const historyFile = path.join(__dirname, historyName);
  assert.equal(fileHash(historyFile), historySha256, 'Historical review copy changed');
  assert.equal(fileHash(path.resolve(attempt, '../full-app-20261102-r2/browser/source-review-20261102-r2.json')), historySha256, 'Historical original review changed');
  const prior = read(historyFile);
  assert.equal(prior.priorInputs.length, 17);
  assert.equal(new Set(prior.priorInputs.map(i => i.path)).size, 17);
  assert.equal(prior.additionalInputs.length, 7);
  const approvedMap = new Map(approved.map(i => [i.path, i.sha256]));
  function reconcile(input, category) {
    const currentRootSha256 = fileHash(path.join(root, input.path));
    const row = { path: input.path, priorSha256: input.sha256, currentRootSha256 };
    report[category].push(row);
    if (input.path === evidenceOnly) {
      assert.equal(currentRootSha256, input.sha256, 'Historical P03 evidence changed');
      assert(!rootFiles.has(input.path) && !candidateFiles.has(input.path));
      assert(!fs.existsSync(path.join(source, input.path)));
      Object.assign(row, { status: 'unchanged_historical_evidence_excluded_from_candidate', candidateSha256: null, reason: 'plans/ is outside the candidate source capture; retained only as historical consumer-reference evidence' });
      return row;
    }
    const currentCandidateSha256 = fileHash(path.join(source, input.path));
    Object.assign(row, { rootManifestSha256: rootFiles.get(input.path), candidateManifestSha256: candidateFiles.get(input.path), currentCandidateSha256 });
    assert.equal(currentRootSha256, rootFiles.get(input.path), 'Root drift since capture: ' + input.path);
    assert.equal(currentCandidateSha256, candidateFiles.get(input.path), 'Candidate drift since admission: ' + input.path);
    assert.equal(currentCandidateSha256, currentRootSha256, 'Unexpected consumer fixture override: ' + input.path);
    if (currentRootSha256 === input.sha256) row.status = 'unchanged_from_prior_review';
    else {
      assert.equal(currentRootSha256, approvedMap.get(input.path), 'Unapproved prior consumer drift: ' + input.path);
      row.status = 'approved_exact_alias_repair_change';
    }
    return row;
  }
  for (const input of prior.priorInputs) check('prior-consumer:' + input.path, () => reconcile(input, 'priorInputs'));
  for (const input of prior.additionalInputs) check('additional-consumer:' + input.path, () => reconcile(input, 'additionalInputs'));
  check('exact-eight-file-approved-repair', () => {
    const approvedFile = path.join(repair, 'owned-source-tested.json');
    assert.deepEqual(read(approvedFile), approved, 'Reviewed repair hashes changed');
    const previousRoot = new Map(read(path.resolve(attempt, '../full-app-20261102-r2/root-source-manifest.json')).files.map(f => [f.path, f.sha256]));
    for (const input of approved) {
      const currentRootSha256 = fileHash(path.join(root, input.path));
      const currentCandidateSha256 = fileHash(path.join(source, input.path));
      const expectedCandidateSha256 = input.path === policyPath ? fixture.candidatePolicySha256 : input.sha256;
      const row = { path: input.path, priorRootSha256: previousRoot.get(input.path) || null, approvedRootSha256: input.sha256, currentRootSha256, currentCandidateSha256, candidateManifestSha256: candidateFiles.get(input.path), status: input.path === policyPath ? 'approved_root_policy_with_exact_synthetic_fixture_override' : 'approved_exact_alias_repair_change' };
      report.approvedChanges.push(row);
      assert.equal(currentRootSha256, input.sha256, 'Approved root repair drift: ' + input.path);
      assert.equal(rootFiles.get(input.path), input.sha256, 'Root capture repair mismatch: ' + input.path);
      assert.equal(currentCandidateSha256, expectedCandidateSha256, 'Candidate repair drift: ' + input.path);
      assert.equal(candidateFiles.get(input.path), expectedCandidateSha256, 'Candidate capture repair mismatch: ' + input.path);
    }
    return { evidence: '../private-alias-exclusion-20261102/owned-source-tested.json', evidenceSha256: fileHash(approvedFile), files: approved.length };
  });
  check('three-real-plus-one-synthetic-policy-provenance', () => {
    const decision = read(path.join(repair, 'asset-decision.json'));
    assert.equal(decision.status, 'resolved_private');
    assert.deepEqual(decision.assets, approvedAliases);
    assert.equal(fixture.policyPath, policyPath);
    assert.deepEqual(fixture.rootPolicyRows, approvedAliases);
    assert.deepEqual(fixture.syntheticAlias, syntheticAlias);
    assert.deepEqual(read(path.join(root, policyPath)), approvedAliases);
    const candidatePolicyBytes = fs.readFileSync(path.join(source, policyPath));
    assert.deepEqual(JSON.parse(candidatePolicyBytes), [...approvedAliases, syntheticAlias]);
    assert(candidatePolicyBytes.equals(Buffer.from(JSON.stringify([...approvedAliases, syntheticAlias], null, 2) + '\n')), 'Unexpected fixture policy serialization');
    assert.equal(fixture.rootPolicySha256, approvedMap.get(policyPath));
    assert.equal(fixture.candidatePolicySha256, hash(candidatePolicyBytes));
    assert.equal(candidateFiles.get(policyPath), fixture.candidatePolicySha256);
    assert.equal(fileHash(path.join(source, syntheticAlias.source)), syntheticAlias.sha256);
    assert.equal(candidateFiles.get(syntheticAlias.source), syntheticAlias.sha256);
    assert.equal(fileHash(path.join(source, syntheticAlias.uploadSource)), syntheticAlias.sha256);
    assert.equal(c.assetAnnex.find(a => a.source === syntheticAlias.uploadSource && a.synthetic === true)?.sha256, syntheticAlias.sha256);
    assert.equal(fileHash(path.join(source, 'public/p04-public-control.png')), c.publicControlSha256);
    assert.equal(candidateFiles.get('public/p04-public-control.png'), c.publicControlSha256);
    report.privateAliasPolicy = { rootRows: approvedAliases, syntheticAlias, rootPolicySha256: fixture.rootPolicySha256, candidatePolicySha256: fixture.candidatePolicySha256, rootRowCount: 3, candidateRowCount: 4, productionPolicyUnmodifiedByFixture: true, artifactScope: 'candidate_only_synthetic_alias_fixture_policy_not_deployable' };
    return report.privateAliasPolicy;
  });
  const harnessFiles = ['run-browser.cjs', 'private-alias-probe.cjs', 'private-alias-probe.test.cjs', 'signin-cadence.cjs', 'signin-cadence.test.cjs', 'rendered-readiness.cjs', 'rendered-readiness.test.cjs', 'ALIAS-PROXY-CONTRACT.md', 'review-candidate-source.cjs'];
  report.harnessInputs = harnessFiles.map(name => ({ path: name, sha256: fileHash(path.join(__dirname, name)) }));
  const syntaxEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => ['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC'].includes(k.toUpperCase())));
  for (const name of harnessFiles.filter(n => n.endsWith('.cjs'))) check('syntax-only:' + name, () => {
    const result = spawnSync(process.execPath, ['--check', path.join(__dirname, name)], { cwd: root, env: syntaxEnv, windowsHide: true, timeout: 30000, encoding: 'utf8' });
    assert(!result.error && result.status === 0, 'Node syntax check failed: ' + name);
    return { node: process.execPath, command: 'node --check', file: name, exitCode: result.status, sourceSha256: fileHash(path.join(__dirname, name)) };
  });
  check('pure-helper-evidence-input-binding', () => {
    const receipt = read(path.join(__dirname, 'pure-protocol-checks.json'));
    for (const name of ['private-alias-probe.cjs', 'private-alias-probe.test.cjs']) assert.equal(receipt.hashes.find(h => h.path === name)?.sha256, fileHash(path.join(__dirname, name)), 'Pure receipt input changed: ' + name);
    assert.equal(receipt.hashes.find(h => h.path === 'run-browser.cjs')?.sha256, fileHash(path.join(__dirname, 'pre-retry01/run-browser.cjs')), 'Historical harness used for protocol evidence changed');
    const test = receipt.commands.find(c => c.tests === 18);
    assert(test && test.passed === 18 && test.failed === 0 && test.exitCode === 0);
    return { file: 'pure-protocol-checks.json', sha256: fileHash(path.join(__dirname, 'pure-protocol-checks.json')), tests: 18, testsRerun: false, evidenceClass: 'historical_pure_helper_assertions_only' };
  });
  check('retry-harness-evidence-and-first-run-preservation', () => {
    assert(['retry01', 'retry02'].includes(retryAttempt), 'Changed harness requires a distinct retry source receipt');
    const preserved = read(path.join(__dirname, 'pre-retry01/recipe-hashes.json'));
    for (const entry of preserved.files) assert.equal(fileHash(path.join(__dirname, 'pre-retry01', entry.path)), entry.sha256);
    const priorReceipt = read(path.join(__dirname, 'source-review-20261102-r3.json'));
    assert.equal(priorReceipt.passed, true);
    assert.equal(priorReceipt.candidateId, c.candidateId);
    for (const name of ['run-browser.cjs', 'review-candidate-source.cjs']) assert.equal(priorReceipt.harnessInputs.find(h => h.path === name)?.sha256, fileHash(path.join(__dirname, 'pre-retry01', name)), 'First admitted recipe changed');
    const failurePreservation = read(path.join(__dirname, 'pre-retry01/failed-evidence-hashes.json'));
    for (const entry of failurePreservation.files) assert.equal(fileHash(path.join(__dirname, entry.path)), entry.sha256, 'First failed execution evidence changed');
    if (retryAttempt === 'retry02') {
      const previous = read(path.join(__dirname, 'pre-retry02/recipe-hashes.json'));
      const previousReceipt = read(path.join(__dirname, 'source-review-20261102-r3-retry01.json'));
      assert.equal(previousReceipt.passed, true);
      assert.equal(previousReceipt.candidateId, c.candidateId);
      for (const entry of previous.files) {
        assert.equal(fileHash(path.join(__dirname, 'pre-retry02', entry.path)), entry.sha256);
        assert.equal(previousReceipt.harnessInputs.find(h => h.path === entry.path)?.sha256, entry.sha256, 'Retry01 admitted recipe changed');
      }
      const previousFailure = read(path.join(__dirname, 'pre-retry02/failed-evidence-hashes.json'));
      for (const entry of previousFailure.files) assert.equal(fileHash(path.join(__dirname, entry.path)), entry.sha256, 'Retry01 execution evidence changed');
    }
    const receiptName = retryAttempt + '-harness-checks.json';
    const receipt = read(path.join(__dirname, receiptName));
    assert.equal(receipt.passed, true);
    assert.equal(receipt.executed.application, false);
    assert.equal(receipt.executed.browser, false);
    assert.equal(receipt.executed.database, false);
    const currentInputs = ['run-browser.cjs', 'signin-cadence.cjs', 'signin-cadence.test.cjs', 'review-candidate-source.cjs', ...(retryAttempt === 'retry02' ? ['rendered-readiness.cjs', 'rendered-readiness.test.cjs'] : [])];
    for (const name of currentInputs) assert.equal(receipt.hashes.find(h => h.path === name)?.sha256, fileHash(path.join(__dirname, name)), 'Retry receipt input changed: ' + name);
    assert.equal(receipt.cadenceTests.failed, 0);
    assert.equal(receipt.cadenceTests.passed, receipt.cadenceTests.tests);
    assert(receipt.cadenceTests.tests >= 11);
    if (retryAttempt === 'retry02') {
      assert.equal(receipt.readinessTests.failed, 0);
      assert.equal(receipt.readinessTests.passed, receipt.readinessTests.tests);
      assert(receipt.readinessTests.tests >= 7);
    }
    return { receipt: receiptName, sha256: fileHash(path.join(__dirname, receiptName)), originalSourceReviewRetained: true, originalFailedRunRetained: true, retry01Retained: retryAttempt === 'retry02', cadenceTests: receipt.cadenceTests, readinessTests: receipt.readinessTests, applicationGate: false };
  });
  check('browser-tool-file-readiness-only', () => {
    assert.equal(process.platform, 'win32');
    const playwrightPackage = path.join(root, 'node_modules/playwright/package.json');
    const browsersFile = path.join(root, 'node_modules/playwright-core/browsers.json');
    const version = read(playwrightPackage).version;
    assert.equal(version, '1.61.1');
    const metadata = read(browsersFile).browsers;
    const chromium = metadata.find(b => b.name === 'chromium');
    const headless = metadata.find(b => b.name === 'chromium-headless-shell');
    assert.equal(chromium.revision, '1228');
    assert.equal(headless.revision, '1228');
    const browserRoot = path.resolve('C:/Users/J COMPUTER/AppData/Local/ms-playwright');
    const chromiumExecutable = path.join(browserRoot, 'chromium-1228/chrome-win64/chrome.exe');
    const headlessExecutable = path.join(browserRoot, 'chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe');
    const openssl = path.resolve('C:/Program Files/Git/usr/bin/openssl.exe');
    const files = [chromiumExecutable, headlessExecutable, openssl].map(file => ({ path: file, regularFile: fs.existsSync(file) && fs.statSync(file).isFile() }));
    assert(files.every(f => f.regularFile), 'Reviewed browser/TLS binary missing');
    report.toolReadiness = { node: process.execPath, nodeVersion: process.version, playwrightVersion: version, playwrightPackageSha256: fileHash(playwrightPackage), browserMetadataSha256: fileHash(browsersFile), files, browserLaunched: false, tlsGenerated: false, resolutionLimit: 'Filesystem presence at the previously reviewed native paths; actual runtime must resolve and launch these tools itself.' };
    return report.toolReadiness;
  });
  report.priorInputCounts = { required: 17, recorded: report.priorInputs.length, candidateSourceInputs: report.priorInputs.filter(i => i.path !== evidenceOnly).length, historicalEvidenceOnly: report.priorInputs.filter(i => i.path === evidenceOnly).length };
  assert.equal(report.priorInputCounts.recorded, 17);
  report.passed = report.checks.every(check => check.passed);
} catch (error) {
  report.error = error.message;
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ passed: report.passed, candidateId: report.candidateId, output, failedChecks: report.checks.filter(c => !c.passed).map(c => ({ name: c.name, error: c.error })), error: report.error }));
  if (!report.passed) process.exitCode = 1;
}
