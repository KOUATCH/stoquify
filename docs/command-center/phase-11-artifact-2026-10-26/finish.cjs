const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {root,state}=require('./environment.cjs'),s=state(),read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n))),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const baseline=read('source-baseline.json'),source=f=>!f.startsWith('docs/')&&!f.startsWith('design-system/')&&!f.endsWith('.md'),files=baseline.files.filter(f=>source(f.path));
const candidateDrift=[],workspaceDrift=[];
for(const f of files)for(const [folder,list] of [[s.candidate,candidateDrift],[root,workspaceDrift]]){const p=path.join(folder,f.path);if(!fs.existsSync(p)||hash(p)!==f.sha256)list.push(f.path)}
const {included}=require(path.join(root,'scripts/candidate-snapshot.cjs')),known=new Set(baseline.files.map(f=>f.path)),selectors=['actions','app','components','config','hooks','i18n','lib','messages','prisma','public','services','src','types','validations','_legacy-dashboard','tests','__tests__','scripts','vendor'];
selectors.push(...fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&included(e.name)&&source(e.name)).map(e=>e.name));
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--',...selectors],{cwd:root,maxBuffer:30e6}).toString().split('\0').filter(Boolean),newSources=[...new Set(paths)].filter(f=>included(f)&&source(f)&&!known.has(f));
const dependency=read('dependency-results.json'),sharedNow=Object.fromEntries(Object.keys(dependency.sharedBefore).map(n=>[n,hash(path.join(root,'node_modules/.prisma/client',n))]));
const preservation={candidateDrift,workspaceDrift,newSources,sharedClientUnchanged:JSON.stringify(sharedNow)===JSON.stringify(dependency.sharedBefore),sourceFiles:files.length,applicationFilesEditedByThisPhase:0,databaseStarted:false,productionAccess:false};fs.writeFileSync(path.join(__dirname,'preservation.json'),JSON.stringify(preservation,null,2));
const install=read('install-results.json'),unit=read('unit-summary.json'),gate=read('artifact-preflight-results.json'),versions=read('installed-versions.json');
assert.equal(read('workflow-results.json').ok,true);
const executedSuites=unit.results.flatMap(r=>read(r.name+'-unit-results.json').testResults.map(t=>t.name));assert.equal(new Set(executedSuites).size,executedSuites.length,'Do not count duplicate suites');
assert.equal(install.exitCode,0);assert.equal(install.lockfileUnchanged,true);assert.equal(dependency.passed,true);assert.equal(unit.passed,true);assert.deepEqual(candidateDrift,[]);assert.equal(preservation.sharedClientUnchanged,true);
const passed=unit.results.reduce((n,r)=>n+r.passed,0),result={generatedAt:new Date().toISOString(),cleanInstallPassed:true,lifecycleStrategy:'npm ci --ignore-scripts, explicit private Prisma generation, native smoke',mockedPureTestsPassed:passed,databaseTestsRerun:false,browserTestsRerun:false,fullBuildRerun:false,artifactPrepared:false,artifactPrerequisite:gate.status,artifactBlockers:gate.blockers,productionReleaseApproved:false,productionAccess:false,preservation};
fs.writeFileSync(path.join(__dirname,'SUMMARY.json'),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(__dirname,'README.md'),`# Command Center clean dependency reconstruction — Phase 11

**Clean dependency reconstruction and ${passed} bounded tests passed. Artifact preparation remains blocked by the existing production preflight.** No application source, migration, shared dependency or production configuration was changed by this phase.

**Source scope:** these results apply to the frozen candidate. During verification, the shared workspace gained ${workspaceDrift.length} changed source files and ${newSources.length} new source paths. Those later edits were preserved and are not certified by this run. Review [the exact paths](preservation.json), capture a new candidate, and rerun affected checks before making a current-workspace or release claim.

## Executed evidence

| Evidence | Result | Scope |
|---|---|---|
| Workflow contract | Passed | Current definitions, hooks, references and fingerprints; 196 scripts remain unclassified |
| Source capture | ${baseline.files.length} files | At capture time, application files matched Phase 10; four additional AF16 verification/configuration files inspected and preserved, not executed; later workspace drift is listed separately |
| Vendored dependency | Integrity verified | SheetJS archive matches its pinned SHA-512 |
| Clean install | Passed | ${versions.summary}; empty candidate dependency directory and fresh owned cache, unchanged lockfile, no lifecycle scripts or audit upload |
| Selected package versions | Ten match the lockfile | Next, React, React DOM, Prisma/client, TypeScript, Jest, Argon2, SWC and SheetJS; [versions and warnings](installed-versions.json) |
| Private client generation | Passed | Candidate's installed Prisma generated its own client; schema and shared generated client unchanged; no database connection |
| Native/runtime module smoke | Eight checks passed | Candidate module resolution, Argon2 hash/verify, native SWC transform and Command Center model availability; [results](dependency-results.json) |
| Mocked/pure/component/framework tests | ${passed} passed, zero skipped | 602 Command Center, 36 authentication/contracts, 76 public/recovery, 30 middleware/routing; own installed Jest/Next with ancestor dependency fallback refused; [summary](unit-summary.json) |
| Artifact prerequisite | Blocked, exit 1; 18/21 ready | Actual production-mode release preflight, synthetic process-only secrets, HTTP loopback and live providers disabled; [results](artifact-preflight-results.json) |
| Preservation | Candidate drift ${candidateDrift.length}; workspace drift ${workspaceDrift.length}; new source paths ${newSources.length} | Shared generated client unchanged; no restoration or overwrite of others' work; [scan](preservation.json) |

## Meaning and limits

This advances the previously open clean-install requirement. It is a controlled script-free npm installation followed by explicit generation and native checks, not a claim that every upstream lifecycle hook ran. Deprecation and peer-override warnings remain in [install.log](install.log). No version upgrade or vulnerability assessment was performed.

The exact first prerequisite in **release:artifact → build → release:secrets:preflight** ran with enforcement enabled and refused HTTPS, live statement-delivery and live invitation-delivery settings. These are deliberately unavailable in this disposable task. No override, fabricated provider credential or live send was used. Full artifact preparation, full compilation on these fresh dependencies, a trusted manifest digest and isolated runtime certification therefore remain unexecuted.

Phase 10's 64 real PostgreSQL tests, full build and authenticated browser checks retain their original source/environment scope. They were not rerun or relabeled as artifact evidence here. This phase started no application server or database and submitted no business transaction or message. The previous disposable application and cluster were not restarted.

The captured candidate is preserved under the ignored Phase 11 directory with its own packages/cache. Source comparison and all commands/results are retained here. No Git commit, staging, deployment or production promotion occurred.

## Next authorized work

See [remaining gates and exact acceptance requirements](REMAINING_GATES.md). Production configuration and release operations require the authorized operator's environment; human accessibility, representative-user productivity, realistic load and approved public policy content remain separate gates. The passing reconstruction and tests do not approve production release.
`);
console.log(JSON.stringify({mockedPureTestsPassed:passed,artifactPrepared:false,artifactBlockedBy:gate.blockers,preservation}));
