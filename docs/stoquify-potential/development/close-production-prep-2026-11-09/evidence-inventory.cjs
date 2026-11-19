// File-only inventory of retained local receipts. No tests, application imports,
// environment files, network, database, generation, install or provider calls.
// Only EVIDENCE_INVENTORY.json is written; original receipts remain unchanged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = file => path.relative(root, file).replaceAll('\\', '/');
const pin = file => ({ path: rel(file), sha256: sha(file), bytes: fs.statSync(file).size });
const evidence = relative => path.join(__dirname, relative);
const bindings = (file, entries) => ({
  receipt: pin(file),
  checkedFiles: entries.length,
  currentMatches: entries.filter(entry => fs.existsSync(path.join(root, entry.path)) && sha(path.join(root, entry.path)) === entry.sha256).length,
  changedOrAbsent: entries.filter(entry => !fs.existsSync(path.join(root, entry.path)) || sha(path.join(root, entry.path)) !== entry.sha256).map(entry => entry.path),
});
function retainedFailures(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...retainedFailures(file));
    else if (/^(verification|pg-RESULT|RESULT)\.json$/.test(entry.name)) {
      const receipt = read(file);
      if (receipt.passed === false) found.push({ receipt: pin(file), kind: entry.name,
        cleanupFailureRecorded: !!receipt.cleanupFailure, reportedFailedTests: receipt.failedTests ?? null,
        reportedPassedTests: receipt.passedTests ?? null, exitCode: receipt.exitCode ?? null });
    }
  }
  return found;
}

