// Prepare local checkpoint documents from existing evidence only. No shared-register, app, database, Git or network writes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const packet = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(packet, name), 'utf8'));
const write = (name, text) => fs.writeFileSync(path.join(packet, name), text, { flag: 'wx' });
const now = new Date().toISOString();
const reviewPath = 'independent-review/FINAL-CAPACITY-OUTCOME-REVIEW.json';
const review = read(reviewPath);
assert.equal(review.passed, false);
assert.equal(review.blockedCheckpointAccepted, true);
assert.equal(review.candidateId, null);
assert.equal(review.artifactSha256, null);
const dependency = read('dependency-staging-attempt03.json');
assert(dependency.passed && dependency.physicalCopyExact && dependency.frozenDependencyTreeUnchanged);
assert.equal(dependency.dependencyManifest.files, 152806);
const preparation = read('preparation.json');
assert.equal(preparation.passed, false);
assert.deepEqual(preparation.commands, []);
const capacity = read('resource-capture-retry-ready-r1.json');
assert.equal(capacity.passed, false);
assert.deepEqual(capacity.failures, ['commit_headroom']);
const source = read('inventory/CURRENT-SOURCE-MANIFEST-r2.json');
assert.equal(source.files.length, 9942);
const selected = read('inventory/SELECTED-INPUTS-REFRESH-r2.json');
assert(selected.all68CurrentMatch && selected.all68CandidateMatch && selected.files.length === 68);
const checkpoint = read('capacity-checkpoint.json');
assert.equal(checkpoint.passed, true);
assert.equal(checkpoint.candidateId, null);
assert.equal(checkpoint.artifactSha256, null);
for (const name of ['sourceCaptured', 'artifactBuilt', 'retainedDatabaseStarted', 'generatedClientCreated', 'nativeOrBrowserQualificationRun', 'qualificationPassed']) assert.equal(checkpoint[name], false, name);
assert.equal(checkpoint.retainedFixture.nativeDatabaseRequeried, false);
assert.equal(checkpoint.allScopedPortsReleased, true);
assert.equal(checkpoint.acceptedSourceObservation.identitySha256, source.identitySha256);
assert(!fs.existsSync('D:/p04-r06-fullapp-20261110-r3/source'), 'Source capture has since started; reassess this checkpoint');
for (const name of ['candidate-admission.json', 'build-result.json', 'runtime-result.json']) assert(!fs.existsSync(path.join(packet, name)), 'Execution has since advanced: ' + name);
for (const name of ['capacity-checkpoint.json', 'RETRY-HANDOFF.md', 'independent-review/DEPENDENCY-STAGING-OUTCOME-REVIEW.json', 'independent-review/LATE-SOURCE-OUTCOME-REVIEW.json']) assert(fs.existsSync(path.join(packet, name)), name);
const gib = bytes => (bytes / 1024 ** 3).toFixed(2);
const physical = gib(capacity.freePhysicalBytes), commit = gib(capacity.freeCommitBytes);
const disk = gib(capacity.drives.find(row => row.drive === 'D').freeBytes);
const prefix = 'execution/P04-R06/qualification-20261110-r3/';
const absolute = 'E:/ohada saas/Focused projects/stoquify/plans/stoquify-production-readiness-2026-10-28/' + prefix;
const currentState = `D: is usable; the separate 152,806-file dependency copy was hash-verified and the frozen original remains unchanged. The late 9,942-file source inventory and bounded concurrent finance/POS/config/metadata disposition were independently accepted for capture preparation; all 68 R06 inputs, schema, 122 migrations and retained fixture sources match. No new product changes were made in this continuation. The earlier 116 mocked passes remain historical, source-bound evidence, not a new test run. Candidate entry stopped before any source/archive write or database startup: latest capacity ${physical} GiB physical/${commit} GiB remaining commit/${disk} GiB D free; the unchanged commit requirement is 12 GiB. No successor candidate, repaired artifact, real-session or browser result exists. Frozen r2 data/evidence remain preserved; R06 and parent/production remain blocked. Fresh source/capacity admission still precedes the saved retry.`;
const parentState = 'P04 remains blocked. R06 current-session and rejected-request bookkeeping repairs are implemented and source/mock reviewed, but full-app qualification remains pending sufficient system memory capacity and admitted successor capture/build. D dependency staging and current-source preparation are reviewed; no new candidate or runtime proof exists. R08 item-list module enforcement and R07 failed-refresh recovery remain unimplemented. P04-D01 option C remains approved; R05 creator/delegate repair is unimplemented. V01/V03/V04/V05 and wider current-checkout/hosted/operator obligations remain open.';
const v02State = 'Historical sealed candidate p04-v02-full-6577e9e63dc7 remains blocked:196 logical groups,171 scoped qualified,17 product-failure groups,8 native-visibility prerequisites unexercised,11 additional replay records distinct. E29 successor auth evidence and all historical observations remain unchanged. R06 repairs retain 116 historical mocked passes; D dependency staging and refreshed source preparation are accepted, but a successor candidate/build and107 real-session/browser cases remain blocked by memory capacity. R08/R07 and wider hosted/operator/current-checkout evidence remain open.';
const next = 'First obtain a fresh passing capacity check after memory is freed, then execute the exact admitted retry in RETRY-HANDOFF.md. It must still prove current-source equality before capture; if source changed, refresh and independently reconcile the delta first. Reuse the verified separate dependency copy after its prescribed integrity checks. Capture and admit the new candidate, explicitly rebind/resume the retained isolated database, verify native continuity, and run the isolated build. Then complete all 107 actual cases mapped to 58 original requirements, artifact/private-data checks, owned cleanup and independent outcome review. Preserve every prior failed attempt and unrelated edit.';
const evidence = [
  'RESULT.md', 'advancement-gates.json', 'ROOT-CONTINUATION.md', 'RETRY-HANDOFF.md',
  'resource-entry.json', 'workflow-check.json', 'dependency-staging.json', 'dependency-staging-attempt03.json',
  'independent-review/DEPENDENCY-STAGING-OUTCOME-REVIEW.json',
  'inventory/CURRENT-SOURCE-MANIFEST-r2.json', 'inventory/SELECTED-INPUTS-REFRESH-r2.json',
  'inventory/RETAINED-FIXTURE-SOURCE-COMPATIBILITY-r2.json', 'inventory/SOURCE-DELTA-CLASSIFICATION-r3.json',
  'inventory/PRIVATE-METADATA-DISPOSITION-r3.json', 'independent-review/LATE-SOURCE-OUTCOME-REVIEW.json',
  'reused-evidence/MANIFEST.json', 'reused-evidence/independent-review/REPAIR-SOURCE-ADMISSION.json',
  'reused-evidence/independent-review/UNIT-OUTCOME-REVIEW.json', 'reused-evidence/unit/attempt01/jest.json',
  'preparation.json', 'resource-capture-entry.json', 'resource-capture-retry-ready-r1.json',
  'independent-review/CANDIDATE-ENTRY-CAPACITY-OUTCOME.json', 'capacity-checkpoint.json', reviewPath,
];
const gate = (id, status, evidence, note) => ({ id, status, evidence, ...(note ? { note } : {}) });
const gates = {
  at: now, packageId: 'P04-R06', scope: 'Reviewed local preparation and capacity-blocked checkpoint; no successor candidate qualification',
  candidateId: null, artifactSha256: null, advancement_allowed: false, production_ready: false,
  required_logical_groups: 58, planned_actual_cases: 107, actual_cases_executed: 0,
  gates: [
    gate('repair_source', 'passed', reviewPath, 'Unchanged repaired source; no new product edit in r3.'),
    gate('mocked_regression', 'passed', reviewPath, '116 historical passes reused with source/dependency provenance; newTestRun:false.'),
    gate('dependencies', 'passed', 'independent-review/DEPENDENCY-STAGING-OUTCOME-REVIEW.json'),
    gate('source_refresh', 'passed', 'independent-review/LATE-SOURCE-OUTCOME-REVIEW.json', 'Recorded preparation snapshot; capture must recheck live-source equality.'),
    gate('capture_capacity', 'blocked', 'resource-capture-retry-ready-r1.json'),
    gate('candidate', 'not_run', 'preparation.json'),
    gate('database_resume', 'not_run', 'capacity-checkpoint.json'),
    gate('full_build', 'not_run', 'capacity-checkpoint.json'),
    gate('real_session_qualification', 'not_run', 'capacity-checkpoint.json'),
    gate('browser_qualification', 'not_run', 'capacity-checkpoint.json'),
    gate('private_runtime_packaging', 'not_run', 'capacity-checkpoint.json', 'No built artifact exists to inspect.'),
    gate('owned_checkpoint', 'passed', 'capacity-checkpoint.json'),
    gate('independent_checkpoint_review', 'passed', reviewPath, 'Blocked checkpoint accepted; qualification did not pass.'),
  ],
  outcome_receipts: { qualification: null, integrity: 'capacity-checkpoint.json', review: reviewPath },
};
const evidenceRecord = {
  candidate_id: null, artifact_sha256: null, prepared_source_identity: source.identitySha256,
  source_hashes: prefix + 'inventory/CURRENT-SOURCE-MANIFEST-r2.json:9942 prepared files;68selected inputs unchanged;no successor capture',
  source_review: prefix + 'independent-review/LATE-SOURCE-OUTCOME-REVIEW.json',
  commands: prefix + 'preparation.json:0capture commands;no build/runtime execution',
  mocked_tests: prefix + 'reused-evidence/MANIFEST.json:116historical mocked passes;5suites;0skips;newTestRun:false',
  native_database: 'Retained r2 cluster not resumed or queried in r3; historical122migrations/16users/32accounts evidence remains in E30.',
  authenticated_browser: 'NOT RUN;107 planned cases/58 original logical requirements remain required',
  build: 'NOT RUN;no successor source capture or artifact',
  dependencies: prefix + 'dependency-staging-attempt03.json:152806files;new copy exact;frozen input unchanged',
  resource_gate: prefix + `resource-capture-retry-ready-r1.json:${physical}GiBphysical/${commit}GiBcommit/${disk}GiBDfree;unchanged6/12/12GiBrequirements`,
  cleanup: prefix + 'capacity-checkpoint.json:preserved dependencies/evidence;no successor app/database/build started',
  reviewer: prefix + reviewPath, advancement: prefix + 'advancement-gates.json:false',
  latest_checkpoint: prefix + 'RESULT.md', prior_checkpoint: 'execution/P04-R06/qualification-20261110-r2/RESULT.md',
  reconciliation: 'No actual r3 case results to reconcile;58logical/107raw/57supplementary coverage remains unchanged',
  remaining_handoffs: [prefix + 'NEXT.md', prefix + 'RETRY-HANDOFF.md'],
  provider_hosted: 'NOT RUN', operator: 'NOT RUN',
  evidence_limit: 'Source/dependency preparation, historical mocked results and capacity/ownership evidence only. No new database/session/browser/build/production certification. E01–E30 preserved.',
};
const result = `# P04-R06 — D: preparation accepted; qualification blocked by memory\n\n${currentState}\n\n| Evidence class | Recorded outcome |\n|---|---|\n| Source | 9,942-file prepared snapshot;68 authentication inputs unchanged;finance/POS/config/metadata differences scoped and reviewed |\n| Dependencies | 152,806 copied files match;preserved original unchanged;${disk} GiB free on D: at latest observation |\n| Mocked tests | 116/116 historical passes across 5 suites, 0 skips;no new r3 run |\n| Database | Retained r2 cluster untouched and stopped;no new native query or qualification |\n| Candidate and build | Not run;entry failed before source/archive writes;no artifact |\n| Real sessions and browser | 0 of 107 planned actual cases executed;58 original requirements still open |\n| Independent review | Preparation and blocked checkpoint accepted;advancement false |\n\nLatest capacity, measured ${capacity.capturedAt}: ${physical} GiB physical memory, ${commit} GiB remaining commit capacity, ${disk} GiB free on D:. Required entry floors remain 6/12/12 GiB respectively. The first failed capture observation and later retry-readiness observation are preserved. Temporary analysis kernels were released; unrelated processes were not stopped.\n\n${next}\n\n[Exact retry and recovery handoff](<${absolute}RETRY-HANDOFF.md>) · [Gate matrix](<${absolute}advancement-gates.json>) · [Independent outcome](<${absolute + reviewPath}>)\n\nNo new product edits, commits, pushes, deployment, production flag changes or production-data migrations occurred in this continuation. The separate D: dependency tree and all earlier candidates/evidence are retained. After eventual R06 qualification, the next recommended package is P04-R08 source/guard refresh and bounded implementation authorization. R05/R07/R08 implementation remains outside this continuation. Parent P04, P04-V02 and production remain blocked.\n`;
const currentDoc = `# Current execution status\n\n${currentState}\n\n${parentState}\n\n[Current E31 evidence](<${absolute}RESULT.md>) · [Next action](<${absolute}NEXT.md>) · [Gate matrix](<${absolute}advancement-gates.json>)\n`;
const nextDoc = `# Exact next action\n\n${next}\n\n[Exact reviewed retry and recovery instructions](<${absolute}RETRY-HANDOFF.md>) · [Latest capacity observation](<${absolute}resource-capture-retry-ready-r1.json>) · [Evidence](<${absolute}RESULT.md>)\n\nAdvancement requires a captured/current source identity, successful isolated full build, all 107 real-session/browser cases mapped to 58 requirements, denial no-write/no-private-data evidence, authorized positives, source/artifact integrity, cleanup and independent review. Historical 116 mocked passes and prepared scripts do not satisfy those runtime gates.\n\nAfter R06 qualification, refresh P04-R08 item-list module enforcement and obtain bounded implementation authorization. R05/R07/R08 implementation is not authorized here. No commit, push, deployment or production changes.\n`;
const input = {
  status: 'blocked', source_admission: 'reused-evidence/independent-review/REPAIR-SOURCE-ADMISSION.json', review: reviewPath,
  current_state: currentState, parent_state: parentState, v02_state: v02State,
  execution_boundary: 'Authorized R06 isolated continuation only. No new product edits in r3;D: dependency staging/source preparation accepted. Candidate/build/runtime remain blocked by remaining system memory capacity;source equality still required at retry. Preserve unrelated changes and all historical evidence. No R05/R07/R08 implementation,commit,push,production flags/data changes or deployment.',
  evidence_record: evidenceRecord,
  evidence_label: 'P04-R06 D: dependency staging and source preparation accepted;candidate capture/build/107-case qualification remain blocked by commit-memory headroom;historical evidence preserved',
  evidence,
  mutation_append: `\n\n## ${now} — E31 P04-R06 D: preparation and capacity checkpoint\n\n${currentState}\n\nOnly R06 current state/boundary/evidence and parent P04/V02 summaries are updated. Existing R06 tasks,all 57 domains,59 packages,14 global decisions,18 gates,dependencies,deferred commitments and authorizations remain intact. E01–E30 preserved. No commit,deployment or production changes.\n`,
  roadmap_tail: `**Exact next action:** ${next}\n\nP04-R06,parent P04/P04-V02 and production remain blocked. See [E31 evidence](${prefix}RESULT.md).\n`,
};
write('RESULT.md', result);
write('CURRENT.md', currentDoc);
write('NEXT.md', nextDoc + '\nExact first command, only after a real capacity change (use a new receipt name if it already exists):\n\n```powershell\n' + checkpoint.nextAction.resourceCommand + '\n```\n');
write('advancement-gates.json', JSON.stringify(gates, null, 2) + '\n');
write('publication-input.json', JSON.stringify(input, null, 2) + '\n');
console.log(JSON.stringify({ prepared: true, status: 'blocked', sharedFilesChanged: 0 }));
