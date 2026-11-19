// Prepare local documentation from accepted capacity-blocked evidence. No app, database, Git or network operations.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const packet = __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(packet, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(packet, name), value, { flag: 'wx' });
const json = (name, value) => write(name, JSON.stringify(value, null, 2) + '\n');
const candidate = read('candidate-admission.json');
const context = read('candidate-context.json');
const build = read('build-result.json');
const resource = read('resource-retry-ready-attempt02-r2.json');
const suspension = read('database/capacity-suspension.json');
const reviewPath = 'independent-review/FINAL-CAPACITY-OUTCOME-REVIEW.json';
const review = read(reviewPath);
const driftPath = 'independent-review/CAPACITY-CHECKPOINT-SOURCE-REVIEW.json';
const drift = read(driftPath);
assert.equal(drift.observationAccepted, true);
assert.equal(drift.criticalInputsStillMatch, true);
assert.equal(drift.frozenCandidateStillMatches, true);
assert.equal(drift.currentCheckoutSourceMatches, false);
assert.equal(drift.currentRootDelta.length, 12);
assert.equal(drift.currentCapturedFiles, 9792);
assert.equal(drift.frozenCandidateFiles, 9789);
assert.equal(candidate.passed, true);
assert.equal(build.passed, false);
assert.equal(build.commands.length, 0);
assert.equal(resource.passed, false);
assert.equal(suspension.passed, true);
assert.equal(suspension.candidateId, candidate.candidateId);
assert.equal(suspension.artifactSha256, null);
assert.equal(review.passed, false);
assert.equal(review.blockedCheckpointAccepted, true);
assert.equal(review.candidateId, candidate.candidateId);
assert.equal(review.artifactSha256, null);
assert(!fs.existsSync(path.join(packet, 'build-result-attempt02.json')), 'Do not publish this checkpoint after a build retry');
assert(!fs.existsSync(path.join(packet, 'runtime-result.json')), 'Runtime outcomes require separate reconciliation');
assert(!fs.existsSync(context.artifact), 'Do not publish a no-artifact checkpoint after packaging starts');
assert(!fs.existsSync(path.join(context.storage, 'private/build-env.json')), 'Build environment already exists');
assert(!fs.existsSync(path.join(packet, 'private-client.json')), 'Private client generation already ran');
assert(!fs.existsSync(path.join(packet, 'database/capacity-resume.json')), 'Continuation has resumed');
const owner = JSON.parse(fs.readFileSync(path.join(context.storage, 'private/cluster-owner.json'), 'utf8'));
assert.equal(owner.state, 'stopped');
assert(!fs.existsSync(path.join(owner.cluster, 'postmaster.pid')), 'Owned database has restarted');
for (const receipt of ['independent-review/REPAIR-SOURCE-ADMISSION.json', 'independent-review/UNIT-OUTCOME-REVIEW.json', 'independent-review/DEPENDENCY-STAGING-OUTCOME-REVIEW.json', 'independent-review/CANDIDATE-OUTCOME-REVIEW.json', 'independent-review/DATABASE-OUTCOME-REVIEW.json']) assert.equal(read(receipt).passed, true, receipt);
const at = new Date().toISOString();
const prefix = 'execution/P04-R06/qualification-20261110-r2/';
const absolute = packet.replaceAll('\\', '/');
const physical = (resource.freePhysicalBytes / 2 ** 30).toFixed(2);
const commit = (resource.freeCommitBytes / 2 ** 30).toFixed(2);
const state = `Rejected-request bookkeeping repair implemented and independently source-reviewed on ${candidate.candidateId}; all 9,789 source files and 68 selected inputs matched at candidate admission. Isolated mocked tests 116/116 passed across 5 suites with 0 skips. Fresh 122-migration databases and a 16-user/32-account fixture accepted with 0 issued sessions. Full build did not start: latest memory capacity ${physical}GiB physical/${commit}GiB commit is below the unchanged 6/12 GiB gates. No repaired artifact or actual 107-case qualification exists. Owned cluster suspended with fixture/state preserved and reviewed recovery. R06 and parent/production remain blocked; E29 failures and prior evidence preserved.`;
const sourceBlocker = ' Final source inspection found nine modified and three added concurrent files: current capture 9,792 versus frozen 9,789. All 68 R06 inputs remain unchanged. Reconcile and admit a successor candidate before any build; capacity alone is insufficient.';
const parentState = 'P04 remains blocked. R06 current-session repair and rejected-request bookkeeping are implemented and source/mock reviewed, but the fresh repaired full build and 107-case real-session/browser qualification remain pending sufficient memory and a refreshed candidate after concurrent source drift. R06 capacity checkpoint and owned database suspension are independently reviewed. R08 item-list module enforcement and R07 failed-refresh recovery remain unimplemented. P04-D01 option C remains approved; R05 creator/delegate repair is unimplemented. V01/V03/V04/V05 and wider current-checkout/hosted/operator obligations remain open.';
const v02State = 'Historical sealed candidate p04-v02-full-6577e9e63dc7 remains blocked:196logical groups,171scoped qualified,17product-failure groups,8native-visibility prerequisites unexercised,11additional replay records distinct. E29 successor auth denial evidence remains historical; no V02 observation is rewritten. R06 rejected-request bookkeeping is now repaired with 116 mocked tests passing, but its fresh full build and real-session/browser qualification are blocked by memory capacity and current-candidate source drift. R08/R07 remain unimplemented; wider hosted/operator/current-checkout evidence remains open.';
const next = "First reconcile the recorded concurrent source delta and capture an independently reviewed successor candidate/context while preserving the frozen candidate and unrelated edits. Follow RETRY-HANDOFF-20261110-r3.md: verify schema, migrations, dependencies and fixture compatibility; explicitly rebind the retained database and downstream recipes to the successor. The old retry is ineligible while its exact-root guard fails. After a fresh capacity check passes at least 6 GiB available physical memory and 12 GiB remaining commit capacity, use the newly admitted recovery/build sequence and obtain native resumed-state review. Then complete the isolated build, current-source/fixture preflights, all 107 cases mapped to 58 requirements, owned cleanup, independent outcome review and successor publication. Do not overwrite previous candidates, receipts or unrelated changes.";
const gates = [
  ['source', 'passed', 'independent-review/REPAIR-SOURCE-ADMISSION.json'],
  ['mocked_tests', 'passed', 'independent-review/UNIT-OUTCOME-REVIEW.json'],
  ['dependencies', 'passed', 'independent-review/DEPENDENCY-STAGING-OUTCOME-REVIEW.json'],
  ['candidate', 'passed', 'independent-review/CANDIDATE-OUTCOME-REVIEW.json'],
  ['current_candidate_freshness', 'blocked', driftPath],
  ['database_setup', 'passed', 'independent-review/DATABASE-OUTCOME-REVIEW.json'],
  ['build_capacity', 'blocked', 'resource-retry-ready-attempt02-r2.json'],
  ['full_build', 'not_run', 'build-result.json'],
  ['real_session_qualification', 'not_run', 'runtime/qualification-contract.json'],
  ['browser_qualification', 'not_run', 'runtime/qualification-contract.json'],
  ['owned_suspension', 'passed', 'database/capacity-suspension.json'],
  ['independent_checkpoint_review', 'passed', reviewPath],
].map(([id, status, evidence]) => ({ id, status, evidence }));
json('advancement-gates.json', { at, packageId: 'P04-R06', scope: 'Local capacity and candidate-freshness blocked checkpoint only', candidateId: candidate.candidateId, artifactSha256: null, advancement_allowed: false, production_ready: false, required_logical_groups: 58, planned_actual_cases: 107, actual_cases_executed: 0, gates, outcome_receipts: { qualification: null, integrity: 'database/capacity-suspension.json', review: reviewPath } });
const result = `# P04-R06: repair implemented; full-app qualification blocked\n\nThe bounded bookkeeping repair is implemented. Independent source review and 116 isolated mocked tests passed. The full build has not started because memory capacity is below the reviewed requirement. Current source also differs from the frozen candidate: nine modified and three added files; all 68 selected P04-R06 inputs still match. No repaired-artifact session or browser qualification is claimed. Parent P04, P04-V02 and production admission remain blocked.\n\n## Verified work\n\n| Evidence class | Observed result | Evidence |\n| --- | --- | --- |\n| Source | Two product files and four regression files; 68 selected inputs and 9,789 candidate files reconciled | [Source admission](independent-review/REPAIR-SOURCE-ADMISSION.json), [candidate admission](candidate-admission.json) |\n| Current snapshot | Nine modified files and three additions; 68 R06 inputs unchanged; successor candidate required | [Source comparison](independent-review/CAPACITY-CHECKPOINT-SOURCE-REVIEW.json) |\n| Mocked tests | 116 passed; 5 suites; 0 failures/skips; isolated from application environment and network | [Independent unit review](independent-review/UNIT-OUTCOME-REVIEW.json) |\n| Dependencies | 152,806 copied files matched the archive; 2,998,378,443 bytes; verified reuse, not a clean install | [Dependency review](independent-review/DEPENDENCY-STAGING-OUTCOME-REVIEW.json) |\n| Native database preparation | 122 migrations; 16 synthetic users; 32 accounts; 0 issued sessions | [Database review](independent-review/DATABASE-OUTCOME-REVIEW.json) |\n| Full build | No client-generation or compiler commands executed; capacity gate failed | [Build entry](build-result.json), [latest capacity](resource-retry-ready-attempt02-r2.json) |\n| Real sessions/browser | Not run on this repaired candidate; 107 cases mapped to 58 original requirements | [Qualification contract](runtime/qualification-contract.json) |\n| Recovery | Owned database suspended; exact fixture/state preserved; resume recipe reviewed | [Suspension receipt](database/capacity-suspension.json), [resume recipe](database/resume-after-capacity.cjs) |\n| Independent outcome | Accurate blocked checkpoint accepted; qualification not passed | [Final review](${reviewPath}) |\n\n## Repair and preserved boundaries\n\nThe credential before-hook applies the installed form-CSRF guard before account lookup or lock audit and no longer resets expired locks. The after-hook updates credential bookkeeping only for a genuine session-token/user success or the native401 INVALID_EMAIL_OR_PASSWORD result. Other outcomes do not become failed passwords. Genuine wrong-password and 30-minute threshold-lock behavior remains covered by explicit tests.\n\nCurrent continuation ownership is limited to lib/auth.ts, lib/security/credential-sign-in-outcome.ts and four regression files. Earlier current-session protection and unrelated edits are preserved. E01–E29 and every prior failed observation remain unchanged; this packet does not turn old failures into passes.\n\n## Blocking evidence and next action\n\nFinal source comparison found nine modified files and three additions, giving 9,792 current files versus 9,789 in the intact frozen candidate. All 68 selected P04-R06 inputs and the six owned repair/test files still match. This is an identity finding, not a correctness judgment on the concurrent finance/payment changes. Preserve them and admit a successor candidate before building. See [exact source delta](independent-review/CAPACITY-CHECKPOINT-SOURCE-REVIEW.json).\n\nThe latest readiness check recorded ${physical} GiB available physical memory and ${commit} GiB remaining commit capacity against unchanged 6/12 GiB requirements. Storage passed. Releasing only owned analysis kernels did not establish sufficient capacity. The original failed entry and both subsequent readiness observations are retained.\n\n${next}\n\nEven after R06 passes, R08 module enforcement, R07 failed-refresh recovery, R05 approved finance visibility implementation and remaining P04 qualification obligations still block parent completion. Those implementations are not authorized by this continuation.\n\nNo commit, push, deployment, production flag change or production-data migration occurred. Hosted/provider/operator admission, clean-install reproducibility and whole-system production readiness are not certified.\n`;
write('RESULT.md', result);
write('CURRENT.md', `# Current execution checkpoint\n\nP04-R06 remains blocked. Rejected-request bookkeeping is implemented and independently reviewed; 116 mocked tests pass. The new full build and actual session/browser qualification have not run because memory capacity remains below the reviewed threshold. The frozen candidate also needs refresh after 12 concurrent source differences; all 68 selected P04-R06 inputs still match. The owned qualification database is suspended with its state preserved.\n\nCandidate: ${candidate.candidateId}; no built artifact. Latest capacity: ${physical} GiB physical / ${commit} GiB commit; requirements: 6/12 GiB.\n\n[Current evidence](<${absolute}/RESULT.md>) · [Advancement gates](<${absolute}/advancement-gates.json>) · [Independent review](<${absolute}/${reviewPath}>)\n\nParent P04, P04-V02 and production remain blocked. Historical V02/E29 findings are preserved. R08, R07 and R05 implementations and wider qualification remain pending and unauthorized by this continuation.\n`);
write('NEXT.md', `# Exact next action\n\n${next}\n\n[Successor handoff](<${absolute}/RETRY-HANDOFF-20261110-r3.md>) · [Source delta](<${absolute}/independent-review/CAPACITY-CHECKPOINT-SOURCE-REVIEW.json>) · [Current evidence](<${absolute}/RESULT.md>) · [Latest resource check](<${absolute}/resource-retry-ready-attempt02-r2.json>) · [Preserved recovery recipe; rebind before use](<${absolute}/database/resume-after-capacity.cjs>) · [Preserved build retry; currently ineligible](<${absolute}/independent-review/BUILD-RECIPE-ADMISSION-attempt02.json>)\n\nAdvancement requires a successful isolated full build, every admitted real-session and browser case, exact native no-write/private-data evidence for denials, authorized positives, source/artifact integrity, owned cleanup and independent outcome review. Source inspection, 116 mocked passes and database preparation do not satisfy these runtime gates.\n\nAfter R06 qualification, the next recommended repair is P04-R08: refresh the inventory item-list source/guard map and seek bounded implementation authorization. R05/R07/R08 are not authorized by this continuation. No commit, push, deployment or production changes.\n`);
const evidence = ['RESULT.md', 'advancement-gates.json', 'AUTHORIZATION.md', 'EXECUTION.md', 'RETRY-HANDOFF-20261110-r3.md', driftPath, 'independent-review/CURRENT-SOURCE-MANIFEST-at-capacity.json', 'inventory/source-before-manifest.json', 'inventory/source-after-manifest.json', 'inventory/repair-owned-files.json', 'inventory/authority-map.json', 'unit/attempt01/receipt.json', 'unit/attempt01/jest.json', 'independent-review/REPAIR-SOURCE-ADMISSION.json', 'independent-review/UNIT-OUTCOME-REVIEW.json', 'dependency-staging.json', 'candidate-admission.json', 'database/fixture-seeded.json', 'independent-review/DATABASE-OUTCOME-REVIEW.json', 'build-result.json', 'resource-build-admission.json', 'resource-retry-ready-attempt02.json', 'resource-retry-ready-attempt02-r2.json', 'runtime/qualification-contract.json', 'independent-review/BUILD-RECIPE-ADMISSION-attempt02.json', 'database/capacity-suspension.json', 'database/resume-after-capacity.cjs', reviewPath];
for (const name of evidence) assert(fs.existsSync(path.join(packet, name)), name);
json('publication-input.json', {
  status: 'blocked', source_admission: 'independent-review/REPAIR-SOURCE-ADMISSION.json', review: reviewPath,
  current_state: state + sourceBlocker, parent_state: parentState, v02_state: v02State,
  execution_boundary: 'This continuation is authorized to repair rejected-request bookkeeping and complete isolated qualification. It owns two product files and four regression files; earlier current-session protection and unrelated edits are preserved. Runtime qualification remains blocked by capacity and current-candidate drift. No R05/R07/R08 implementation, commit/push, production flag/data changes or deployment is authorized.',
  additional_task: 'Repair rejected-request credential bookkeeping, preserve genuine sign-in/failure/lock behavior, qualify all 107 admitted real-session/browser cases against one new artifact with native evidence, obtain independent review and publish outcomes. Implementation and116 mocked regressions complete; full-app qualification remains pending memory capacity and successor candidate admission.',
  evidence_record: {
    candidate_id: candidate.candidateId, artifact_sha256: null,
    source_hashes: prefix + 'inventory/source-after-manifest.json:68selected; candidate-admission.json:9789full source files; zero overrides/additions',
    source_review: prefix + 'independent-review/REPAIR-SOURCE-ADMISSION.json',
    commands: prefix + 'build-result.json:0build commands executed; admitted run-build-attempt02.cjs and run-runtime-v3.cjs NOT RUN',
    mocked_tests: prefix + 'unit/attempt01/jest.json:116passed;5suites;0failed;0skipped; isolated mocked persistence',
    native_database: prefix + 'independent-review/DATABASE-OUTCOME-REVIEW.json:122migrations;16syntheticusers;32accounts;0issued sessions; setup proof only, no auth qualification',
    authenticated_browser: 'NOT RUN on repaired r2 candidate;107-case successor contract prepared, original58 logical requirements preserved',
    build: prefix + 'build-result.json:entry capacity failure before private client generation/environment/compilation; no artifact',
    resource_gate: prefix + `resource-retry-ready-attempt02-r2.json:${physical}GiBphysical/${commit}GiBcommit;6/12GiBrequirements;blocked`,
    cleanup: prefix + 'database/capacity-suspension.json:ownedcluster stopped; fixture/data/evidence preserved; reviewed resume required',
    reviewer: prefix + reviewPath, advancement: prefix + 'advancement-gates.json:false',
    latest_checkpoint: prefix + 'RESULT.md', prior_checkpoint: 'execution/P04-R06/qualification-20261109-r1/RESULT-attempt02.md',
    reconciliation: prefix + 'runtime/qualification-contract.json:107planned cases;58original requirements; no actual repaired-artifact run',
    remaining_handoffs: [prefix + 'NEXT.md', prefix + 'RETRY-HANDOFF-20261110-r3.md', prefix + 'database/resume-after-capacity.cjs'],
    current_source: prefix + driftPath + ':9modified/3added;9792current versus9789frozen;all68R06 inputs unchanged;successor candidate required',
    provider_hosted: 'NOT RUN', operator: 'NOT RUN',
    evidence_limit: 'Source/mocked/database-setup/capacity/suspension evidence only. No repaired artifact, real-session/browser qualification, clean-install or production certification. E29 observations remain historical.'
  },
  evidence_label: 'P04-R06 bookkeeping repaired; 116 mocked regressions pass; captured candidate and database accepted; full build and 107-case qualification blocked by memory and concurrent source drift; owned database suspended with reviewed recovery',
  evidence,
  mutation_append: `\n\n## ${at} — E30 P04-R06 repair and capacity-blocked qualification\n\n${state}${sourceBlocker}\n\nOnly P04-R06 current state/boundary/task/evidence and parent P04/V02 summaries were advanced to this checkpoint. All 57 domains, 59 packages, global decisions/gates, dependencies, deferred commitments and implementation authorizations remain intact. E01–E29 are preserved. No commit, deployment or production changes.\n`,
  roadmap_tail: `**Exact next action:** ${next}\n\nP04-R06 remains blocked until actual full-app qualification passes; parent P04 and production remain blocked. See [E30 evidence](execution/P04-R06/qualification-20261110-r2/RESULT.md).\n`
});
console.log(JSON.stringify({ prepared: true, status: 'blocked', candidateId: candidate.candidateId, artifactSha256: null, files: 5 }));
