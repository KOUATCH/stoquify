// Publish only completed local browser evidence; leave prior receipts and release gates intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const phase='docs/accounting-firms/roadmap-2026-10-19/execution/AF16';
const run=phase+'/2026-10-26-run-03';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const receipt=JSON.parse(read(run+'/sealed-opening-summary.json'));
const browser=JSON.parse(read(run+'/browser-verification.json'));
const cleanup=JSON.parse(read(run+'/cleanup.json'));
if(!receipt.passed||!browser.passed||!receipt.serverStopped||!receipt.proxyStopped||!receipt.artifactUnchangedAfterBrowser)throw Error('Completed passing browser run and runtime cleanup required');
if(!cleanup.ownedDatabaseStopped||cleanup.originalFixture.openingExecutions!==0||cleanup.originalFixture.journals!==0)throw Error('Database cleanup and original-fixture check required');
const reportName='SEALED_OPENING_BROWSER_2026-10-26.md';
if(fs.existsSync(path.join(root,phase,reportName)))throw Error('Refusing an existing final report');
const checks=browser.checks.map((text,index)=>`${index+1}. ${text}`).join('\n');
const report=`# AF16 sealed opening workflow verification

26 October 2026. **AF09–AF10 authenticated browser workflow PASS against the retained full application artifact. Production remains NO_GO; AF16 remains IMPLEMENTED_UNVERIFIED for release.** Live pilot validation remains deferred. This continuation closes the selected opening staging/apply/recovery browser gap; it does not qualify every accounting-firm screen.

## Exact candidate and reused functionality

Build ID: ${receipt.buildId}. Artifact manifest SHA-256: ${receipt.artifactSha256}. The existing release verifier checked the source identity, manifest and all ${receipt.preverifiedFiles} sealed files before use and again after the browser journey. The retained outside-repository runtime copy matched those files before startup. No application source, dependency, migration or built file was changed; the frozen candidate was not rebuilt or refreshed.

Reused scripts/verify-opening-cutover-browser.cjs and the retained AF16 AF10 PostgreSQL scenario fixture. The new runner adds local orchestration, exact target guards and an adapter; the original financial assertions remain. It clones ${receipt.clonedFrom} into ${receipt.database} only after checking the owned PostgreSQL data directory and all ${receipt.migrations} migration names/checksums against the frozen candidate. The original fixture database and earlier receipts remain unchanged. The clone contains synthetic scenario data; only its selected empty opening client receives browser writes and fresh credentials.

The fixture is a bounded CM/XAF empty-client opening, with separate source and independent control files, existing account/customer/supplier/item/location mappings and three independent identities. It is not evidence of country qualification, a nonempty-client conversion, another currency or whole-cutover undo.

## Executed browser and database observations

${checks}

The browser completed ${browser.checks.length} recorded workflow assertions. Secure HttpOnly session cookies were checked for ${browser.secureCookieRoles.join(', ')} after real credential sign-in. There were ${browser.axe.length} scoped axe scans and ${browser.pageErrors.length} recorded page errors. Screenshots cover the approval form, approved state, rollback/retry state, active EN/FR desktop/mobile states and current-access denial. All eight screenshots were visually inspected: labels and focus are visible, mobile text wraps, and no overlap was observed in the captured panels. The module-denial assertion and screenshot concern the controlled-cutover panel; the separate preview remains visible. See [visual review](2026-10-26-run-03/browser-visual-review.json). Automated checks and screenshot inspection remain separate evidence classes.

Financial approval alone left all observed balances and writer counts unchanged. The injected database failure after stock handling rolled back the attempted financial effects and retained APPROVED. The next real apply committed while its response was deliberately lost; recovery read ACTIVE and replay of the original command did not duplicate effects. Final selected-client counts were ${browser.financialAfter.journals} journal entry, ${browser.financialAfter.stock} stock transaction, ${browser.financialAfter.levels} inventory level, ${browser.financialAfter.ar} customer ledger entry and ${browser.financialAfter.ap} supplier ledger entry; customer balance ${browser.financialAfter.customer} and supplier balance ${browser.financialAfter.supplier}. These assertions exercise actual protected actions and PostgreSQL in the browser lane, not mocked service results.

The retained reconciliation payload is in browser-verification.json. No new unit suite, full lint/type/build, migration replay, dependency installation or export check ran in this continuation. Those evidence classes retain their prior dates and scopes. Opening screenshots and reconciliation receipts are not new AF08/AF12 export proof.

## Local HTTPS and authority boundary

The server ran in production mode from the sealed runtime, bound to a temporary 127.0.0.1 port. A task-owned HTTPS proxy listened only on 127.0.0.1:3186 and forwarded requests to that local process. Requests used https://localhost:3186 because Next canonicalizes loopback addresses to localhost. DNS was checked for loopback-only resolution; browser resolution was pinned to 127.0.0.1. Host and forwarded protocol were preserved for the server-action origin checks.

Fresh synthetic secrets and database configuration were supplied through an explicit environment allowlist. No application environment files were loaded; live statement/invitation delivery remained disabled. The certificate was self-signed for localhost and 127.0.0.1; only the isolated browser contexts ignored its trust error. No operating-system trust setting was changed. This proves local secure-cookie/action behavior for the exercised flow, not hosted TLS, certificate trust, every bundled public URL or production secret readiness. The build's bundled public origin remains unchanged.

Both the TLS proxy and application child process were stopped after verification. The original fixture still has zero opening executions and zero journal entries for the selected client. With no other database clients connected, the owned PostgreSQL cluster was stopped cleanly. The synthetic clone, private certificate/credentials, runtime copy and sealed artifact are retained; cleanup.json records these outcomes. Private credentials, session tokens and server logs are outside the published report folder.

## Selected-scope browser coverage map

| Scope | Existing evidence | Remaining gap |
|---|---|---|
| AF01–AF02 portfolio | 25 October evidence-desk journey includes portfolio navigation; earlier phase run covers 105-client traversal | Full sealed-build portfolio traversal/search/fresh-authority matrix |
| AF03–AF05 engagements | 25 October real service cases; earlier phase browser setup/lifecycle evidence | Sealed-build enrollment, consent, assignment, suspension and handover journeys |
| AF06–AF08 evidence and workpapers | 25 October three-role evidence journey, retained workpaper/advisory exports and independent artifact inspection | Sealed-build evidence/provider/account-coverage/workpaper/export surface coverage |
| AF09–AF10 opening | This run: sealed staging, review, financial approval, transaction failure, lost response, exact retry, module denial and EN/FR responsive states | Broader source/period/tenant denial matrices and agreed performance budgets; no whole-cutover undo claim |
| AF11 obligations | 25 October real PostgreSQL cases and earlier phase browser evidence | Sealed-build operational obligation journey; qualified country evidence stays external |
| AF12–AF13 advisory and economics | 25 October reviewed shared-client browser, step-up, confidentiality and export evidence | Sealed-build replay of selected advisory/workload journeys |

Historical phase passes were not relabelled as current sealed-build passes. This is a coverage inventory, not a whole-product accessibility certification. The earlier 26–35 second public cold-response observations remain open; this functional workflow does not establish a latency budget.

## Predecessor rollback assessment

The bounded inventory of retained .codex-tmp/af* accounting-firm candidates found the current AF16 sealed artifact and its current build output. Earlier AF browser directories have neither an artifact manifest nor a .next/BUILD_ID. No retained sealed predecessor was identified within that scope. Unrelated projects' build directories were not assumed to be authorized predecessors. Therefore previous-application compatibility/rollback was not executed. Database upgrade checks, opening transaction rollback and stopping the current server cannot substitute for it.

## Verification, reports and next step

The workflow contract passed with 196 unclassified package scripts; no reviewed hashes were changed. New harness behavior was inspected for target, process, fixture, TLS and mutation boundaries. Initial attempts verified the artifact/copy but received EACCES and then ECONNREFUSED when connecting to the owned local database, before cloning or browser activity. Both failed prechecks are retained in blocked-local-connection.json and blocked-local-connection-2.json. The initially restricted database process did not remain available; a host-context restart required PostgreSQL recovery and exceeded pg_ctl's initial readiness wait. The browser runner proceeded only after database readiness, retaining the exact data-directory guard and rechecking the artifact. See [run summary](2026-10-26-run-03/sealed-opening-summary.json), [browser assertions](2026-10-26-run-03/browser-verification.json), [browser log](2026-10-26-run-03/browser.log), [predecessor inventory](2026-10-26-run-03/predecessor-inventory.json) and the separate publication/visual review receipts.

Keep production NO_GO and pilot PILOT_PREPARED. Next, reuse this verified artifact to exercise the missing AF03–AF05 engagement lifecycle in a fresh synthetic clone, followed by the AF11 operational register. Preserve the local TLS/current-authority controls, retain all failures and avoid rebuilding the frozen candidate. Identify an explicit compatible predecessor before any previous-application rollback rehearsal. Fresh-install lifecycle/clean-build qualification, performance budgets, hosted operations and qualified country evidence remain separate open gates. AF14/AF15 remain excluded.

Ready-to-use next prompt:

> Continue AF16 with sealed-build firm engagement browser verification. Reuse build ${receipt.buildId} and artifact digest ${receipt.artifactSha256}, verifying exact bytes before use. Reuse AF05 enrollment/consent, assignment, suspension, handover and restrictive recovery fixtures and protected workflows on a new owned synthetic database clone. Use the proven local HTTPS setup and fresh independent identities; check current authorization, denied/revoked states and EN/FR desktop/mobile behavior. Preserve prior receipts and do not rebuild the candidate. Update the coverage map, roadmap and Markdown/PDF reports with actual outcomes. Keep live activity, deployment, AF14/AF15 and country qualification deferred; do not claim predecessor rollback without an identified compatible predecessor artifact.
`;
fs.writeFileSync(path.join(root,phase,reportName),report,{flag:'wx'});
const note='**26 October 2026 sealed opening follow-up:** [AF09–AF10 browser verification]('+reportName+') passes on the verified full application: three real identities, secure cookies, staged review, separate financial approval, injected failure rollback, lost-response recovery, replay and current-module denial; six scoped axe scans. Remaining browser, predecessor rollback and other release gates stay open.\n\n';
for(const name of ['RESULT.md','GO_NO_GO.md']){
 const file=phase+'/'+name,text=read(file),separator=text.match(/\r?\n\r?\n/);
 if(!separator)throw Error('Missing document heading separator: '+file);
 const cut=separator.index+separator[0].length;
 fs.writeFileSync(path.join(root,file),text.slice(0,cut)+note+text.slice(cut));
}
for(const [file,prefix] of [
 ['docs/accounting-firms/README.md','roadmap-2026-10-19/execution/AF16/'],
 ['docs/accounting-firms/roadmap-2026-10-19/STATUS.md','execution/AF16/'],
 ['docs/accounting-firms/roadmap-2026-10-19/01_IMPLEMENTATION_ROADMAP.md','execution/AF16/']]){
 let text=read(file);const separator=text.match(/\r?\n\r?\n/);
 if(!separator)throw Error('Missing document heading separator: '+file);
 const cut=separator.index+separator[0].length;
 text=text.slice(0,cut)+note.replace('('+reportName+')','('+prefix+reportName+')')+text.slice(cut);
 if(file.endsWith('/STATUS.md'))text=text.replace('fresh locked install passes with hooks disabled | Production NO_GO','fresh locked install passes with hooks disabled; [sealed AF09–AF10 browser](execution/AF16/'+reportName+') passes with six scoped axe scans | Production NO_GO');
 fs.writeFileSync(path.join(root,file),text);
}
const followup=`# AF16 sealed opening workflow follow-up\n\n26 October 2026. AF09–AF10 authenticated staging/apply/recovery passes against build ${receipt.buildId}; no rebuild or application change. Three identities used secure HttpOnly cookies. Financial approval, after-stock failure rollback, lost-response recovery, exact replay and current-module denial passed, with six scoped EN/FR desktop/mobile axe scans.\n\nProduction remains NO_GO; live pilot validation stays deferred. Other selected-scope browser journeys, an identified predecessor application, fresh-install lifecycle/clean-build qualification, performance budgets and AF11 qualified country evidence remain open. Next: sealed-build AF03–AF05 engagement lifecycle on a fresh synthetic clone.\n\n[Full report](<E:/ohada saas/Focused projects/stoquify/${phase}/${reportName}>) · [Roadmap](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/STATUS.md>).\n`;
for(const folder of ['what-next','docs/accounting-firms/supporting-reports'])fs.writeFileSync(path.join(root,folder,'2026-10-26-af16-sealed-opening-browser.md'),followup,{flag:'wx'});
const files=['scripts/run-af16-sealed-opening-browser.cjs','scripts/af16-sealed-opening-browser.generated.cjs','scripts/finalize-af16-opening-cleanup.cjs','scripts/finalize-af16-opening-browser.cjs','scripts/verify-af16-opening-publication.py'];
fs.writeFileSync(path.join(root,run,'orchestration-sources.json'),JSON.stringify(files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),null,2),{flag:'wx'});
console.log(JSON.stringify({report:phase+'/'+reportName,checks:browser.checks.length,axe:browser.axe.length,release:'NO_GO'}));
