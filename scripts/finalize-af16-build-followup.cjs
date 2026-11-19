// Publish only the observed, blocked AF16 build rehearsal; keep the earlier verification historical.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Client}=require('pg');
const c=require('./af16-verification-context.cjs');
const phase=path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16');
const output=path.join(phase,'2026-10-26-run-02');
const roadmap=path.dirname(path.dirname(phase)),docs=path.join(c.root,'docs/accounting-firms');
const read=file=>fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
const json=file=>JSON.parse(read(path.join(output,file)));
const write=(file,value)=>fs.writeFileSync(path.join(output,file),JSON.stringify(value,null,2),{flag:'wx'});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main(){
  const destination=path.join(phase,'BUILD_ASSURANCE_2026-10-26.md');
  if(fs.existsSync(destination))throw Error('Follow-up is already published; review before updating');
  const preparation=json('candidate-preparation.json'),build=json('artifact-build.json'),generation=json('client-generation.json'),retry=json('retry-precheck-attempt-2.json');
  const log=read(path.join(output,'artifact-build.log'));
  if(build.exitCode!==1||generation.exitCode!==0||retry.passed||!log.includes('Status: blocked-orphaned-build'))throw Error('Unexpected outcome; this report template does not apply');
  if(!read(path.join(output,'workflow-check-final.log')).includes('Workflow contract passed;'))throw Error('Final workflow check did not pass');
  const artifact=path.join(c.root,'.codex-tmp/af16-artifact-20261026');
  if(fs.existsSync(artifact)||fs.existsSync(path.join(preparation.target,'.next/BUILD_ID')))throw Error('Unexpected build artifact; review the outcome');
  const findings=[];let file=null;
  for(const line of log.split(/\r?\n/)){
    if(line.startsWith(preparation.target+path.sep))file=line.slice(preparation.target.length+1).replaceAll('\\','/');
    const row=line.match(/^\s*(\d+):(\d+)\s+(warning|error)\s+(.+?)\s{2,}(\S+)\s*$/);
    if(row)findings.push({file,line:Number(row[1]),column:Number(row[2]),severity:row[3],message:row[4],rule:row[5]});
  }
  if(findings.length!==24||findings.some(row=>row.severity==='error')||!log.includes('24 problems (0 errors, 24 warnings)'))throw Error('Lint result needs review');
  write('lint-findings.json',{errors:0,warnings:24,findings});
  const preflight=JSON.parse(read(path.join(preparation.target,'what-next/release-secret-preflight.json')));
  write('secret-preflight.json',preflight);
  const probe=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261026_build_r2',connectionTimeoutMillis:5000});await probe.connect();
  let database;
  try{await c.guard(probe);database=(await probe.query('SELECT (SELECT count(*) FROM users)::int users,(SELECT count(*) FROM organizations)::int organizations,(SELECT count(*) FROM _prisma_migrations)::int migrations')).rows[0];}
  finally{await probe.end();}
  if(database.users!==0||database.organizations!==0||database.migrations!==120)throw Error('Unexpected build database state');
  write('build-database-after.json',{...database,clusterGuardPassed:true,scope:'Empty synthetic build clone; no real firm enrollment'});
  const owned=['prepare-af16-release-candidate.cjs','prepare-af16-build-database.cjs','run-af16-release-candidate.cjs','finalize-af16-build-followup.cjs'];
  write('orchestration-sources.json',owned.map(name=>({file:'scripts/'+name,sha256:hash(fs.readFileSync(path.join(c.root,'scripts',name)))})));
  const summary={date:'2026-10-26',workflow:'PASS',clientGeneration:'PASS',lint:{errors:0,warnings:24},preflight:{status:preflight.summary.status,releaseEnforced:preflight.summary.releaseEnforced,warnings:preflight.warnings},artifactBuild:'BLOCKED_BY_EXISTING_BUILD',retryPrecheck:'REFUSED_COMPETING_BUILD',compiler:'NOT_RUN',artifactSealing:'NOT_RUN',artifactVerification:'NOT_RUN',newBrowserChecks:'NOT_RUN',production:'NO_GO',formalAF16:'IMPLEMENTED_UNVERIFIED',pilot:'PILOT_PREPARED',liveValidation:'DEFERRED'};
  write('verification-summary.json',summary);
  const grouped=Object.entries(findings.reduce((counts,row)=>(counts[row.rule]=(counts[row.rule]||0)+1,counts),{})).map(([rule,count])=>`| ${rule} | ${count} |`).join('\n');
  fs.writeFileSync(destination,`# AF16 local build assurance follow-up

26 October 2026. **Workflow check PASS. Lint PASS with 0 errors and 24 warnings. Full application compilation BLOCKED by another active build. No artifact was produced. AF16 remains IMPLEMENTED_UNVERIFIED; production NO_GO; pilot PILOT_PREPARED and live validation deferred.**

## What this continuation accomplished

The next logical step was the actual application artifact pipeline. Reused the existing source-snapshot, release-artifact, secret-preflight, lint, safe-build and AF16 database controls. The earlier authentication-test manifest failure no longer occurs on the current checkout; both current workflow checks pass. This continuation made no application business-logic, migration or command-registry changes.

Retained ${preparation.sourceFiles} source files from HEAD ${preparation.head}, including the local changes represented in the manifest. A local clone supplies an independent Git index; it does not change the primary checkout or its refs. The private source archive SHA-256 is ${preparation.sourceArchiveSha256}. Its file hashes are in [source-manifest.json](2026-10-26-run-02/source-manifest.json). Environment files were excluded.

Copied installed dependencies into the isolated candidate, then generated its Prisma client. Installed Next ${preparation.versions.next}, React ${preparation.versions.react} and Prisma ${preparation.versions.prisma} are recorded in [candidate-preparation.json](2026-10-26-run-02/candidate-preparation.json). This proves neither a clean lockfile installation nor a new dependency audit. The candidate and build output remain separate from the working application's directories.

## Executed checks and actual result

| Check | Result | Evidence class and limit |
|---|---|---|
| Initial and final workflow check | PASS; 196 scripts remain unclassified | Read-only contract checks; no registry hashes were refreshed by AF16 |
| Source reconstruction | PASS; ${preparation.sourceFiles} files matched the captured identity before dependency copying | Local file/hash evidence, not application execution |
| Synthetic build database | PASS; empty clone with 120 matching migration checksums | Real PostgreSQL clone of the owned AF16 template; no new migration execution in this continuation |
| Prisma client generation | PASS, ${(generation.elapsedMs/1000).toFixed(1)} seconds | Real current client generation in the isolated copy |
| Secret preflight | CONDITIONAL; 2 warnings, release enforcement off | Fresh synthetic secrets; live statement and accountant-invitation delivery deliberately disabled; not production-secret certification |
| Full configured lint | PASS; 0 errors, 24 warnings | Current frozen application/actions/components/config/hooks/lib/services; warnings remain visible |
| Artifact build attempt 1 | BLOCKED; exit 1 after ${(build.elapsedMs/1000).toFixed(1)} seconds | Safe-build process gate refused another active Next build before invoking the compiler |
| Retry attempt 2 | BLOCKED before lint/build | The early retry precheck detected the same competing process and left it untouched |
| Compilation, sealing and artifact verification | NOT RUN | No BUILD_ID, standalone artifact or trusted artifact digest exists for this candidate |
| New browser, unit or rollback checks | NOT RUN | The 25 October evidence remains historical; no new green result is inferred from it |

The full attempt is retained in [artifact-build.log](2026-10-26-run-02/artifact-build.log), with [its exit receipt](2026-10-26-run-02/artifact-build.json). The retry refusal is in [retry-precheck-attempt-2.json](2026-10-26-run-02/retry-precheck-attempt-2.json). The other build used PID 44076 at observation time; process identifiers are historical evidence, not reusable shutdown targets. Its parent was an active safe-build wrapper. Approximately 414 MiB of physical memory was free at inspection, so launching another heavy compilation was not justified. No other process was killed and the allow-orphans override was not enabled.

The first local PostgreSQL restart attempted its default listener and failed to bind. Restarting this owned cluster explicitly on its original 127.0.0.1:55451 listener succeeded. Only then did the clone helper verify the data-directory identity and all 120 migration names/checksums before creating the new database. The final build clone retains zero users, zero organizations and 120 migration records. Startup logs remain in the private task directory.

## Lint warnings retained

| Rule | Warnings |
|---|---:|
${grouped}

The exact files, lines and messages are preserved in [lint-findings.json](2026-10-26-run-02/lint-findings.json). They include accounting-workspace effect dependencies/ref cleanup as well as other application surfaces. They were not suppressed or treated as build errors. A behavioral change to those effects needs its own focused review and regression checks.

## Safe continuation from the retained candidate

After the competing build has finished, restart only the owned AF16 cluster if needed, explicitly on 127.0.0.1:55451. Keep the existing build database; do not rerun the fresh-database creator against it. The retry entrypoint checks for active builds, validates the frozen source identity, requires the successful retained client-generation receipt, and verifies the owned database and migration checksums before running the existing artifact pipeline. These successful retry branches remain unexecuted until the process gate clears.

Next unused command: node scripts/run-af16-release-candidate.cjs --attempt 3. Each attempt has distinct receipts and refuses overwrite. The command retains the normal lint/build and artifact controls, fresh synthetic configuration, disabled live delivery and the separate schema-promotion boundary. If compilation succeeds, it captures the artifact manifest digest and invokes the existing artifact verifier. Do not claim a deployable artifact until both operations actually pass.

Ready-to-use continuation prompt:

> Continue AF16 local artifact assurance from BUILD_ASSURANCE_2026-10-26.md. Check that the competing build has ended and that resources are available; do not stop another task's processes or enable the allow-orphans override. Restart only the retained AF16 synthetic PostgreSQL cluster on port 55451 if needed. Reuse the frozen candidate and existing build-only database, run the next unused attempt with scripts/run-af16-release-candidate.cjs, and retain actual lint/compiler/sealing/verification results. Diagnose any genuine build failure before changing code; preserve unrelated edits and do not bypass build, type, authorization or migration controls. If a verified artifact is produced, continue with the appropriate local runtime and rollback checks. Update the roadmap and matching Markdown/PDF reports. Keep live enrollment, provider delivery, deployment and qualified-country claims deferred.

## Remaining release decision

This continuation closes the current workflow-manifest failure and supplies a current full lint result and reproducible build candidate. It does not close compilation, clean-install reproducibility, runtime/previous-application rollback, remaining selected-scope browser coverage, agreed performance budgets or AF11 qualified country review. Production remains NO_GO. The pilot remains prepared with live validation deferred; AF14 and AF15 remain excluded.

See [the original development result](RESULT.md), [decision matrix](GO_NO_GO.md), [current receipts](2026-10-26-run-02/verification-summary.json) and the separate cleanup/publication receipts in this run.
`);
  const edit=(file,fn)=>fs.writeFileSync(file,fn(read(file)));
  const note='**26 October 2026 follow-up:** [Local build assurance](BUILD_ASSURANCE_2026-10-26.md) records a current workflow PASS and full lint PASS (0 errors, 24 warnings). Compilation was blocked by another active build; no artifact was produced. The 25 October results below remain historical.\n\n';
  edit(path.join(phase,'RESULT.md'),s=>s.replace(/^(# .*\r?\n)/,'$1\n'+note));
  edit(path.join(phase,'GO_NO_GO.md'),s=>s.replace('25 October 2026.','Updated 26 October 2026.').replace('Current development results are recorded separately in RESULT.md.','Development results are recorded in RESULT.md; the [26 October build follow-up](BUILD_ASSURANCE_2026-10-26.md) is the current build evidence.').replace('| Shared workflow registry | FAIL on final check | Concurrent PasswordRecoveryForms.test.tsx changes differ from the test:ecc:pilots reviewed manifest; preserve and review the owning change, without automatic hash refresh | Authentication-change owner / workflow maintainer |','| Shared workflow registry | PASS on 26 October | Initial and final checks pass; the 25 October failure remains historical. AF16 changed no registry hash | Workflow maintainer |').replace('Current checks are useful, but no full sealed standalone build, hosted promotion rehearsal or complete previous-app rollback proof is supplied by this run','Current lint passes with 24 warnings; actual compilation is blocked by another active build. No sealed artifact, hosted promotion or complete previous-app rollback proof is supplied'));
  edit(path.join(roadmap,'STATUS.md'),s=>s.replace('**Updated:** 25 October 2026.','**Updated:** 26 October 2026.').replace('The AF16 final workflow check fails on concurrent authentication-test manifest drift; the AF13 workflow pass is historical;','The current AF16 workflow check passes; its 25 October failure is historical. The full lint check passes, but compilation is blocked by another active build;').split('\n').map(line=>line.startsWith('| [AF16 prompt]')?'| [AF16 prompt](prompts/AF16-pilot-release-assurance.md) | IMPLEMENTED_UNVERIFIED | Explicit AF01–AF13 synthetic development expansion | [25 October development result](execution/AF16/RESULT.md); [26 October build follow-up](execution/AF16/BUILD_ASSURANCE_2026-10-26.md): workflow and full lint pass, isolated candidate prepared; compiler blocked by competing build | Production NO_GO; pilot prepared, live validation deferred; no sealed artifact; rollout/browser/performance and AF11 review gates remain |':line).join('\n'));
  edit(path.join(roadmap,'01_IMPLEMENTATION_ROADMAP.md'),s=>s.replace(/^(# .*\r?\n)/,'$1\n**26 October 2026 AF16 follow-up:** [Current build assurance](execution/AF16/BUILD_ASSURANCE_2026-10-26.md): workflow and full lint pass (0 errors, 24 warnings); the isolated artifact build is blocked before compilation by another active build. No artifact or production GO is claimed.\n\n'));
  edit(path.join(docs,'README.md'),s=>s.replace(/^(# .*\r?\n)/,'$1\n**AF16 build follow-up (26 October 2026):** [Markdown](roadmap-2026-10-19/execution/AF16/BUILD_ASSURANCE_2026-10-26.md) · [PDF](roadmap-2026-10-19/execution/AF16/BUILD_ASSURANCE_2026-10-26.pdf). Workflow and lint pass; compilation remains blocked by a competing build.\n\n'));
  const followup='# AF16 next step — complete the isolated artifact build\n\n26 October 2026. The workflow check now passes and the full lint check reports zero errors and 24 warnings. The artifact pipeline stopped before compilation because another build is active. No artifact was produced; production remains NO_GO and live validation deferred.\n\nRead [the retained build report](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/execution/AF16/BUILD_ASSURANCE_2026-10-26.md>). After the competing build ends, reuse the isolated source candidate and build-only database. Restart only the AF16 cluster on port 55451 if needed, then run the next unused guarded attempt (currently `node scripts/run-af16-release-candidate.cjs --attempt 3`). Preserve failed attempts and unrelated work. Do not suppress lint/types, bypass the process guard, promote a schema or enable live delivery. Update the roadmap and Markdown/PDF reports with the actual result.\n';
  const name='2026-10-26-af16-build-assurance.md';
  fs.writeFileSync(path.join(c.root,'what-next',name),followup);fs.writeFileSync(path.join(docs,'supporting-reports',name),followup);
  console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