function main() {
  assert.equal(process.argv.length, 2, 'No inputs or overrides; reads only this retained packet');
  const directories = fs.readdirSync(__dirname, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
  const attempts = [], candidates = new Map(), incomplete = [];
  for (const directory of directories.filter(name => /^unit-/.test(name))) {
    const verificationFile = evidence(directory + '/verification.json'), resultsFile = evidence(directory + '/results.json');
    if (!fs.existsSync(verificationFile) || !fs.existsSync(resultsFile)) {
      incomplete.push({ directory, verificationPresent: fs.existsSync(verificationFile), resultsPresent: fs.existsSync(resultsFile) }); continue;
    }
    const verification = read(verificationFile), results = read(resultsFile);
    const attempt = { directory, verification: pin(verificationFile), results: pin(resultsFile), finished: verification.finished, passed: verification.passed,
      reportedPassed: results.numPassedTests, reportedFailed: results.numFailedTests, reportedPending: results.numPendingTests,
      reportedTodo: results.numTodoTests, suites: [] };
    for (const suite of results.testResults) {
      const file = rel(suite.name), expected = verification.suiteHashes[file], current = fs.existsSync(suite.name) && sha(suite.name) === expected;
      const counts = suite.assertionResults.reduce((accumulator, test) => { accumulator[test.status] = (accumulator[test.status] || 0) + 1; return accumulator; }, {});
      const subject = { file, passed: counts.passed || 0, failed: counts.failed || 0, pending: counts.pending || 0, todo: counts.todo || 0,
        testSha256: expected, currentTestMatches: current, resultStatus: suite.status, selectedFrom: directory, finished: verification.finished };
      attempt.suites.push({ file, currentTestMatches: current, counts });
      if (verification.passed && verification.unchangedInputs && results.success && suite.status === 'passed' && current && !subject.failed && !subject.pending && !subject.todo) {
        const prior = candidates.get(file);
        if (!prior || Date.parse(subject.finished) > Date.parse(prior.finished)) candidates.set(file, subject);
      }
    }
    attempts.push(attempt);
  }
  const selected = [...candidates.values()].sort((a, b) => a.file.localeCompare(b.file));
  const service = selected.filter(suite => /^(actions|services)\//.test(suite.file));
  const jsdom = selected.filter(suite => /^(components|hooks)\//.test(suite.file));
  assert.equal(service.length, 14); assert.equal(service.reduce((sum, suite) => sum + suite.passed, 0), 796);
  assert.equal(jsdom.length, 4); assert.equal(jsdom.reduce((sum, suite) => sum + suite.passed, 0), 161);
  const controlsFile = evidence('controls-468cc2a459/verification.json'), controls = read(controlsFile);
  assert(controls.passed && controls.expectedBlockedTemplate); assert.equal(controls.pureTests, 15);
  const controlsBindings = bindings(controlsFile, Object.entries(controls.sourceHashes).map(([file, hash]) => ({ path: file, sha256: hash })));
  assert.equal(controlsBindings.changedOrAbsent.length, 0);
  const authFile = evidence('auth-typing/unit-317902eb0e/RESULT.json'), auth = read(authFile);
  const authResultsFile = evidence('auth-typing/unit-317902eb0e/results.json'), authResults = read(authResultsFile);
  const typingFile = evidence('auth-typing/proof-c8b1c6a182/RESULT.json'), typing = read(typingFile);
  assert(auth.passed && auth.unchangedInputs && authResults.success); assert.equal(auth.passedTests, 87); assert.equal(authResults.numPassedTests, 87); assert.equal(auth.skipped, 0);
  assert.equal(authResults.numFailedTests, 0); assert.equal(authResults.numPendingTests, 0); assert.equal(authResults.numTodoTests, 0);
  assert(typing.passed && typing.emittedJavaScriptIdentical); assert.equal(typing.newDiagnostics.length, 0);
  assert.equal(sha(path.join(root, 'lib/auth.ts')), typing.proposedSourceSha256);
  const authBindings = bindings(authFile, Object.entries(auth.sourceHashes).map(([file, hash]) => ({ path: file, sha256: hash })));
  assert.equal(authBindings.changedOrAbsent.length, 0);

  const retentionFile = evidence('pg-RETENTION_LATEST.json'), retention = read(retentionFile);
  const producerFile = evidence('ca03-producer/pg-LATEST.json'), producer = read(producerFile);
  const admissionFile = evidence('earned-close/QUALIFICATION_ADMISSION.json'), admission = read(admissionFile);
  assert(retention.passed && retention.ownedClusterStopped && producer.passed && producer.ownedClusterStopped);
  assert(admission.passed && admission.ownedClusterStopped && admission.sourceAndPrivateClientRechecked);
  assert.equal(admission.status, 'PASS_SERVICE_QUALIFICATION_WITH_CLEANUP_SUPPLEMENT');
  for (const item of [admission.originalReceipt, admission.originalLatestPreserved, admission.cleanupSupplement, admission.runner, ...admission.evidence]) assert.equal(sha(item.path), item.sha256);
  const original = read(admission.originalReceipt.path), cleanup = read(admission.cleanupSupplement.path);
  assert.equal(original.passed, false); assert.equal(original.cleanupFailure, 'pg-stop failed; retained evidence available');
  assert(cleanup.passed && cleanup.pgCtlStatusExitCode === 3 && cleanup.postmasterPidAbsent && cleanup.portReleased);
  const database = [
    { kind: 'retention-migration-services-and-SQL', receipt: pin(retentionFile), tests: retention.checks.find(check => check.name === 'realRetentionServicesAndSql').tests, ownedClusterStopped: true,
      limitation: retention.limitation, sourceManifest: path.join(retention.evidenceDirectory, 'pg-SOURCE_MANIFEST.json') },
    { kind: 'monthly-import-run-sign-coverage-producers', receipt: pin(producerFile), tests: producer.checks.find(check => check.name === 'actualProducerServiceCases').passedTests, ownedClusterStopped: true,
      limitation: producer.limitation, sourceManifest: path.join(producer.evidenceDirectory, 'pg-SOURCE_MANIFEST.json') },
    { kind: 'earned-internal-system-close-lifecycle', receipt: pin(admissionFile), tests: admission.admittedTests, namedPhases: admission.admittedNamedPhases, status: admission.status,
      ownedClusterStopped: true, observedCounts: admission.expectedCounts, originalFailedReceipt: pin(admission.originalReceipt.path), cleanupSupplement: pin(admission.cleanupSupplement.path),
      limitation: admission.limitation, sourceManifest: path.join(admission.evidenceDirectory, 'pg-SOURCE_MANIFEST.json') },
  ];
  for (const item of database) {
    const manifest = read(item.sourceManifest); item.sourceBinding = bindings(item.sourceManifest, manifest.files); delete item.sourceManifest;
    assert.equal(item.sourceBinding.changedOrAbsent.length, 0);
  }
  assert.deepEqual(database.map(item => item.tests), [23, 12, 6]);
  const rendered = ['rendered-ui/attempt-a8675761fb', 'rendered-monthly-ui/attempt-84f64b33a3'].map(directory => {
    const file = evidence(directory + '/RESULT.json'), result = read(file), sourceFile = evidence(directory + '/SOURCE_BINDING.json'), source = read(sourceFile);
    assert(result.passed && result.browserClosed && result.serverClosed); assert.equal(sha(sourceFile), result.sourceBindingSha256);
    const check = bindings(sourceFile, source.source); assert.equal(check.changedOrAbsent.length, 0);
    return { receipt: pin(file), sourceBinding: check, recordedCases: result.results.reduce((sum, row) => sum + row.cases.length, 0),
      variants: result.results.map(row => ({ locale: row.locale, viewportWidth: row.width, cases: row.cases.length, overflow: row.geometry.documentWidth > row.geometry.viewport,
        axeViolations: row.axe.violations.length, axeIncomplete: row.axe.incomplete })),
      browserClosed: result.browserClosed, serverClosed: result.serverClosed, classification: result.evidenceClass, limitations: result.limitations };
  });
  assert.deepEqual(rendered.map(item => item.recordedCases), [40, 32]);
  const staticFile = evidence('static-68242d33b5/verification.json'), staticResult = read(staticFile);
  assert.equal(staticResult.passed, false);
  const inventory = {
    checkedAt: new Date().toISOString(), status: 'IN_PROGRESS_LOCAL_EVIDENCE_INVENTORY', releaseApproved: false, deploymentApproved: false,
    scope: 'Retained receipt/source/hash inventory only; this runner executes no test, build, application, database, provider or deployment.',
    runner: pin(__filename),
    counts: { distinctMockedServiceActionSuites: service.length, mockedServiceActionTests: service.reduce((sum, item) => sum + item.passed, 0),
      distinctJsdomSuites: jsdom.length, jsdomComponentHookTests: jsdom.reduce((sum, item) => sum + item.passed, 0),
      distinctMockedAuthSuites: authResults.testResults.length, mockedAuthRegressionTests: authResults.numPassedTests,
      pureReleaseControlTests: controls.pureTests, realDatabaseTests: database.reduce((sum, item) => sum + item.tests, 0),
      earnedCloseNamedPhases: admission.admittedNamedPhases, mockedAuthActionRenderedCases: rendered.reduce((sum, item) => sum + item.recordedCases, 0) },
    countingRule: 'Select the latest passing receipt per test suite only when its test-file hash still matches. Count each suite once. Reconciliation actions has26 tests in both789 and33 batches, so selected service/action count is789+33-26=796. Evidence classes are separate; rendered variants and lifecycle phase checks are not extra unit tests.',
    selectedUnitSuites: selected, unitAttempts: attempts, incompleteUnitAttemptArtifacts: incomplete, retainedFailedAttemptReceipts: retainedFailures(__dirname),
    mockedSharedAuth: { receipt: pin(authFile), results: pin(authResultsFile), tests: authResults.numPassedTests, skipped: auth.skipped,
      suites: authResults.testResults.map(suite => ({ file: rel(suite.name), tests: suite.assertionResults.length, status: suite.status })),
      sourceBinding: authBindings, classification: auth.classification,
      typeOnlyFixProof: { receipt: pin(typingFile), beforeSourceSha256: typing.beforeSourceSha256, proposedSourceSha256: typing.proposedSourceSha256,
        emittedJavaScriptIdentical: typing.emittedJavaScriptIdentical, newDiagnosticCount: typing.newDiagnostics.length, installedDeclarations: typing.installedDeclarations,
        classification: typing.classification } },
    pureControls: { receipt: pin(controlsFile), tests: controls.pureTests, expectedIncompleteTemplateBlocked: controls.expectedBlockedTemplate, sourceBinding: controlsBindings },
    realDatabase: database, rendered,
    failedWholeTreeStaticCheck: { receipt: pin(staticFile), checks: staticResult.checks.map(check => ({ name: check.name, exitCode: check.exitCode, error: check.error })),
      lintErrors: staticResult.lintErrors, lintWarnings: staticResult.lintWarnings,
      recordedDiagnosticCount: 3, diagnosis: ['Shared lib/auth.ts SDK Response overload inference', 'Two preserved repair-r1 source-copy imports included in compilation'],
      currentBoundInputCheck: bindings(staticFile, Object.entries(staticResult.sourceHashes).map(([file, hash]) => ({ path: file, sha256: hash }))) },
    pending: ['New whole-tree compiler qualification after the typing and archive-exclusion changes',
      'Actual authenticated current-source application/browser qualification', 'Selected production host/public domain and compatible target artifact', 'Real live delivery/invitation, scheduler and hosted recovery evidence', 'Independent domain and production-promotion acceptance'],
    limits: ['Unit dependencies are mocked; jsdom is not a real authenticated browser.', 'Rendered72 cases use mocked authentication/actions.', 'Database41 tests use isolated synthetic facts; earned close is internal system evidence, not statutory approval.',
      'Old failed and superseded receipts remain preserved; admission supplement does not rewrite the original PG cleanup failure.', 'No full current sealed artifact or live-delivery readiness follows from this inventory.'],
  };
  const output = evidence('EVIDENCE_INVENTORY.json'); fs.writeFileSync(output, JSON.stringify(inventory, null, 2) + '\n');
  console.log(JSON.stringify({ status: inventory.status, counts: inventory.counts, selectedUnitSuites: selected.length, output: rel(output), sha256: sha(output) }));
}
main();
