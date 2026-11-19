// Retain the observed AF16 attempt 3 timeout and attempt 4 competing-build refusal.
// Reads only the owned synthetic database; updates this phase's documentation and evidence.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { Client } = require('pg');
const { root, guard } = require('./af16-verification-context.cjs');
const docs = path.join(root, 'docs/accounting-firms');
const roadmap = path.join(docs, 'roadmap-2026-10-19');
const phase = path.join(roadmap, 'execution/AF16');
const run = path.join(phase, '2026-10-26-run-02');
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const json = name => JSON.parse(read(path.join(run, name)));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2), { flag: 'wx' });
function replace(file, before, after) {
  const text = read(file);
  if (!text.includes(before) || text.indexOf(before) !== text.lastIndexOf(before)) throw Error('Expected unique text in ' + file);
  fs.writeFileSync(file, text.replace(before, after));
}
async function main() {
  if (fs.existsSync(path.join(run, 'attempt-4-summary.json'))) throw Error('Retry results already finalized');
  const third = json('artifact-build-attempt-3.json'), fourth = json('artifact-build-attempt-4.json');
  const log3 = read(path.join(run, 'artifact-build-attempt-3.log')), log4 = read(path.join(run, 'artifact-build-attempt-4.log'));
  if (!third.error?.includes('ETIMEDOUT') || !log3.includes('Compiled successfully in 15.9min') || !log3.includes('Collecting page data') || !log3.includes('Status: timeout') || !log3.includes('Orphaned build chains after build: 0')) throw Error('Unexpected attempt 3 result');
  if (fourth.exitCode !== 1 || !log4.includes('Status: blocked-orphaned-build') || !log4.includes('pid=10304 ppid=30996') || !log4.includes('24 problems (0 errors, 24 warnings)')) throw Error('Unexpected attempt 4 result');
  if (hash(path.join(root, 'scripts/run-af16-release-candidate.cjs')) !== fourth.runnerSha256) throw Error('Runner changed after attempt 4');
  if (!read(path.join(run, 'workflow-check-attempt-4.log')).includes('Workflow contract passed;')) throw Error('Workflow check missing');
  if (!fs.existsSync(path.join(run, 'verification-summary-attempts-1-2.json'))) throw Error('Historical summary required');
  if (fs.existsSync(path.join(root, '.codex-tmp/af16-artifact-20261026')) || fs.existsSync(path.join(root, '.codex-tmp/af16-release-20261026/.next/BUILD_ID'))) throw Error('Unexpected artifact; review results');
  const probe = new Client({ connectionString: 'postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261026_build_r2', connectionTimeoutMillis: 5000 });
  await probe.connect();
  let database;
  try {
    await guard(probe);
    database = (await probe.query('SELECT (SELECT count(*) FROM users)::int users,(SELECT count(*) FROM organizations)::int organizations,(SELECT count(*) FROM _prisma_migrations)::int migrations')).rows[0];
  } finally { await probe.end(); }
  if (database.users !== 0 || database.organizations !== 0 || database.migrations !== 120) throw Error('Unexpected database state');
  write('build-database-after-attempt-4.json', { ...database, clusterGuardPassed: true, observedAt: new Date().toISOString(), scope: 'Empty synthetic AF16 build clone; read-only observation' });
  write('attempt-4-summary.json', { workflow: 'PASS', initialProcessGuard: 'PASS', frozenSourceIdentity: 'PASS', databaseMigrationChecks: 'PASS', lint: { errors: 0, warnings: 24 }, compiler: 'NOT_RUN', outcome: 'BLOCKED_BY_COMPETING_BUILD_AFTER_LINT', elapsedMs: fourth.elapsedMs, competingProcessAtObservation: { pid: 10304, parentPid: 30996 }, buildTimeoutMs: fourth.buildTimeoutMs, pipelineTimeoutMs: fourth.pipelineTimeoutMs, note: 'Process IDs are historical observations, not reusable shutdown targets. No competing process stopped; no allow-orphans/skip-clean/lint/type bypass.' });
  write('retry-orchestration-sources.json', ['run-af16-release-candidate.cjs', 'verify-af16-artifact-runtime.cjs', 'finalize-af16-build-retries.cjs'].map(name => ({ file: 'scripts/' + name, sha256: hash(path.join(root, 'scripts', name)) })));
  const summary = { date: '2026-10-26', latestAttempt: 4, workflow: 'PASS', clientGeneration: 'PASS_RETAINED', lint: { errors: 0, warnings: 24 }, compiler: 'PASS_ATTEMPT_3_15_9_MINUTES', nextTypeGate: 'PASSED_STAGE_ATTEMPT_3_LOG_ADVANCED_TO_PAGE_DATA', pageDataCollection: 'STARTED_THEN_TIMEOUT_ATTEMPT_3', artifactBuild: 'INCOMPLETE: attempt 3 timeout; attempt 4 blocked by competing build', artifactSealing: 'NOT_RUN', artifactVerification: 'NOT_RUN', artifactRuntime: 'HELPER_SYNTAX_CHECKED_NOT_EXECUTED', newBrowserChecks: 'NOT_RUN', newUnitTests: 'NOT_RUN', production: 'NO_GO', formalAF16: 'IMPLEMENTED_UNVERIFIED', pilot: 'PILOT_PREPARED', liveValidation: 'DEFERRED', nextUnusedAttempt: 5 };
  fs.writeFileSync(path.join(run, 'verification-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(phase, 'BUILD_ASSURANCE_2026-10-26.md'), `# AF16 local build assurance follow-up

26 October 2026. **Workflow and lint PASS. Application compilation and the Next.js type-check stage passed in attempt 3; page-data collection started but the build timed out. Attempt 4 was blocked by a new competing build after lint. No sealed artifact exists. AF16 remains IMPLEMENTED_UNVERIFIED; production NO_GO; pilot PILOT_PREPARED with live validation deferred.**

## Candidate and reused functionality

Reused the existing source snapshot, release-artifact, secret-preflight, lint, safe-build and AF16 database controls. The candidate retains 7,916 source files from HEAD 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus captured local changes. Its independent Git index and generated output remain separate from the primary checkout. Environment files were excluded. Both retries checked every frozen source path/hash and the owned database's 120 migration names/checksums before entering the artifact pipeline.

The private source archive SHA-256 remains 0db1890ac0c8463838bc1910884cb9480c51750a8047b6658cb56b408c76b567. See [source manifest](2026-10-26-run-02/source-manifest.json) and [candidate preparation](2026-10-26-run-02/candidate-preparation.json). Installed dependencies were copied, not installed afresh: Next 15.5.27, React 19.2.6 and Prisma 6.19.3. The successful 208.4-second Prisma generation is retained evidence. This is not clean-lockfile-install or dependency-audit proof.

## Executed checks and actual results

| Check | Result | Evidence class and limit |
|---|---|---|
| Workflow contract | PASS before attempts 3 and 4; 196 unclassified scripts | Read-only contract checks; no registry hashes changed |
| Frozen source and database prechecks | PASS on both retries | Exact file identity and real PostgreSQL catalog/checksum reads |
| Synthetic secret preflight | CONDITIONAL; 2 disabled-live-delivery warnings | Fresh synthetic secrets, release enforcement off; not production-secret approval |
| Configured full lint | PASS on both retries; 0 errors, 24 warnings each | Repeated runs are not additional unique test coverage |
| Attempt 3 compilation | PASS in 15.9 minutes | Actual full application compiler, not a fixture |
| Attempt 3 Next type gate | Passed stage | Log advanced from type checking to Collecting page data; no separate tsc test total is claimed |
| Attempt 3 page-data collection | Started, not completed | Safe build reached its 30-minute limit; outer runner reached 40 minutes (2400265 ms), with ETIMEDOUT/SIGTERM |
| Attempt 4 | BLOCKED after lint; exit 1, 516.3 seconds | Another Next build appeared after the initial process check; the compiler was not invoked in this attempt |
| Build ID, sealing and artifact verification | NOT PRODUCED / NOT RUN | Partial .next output is not a release artifact |
| Runtime smoke helper | Syntax PASS; actual execution NOT RUN | Requires a verified sealed artifact; no HTTP or browser result inferred |
| New unit, browser or previous-app rollback checks | NOT RUN | The 25 October development results remain historical |

Read the full [attempt 3 log](2026-10-26-run-02/artifact-build-attempt-3.log), [exit receipt](2026-10-26-run-02/artifact-build-attempt-3.json), [stage summary](2026-10-26-run-02/attempt-3-summary.json), [attempt 4 log](2026-10-26-run-02/artifact-build-attempt-4.log) and [retry summary](2026-10-26-run-02/attempt-4-summary.json). Attempts 1 and 2 remain retained: both were blocked before compilation by the earlier competing build. Their original summary, cleanup and publication receipts are preserved with the attempts-1-2 suffix.

## Timeout and process findings

Attempt 3 passed the process guard and ran the compiler. A retained activity sample showed CPU work and an updating trace, with only about 151 MiB of physical memory available at that instant. This documents resource pressure; it does not establish a sole root cause. The compiler also emitted next-intl dynamic-import dependency-cache warnings. Compilation still passed. Next's lint warnings and the later page-data/timeout messages are preserved in the log.

The safe-build wrapper reported zero remaining build chains after its timeout. The outer runner also expired, demonstrating that its original 40-minute total budget was too close to lint plus the 30-minute build budget. The AF16 orchestration runner now supplies a bounded 60-minute build budget and a 90-minute outer budget, and records those values plus its source hash in the exit receipt. No application, migration, dependency, command-registry, allow-orphans, cleanup, lint or type-check control was changed.

Attempt 4's early guard passed, but another task started a root-checkout build while AF16 was running lint. The normal second guard refused that build conflict. PID 10304 and parent 30996 are historical observations only; the other task was not stopped or modified. The longer compiler budget is configured but has not yet been exercised through a successful full build.

## Database, warnings and runtime preparation

The retained build database is the owned loopback clone on 127.0.0.1:55451. Its final read-only observation after attempt 4 found zero users, zero organizations and 120 migration records. See [database receipt](2026-10-26-run-02/build-database-after-attempt-4.json). No schema promotion, real firm enrollment or provider delivery occurred. Cleanup is recorded separately; the database files and frozen candidate are retained.

The 24 configured-lint warnings comprise 21 react-hooks/exhaustive-deps, two @next/next/no-img-element and one import/no-anonymous-default-export warning. [Exact findings](2026-10-26-run-02/lint-findings.json) remain available and neither retry suppressed them.

Added scripts/verify-af16-artifact-runtime.cjs using the existing release verifier and S11 isolated-runtime pattern. It requires the trusted manifest digest, copies verified runtime bytes outside repository ancestors, uses fresh synthetic configuration and the guarded local database, and checks EN/FR public/login HTML, anonymous dashboard redirects, public/static asset hashes and unchanged sealed bytes. It shuts down its own server and retains an HTTP receipt. Both changed/new orchestration files passed node --check. The runtime helper remains unexecuted because no artifact exists; it is not TLS, authenticated browser, previous-application rollback or production evidence.

## Next bounded step

Use a quiet build window after the competing task finishes. Restart only the owned AF16 cluster on its existing port if stopped; reuse the existing build database and frozen source. Do not rerun the fresh clone creators. Next unused command: node scripts/run-af16-release-candidate.cjs --attempt 5. Keep normal process, source, database, cleanup, lint, type and artifact controls. Each attempt refuses to overwrite its receipts.

If the pipeline seals and verifies an artifact, run node scripts/verify-af16-artifact-runtime.cjs and inspect its actual receipt before claiming runtime success. Then continue the remaining selected-scope browser and prior-application rollback work. The latter needs a retained compatible predecessor application; synthetic SQL upgrade proof alone does not supply it.

Ready-to-use continuation prompt:

> Continue AF16 artifact assurance from BUILD_ASSURANCE_2026-10-26.md. Wait for a quiet local build window without stopping other tasks or bypassing the process guard. Reuse the retained frozen candidate and owned synthetic database; restart only the AF16 cluster on port 55451 if needed. Run the next unused guarded attempt, currently attempt 5, with the documented 60-minute build and 90-minute overall budgets. Retain actual lint, compiler, type, page-generation, sealing and hash-verification results. Diagnose any genuine failure without suppressing checks or altering unrelated work. If a sealed artifact verifies, execute the prepared isolated HTTP runtime check and record its exact scope. Update the roadmap and matching Markdown/PDF reports. Keep live validation, deployment, provider delivery, AF14/AF15 and qualified-country claims deferred.

## Release decision

This continuation establishes successful application compilation and progression through the Next type gate, but not a complete build. Sealed-artifact verification, clean-install reproducibility, isolated runtime, previous-application rollback, remaining browser coverage, agreed performance budgets and AF11 qualified country review remain open. Production stays NO_GO, AF16 IMPLEMENTED_UNVERIFIED and the pilot PILOT_PREPARED. See [development result](RESULT.md), [decision matrix](GO_NO_GO.md) and [current summary](2026-10-26-run-02/verification-summary.json).
`);
  replace(path.join(docs, 'README.md'), 'Workflow and lint pass; compilation remains blocked by a competing build.', 'Workflow, lint, compilation and the Next type gate passed; page-data collection timed out, then a competing build blocked the longer retry. No sealed artifact exists.');
  replace(path.join(phase, 'RESULT.md'), 'Compilation was blocked by another active build; no artifact was produced.', 'Attempt 3 compiled successfully and advanced through the Next type gate to page-data collection before timing out. Attempt 4 was blocked after lint by a new competing build; no sealed artifact was produced.');
  replace(path.join(roadmap, '01_IMPLEMENTATION_ROADMAP.md'), 'the isolated artifact build is blocked before compilation by another active build. No artifact or production GO is claimed.', 'attempt 3 compiled successfully and passed the Next type gate before timing out in page-data collection; attempt 4 was blocked by a new competing build. No sealed artifact or production GO is claimed.');
  replace(path.join(roadmap, 'STATUS.md'), 'The full lint check passes, but compilation is blocked by another active build; AF08’s earlier failure remains historical evidence.', 'Full lint, compilation and the Next type gate passed; page-data collection timed out, then a new competing build blocked the longer retry. No sealed artifact exists; AF08’s earlier failure remains historical evidence.');
  replace(path.join(roadmap, 'STATUS.md'), 'workflow and full lint pass, isolated candidate prepared; compiler blocked by competing build', 'workflow/lint/compilation and Next type gate pass; page-data timeout retained; longer retry blocked by a new competing build');
  replace(path.join(phase, 'GO_NO_GO.md'), 'Current lint passes with 24 warnings; actual compilation is blocked by another active build.', 'Current lint passes with 24 warnings; compilation and the Next type gate passed, but page-data collection timed out and a new competing build blocked the longer retry.');
  const followup = `# AF16 next step — finish and verify the isolated artifact

26 October 2026. Attempt 3 compiled the full application in 15.9 minutes and advanced through the Next type gate to page-data collection, then hit the build/outer timeouts. Attempt 4 passed lint (zero errors, 24 warnings) but another task started a build, so the process guard refused compilation. No sealed artifact exists. AF16 remains IMPLEMENTED_UNVERIFIED; production NO_GO and live validation deferred.

Read [the current build report](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF16/BUILD_ASSURANCE_2026-10-26.md>). Use a quiet build window; preserve other tasks. Restart only the owned AF16 cluster on port 55451 if needed and reuse the existing frozen candidate/database. Run the next unused guarded attempt, currently node scripts/run-af16-release-candidate.cjs --attempt 5, with the documented 60-minute build and 90-minute outer budgets. Preserve all guards and prior receipts. If sealing and digest verification pass, run node scripts/verify-af16-artifact-runtime.cjs; its current evidence is syntax-only. Record actual results and update Markdown/PDF reports. Remaining browser, predecessor-application rollback, clean-install, performance-budget and AF11 review gates stay separate. No schema promotion, live delivery or rollout is authorized.
`;
  fs.writeFileSync(path.join(root, 'what-next/2026-10-26-af16-build-assurance.md'), followup);
  fs.writeFileSync(path.join(docs, 'supporting-reports/2026-10-26-af16-build-assurance.md'), followup);
  console.log(JSON.stringify(summary));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
