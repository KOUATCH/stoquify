// Pure evidence publication maintenance. Original public artifacts stay at their
// original paths. No application, test, DB, environment loading or child process.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = fs.realpathSync(path.resolve(__dirname, '../../../..'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function contained(file, exists = true) {
  const resolved = path.resolve(file), relative = path.relative(root, resolved);
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Path is outside the intended workspace');
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    if (fs.existsSync(current)) assert(!fs.lstatSync(current).isSymbolicLink(), 'Linked evidence path refused');
    else assert(!exists && current === resolved, 'Missing evidence parent');
  }
  return resolved;
}
const digest = file => hash(fs.readFileSync(contained(file)));
const pin = file => ({ path: path.relative(root, contained(file)).replaceAll('\\', '/'), sha256: digest(file), bytes: fs.statSync(file).size });
function writeNew(file, bytes) { contained(file, false); assert(!fs.existsSync(file), 'Existing publication output is preserved'); fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); }
function knownCredentialEvidence(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(knownCredentialEvidence);
  return Object.entries(value).some(([key, item]) => /^(?:password|token|accessToken|refreshToken|idToken|apiKey|secret)$/i.test(key) || knownCredentialEvidence(item));
}
const phases = ['actual-approved-opening-and-replay', 'actual-collections-and-provider-links', 'electronic-claim-denials-no-effects', 'actual-concurrent-claim-exclusion', 'assessment-before-provider-and-schedule-evidence', 'actual-monthly-import-independent-signatures', 'actual-bank-bs-approval-certification-and-seal', 'actual-closed-period-denial-and-retained-recovery'];
const counts = { journals: 4, customerSettlements: 3, claimedProviderTransactions: 2, signedReconciliationRuns: 2, approvedBankBalanceEvidence: 1, certifiedExports: 1, periodCloseEvents: 1, periodReopenEvents: 0, providerAccounts: 2, activeOpeningExecutions: 1, openingReceivables: 1, sales: 0, payrollRuns: 0, statutoryCertifiedDocuments: 0 };
const sources = [
  { id: '149fa2421b', sha256: '8f49c06fbed09468c9e7c100760415b5d4aeb4bc92e32e42fe944034f7bfc09c', bytes: 6981 },
  { id: '54a799a9fc', sha256: '1c3bfeb4405f1b84b2bb9d2d826d7b55146f0fbb9eeb9f7ffbc051a0540c8b79', bytes: 16598 },
];
function stockMetrics(value) {
  assert(value && typeof value === 'object');
  const result = {};
  for (const key of ['quantity', 'averageCost', 'value']) { assert(typeof value[key] === 'string' && /^\d+\.\d+$/.test(value[key])); result[key] = value[key]; }
  return result;
}
function safeAuxiliary(original) {
  const denials = original.denials, race = original.race;
  assert.deepEqual(denials.negativeKinds, ['foreign', 'rail', 'amount', 'currency', 'mapping', 'reused-native', 'changed-primary-replay']);
  assert.equal(denials.allNegativeFinancialSnapshotsUnchanged, true);
  assert.equal(race.injectedClaimFailureRolledBack, true); assert.deepEqual(race.claimFaultMarker, { reached: true, invocations: 1 });
  for (const [key, expected] of Object.entries({ crossWorkflowContenders: 2, crossWorkflowFinancialWinners: 1, twoCollectionContenders: 2, twoCollectionFinancialWinners: 1 })) assert.equal(race[key], expected);
  assert(['POS', 'CUSTOMER_SETTLEMENT'].includes(race.crossWorkflowWinner));
  const result = {
    denials: { negativeKinds: [...denials.negativeKinds], allNegativeFinancialSnapshotsUnchanged: true },
    race: { injectedClaimFailureRolledBack: true, claimFaultMarker: { reached: true, invocations: 1 }, crossWorkflowContenders: 2, crossWorkflowFinancialWinners: 1,
      crossWorkflowWinner: race.crossWorkflowWinner, twoCollectionContenders: 2, twoCollectionFinancialWinners: 1, trackedStockFixture: !!race.trackedStockOpening },
  };
  if (race.trackedStockOpening) {
    assert.equal(race.losingContenderCode, 'CONFLICT');
    result.race.losingContenderCode = 'CONFLICT';
    result.race.openingStock = stockMetrics(race.trackedStockOpening); result.race.afterContentionStock = stockMetrics(race.afterCrossStock);
  }
  return result;
}
function main() {
  assert.deepEqual(process.argv.slice(2), ['publish']);
  const admissionFile = path.join(__dirname, 'SANITIZED_PUBLICATION_ADMISSION.json'); contained(admissionFile, false); assert(!fs.existsSync(admissionFile));
  const runner = pin(__filename), protectedInputs = new Map();
  const protect = file => { const bound = pin(file); protectedInputs.set(bound.path, bound); return bound; };
  const plans = sources.map(source => {
    const directory = contained(path.join(__dirname, 'pg-attempt-' + source.id)), privateDirectory = contained(path.join(root, '.codex-tmp', 'close-monthly-20261110-' + source.id));
    const originalFile = contained(path.join(directory, 'pg-monthly-close-service.summary.json')), originalBytes = fs.readFileSync(originalFile), original = read(originalFile);
    assert.equal(hash(originalBytes), source.sha256); assert.equal(originalBytes.length, source.bytes);
    assert(!/(?:monthly_session_|earned_session_|ca03_session_)[a-f0-9]{64}|\bBearer\s+[A-Za-z0-9._~-]{16,}/.test(originalBytes.toString('utf8')), 'Known fixture session/authorization token pattern found');
    assert(!knownCredentialEvidence(original), 'Credential field found in expanded synthetic summary');
    const resultFile = contained(path.join(directory, 'pg-RESULT.json')), result = read(resultFile);
    assert(result.passed && result.ownedClusterStopped); assert.equal(result.directory, privateDirectory); assert.equal(result.evidenceDirectory, directory);
    assert.equal(result.database, 'stoquify_replay_close_monthly_20261110_' + source.id);
    assert(original.passed && original.earnedInternalTerminalStates && original.syntheticProviderConfirmationFacts); assert.equal(original.seededInternalFinancialTerminalStates, false);
    assert.deepEqual(original.counts, counts); assert.deepEqual(original.checks, phases.map(name => ({ name, passed: true })));
    const rawFile = contained(path.join(privateDirectory, 'monthly-close-service-evidence.private.json'));
    assert.equal(original.privateEvidence.path, rawFile); assert.equal(digest(rawFile), original.privateEvidence.sha256); assert.equal(fs.statSync(rawFile).size, original.privateEvidence.bytes);
    const raw = read(rawFile); assert.equal(raw.initialApprovedProviderMappingConfiguration, true);
    const preservationFile = path.join(privateDirectory, 'monthly-close-service-summary.expanded-original.json'), supplementFile = path.join(directory, 'pg-monthly-close-service.sanitized.summary.json');
    for (const output of [preservationFile, supplementFile]) { contained(output, false); assert(!fs.existsSync(output), 'Existing preservation/supplement is preserved'); }
    for (const file of [originalFile, resultFile, rawFile, ...['pg-SOURCE_MANIFEST.json', 'pg-HISTORY.json', 'pg-PRIVATE_FIXTURE.json', 'pg-monthly-close-lifecycle.execution.json', 'pg-SQL_INVENTORY.json'].map(name => path.join(directory, name))]) protect(file);
    return { source, originalFile, originalBytes, original, resultFile, result, rawFile, preservationFile, supplementFile, auxiliary: safeAuxiliary(original.auxiliary) };
  });
  protect(path.join(__dirname, 'pg-monthly-qualification.cjs')); protect(path.join(__dirname, 'pg-LATEST.json'));
  // All inputs and absent outputs were checked before the first publication write.
  for (const plan of plans) { writeNew(plan.preservationFile, plan.originalBytes); assert.equal(digest(plan.preservationFile), plan.source.sha256); assert.equal(fs.statSync(plan.preservationFile).size, plan.source.bytes); }
  const publications = [];
  for (const plan of plans) {
    const supplement = { passed: true, publicationKind: 'SANITIZED_SUPPLEMENT_TO_UNCHANGED_SYNTHETIC_EXPANDED_SUMMARY', checks: phases.map(name => ({ name, passed: true })), counts: { ...counts }, auxiliary: plan.auxiliary,
      earnedInternalTerminalStates: true, seededInternalFinancialTerminalStates: false, syntheticProviderConfirmationFacts: true, initialApprovedProviderMappingConfiguration: true,
      scope: 'Internal opening-receivable collection and monthly close only; not an October new sale, live-provider authenticity/processing, statutory approval or deployment.',
      source: { originalExpandedSummary: pin(plan.originalFile), privateExactPreservation: pin(plan.preservationFile), originalQualificationReceipt: pin(plan.resultFile), privateDetailedServiceEvidence: pin(plan.rawFile), historicalQualificationRunnerSha256: plan.result.runnerSha256 },
      publicationNote: 'This is a projection of retained executed evidence, not a new execution or replacement qualification. Original expanded public summary remains at its unchanged path for historical integrity references; it contains synthetic financial/source data and must not be described as counts-only or private.',
    };
    writeNew(plan.supplementFile, JSON.stringify(supplement, null, 2) + '\n');
    publications.push({ attempt: plan.source.id, originalExpandedPublicSummary: pin(plan.originalFile), privateExactPreservation: pin(plan.preservationFile), sanitizedSupplement: pin(plan.supplementFile), originalQualificationReceipt: pin(plan.resultFile) });
  }
  for (const binding of protectedInputs.values()) assert.equal(digest(path.join(root, binding.path)), binding.sha256, 'Protected evidence input changed during publication');
  assert.equal(digest(__filename), runner.sha256);
  const admission = { checkedAt: new Date().toISOString(), passed: true, status: 'SANITIZED_SUPPLEMENTS_PUBLISHED_ORIGINALS_PRESERVED', publicationOnly: true, financialExecutionRepeated: false, qualificationReceiptsRewritten: false, historicalQualificationHarnessRewritten: false,
    historicalExpandedArtifactsRemainAtOriginalPublicPaths: true, historicalExpandedArtifactsSyntheticOnly: true, knownFixtureSessionTokenPatternsObserved: false, credentialFieldsObserved: false,
    privacyBoundary: 'New supplemental summaries use strict counts/status/phase and safe auxiliary metrics. Historical expanded originals remain public synthetic artifacts and are not claimed to be counts-only or private. Full original bytes are additionally preserved in matching private contexts.',
    integrityDecision: 'Original 149fa summary bytes are referenced by another program\'s historical source manifests. Original public paths/hashes, all qualification/source/raw receipts and other program manifests are unchanged.',
    publications, protectedInputs: [...protectedInputs.values()], runner };
  writeNew(admissionFile, JSON.stringify(admission, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, status: admission.status, attempts: publications.length, originalPublicSummariesUnchanged: true, admission: pin(admissionFile) }));
}
main();
