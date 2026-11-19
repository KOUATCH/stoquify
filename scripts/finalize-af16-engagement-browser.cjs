// Publish actual failed verification and retained diagnostics without relabelling phase passes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),phase='docs/accounting-firms/roadmap-2026-10-19/execution/AF16',run=phase+'/2026-10-28-run-02';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const receipt=JSON.parse(read(run+'/sealed-engagement-summary.json')),browser=JSON.parse(read(run+'/browser-results.json')),diagnostic=JSON.parse(read(run+'/refresh-diagnostic.json')),cleanup=JSON.parse(read(run+'/cleanup.json')),integrity=JSON.parse(read(run+'/post-run-integrity.json'));
assert.ok(!receipt.passed&&!browser.passed&&diagnostic.error&&receipt.serverStopped&&receipt.proxyStopped&&cleanup.ownedDatabaseStopped&&integrity.passed);
const visual=JSON.parse(read(run+'/browser-visual-review.json'));assert.ok(visual.reviewed);
const name='SEALED_ENGAGEMENT_BROWSER_2026-10-28.md';
const report=`# AF16 sealed firm engagement verification — blocked journey

28 October 2026. **Selected AF03–AF05 sealed-build browser verification FAILED during client-grant setup.** The lifecycle journey did not reach draft, assignment, suspension or handover. Production remains NO_GO; AF16 remains IMPLEMENTED_UNVERIFIED for release. Historical AF03–AF05 phase verification remains separately dated and scoped. Live pilot validation remains deferred.

## Outcome and concrete blocker

Two independent real credential sign-ins succeeded and both sessions supplied Secure HttpOnly cookies. The client owner used the existing grant form and password confirmation to save a preparer mandate. The page displayed “Accountant access granted.” but its submit control remained “Saving…” and unavailable for the next grant. The existing test waited 90 seconds for “Invite or grant access” and failed. Zero page errors were recorded, but that does not make the interaction successful.

A separate diagnostic reopened the same sealed application against the same synthetic clone. The form became usable on a fresh page load, and a direct database read confirmed the manager and preparer grants were present. Thus the first grant was committed; repeating it blindly would be wrong. The diagnostic then attempted the reviewer's grant with the real password-confirmation flow and timed out waiting for the success message. Its request trace records an aborted POST during that sequence. The cause of the pending/aborted interaction is **unconfirmed**; this is not yet attributed to application logic, the local proxy, browser orchestration or timing. No speculative application change or assertion weakening was made.

The final database snapshot contains ${cleanup.clone.users} users, ${cleanup.clone.organizations} organizations, ${cleanup.clone.grants} grants, ${cleanup.clone.engagements} engagements and ${cleanup.clone.journals} journals. Retained grant actors/statuses: ${cleanup.clone.grantActors.map(g=>`${g.actor}: ${g.status}`).join('; ')}. The preparer's committed grant is preserved as diagnostic evidence. There is no completed engagement lifecycle pass.

## Exact application and reused functionality

Build ID: ${receipt.buildId}. Artifact manifest SHA-256: ${receipt.artifactSha256}. The existing verifier checked frozen source identity and all ${receipt.preverifiedFiles} sealed files before the browser attempt. The retained outside-repository runtime copy matched the manifest before startup. After the failed journey and diagnostic, a separate full check again verified the artifact, ${integrity.sourceFiles} frozen source files and runtime copy. No application file, dependency, migration or built asset was changed; the candidate was not rebuilt or refreshed.

The harness reuses the frozen scripts/verify-firm-engagement-browser.cjs and the seed block from scripts/fixtures/firm-engagement-workflows-browser.cjs. Existing FirmEngagementWorkspace, AccountantAccessManager, protected actions and AF03/AF04 services remain the implementation under test. Adaptations use the exact isolated database/client, local HTTPS, fresh credentials and separate evidence paths, add secure-cookie/page-error assertions, and prepare a real UI suspension/reactivation assertion. That additional lifecycle assertion was not reached.

All ${receipt.migrations} migration names, checksums and completion states matched the frozen candidate before cloning the owned empty template ${receipt.clonedFrom} into ${receipt.database}. No migration was executed. Five synthetic actors across firm/client/foreign organizations were seeded through the existing AF05 fixture code. Only manager and owner browser identities were exercised. The seeded manager mandate permits setup; staff consent is still granted explicitly by the client owner.

## Verification classes and actual results

| Evidence class | Result | Limit |
|---|---|---|
| Workflow contract | PASS; 196 package scripts remain unclassified | Does not approve or execute those scripts |
| Source inspection | Existing grant, password-confirmation, refresh and engagement transition behavior inspected | Inspection is not a passing browser result or proven root cause |
| Artifact/source/runtime integrity | PASS before the browser attempt and after the diagnostic | Applies to the retained candidate, not unrelated working-tree changes |
| Real database | Template/migration guards passed; preparer grant persisted; final fixture snapshot retained | No new service-suite, concurrency or migration-replay tests ran |
| Real authenticated browser | FAIL after a saved grant leaves the form pending; diagnostic also fails in the next grant flow | Two secure sessions succeeded; this is not a lifecycle pass |
| EN/FR, mobile, keyboard, axe | NOT RUN in this attempt | The failure occurred before the planned layout/recovery matrix |
| Unit/mock, full lint/type/build | NOT RUN in this continuation | Existing earlier results retain their dates/scopes |
| Documentation | Markdown/PDF publication and visual inspection recorded separately | Does not change the failed application outcome |

The intended lifecycle/recovery matrix remains ready in the scoped harness, including explicit enrollment, suspension/reactivation, handover, revocation, invitation delivery state and six restrictive recovery groups. None is represented as passing from this run. No new export or country-compliance proof was produced.

## Retained failures and observations

The first orchestration attempt used incorrect physical table names in its empty-template check. It failed before cloning or application startup. The corrected attempt uses the Prisma-mapped users and organizations tables, a fresh evidence folder and a new database name. Both the failed precheck and its original harness are retained in 2026-10-28-run-01.

The real browser failure is retained separately in [browser-results.json](2026-10-28-run-02/browser-results.json) and [browser.log](2026-10-28-run-02/browser.log). Its client screenshot visibly shows the success message with the disabled “Saving…” control; the manager page was not yet navigated. The [visual review](2026-10-28-run-02/browser-visual-review.json) records those two captured images. The diagnostic [request timeline](2026-10-28-run-02/refresh-diagnostic.json) records method/path/timing/failure metadata only, plus fresh-load recovery and persisted grants. It does not publish request bodies, passwords or session tokens. No diagnostic success screenshot was produced because that sequence failed before its screenshot step.

See also [run summary](2026-10-28-run-02/sealed-engagement-summary.json), [post-run integrity](2026-10-28-run-02/post-run-integrity.json), [cleanup snapshot](2026-10-28-run-02/cleanup.json), and separate document publication receipts. No timeout was increased to call this a pass. Reload recovery was a diagnostic action, not a replacement for the failed seamless workflow.

## Local runtime and cleanup

The sealed application ran in production mode on a temporary loopback port behind the existing local HTTPS proxy at https://localhost:3186. Browser resolution was pinned to 127.0.0.1. Fresh synthetic secrets and the exact owned database URL were supplied through an environment allowlist; no application environment file was loaded. Live invitation/statement delivery flags stayed off, and no delivery worker ran.

The certificate was self-signed and trusted only through the isolated browser context's test setting; OS trust was unchanged. This setup is a local diagnostic environment, not hosted TLS qualification. The diagnostic reused the just-verified runtime, with a separate private server log/certificate and new sign-in; the post-run integrity check then confirmed its bytes remained unchanged.

Both application processes and their proxies were stopped. The proxy port is free. The original template remains empty, and with no other client connections the owned PostgreSQL cluster stopped cleanly. The synthetic clone, credentials/certificates and artifact are retained for diagnosis. Private credentials and server logs remain outside the published reports.

## Updated selected-scope coverage map

| Scope | Current evidence | Open gate |
|---|---|---|
| AF01–AF02 portfolio | Earlier phase traversal/search and 25 October evidence journey | Full sealed portfolio/current-authority matrix |
| AF03–AF05 engagements | Historical phase passes; this sealed attempt fails during grant setup | Resolve pending/aborted grant and password-confirmation flow, then rerun lifecycle and recovery on a fresh clone |
| AF06–AF08 evidence/workpapers | Earlier phase and 25 October browser/export evidence | Sealed evidence/provider/coverage/workpaper/export journey |
| AF09–AF10 opening | 26 October sealed staging/approval/rollback/replay checks pass in their bounded scope | Broader source/period/tenant cases and agreed performance budget |
| AF11 obligations | Earlier operational browser and 25 October PostgreSQL evidence | Sealed operational register after the engagement blocker; qualified country evidence remains external |
| AF12–AF13 advisory/economics | Earlier phase and 25 October shared-client browser/export evidence | Sealed advisory/workload journey |

## Next step and release decision

The next logical step is **diagnose and resolve the saved-grant pending state and the subsequent password-confirmation interruption**, then rerun AF03–AF05. AF11 remains queued after this blocker. Start with the retained clone and request timeline; compare the existing local proxy with a controlled direct origin where safe, record response completion and fresh-auth state without logging secrets, and reproduce the failure before deciding whether the fix belongs in application code or the harness. Preserve current authorization, explicit consent, idempotency and independent identities.

If application code must change, retain this failed candidate and its evidence, add a focused regression, and prepare a separately identified replacement candidate under the existing build/artifact process. Never edit the sealed artifact in place or relabel these failures. No speculative patch was made in this verification continuation because the evidence does not yet identify a safe, proven repair.

Production stays NO_GO; pilot stays PILOT_PREPARED. Other browser journeys, an identified compatible predecessor for rollback rehearsal, fresh-install lifecycle/clean-build qualification, performance/error budgets, hosted operations, qualified country evidence and live pilot validation remain open. AF14/AF15 remain excluded.

Ready-to-use next prompt:

> Continue AF16 by diagnosing the 28 October sealed engagement browser blocker. Read SEALED_ENGAGEMENT_BROWSER_2026-10-28.md and the retained browser/diagnostic receipts. Reproduce the saved preparer grant leaving “Saving…” and the subsequent reviewer grant/password-confirmation interruption. Distinguish application behavior from proxy or harness timing using bounded request diagnostics without exposing secrets. Reuse existing consent, fresh-auth, idempotency and current-authority controls. Fix only the proven cause; add appropriate regression verification. Preserve the original sealed artifact and failures; if application code changes, create a separately identified replacement candidate through the existing build/artifact workflow. Rerun the engagement lifecycle and recovery on fresh synthetic data, update Markdown/PDF reports and the roadmap, and keep production NO_GO and live validation deferred until the remaining gates are satisfied. Do not advance to AF11 as though this journey passed.
`;
fs.writeFileSync(path.join(root,phase,name),report,{flag:'wx'});
const note='**28 October 2026 sealed engagement follow-up:** [AF03–AF05 browser attempt]('+name+') FAILED during client-grant setup: the preparer grant saved but the form remained pending; a diagnostic recovered the form on reload, then failed in the next grant/password-confirmation flow. Lifecycle, EN/FR/axe and recovery matrices were not reached. Next: diagnose this blocker before AF11. Production remains NO_GO.\n\n';
const updates=[['docs/accounting-firms/README.md','roadmap-2026-10-19/execution/AF16/'],['docs/accounting-firms/roadmap-2026-10-19/STATUS.md','execution/AF16/'],['docs/accounting-firms/roadmap-2026-10-19/01_IMPLEMENTATION_ROADMAP.md','execution/AF16/'],[phase+'/RESULT.md',''],[phase+'/GO_NO_GO.md','']];
for(const [file,prefix] of updates){let text=read(file);const sep=text.match(/\r?\n\r?\n/);assert.ok(sep);const cut=sep.index+sep[0].length;text=text.slice(0,cut)+note.replace('('+name+')','('+prefix+name+')')+text.slice(cut);
 if(file.endsWith('/STATUS.md')){text=text.replace('**Updated:** 26 October 2026.','**Updated:** 28 October 2026.');text=text.replace('passes with six scoped axe scans | Production NO_GO','passes with six scoped axe scans; [28 October sealed engagement attempt](execution/AF16/'+name+') FAILED during grant setup | Production NO_GO');}
 fs.writeFileSync(path.join(root,file),text);}
