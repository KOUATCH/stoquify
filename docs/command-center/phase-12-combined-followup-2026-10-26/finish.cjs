// Publish measured results and preservation evidence; never edits application files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {root,state}=require('./environment.cjs'),s=state(),read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n))),hash=p=>fs.existsSync(p)?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null;
const baseline=read('source-baseline.json'),prepare=read('prepare-results.json'),verification=read('verification-summary.json'),source=f=>!f.startsWith('docs/')&&!f.startsWith('design-system/')&&!f.endsWith('.md');
const files=baseline.files.filter(f=>source(f.path)),known=new Set(files.map(f=>f.path)),candidateDrift=[],workspaceDrift=[];
for(const f of files){if(hash(path.join(s.candidate,f.path))!==f.sha256)candidateDrift.push(f.path);if(hash(path.join(root,f.path))!==f.sha256)workspaceDrift.push(f.path)}
const {included}=require(path.join(root,'scripts/candidate-snapshot.cjs'));const selectors=['actions','app','components','config','hooks','i18n','lib','messages','prisma','public','services','src','types','validations','_legacy-dashboard','tests','__tests__','scripts','vendor'];
selectors.push(...fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()&&included(e.name)&&source(e.name)).map(e=>e.name));
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--',...selectors],{cwd:root,maxBuffer:30e6}).toString().split('\0').filter(Boolean),newSources=[...new Set(paths)].filter(f=>included(f)&&source(f)&&!known.has(f));
const unchanged=(folder,expected)=>Object.entries(expected).every(([n,h])=>hash(path.join(folder,n))===h);
const preservation={candidateDrift,workspaceDrift,newSources,privateClientUnchanged:unchanged(path.join(s.dependencies,'.prisma/client'),prepare.privateClientHashes),sharedClientUnchanged:unchanged(path.join(root,'node_modules/.prisma/client'),prepare.sharedClientHashes),sourceFiles:files.length,applicationFilesEditedByThisPhase:0,databaseStarted:false,productionAccess:false};
fs.writeFileSync(path.join(__dirname,'preservation.json'),JSON.stringify(preservation,null,2));
const testRows=verification.results.filter(r=>'passed'in r),suites=testRows.flatMap(r=>read(r.name+'-results.json').testResults.map(t=>t.name));assert.equal(new Set(suites).size,suites.length,'Duplicate suites cannot be summed');
const lint=read('lint-results.json'),errors=lint.reduce((n,r)=>n+r.errorCount,0),warnings=lint.reduce((n,r)=>n+r.warningCount,0),passed=testRows.reduce((n,r)=>n+r.passed,0),failed=testRows.reduce((n,r)=>n+r.failed,0),skipped=testRows.reduce((n,r)=>n+r.skipped,0);
const result={generatedAt:new Date().toISOString(),verificationPassed:verification.passed,mockedPureTestsPassed:passed,failed,skipped,testSuites:suites.length,typecheck:verification.results.find(r=>r.name==='typecheck'),lint:{files:lint.length,errors,warnings},preservation,realDatabaseTestsRerun:false,browserTestsRerun:false,artifactPrepared:false,productionReleaseApproved:false};
fs.writeFileSync(path.join(__dirname,'SUMMARY.json'),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(__dirname,'README.md'),`# Command Center combined-source follow-through — Phase 12

**${passed} mocked/pure/component/framework tests passed; ${failed} failed and ${skipped} skipped.** Configured-project type check exit: ${result.typecheck.exitCode}. Focused lint: ${errors} errors, ${warnings} warnings across ${lint.length} files. See [machine-readable results](SUMMARY.json) and [exact stage results](verification-summary.json).

The next logical step was to close Phase 11's concurrent-change review gap. A fresh ${baseline.files.length}-file candidate captures the combined source, including the authentication, protected-action, HR module-gate and public/upload import changes. [Source review](SOURCE_REVIEW.md) explains each boundary and its limits; [exact delta](source-delta.json) identifies the capture. No application or database changes were made by this phase.

## Evidence classes

| Class | Measured result | Limits |
|---|---|---|
| Source review and capture | ${files.length} non-documentation source files | Newly added AF16 helpers inspected for scope, not executed or certified |
| Existing Command Center lane | ${testRows.find(r=>r.name==='command-center')?.passed} passed | Mocked/pure/component evidence |
| Authentication/contracts, public/recovery, routing | ${testRows.filter(r=>['security','public-recovery','middleware'].includes(r.name)).reduce((n,r)=>n+r.passed,0)} passed | Framework/mocked evidence; no real browser |
| Affected security/HR/public/upload boundaries | ${testRows.find(r=>r.name==='affected-boundaries')?.passed} passed | Eleven explicit files; database and auth dependencies mocked |
| Configured-project type check | Exit ${result.typecheck.exitCode} | Original tsconfig exclusions retained; no emitted or incremental output; no new generated route types |
| Focused lint | ${errors} errors, ${warnings} warnings | Changed/new TypeScript source only; no autofix |
| Real PostgreSQL | Not rerun | Phase 10 results retain their historical source/environment scope |
| Authenticated browser/accessibility | Not rerun | Phase 10 results are not relabeled as proof of these new authentication changes |
| Artifact/build/production | Not run | Existing Phase 11 prerequisite block remains unresolved |

## Preservation and provenance

Only the task-owned Phase 11 clean-installed package directory was reused, after matching manifest, lockfile and schema. Node's module-loader guard rejects resolved dependencies outside that directory; its scope is documented in the source review. No reinstall, generation, shared dependency mutation, environment-file copy, server startup, database access or live send occurred. This is reuse of the prior clean install, not a second independent reconstruction.

Final checks: candidate drift **${candidateDrift.length}**, workspace drift **${workspaceDrift.length}**, new workspace source paths **${newSources.length}**; private client unchanged **${preservation.privateClientUnchanged}**, shared client unchanged **${preservation.sharedClientUnchanged}**. See [preservation details](preservation.json). Results apply to the captured candidate; later workspace changes are preserved and are outside this run's certification. Review those exact later paths before claiming latest-workspace readiness.

## Remaining acceptance

The source-review and affected-regression prerequisite advances CC-07.2/CC-07.4 for this capture only. It does not close real authenticated runtime acceptance for the changed boundaries, trusted artifact preparation, human screen-reader/native zoom, representative-user productivity, agreed realistic-load criteria or approved public policy content. [Phase 11's remaining gates](../phase-11-artifact-2026-10-26/REMAINING_GATES.md) retain those requirements. Production remains NO_GO; no deployment or schema promotion is authorized or performed.
`);
assert.deepEqual(candidateDrift,[]);assert.equal(preservation.privateClientUnchanged,true);assert.equal(preservation.sharedClientUnchanged,true);console.log(JSON.stringify(result));
