const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),phase='docs/accounting-firms/roadmap-2026-10-19/execution/AF16',run=phase+'/2026-11-02-run-03',build=phase+'/2026-11-02-run-01';
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),json=file=>JSON.parse(read(file));
const browser=json(run+'/browser-results.json'),recovery=json(run+'/browser-recovery.json'),summary=json(run+'/sealed-engagement-summary.json'),cleanup=json(run+'/cleanup.json'),prep=json(build+'/candidate-preparation.json'),unit=json(build+'/grant-repair-jest.json'),counter=json(build+'/grant-counterfactual-jest.json'),visual=json(run+'/browser-visual-review.json');
assert.ok(browser.passed&&recovery.passed&&summary.passed&&summary.artifactUnchangedAfterBrowser&&cleanup.ownedDatabaseStopped&&visual.reviewed&&unit.success);
assert.equal(unit.numPassedTests,8);assert.equal(counter.numFailedTests,1);assert.match(counter.testResults[0].message,/Saving/);
assert.equal(json(build+'/artifact-build.json').exitCode,0);assert.equal(json(build+'/artifact-verify.json').exitCode,0);
const scans=browser.checks.filter(c=>c.locale),name='ENGAGEMENT_REPAIR_2026-11-02.md';
const report=`# AF16 engagement grant repair and lifecycle verification

2 November 2026. **The saved-grant pending-state defect is reproduced by a focused regression, and the existing working-tree repair passes that regression and the selected authenticated AF03–AF05 browser lifecycle/recovery journey on a separately built artifact.** Production remains NO_GO; AF16 remains IMPLEMENTED_UNVERIFIED for release; live pilot validation remains deferred. The 28 October failure is retained unchanged.

## Defect, repair and proof

The old AccountantAccessManager used React transition pending state for both a protected mutation and its subsequent router refresh. When the refresh remains suspended, the command can already be confirmed and display “Accountant access granted.” while its control still says “Saving…”. The controlled regression reproduces this precise state with the original component. Its one selected case fails as expected; the repaired component passes all eight recovery cases.

The repair was already present in the working tree when this continuation began. It was reviewed and reused, rather than overwritten or claimed as new work. It tracks only the mutation/password check as saving, releases that state in finally, and refreshes the list after confirmation. A synchronous in-flight guard blocks immediate duplicate submissions; the retained command prevents starting a different change while its result is unresolved. Password confirmation preserves the original payload and idempotency key for explicit Retry. Confirmed success remains success if refresh fails, with an EN/FR list-reload action. Server permissions, client consent, current-authority checks and financial services are unchanged by this UI repair.

The component checks cover: password confirmation and exact retry; lost-response command retention; duplicate-click prevention and a new key for a later grant; rejected results; suspended read-model refresh; immediate double submission before rerender; refresh exceptions after confirmed success; and French recovery copy. These are controlled mocked-action/component results. The later real browser and database assertions are separate evidence.

The first counterfactual setup incorrectly resolved a second React/Next runtime from the frozen candidate's node_modules and failed with an invalid-hook error. That result is retained as invalid-counterfactual-jest.json and is not defect evidence. The corrected test copies the original component into a root-resolved adapter, changing only its two relative copy-module imports; it then reproduces the expected pending-state failure. The first broad test discovery processes were also stopped and the roots narrowed before relying on results.

The first replacement browser attempt completed ten lifecycle/layout groups, then failed a stale harness expectation: it expected the initial route-denied heading immediately after an in-workspace refresh. The application correctly rendered the contract's generic alert and cleared private cards. That failed attempt and screenshots remain in 2026-11-02-run-02. The corrected adapter now asserts this in-workspace denial, then reloads and asserts the initial route boundary and absence of the private workspace. Both layers pass on the fresh 2026-11-02-run-03 clone; the same correction applies to the recovery suite. No application guard, timeout or sealed byte was changed for this correction.

## Replacement candidate and artifact

Build ID: ${summary.buildId}. Artifact manifest SHA-256: ${summary.artifactSha256}. Frozen source file count: ${prep.sourceFiles}. The replacement is reconstructed from the retained source archive SHA-256 ${prep.baseSourceArchiveSha256}, with exactly three explicit overlays:

| Overlay | Purpose |
|---|---|
| components/accounting/AccountantAccessManager.tsx | Existing grant-form repair |
| components/accounting/__tests__/AccountantAccessManager.recovery.test.tsx | Existing focused recovery regressions |
| scripts/release-artifact.cjs | Existing current v2 packaging/verification, including private legacy-upload mapping |

All other application source comes from the retained candidate, keeping unrelated current working-tree edits outside this comparison. The original source archive, artifact and previous browser failures were preserved. The dependencies were physically copied from the retained candidate; this is not a fresh locked installation. The normal pipeline regenerated Prisma Client, ran lint and the full Next build/type stage, then sealed and independently verified the artifact. Conditional local secret-preflight warnings remain local configuration evidence, not production-secret qualification. No schema migration or promotion ran.

The current artifact helper maps legacy upload bytes into private artifact storage and verifies the mapping. That packaging overlay is explicit; this engagement journey does not certify every upload route or the rest of the current working tree. Candidate preparation, build logs, stage exits, source/overlay hashes and trusted digest are retained in [the build evidence folder](2026-11-02-run-01/candidate-preparation.json).

## Real browser and database observations

${browser.checks.map((c,i)=>`${i+1}. ${c.locale?`${c.locale.toUpperCase()} at ${c.width}px: keyboard refresh/focus and overflow assertions passed; ${c.axeViolations.length} scoped axe violations.`:Object.values(c).join('; ')}`).join('\n')}

${recovery.checks.map((c,i)=>`${i+1}. Recovery: ${c}`).join('\n')}

There are ${browser.checks.length} lifecycle/layout assertion groups and ${recovery.checks.length} restrictive recovery groups. Manager and client owner signed in independently through the real endpoint; Secure HttpOnly session cookies were asserted, including a fresh recovery session. The previously failing pair of staff grants completes before engagement setup without reloading between those grants. The browser also exercises real password confirmation when required. The October diagnostic's interrupted next-grant sequence therefore no longer blocks this replacement journey; the controlled test establishes the pending-refresh mechanism but does not prove every cause of the old aborted network request.

Suspension/reactivation checks persisted ACTIVE → SUSPENDED → ACTIVE transitions and exact version increments, removes/restores the managed-read label, and compares all client grant records before/after. Handover ends the outgoing assignment, requires explicit incoming enrollment and preserves the observed work-row count. Client revocation is a real owner-form action. The failed-invitation state is deliberately injected into a synthetic queued outbox; no delivery worker/provider runs and no recipient acceptance is claimed.

Role/module/session/expiry changes and the aborted read are controlled synthetic fault injections. Cancellation also compares the complete engagement record before/after. The final clone contains ${cleanup.clone.engagements} engagement, ${cleanup.clone.grants} grants and ${cleanup.clone.journals} journals. Its engagement is ${cleanup.clone.status}, version ${cleanup.clone.version}; reviewer revocation is retained, and the manager has ${cleanup.clone.managerSessions} sessions after the final denial check. The source template remains empty.

## Rendered evidence and limits

${scans.length} scoped axe scans passed in EN/FR at desktop and mobile widths. Both browser runs recorded zero page errors. The ${visual.screenshots.length} retained screenshots were reviewed separately; see [visual observations](2026-11-02-run-03/browser-visual-review.json). These results cover the exercised workspace and captured states, not whole-application accessibility. No styling or brand tokens were changed in this continuation.

No new full unit/service suite, migration replay, provider connectivity, country qualification or export reconciliation was run. Earlier AF09–AF10 opening checks and other AF evidence retain their original candidate/date and scope. This replacement's full build and engagement journey do not automatically renew every earlier browser pass. Broader final-release regression coverage remains open.

## Integrity and cleanup

The new artifact's recorded digest, exact source and all ${summary.preverifiedFiles} artifact files were verified before use and after both browser journeys. Its separate outside-repository runtime copy matched the manifest before startup. A guarded clone of the owned empty PostgreSQL template was created only after all ${summary.migrations} migration names/checksums/states matched. The unchanged schema uses the isolated AF16 generated client.

The sealed runtime used a temporary loopback HTTP port behind the established https://localhost:3186 test proxy, fresh synthetic secrets and an explicit environment allowlist. Browser localhost resolution was pinned to loopback. Only isolated browser contexts ignored the local self-signed certificate; OS trust was unchanged. Live statement/invitation flags remained disabled. This is local secure-cookie/action proof, not hosted TLS or production setup.

The server and proxy stopped after verification; the proxy port is free. After confirming the original template remained empty and there were no other database clients, the owned PostgreSQL cluster stopped cleanly. Synthetic build/browser clones and private runtime/credentials are retained. No deployment, production enrollment, migration promotion or live communication occurred.

## Roadmap decision and next prompt

The selected AF03–AF05 sealed-browser blocker is resolved for this replacement artifact. Next is the AF11 operational obligation register, reusing this exact artifact and fresh synthetic data. Production stays NO_GO and pilot stays PILOT_PREPARED. Portfolio/evidence/workpaper/advisory browser coverage, predecessor rollback rehearsal, installation lifecycle, performance/error budgets, hosted operations and qualified country evidence remain open. AF14/AF15 remain excluded.

> Continue AF16 with AF11 operational obligation register browser verification using build ${summary.buildId} and artifact digest ${summary.artifactSha256}. Reuse the existing AF11 workflows/fixtures, the owned empty template and local HTTPS setup; verify exact artifact bytes before and after use without rebuilding. Exercise supported creation, evidence, review, current-authority denial/recovery and EN/FR desktop/mobile behavior on a fresh synthetic clone. Preserve UNKNOWN statutory candidates and distinguish operational evidence from qualified country or filing proof. Update the roadmap and Markdown/PDF reports with actual results. Keep production NO_GO, live pilot validation deferred and AF14/AF15 excluded. Preserve the old failures and the separate dates/candidates of earlier passes.
`;
fs.writeFileSync(path.join(root,phase,name),report,{flag:'wx'});
const note='**2 November 2026 engagement repair follow-up:** [Replacement artifact and AF03–AF05 verification]('+name+') PASS within the selected scope: eight component recovery checks, reproduced old pending-refresh defect, full build/artifact verification, '+browser.checks.length+' lifecycle/layout groups and '+recovery.checks.length+' restrictive recovery groups; '+scans.length+' scoped axe scans. The 28 October failure remains historical. Next: AF11 operational register on this replacement artifact. Production remains NO_GO.\n\n';
for(const [file,prefix] of [['docs/accounting-firms/README.md','roadmap-2026-10-19/execution/AF16/'],['docs/accounting-firms/roadmap-2026-10-19/STATUS.md','execution/AF16/'],['docs/accounting-firms/roadmap-2026-10-19/01_IMPLEMENTATION_ROADMAP.md','execution/AF16/'],[phase+'/RESULT.md',''],[phase+'/GO_NO_GO.md','']]){
 let text=read(file);const sep=text.match(/\r?\n\r?\n/);assert.ok(sep);const cut=sep.index+sep[0].length;text=text.slice(0,cut)+note.replace('('+name+')','('+prefix+name+')')+text.slice(cut);
 if(file.endsWith('/STATUS.md'))text=text.replace('**Updated:** 28 October 2026.','**Updated:** 2 November 2026.').replace('FAILED during grant setup | Production NO_GO','FAILED during grant setup (historical); [2 November replacement](execution/AF16/'+name+') passes selected engagement lifecycle/recovery | Production NO_GO');
 fs.writeFileSync(path.join(root,file),text);
}
const followup=`# AF16 engagement repair follow-up\n\n2 November 2026. The grant-form repair passes eight focused component checks and selected engagement browser/recovery verification on replacement build ${summary.buildId}. The old component reproduces the pending-refresh defect. The original failed artifact and evidence remain unchanged.\n\nNext: AF11 operational register on this exact new artifact, digest ${summary.artifactSha256}, using existing workflows and fresh synthetic data. Production stays NO_GO; live validation remains deferred.\n\n[Full report](<E:/ohada saas/Focused projects/stoquify/${phase}/${name}>).\n`;
for(const folder of ['what-next','docs/accounting-firms/supporting-reports'])fs.writeFileSync(path.join(root,folder,'2026-11-02-af16-engagement-repair.md'),followup,{flag:'wx'});
console.log(JSON.stringify({report:phase+'/'+name,browser:'PASS',release:'NO_GO'}));
