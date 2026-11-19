// File-only local evidence admission. No test, application, database, environment
// loading, provider access, schema promotion or deployment is performed here.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digest = file => hash(fs.readFileSync(file));
const pin = file => ({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: digest(file), bytes: fs.statSync(file).size });
function bound(binding) { const file = path.resolve(root, binding.path); assert.equal(digest(file), binding.sha256); return file; }
function rootSources(entries) { for (const entry of entries) assert.equal(digest(path.join(root, entry.path)), entry.sha256, 'Qualified source changed: ' + entry.path); }
assert.equal(process.argv.length, 3); assert.match(process.argv[2], /^static-[a-f0-9]{10}$/);
const output = path.join(__dirname, 'FINAL_PREPARATION.json'); assert(!fs.existsSync(output), 'Existing final admission is preserved');
const inventoryFile = path.join(__dirname, 'EVIDENCE_INVENTORY.json'), inventory = read(inventoryFile);
assert.equal(digest(inventoryFile), 'ff9102bd177eb08959f465a9f3e4f272d76ff71db96634a5789adb6f8a52a780');
assert.deepEqual([inventory.counts.mockedServiceActionTests, inventory.counts.jsdomComponentHookTests, inventory.counts.mockedAuthRegressionTests, inventory.counts.pureReleaseControlTests, inventory.counts.realDatabaseTests, inventory.counts.earnedCloseNamedPhases, inventory.counts.mockedAuthActionRenderedCases], [796, 161, 87, 15, 41, 10, 72]);
for (const suite of inventory.selectedUnitSuites) assert.equal(digest(path.join(root, suite.file)), suite.testSha256);
for (const item of [...inventory.realDatabase, ...inventory.rendered]) {
  bound(item.receipt); const source = read(bound(item.sourceBinding.receipt)); rootSources(Array.isArray(source.source) ? source.source : source.files);
}
for (const item of [inventory.mockedSharedAuth, inventory.pureControls]) {
  const receipt = read(bound(item.receipt));
  for (const [file, sha256] of Object.entries(receipt.sourceHashes || {})) assert.equal(digest(path.join(root, file)), sha256);
}
const staticFile = path.join(__dirname, process.argv[2], 'verification.json'), statics = read(staticFile);
assert(statics.passed && statics.unchangedInputs); assert.equal(statics.lintErrors, 0);
assert(statics.checks.every(check => check.exitCode === 0 && !check.error));
for (const [file, sha256] of Object.entries(statics.sourceHashes)) assert.equal(digest(path.join(root, file)), sha256);
const runtimeFile = path.join(__dirname, 'authenticated-app/runtime-2d0757d253/RESULT.json'), runtime = read(runtimeFile);
assert(runtime.passed && runtime.browserCompleted && runtime.financialFactsUnchanged && runtime.applicationStopped && runtime.ownedClusterStopped && runtime.portsReleased);
assert.deepEqual(runtime.checks.map(check => check.operation), ['stale-proof', 'suspend-close-module', 'restore-close-module', 'revoke-current-session']);
const browserFile = path.join(__dirname, 'authenticated-app/attempt-4a55df136f/RESULT.json'), browser = read(browserFile);
assert(browser.passed && browser.browserClosed && browser.contextClosed && !browser.rootCleanupRequired);
assert.equal(browser.steps.length, 6); assert(browser.steps.every(check => check.passed)); assert.equal(browser.transitions.length, 4);
assert.equal(browser.downloads.length, 2); assert(browser.downloads.every(item => item.equalsPrivateOriginalBytes && item.validUtf8Json && item.passwordStepUpObserved));
assert.equal(browser.downloads[0].sha256, browser.downloads[1].sha256); assert.equal(browser.pageErrorCount, 0); assert.equal(browser.consoleErrorCount, 0);
const browserSourcesFile = path.join(path.dirname(browserFile), 'SOURCE_BINDING.json'); assert.equal(digest(browserSourcesFile), browser.sourceBindingSha256); rootSources(read(browserSourcesFile).source);
const targetFile = path.join(__dirname, 'AUTHENTICATED_RUNTIME_TARGET.json'), target = read(targetFile), manifest = read(target.sourceManifest);
assert.equal(hash(JSON.stringify(manifest.files)), target.sourceManifestSha256); assert.equal(runtime.sourceManifestSha256, target.sourceManifestSha256); rootSources(manifest.files);
for (const entry of manifest.files.filter(entry => entry.path !== 'next-env.d.ts')) assert.equal(digest(path.join(target.candidate, entry.path)), entry.sha256);
assert.equal(digest(path.join(target.candidate, 'next-env.d.ts')), runtime.generatedDeclarationSha256);
const client = path.resolve(root, statics.privateClient); assert.equal(client, target.privateClient);
assert.equal(digest(path.join(client, 'schema.prisma')), statics.privateClientSchemaSha256); assert.equal(digest(path.join(client, 'index.d.ts')), statics.privateClientTypesSha256);
const workflowFile = path.join(__dirname, 'auth-typing/WORKFLOW.json'), workflow = read(workflowFile); assert(workflow.passed && workflow.exitCode === 0); assert.equal(digest(path.join(root, 'scripts/verify-agent-workflow-contract.js')), workflow.scriptSha256);
const catalogFile = path.join(root, 'prisma/migration-catalog-manifest.json'), catalog = read(catalogFile); assert.equal(catalog.migrationCount, 122);
for (const entry of catalog.migrations) assert.equal(digest(path.join(root, entry.path)), entry.rawSha256);
const final = {
  checkedAt: new Date().toISOString(), status: 'LOCAL_CLOSE_SCOPE_QUALIFIED_PRODUCTION_BLOCKED', localQualificationPassed: true,
  productionApproved: false, deploymentApproved: false, schemaPromotionExecuted: false, liveDeliveryExecuted: false,
  source: { manifest: pin(target.sourceManifest), manifestSha256: target.sourceManifestSha256, files: manifest.files.length, scope: manifest.scope,
    actualApplication: 'Next development runtime; reused locked dependencies, schema-only private Prisma override; no new production artifact',
    generatedCandidateDeclarationSha256: runtime.generatedDeclarationSha256, catalog: pin(catalogFile), catalogIdentity: catalog.catalogSha256, migrations: catalog.migrationCount },
  counts: { ...inventory.counts, actualAuthenticatedBrowserChecks: 6, realAuthorityTransitions: 4, exactHistoricalDownloads: 2 },
  staticChecks: { passed: true, lintErrors: statics.lintErrors, lintWarnings: statics.lintWarnings },
  operationalCleanup: { browserStopped: true, applicationStopped: true, isolatedDatabaseStopped: true, portsReleased: true, financialFactsUnchangedDuringAuthenticatedJourney: true },
  evidence: [inventoryFile, staticFile, runtimeFile, browserFile, browserSourcesFile, targetFile, workflowFile,
    path.join(__dirname, 'earned-close/QUALIFICATION_ADMISSION.json'), path.join(__dirname, 'auth-typing/proof-c8b1c6a182/RESULT.json'),
    path.join(__dirname, 'RESULT.md'), path.join(__dirname, 'FINAL_ADMISSION_ATTEMPT_01.json'), path.join(root, 'docs/release/HARDENED_CLOSE_PRODUCTION_DEPLOYMENT.md'),
    path.join(root, 'config/release/hardened-close-production.template.json'), path.join(root, 'scripts/hardened-close-production-readiness.cjs')].map(pin),
  remainingProductionGates: ['Selected host, public HTTPS domain and provider-compatible current artifact', 'Wider platform release gates and independent Cameroon domain acceptance; provider-backed full-month close for any pilot bank/mobile-money rails',
    'Production database/history/risk, protected secrets and measured hosted recovery', 'Verified sender, real owned-test statement/invitation delivery and qualified private scheduled worker',
    'Approved original statement custody/provider onboarding and scoped CA-06 follow-up', 'Independent protected promotion/cohort/stop/rollback authorization'],
  limits: ['Internal system-close evidence only; no statutory certification.', 'Mocked, PostgreSQL, rendered fixture and actual development-session evidence are separate classes.',
    'No target-platform production build or provider deployment was qualified.', 'Failed and superseded receipts remain preserved; delayed PG cleanup was admitted by a separate bound supplement.',
    'The pre-runtime inventory remains historical IN_PROGRESS evidence; this admission records the additional completed runtime/static checks.'],
  runner: pin(__filename),
};
fs.writeFileSync(output, JSON.stringify(final, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: final.status, sourceManifestSha256: final.source.manifestSha256, output: pin(output) }));