const followup=`# AF16 engagement verification blocker\n\n28 October 2026. The sealed AF03–AF05 browser attempt failed: a preparer grant was saved, but the form remained on “Saving…” and blocked the next grant. A fresh page load recovered the form and confirmed the grant; a diagnostic then failed during the next grant/password-confirmation sequence. Root cause is unconfirmed. No application code or sealed asset was changed.\n\nNext: diagnose and fix the proven cause, preserving fresh authentication, consent and idempotency, then rerun the engagement lifecycle on fresh synthetic data. AF11 is queued after this blocker. Production remains NO_GO; live pilot validation and AF14/AF15 remain deferred/excluded.\n\n[Full report](<E:/ohada saas/Focused projects/stoquify/${phase}/${name}>) · [Roadmap](<E:/ohada saas/Focused projects/stoquify/docs/accounting-firms/roadmap-2026-10-19/STATUS.md>).\n`;
for(const folder of ['what-next','docs/accounting-firms/supporting-reports'])fs.writeFileSync(path.join(root,folder,'2026-10-28-af16-sealed-engagement-browser.md'),followup,{flag:'wx'});
const sources=['scripts/run-af16-sealed-engagement-browser.cjs','scripts/af16-engagement-suspension.fragment.txt','scripts/af16-sealed-engagement-browser.generated.cjs','scripts/diagnose-af16-engagement-refresh.cjs','scripts/verify-af16-engagement-retained-artifact.cjs','scripts/finalize-af16-engagement-cleanup.cjs','scripts/finalize-af16-engagement-browser.cjs','scripts/verify-af16-engagement-publication.py'];
fs.writeFileSync(path.join(root,run,'orchestration-sources.json'),JSON.stringify(sources.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),null,2),{flag:'wx'});
console.log(JSON.stringify({report:phase+'/'+name,browser:'FAIL',lifecycle:'NOT_REACHED',release:'NO_GO'}));
