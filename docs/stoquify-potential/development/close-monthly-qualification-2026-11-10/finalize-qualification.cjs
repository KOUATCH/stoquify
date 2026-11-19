// Evidence admission only: reads existing local receipts/source and writes one
// new JSON record. No application, database, network, build or secret loading.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const local = relative => path.join(__dirname, relative);
const receipt = relative => ({ path: relative.replaceAll('\\', '/'), sha256: digest(local(relative)) });
function verifyMap(map) { for (const [file, sha] of Object.entries(map)) assert.equal(digest(path.join(root, file)), sha, 'Changed input: ' + file); }
function verifyFiles(base, files) { for (const file of files) assert.equal(digest(path.join(base, file.path)), file.sha256, 'Changed file: ' + file.path); }
function verifyPin(pin) {
  assert(pin && typeof pin.path === 'string' && !path.isAbsolute(pin.path));
  const file = path.resolve(root, pin.path), relative = path.relative(root, fs.realpathSync(file));
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
  assert.equal(digest(file), pin.sha256); if (pin.bytes !== undefined) assert.equal(fs.statSync(file).size, pin.bytes);
}
function main() {
  assert.deepEqual(process.argv.slice(2), ['admit']);
  const output = local('FINAL_QUALIFICATION.json'); assert(!fs.existsSync(output), 'Existing admission is preserved');
  const unitPaths = ['unit-320cb51326/verification.json', 'ui-unit-2d2e071850/verification.json', 'ui-unit-7beb0ed572/verification.json'];
  const units = unitPaths.map(readRelative => read(local(readRelative))), totals = [155, 76, 22];
  const suites = new Set();
  units.forEach((unit, index) => {
    assert(unit.passed && unit.unchangedInputs); assert.equal(unit.passedTests, totals[index]); assert.equal(unit.failedTests, 0); assert.equal(unit.skipped, 0);
    verifyMap(unit.suiteHashes); if (unit.inputHashesBefore) { verifyMap(unit.inputHashesBefore); assert.deepEqual(unit.inputHashesBefore, unit.inputHashesAfter); }
    for (const file of Object.keys(unit.suiteHashes).filter(file => /\.test\.tsx?$/.test(file))) { assert(!suites.has(file), 'Repeated suite'); suites.add(file); }
  }); assert.equal(suites.size, 7);
  const staticPath = 'static-c519a9b3bf/verification.json', compiler = read(local(staticPath));
  assert(compiler.passed && compiler.unchangedInputs); assert.equal(compiler.lintErrors, 0); verifyMap(compiler.sourceHashes);
  const renderedPath = 'rendered-ui/attempt-254a51fb41', rendered = read(local(renderedPath + '/RESULT.json'));
  assert(rendered.passed && rendered.browserClosed && rendered.serverClosed); assert.equal(rendered.remainingOwnedProfiles, 0);
  const renderedBinding = read(local(renderedPath + '/SOURCE_BINDING.json')); verifyFiles(root, renderedBinding.source); verifyFiles(local(renderedPath), renderedBinding.files);
  assert.equal(digest(local(renderedPath + '/SOURCE_BINDING.json')), rendered.sourceBindingSha256);
  assert.equal(rendered.results.reduce((sum, row) => sum + row.cases.length, 0), 48);
  const pgPath = 'pg-attempt-54a799a9fc', pg = read(local(pgPath + '/pg-RESULT.json')), pgManifest = read(local(pgPath + '/pg-SOURCE_MANIFEST.json'));
  assert(pg.passed && pg.ownedClusterStopped); verifyFiles(root, pgManifest.files); assert.equal(digest(local('pg-monthly-qualification.cjs')), pg.runnerSha256);
  const pgTests = read(local(pgPath + '/pg-monthly-close-tests.summary.json')); assert(pgTests.success); assert.equal(pgTests.passed, 8); assert.equal(pgTests.failed, 0); assert.equal(pgTests.pending, 0); assert.equal(pgTests.todo, 0);
  const publicationPath = 'SANITIZED_PUBLICATION_ADMISSION.json'; const publication = read(local(publicationPath));
  assert(publication.passed && publication.publicationOnly, 'Sanitized publication admission required');
  assert.equal(publication.status, 'SANITIZED_SUPPLEMENTS_PUBLISHED_ORIGINALS_PRESERVED');
  assert.equal(publication.financialExecutionRepeated, false); assert.equal(publication.qualificationReceiptsRewritten, false); assert.equal(publication.historicalQualificationHarnessRewritten, false);
  assert(publication.historicalExpandedArtifactsRemainAtOriginalPublicPaths && publication.historicalExpandedArtifactsSyntheticOnly);
  assert.equal(publication.knownFixtureSessionTokenPatternsObserved, false); assert.equal(publication.credentialFieldsObserved, false);
  assert.deepEqual(publication.publications.map(row => row.attempt), ['149fa2421b', '54a799a9fc']);
  verifyPin(publication.runner); publication.protectedInputs.forEach(verifyPin);
  for (const row of publication.publications) for (const value of Object.values(row)) if (value && typeof value === 'object' && 'sha256' in value) verifyPin(value);
  const target = read(local('COLLECTION_RUNTIME_TARGET.json')), runtimeIndex = read(local('authenticated-app/LATEST.json'));
  const runtimeDirectory = path.resolve(runtimeIndex.evidenceDirectory); assert.equal(path.dirname(runtimeDirectory), local('authenticated-app')); assert.match(path.basename(runtimeDirectory), /^runtime-[a-f0-9]{10}$/);
  const runtime = read(path.join(runtimeDirectory, 'RESULT.json')); assert.deepEqual(runtimeIndex, runtime); assert(runtime.passed && runtime.applicationStopped && runtime.ownedClusterStopped && runtime.portsReleased && runtime.proxyStopped && runtime.collectPermissionRestored);
  assert.equal(runtime.runnerSha256, digest(local('authenticated-collection-runtime.cjs'))); assert.equal(runtime.parentPgReceiptSha256, digest(local(pgPath + '/pg-RESULT.json')));
  assert(runtime.noFinancialEffectFromIdentityVerification && runtime.primaryOctoberAndRetainedPackUnchanged && runtime.privateOctoberPackFilesUnchanged && runtime.noFinancialWritesAfterVerifiedCollection);
  assert.equal(runtime.operations.length, 6); assert.equal(runtime.sourceManifestSha256, target.sourceManifestSha256);
  const source = read(target.sourceManifest); verifyFiles(root, source.files); verifyFiles(target.candidate, source.files.filter(file => file.path !== 'next-env.d.ts'));
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(source.files)).digest('hex'), target.sourceManifestSha256);
  assert.match(runtime.generatedDeclarationSha256, /^[a-f0-9]{64}$/); assert.equal(digest(path.join(target.candidate, 'next-env.d.ts')), runtime.generatedDeclarationSha256);
  const ready = read(local('authenticated-app/APP_READY.json'));
  assert(ready.ready); assert.equal(path.resolve(ready.evidenceDirectory), runtimeDirectory); assert.equal(ready.origin, target.origin); assert.equal(ready.sourceManifestSha256, target.sourceManifestSha256);
  const runtimeId = path.basename(runtimeDirectory).slice('runtime-'.length), privateRun = path.join(target.directory, 'run-' + runtimeId);
  assert.equal(path.resolve(ready.handshakeDirectory), path.join(privateRun, 'handshakes')); assert.equal(path.resolve(ready.privateControlFile), path.join(privateRun, 'browser-control.private.json'));
  const finished = read(path.join(ready.handshakeDirectory, 'FINISHED.json'));
  const browserDirectory = path.resolve(finished.evidenceDirectory); assert.equal(path.dirname(browserDirectory), local('authenticated-app')); assert.match(path.basename(browserDirectory), /^attempt-[a-f0-9]{10}$/);
  const browser = read(path.join(browserDirectory, 'RESULT.json')); assert(finished.passed && browser.passed && browser.browserClosed && browser.contextClosed); assert.equal(browser.remainingOwnedProfileDirectories, 0); assert.equal(browser.steps.length, 7); assert.equal(browser.transitions.length, 6); assert(browser.steps.every(step => step.passed));
  assert.deepEqual(browser.transitions, runtime.operations);
  const browserBinding = read(path.join(browserDirectory, 'SOURCE_BINDING.json')); verifyFiles(root, browserBinding.source); assert.equal(digest(path.join(browserDirectory, 'SOURCE_BINDING.json')), browser.sourceBindingSha256);
  const relative = file => path.relative(__dirname, file).replaceAll('\\', '/');
  const report = {
    admittedAt: new Date().toISOString(), status: 'LOCAL_MIXED_COLLECTION_MONTH_AND_AUTHENTICATED_UI_QUALIFIED_PRODUCTION_BLOCKED',
    classification: 'Bounded synthetic local development qualification, separate mocked/static/PostgreSQL/rendered/real-auth evidence. No production artifact, live provider, statutory or global platform approval.',
    productSourceHashes: compiler.sourceHashes,
    evidence: {
      mockedUnits: unitPaths.map((file, index) => ({ ...receipt(file), passed: totals[index], skipped: 0 })), distinctJestSuites: suites.size, distinctJestExecutions: 253,
      compilerAndLint: { ...receipt(staticPath), lintErrors: compiler.lintErrors, lintWarnings: compiler.lintWarnings },
      renderedMockedActions: { ...receipt(renderedPath + '/RESULT.json'), cases: 48, sourceBinding: receipt(renderedPath + '/SOURCE_BINDING.json') },
      isolatedPostgres: { ...receipt(pgPath + '/pg-RESULT.json'), passed: 8, skipped: 0, sourceBinding: receipt(pgPath + '/pg-SOURCE_MANIFEST.json'), tests: receipt(pgPath + '/pg-monthly-close-tests.summary.json') },
      sanitizedPublication: receipt(publicationPath),
      authenticatedRuntime: { ...receipt(relative(path.join(runtimeDirectory, 'RESULT.json'))), sourceManifestSha256: target.sourceManifestSha256, sourceFiles: source.files.length },
      authenticatedBrowser: { ...receipt(relative(path.join(browserDirectory, 'RESULT.json'))), steps: browser.steps.length, transitions: browser.transitions.length, pageErrors: browser.pageErrorCount, consoleErrors: browser.consoleErrorCount, sourceBinding: receipt(relative(path.join(browserDirectory, 'SOURCE_BINDING.json'))) },
    },
    isolation: { newAbsentDatabase: pg.database, migrationCatalog: pg.catalogSha256, migrations: 122, rootPrismaGeneration: false, rootBuild: false, cleanDependencyInstall: false, sourceBoundDevelopmentRuntime: true, originalOctoberPackAndFinancialFactsUnchangedDuringUI: true, allOwnedServersAndBrowsersStopped: true },
    limits: ['Primary October case has an approved opening receivable and cash/mobile/bank collections, no October new sale or stock activity.', 'Positive tracked-stock POS/COGS and contested native receipt are a separate November auxiliary case.', 'CONFIRMED provider observations and initial APPROVED account mapping are synthetic input/configuration; upstream provider authenticity is not earned.', 'Independent reconciliation/signatures, bank and balance-sheet approvals, internal T4 certification, retention and seal are earned through their owners; statutory status remains blocked.', 'The monthly case does not repeat reopen/recertification; the previous cash-only lifecycle remains separate historical evidence.', 'Live contention proves the observed winner/conflict/rollback, not every interleaving or execution of each raw SQLSTATE retry branch.', 'Authenticated English development app uses reused dependencies/private Prisma override. EN/FR mobile/desktop coverage is separately mocked-action rendering.', 'Support file selection retains a browser-computed fingerprint only; no original-document upload/custody or live delivery is established.', 'Rendered axe had zero violations and incomplete contrast; no full accessibility claim.', 'Historical expanded synthetic summaries remain unchanged for integrity references; sanitized supplements are the publication view.'],
    remainingProductionGates: ['Selected host/runtime/region and owned public HTTPS domain', 'Current target-platform build/artifact and protected promotion', 'Hosted database/migration adoption and measured backup/PITR recovery', 'Verified live statement and accountant invitation delivery plus owned scheduled workers', 'Original statement custody, provider onboarding and independent Cameroon/domain acceptance', 'Existing wider platform release gates and remaining CA-06 assignment/scope follow-up'],
    runnerSha256: digest(__filename), productionDeployed: false, realMessagesSent: false, commitCreated: false,
  };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ admitted: true, status: report.status, evidenceFile: output, sha256: digest(output) }));
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
