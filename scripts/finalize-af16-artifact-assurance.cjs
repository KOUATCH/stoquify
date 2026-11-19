// Record completed local artifact assurance; never promotes schemas or deploys applications.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { Client } = require('pg');
const { root, guard } = require('./af16-verification-context.cjs');
const docs = path.join(root, 'docs/accounting-firms'), roadmap = path.join(docs, 'roadmap-2026-10-19');
const phase = path.join(roadmap, 'execution/AF16'), run = path.join(phase, '2026-10-26-run-02');
const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const json = file => JSON.parse(read(path.join(run, file)));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2), { flag: 'wx' });
function replace(file, before, after) {
  const text = read(file);
  if (!text.includes(before) || text.indexOf(before) !== text.lastIndexOf(before)) throw Error('Unique expected text missing: ' + file);
  fs.writeFileSync(file, text.replace(before, after));
}
async function main() {
  if (fs.existsSync(path.join(run, 'attempt-5-summary.json'))) throw Error('Artifact results already finalized');
  const build = json('artifact-build-attempt-5.json'), verified = json('artifact-verify-attempt-5.json');
  const initialRuntime = json('artifact-runtime.json'), aliasRuntime = json('artifact-runtime-retry.json'), runtime = json('artifact-runtime-attempt-3.json'), install = json('locked-install.json'), digest = json('artifact-digest.json').sha256;
  const manifestPath = path.join(root, '.codex-tmp/af16-artifact-20261026/artifact.json');
  const manifest = JSON.parse(read(manifestPath)), log = read(path.join(run, 'artifact-build-attempt-5.log'));
  if (build.exitCode !== 0 || verified.exitCode !== 0 || !runtime.passed || !runtime.copiedBytesVerified || !runtime.serverStopped || !runtime.artifactUnchangedAfterRequests || runtime.checks.length !== 8) throw Error('Successful artifact and runtime evidence required');
  if (initialRuntime.passed || !initialRuntime.serverStopped || !initialRuntime.error?.includes('TimeoutError') || runtime.requestTimeoutMs !== 120000) throw Error('Expected retained cold-request timeout and diagnostic retry');
  if (aliasRuntime.passed || !aliasRuntime.serverStopped || !aliasRuntime.error?.includes('http://localhost:') || aliasRuntime.checks.length !== 2) throw Error('Expected retained loopback-origin harness mismatch');
  if (sha(manifestPath) !== digest || runtime.artifactSha256 !== digest || runtime.buildId !== manifest.buildId) throw Error('Artifact receipt identity mismatch');
  if (!log.includes('Status: passed') || !log.includes('24 problems (0 errors, 24 warnings)') || !log.includes('Generating static pages (11/11)') || !log.includes('Compiled successfully in 14.3min')) throw Error('Unexpected build stages');
  if (!install.passed || !install.inputsUnchanged || install.exitCode !== 0) throw Error('Locked install evidence missing');
  if (!read(path.join(run, 'workflow-check-attempt-5.log')).includes('Workflow contract passed;') || !read(path.join(run, 'workflow-check-attempt-5-final.log')).includes('Workflow contract passed;') || !fs.existsSync(path.join(run, 'verification-summary-attempts-3-4.json'))) throw Error('Workflow/history evidence missing');
  const client = new Client({ connectionString: 'postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261026_build_r2', connectionTimeoutMillis: 5000 });
  await client.connect();
  let database;
  try { await guard(client); database = (await client.query('SELECT (SELECT count(*) FROM users)::int users,(SELECT count(*) FROM organizations)::int organizations,(SELECT count(*) FROM _prisma_migrations)::int migrations')).rows[0]; }
  finally { await client.end(); }
  if (database.users !== 0 || database.organizations !== 0 || database.migrations !== 120) throw Error('Unexpected synthetic database counts');
  write('build-database-after-attempt-5.json', { ...database, observedAt: new Date().toISOString(), clusterGuardPassed: true, scope: 'Read-only counts after the full build and anonymous HTTP smoke; no migration execution' });
  write('latest-orchestration-sources.json', ['run-af16-release-candidate.cjs', 'verify-af16-locked-install.cjs', 'verify-af16-artifact-runtime.cjs', 'finalize-af16-artifact-assurance.cjs'].map(name => ({ file: 'scripts/' + name, sha256: sha(path.join(root, 'scripts', name)) })));
  const summary = { date: '2026-10-26', latestAttempt: 5, workflow: 'PASS', lint: { errors: 0, warnings: 24 }, compilation: 'PASS_14_3_MINUTES', nextTypeGate: 'PASS', staticPages: '11/11', fullBuild: 'PASS', artifactSealing: 'PASS', artifactFiles: manifest.files.length, artifactSha256: digest, buildId: manifest.buildId, artifactVerification: 'PASS', isolatedHttpRuntime: { passedOnRetry: true, initialAttempt: 'FIRST_PUBLIC_REQUEST_TIMEOUT_30_SECONDS', diagnosticRequestLimitMs: 120000, slowestRetryCheckMs: Math.max(...runtime.checks.map(check => check.elapsedMs)), checks: 8, serverStopped: true, artifactUnchanged: true }, lockedInstall: { passed: true, packages: 1340, elapsedMs: install.elapsedMs, lifecycleScripts: 'DISABLED', cleanBuildFromThisInstall: 'NOT_RUN' }, newUnitTests: 'NOT_RUN', newBrowserChecks: 'NOT_RUN', migrations: 'NOT_RUN', priorApplicationRollback: 'NOT_RUN', production: 'NO_GO', formalAF16: 'IMPLEMENTED_UNVERIFIED', pilot: 'PILOT_PREPARED', liveValidation: 'DEFERRED' };
  write('attempt-5-summary.json', summary);
  fs.writeFileSync(path.join(run, 'verification-summary.json'), JSON.stringify(summary, null, 2));
  fs.copyFileSync(path.join(root, '.codex-tmp/af16-release-20261026/what-next/release-secret-preflight.json'), path.join(run, 'secret-preflight-attempt-5.json'), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(phase, 'BUILD_ASSURANCE_2026-10-26.md'), `# AF16 local artifact and runtime assurance

26 October 2026. **Full application build, artifact sealing and digest verification PASS. Eight isolated HTTP checks PASS on a diagnostic retry; the initial 30-second public-page timeout is retained. Fresh lockfile installation with lifecycle scripts disabled also PASS. AF16 remains IMPLEMENTED_UNVERIFIED for release; production NO_GO; pilot PILOT_PREPARED with live validation deferred.**

## Verified candidate and artifact

Reused Stoquify's source-snapshot, secret-preflight, lint, safe-build, release-artifact and AF16 database controls. The frozen candidate contains 7,916 source files from HEAD 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus captured local changes. Its independent index, dependencies and build output are isolated from the primary checkout. Environment files were excluded. The [source manifest](2026-10-26-run-02/source-manifest.json) identifies the exact tested bytes; later primary-checkout changes are not covered automatically.

The private source archive SHA-256 remains 0db1890ac0c8463838bc1910884cb9480c51750a8047b6658cb56b408c76b567. Build dependencies were the retained installed copy: Next 15.5.27, React 19.2.6 and Prisma 6.19.3. The separate fresh installation below did not replace that dependency tree.

| Artifact identity | Recorded value |
|---|---|
| Build ID | ${manifest.buildId} |
| Sealed runtime files | ${manifest.files.length} |
| Manifest SHA-256 | ${digest} |
| Retained artifact | .codex-tmp/af16-artifact-20261026 |
| Source candidate | .codex-tmp/af16-release-20261026 |

The digest was captured immediately from the produced artifact and supplied to the independent verifier. Local content verification is not a signature, immutable artifact store or deployment authorization.

## Actual verification results

| Check | Result | Evidence class and limit |
|---|---|---|
| Workflow contract | PASS; 196 scripts unclassified | Read-only contract check; no registry hash refresh |
| Frozen source and database prechecks | PASS | Exact file hashes and 120 migration names/checksums before building |
| Synthetic secret preflight | CONDITIONAL; 2 disabled-live-delivery warnings | Fresh synthetic secrets; release enforcement off; not production-secret approval |
| Configured full lint | PASS; 0 errors, 24 warnings | Warnings retained; no suppression |
| Application compilation | PASS in 14.3 minutes | Actual full application compiler |
| Next type gate and page generation | PASS; 11/11 static pages | Complete Next pipeline, not a separate tsc test count |
| Full build and artifact sealing | PASS; ${(build.elapsedMs / 60000).toFixed(1)} minutes overall | Normal cleanup removed incomplete output; valid final output; no remaining build chains |
| Independent artifact verification | PASS; ${(verified.elapsedMs / 1000).toFixed(1)} seconds | Source identity, manifest digest and every sealed file checked |
| Isolated runtime | PASS on retry; 8 HTTP checks | Initial public request timed out at 30 seconds; retry limit 120 seconds. No latency/SLO, authenticated browser or TLS claim |
| Fresh locked installation | PASS; 1,340 packages in ${(install.elapsedMs / 60000).toFixed(1)} minutes | Lifecycle scripts disabled; not a full clean-install build or native-module qualification |
| Final synthetic database observation | 0 users, 0 organizations, 120 migration records | Guarded read-only counts; no new migration or real enrollment |

Receipts: [build log](2026-10-26-run-02/artifact-build-attempt-5.log), [build exit](2026-10-26-run-02/artifact-build-attempt-5.json), [artifact verification](2026-10-26-run-02/artifact-verify-attempt-5.json), [initial runtime timeout](2026-10-26-run-02/artifact-runtime.json), [loopback-origin mismatch](2026-10-26-run-02/artifact-runtime-retry.json), [final runtime retry](2026-10-26-run-02/artifact-runtime-attempt-3.json), [locked install](2026-10-26-run-02/locked-install.json) and [database observation](2026-10-26-run-02/build-database-after-attempt-5.json).

## Runtime and dependency scope

The runtime check reused the existing release verifier and S11 outside-repository copy pattern. It verified copied bytes before starting the sealed server on a temporary 127.0.0.1 port. Fresh synthetic configuration and the guarded AF16 database were used; live statement and invitation delivery stayed disabled. No application environment files or workspace dependency fallback were used.

The initial server started in 1.647 seconds, but its first public-page request exceeded the 30-second check limit; no page check completed. That failure and server shutdown were retained. Source inspection found in-process session lookup and local rendering in the public route. No application fix was made. A diagnostic retry used a 120-second limit: English public HTML took 34,885 ms (headers at 16,349 ms), and login HTML took 536 ms. It then stopped because the harness expected a 127.0.0.1 redirect origin while Next returned localhost. The installed next/dist/server/web/next-url.js explicitly normalizes loopback aliases to localhost.

The final retry used localhost consistently for requests/configuration, verified that DNS resolved only to loopback, retained the strict 127.0.0.1 listener and same-origin redirect assertions, and reused the copy only after matching every file to the verified manifest. It recorded route/status/header/body timings; its slowest completed check took ${Math.max(...runtime.checks.map(check => check.elapsedMs))} ms. Both earlier failure receipts remain. A passing retry does not establish acceptable cold-start latency or production responsiveness.

The eight final retry checks covered English/French public and login HTML (four HTTP 200 responses), anonymous accounting-dashboard redirects to the corresponding login page with the callback path retained (two checks), and a public asset plus a Next static asset whose served bytes matched their sealed hashes (two checks). The sealed source/artifact were reverified after requests. The child server was stopped and the copied runtime retained. These are HTTP checks, not screenshots, accessibility scans, authenticated financial journeys, TLS proof or previous-application rollback. The build used public origin https://127.0.0.1:3186; future authenticated browser checks must account for bundled public configuration and verify origin/cookie behavior with an isolated local HTTPS setup. Changing runtime environment variables alone does not replace already-bundled public values.

The independent install used npm ci --ignore-scripts --no-audit --no-fund in a fresh private directory with empty task-owned npm configuration and cache. Package.json, package-lock.json and the vendored SheetJS archive matched the frozen manifest; the archive also matched lockfile SHA-512 integrity. Installation inputs stayed unchanged, and the six recorded key package versions matched the retained candidate. npm reported a better-call/zod peer warning and existing package deprecations. No version was changed and no vulnerability audit ran. The receipt lists all skipped lifecycle packages. Client generation, native/lifecycle validation and a build from that fresh install remain separate work.

## Earlier attempts and changes retained

| Attempt | Historical outcome |
|---|---|
| 1 | Process guard blocked a competing build after lint |
| 2 | Early guard blocked the same competing process before lint |
| 3 | Compilation passed in 15.9 minutes; type gate passed; page-data collection began, then the 30-minute build and 40-minute outer budgets expired |
| 4 | Lint passed; a new competing build appeared before compilation and the second guard refused it |
| 5 | Waited for the competing build to finish, then completed the guarded artifact pipeline and independent verification |

All earlier logs and receipts remain. Prior summary, cleanup and publication receipts are preserved with attempts-1-2 and attempts-3-4 suffixes. No other task's processes were stopped. The AF16 runner uses a bounded 60-minute build budget and 90-minute outer budget; it retains process, source, database, cleanup, lint, type and artifact controls. The existing compiler dependency-cache warning and 24 lint warnings remain visible.

This continuation added the bounded locked-install probe and executed the prepared runtime verifier. It changed no application business logic, migrations, dependencies, permissions or command-registry hashes. Current helper hashes are in [orchestration sources](2026-10-26-run-02/latest-orchestration-sources.json). The candidate, sealed artifact, synthetic database files and runtime copy remain retained; final service cleanup is recorded in cleanup.json.

## Remaining release decision and next step

The local artifact and anonymous HTTP runtime gaps are now closed for this exact candidate. Production remains NO_GO and AF16 IMPLEMENTED_UNVERIFIED because the remaining selected-scope browser checks, prior-application compatibility/rollback, clean build from the fresh dependency install, agreed performance budgets and AF11 qualified country evidence are still open. Hosted promotion and operations also require separate authorization and evidence. Live pilot validation remains deferred; AF14 and AF15 remain excluded.

No new unit suites, migration runs or authenticated browser checks ran in this continuation. The 25 October regression, database and browser results remain historical evidence with their original scope. Starting and stopping the current artifact is not proof that a predecessor application works against the expanded schema.

Ready-to-use next prompt:

> Continue AF16 from the verified artifact and BUILD_ASSURANCE_2026-10-26.md. Reuse build ${manifest.buildId} and its recorded manifest digest; verify those exact bytes before use and do not rebuild or silently refresh the frozen candidate. Map the remaining authenticated browser journeys against RELEASE_SCOPE.md and the 25 October evidence, then execute the missing synthetic workflows with fresh authority, denial, recovery and export checks. Reuse the existing fixtures and guarded local database controls. Assess prior-application rollback only against an identified retained predecessor; do not substitute current-app restart or SQL-only upgrade proof. Record the fresh-install lifecycle/clean-build gap separately. Update the roadmap and matching Markdown/PDF reports with actual outcomes. Keep live enrollment, delivery, deployment, AF14/AF15 and qualified-country claims deferred.

See [development result](RESULT.md), [release decision](GO_NO_GO.md) and [current summary](2026-10-26-run-02/verification-summary.json).
`);
  replace(path.join(docs, 'README.md'), 'Workflow, lint, compilation and the Next type gate passed; page-data collection timed out, then a competing build blocked the longer retry. No sealed artifact exists.', 'Full build, sealed artifact verification and eight isolated HTTP runtime checks pass. Fresh lockfile installation passes with lifecycle scripts disabled; release qualification remains open.');
  replace(path.join(phase, 'RESULT.md'), 'Attempt 3 compiled successfully and advanced through the Next type gate to page-data collection before timing out. Attempt 4 was blocked after lint by a new competing build; no sealed artifact was produced.', 'Attempt 5 completed the full build, sealed and independently verified 5,284 runtime files, and passed eight isolated HTTP checks. A separate fresh locked install passed with lifecycle scripts disabled. Earlier timeout/conflict attempts remain retained; production qualification remains open.');
  replace(path.join(roadmap, '01_IMPLEMENTATION_ROADMAP.md'), 'attempt 3 compiled successfully and passed the Next type gate before timing out in page-data collection; attempt 4 was blocked by a new competing build. No sealed artifact or production GO is claimed.', 'attempt 5 completed the full build, sealed/verified 5,284 runtime files and passed eight isolated HTTP checks. A fresh locked install passed with lifecycle scripts disabled. Production remains NO_GO pending the remaining release gates.');
  replace(path.join(roadmap, 'STATUS.md'), 'Full lint, compilation and the Next type gate passed; page-data collection timed out, then a new competing build blocked the longer retry. No sealed artifact exists; AF08’s earlier failure remains historical evidence.', 'Full build, sealed artifact verification and eight isolated HTTP runtime checks pass. Fresh locked installation passes with lifecycle scripts disabled; remaining release gates stay open. AF08’s earlier failure remains historical evidence.');
  replace(path.join(roadmap, 'STATUS.md'), 'workflow/lint/compilation and Next type gate pass; page-data timeout retained; longer retry blocked by a new competing build', 'full build, 5,284-file sealed artifact/digest verification and eight isolated HTTP checks pass; fresh locked install passes with hooks disabled');
  replace(path.join(roadmap, 'STATUS.md'), 'Production NO_GO; pilot prepared, live validation deferred; no sealed artifact; rollout/browser/performance and AF11 review gates remain', 'Production NO_GO; pilot prepared, live validation deferred; authenticated browser, predecessor rollback, clean-build/lifecycle, performance and AF11 review gates remain');
  replace(path.join(phase, 'GO_NO_GO.md'), 'Current lint passes with 24 warnings; compilation and the Next type gate passed, but page-data collection timed out and a new competing build blocked the longer retry. No sealed artifact, hosted promotion or complete previous-app rollback proof is supplied', 'Full build, sealed artifact verification and isolated HTTP smoke pass; 24 lint warnings remain. Authenticated browser coverage, predecessor-app rollback, clean build/lifecycle qualification and hosted promotion remain open');
  replace(path.join(phase, 'GO_NO_GO.md'), 'Freeze a release candidate and use the existing artifact/schema procedure.', 'Reuse the verified frozen candidate and sealed artifact with the existing artifact/schema procedure; verify the recorded digest and do not silently rebuild or refresh the source.');
  const followup = `# AF16 next step — authenticated artifact journeys and rollback evidence

26 October 2026. The full build passed, artifact ${manifest.buildId} was sealed (${manifest.files.length} files) and independently verified, and eight HTTP checks passed from an isolated runtime copy. Fresh npm ci with lifecycle scripts disabled installed 1,340 packages without changing the frozen installation inputs. AF16 remains IMPLEMENTED_UNVERIFIED for release; production NO_GO and live pilot validation deferred.

Read [the current artifact report](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF16/BUILD_ASSURANCE_2026-10-26.md>). Verify and reuse the retained artifact with SHA-256 ${digest}. Do not rerun the completed build attempt or silently refresh the source. Map and execute the remaining authenticated synthetic browser journeys against RELEASE_SCOPE.md, reusing existing fixtures and authority/denial/recovery/export checks. Identify a retained predecessor before claiming application rollback; current-app restart and SQL-only upgrade proof do not establish it. Track fresh-install lifecycle/native validation and a build from that installation separately. Update the roadmap and Markdown/PDF reports. No schema promotion, live delivery, enrollment or deployment is authorized.
`;
  fs.writeFileSync(path.join(root, 'what-next/2026-10-26-af16-build-assurance.md'), followup);
  fs.writeFileSync(path.join(docs, 'supporting-reports/2026-10-26-af16-build-assurance.md'), followup);
  console.log(JSON.stringify(summary));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
