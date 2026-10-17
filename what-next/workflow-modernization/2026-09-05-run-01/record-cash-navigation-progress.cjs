const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f)));
const staticFile='evidence/cash-navigation-checks-d4c78fcd-9e40-405a-8f8b-875ae63ddc89.json',runtimeFile=process.argv[2];assert.ok(runtimeFile?.startsWith('lanes/environment/cash-navigation-')&&runtimeFile.endsWith('.json'));
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-sources-review-2026-09-28.json');
const stockFile='lanes/environment/cash-navigation-5ecd6ed7-726d-46e7-af1e-e4bcebf246cd.json',stock=read(stockFile);
assert.ok(tests.passed&&tests.sourceStable&&runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutationsDuringReads);assert.equal(runtime.checks.length,4);
assert.equal(stock.checks.length,2);assert.ok(stock.checks.every(row=>row.id==='stock_cash_buffer'));
const checks=[...stock.checks,...runtime.checks];assert.equal(checks.length,6);
assert.ok(checks.every(row=>row.keyboardHandoff&&row.backRetainedLocale&&row.renderedLinkRevocation));
for(const [file,expected]of Object.entries(stock.sourceBefore))assert.equal(hash(path.join(repo,file)),expected,'Reused stock journey source: '+file);
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row=>row.file).sort(),['services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','components/cash-command/CashCommandDashboard.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx','services/cash-command/__tests__/cash-command.service.test.ts','components/cash-command/__tests__/CashCommandDashboard.test.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx'].sort());
const report='CASH_COMMAND_NAVIGATION_2026-09-28.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,
 verifiedSubcriteria:['cash_stock_canonical_items_destination','payroll_and_inventory_aggregate_and_destination_authority_separated','every_card_change_risk_and_primary_action_uses_admitted_destination','six_en_fr_keyboard_handoffs_back_and_rendered_link_revocation','visible_localized_destination_denial_guidance'],
 receipts:[staticFile,runtimeFile,stockFile,'evidence/cash-navigation-checks-25461cf4-cb6e-4e00-9ce4-b33ae48b2c46.json','evidence/cash-navigation-checks-64d504e1-c7ec-4375-a79f-2269354ffa3b.json','lanes/environment/cash-navigation-4e927ac6-4d48-4c1b-90e6-8cff8a6ee4d7.json','lanes/environment/cash-navigation-f2f87d34-0355-4e6a-94c0-5b0d798f76bc.json','lanes/environment/cash-navigation-0d04db74-c122-4a39-a9fd-a2c12238f5ff.json'].map(file=>({file,sha256:hash(path.join(root,file))})),
 artifacts:checks.flatMap(row=>row.screenshots).map(name=>{const file='lanes/environment/'+name;return{file,sha256:hash(path.join(root,file))}}),
 remaining:['Cash drawer destination requires finance.cash-drawer.read OR finance.read in addition to source CASH_DRAWER_READ. Align this remaining link and verify other finance/action-queue handoffs.','An intermittent hydration mismatch occurred after a payroll handoff when back on Cash Command. Four subsequent EN/FR payroll journeys passed with no page errors; the cause remains unidentified and is not claimed fixed.','Complete server-authored EN/FR copy, honest current-observation labels and empty-forecast grading.','Verify remaining proof subjects, genuine posted payroll lifecycle and full accessibility/latency requirements. Payroll destination nested main landmarks were observed and remain with its broader accessibility review.']};
fs.writeFileSync(path.join(root,'evidence/cash-navigation-review-2026-09-28.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,report),`# Cash Command inventory and payroll navigation

${review.at}. FA-CASH-COMMAND remains In progress. Previous turn delivered verified independent source admission; this turn completes three destination handoffs, not the full workflow.

The stock card now opens the existing inventory items route. Payroll payment/recovery and declaration links require the destination's page and workbench read permissions. Aggregate permission remains independent: permitted cash or payroll totals are preserved when destination access is absent. The destination link is disabled with visible EN/FR guidance. Cards, change strips, risks, action queues and the primary action use admitted destinations, and secondary signal permissions are preserved. Links across these representations retain the selected EN/FR locale; source identity and hashes are unchanged.

| Cash indicator | Destination | Additional destination requirements |
|---|---|---|
| Stock cash buffer | /dashboard/inventory/items | inventory.items.read |
| Employee recovery / payroll net pay | /dashboard/payroll/payments | payments.reconciliation.read and payroll.command.read, alongside payroll.payments.reconcile |
| Statutory liability | /dashboard/payroll/declarations | payroll.command.read, alongside payroll.declarations.manage |

## Verification and limits

- ${staticFile}: 197 tests/seven suites, changed-file lint and full typecheck passed. Tests preserve aggregate values, verify each missing destination permission, disable alternate representations, preserve additional permissions, localize links and expose denial guidance without hover.
- ${runtimeFile}: four passing actual authenticated EN desktop/FR 320px payroll journeys. Two completed inventory journeys are reused from ${stockFile}, with their source hashes checked against the same current code; that run later failed on a payroll hydration error, so it is not represented as an overall pass. All six journeys verify an initially disabled destination, authorized keyboard entry, the destination workbench, Back with retained language, permission withdrawal against an already-rendered link, and disabled links after refresh. Eighteen screenshots and development handoff timings are retained. Business-record equality before/after is verified by the passing payroll run; only owned synthetic roles were changed to exercise authority. This does not verify payroll posting, statutory compliance or production performance.
- Previous failures are retained: Jest needed its existing ESM routing configuration isolated while exercising the real localizePath function; TypeScript exposed a nullable drill-through return type and was corrected. Browser attempts revealed a default navigation wait timeout, an assertion aimed at an unrelated proof tooltip, and a strict selector encountering nested payroll main landmarks. The verifier was corrected without relaxing destination or revocation assertions. One run reported a hydration mismatch after payroll navigation, with the browser back on Cash Command; its original trace was truncated before the component detail. The follow-up captures trace tails and passed all four payroll journeys with no page errors. That intermittent defect remains unidentified and open. Nested destination landmarks remain a separate accessibility finding.
- Existing tenant source, payroll calculation and BI adapter runtime behavior are unchanged. Their prior source admission/proof evidence is retained through exact source bindings plus focused regression. Published design reports and unrelated working-tree edits remain intact.

## Using and operating the change

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. A visible indicator does not guarantee access to its source workspace. If the link is disabled, ask the organization administrator to review the destination permissions listed above and current module read grants, then refresh. No extra approval record, migration or user-entered reference is required for these read-only handoffs. Neither link access nor a forecast grants authority to release a payment or approve a declaration.

No deployment or live customer activation occurred. Use existing release controls for rollout; inspect denied-link rates and destination errors. Rollback requires restoring the coherent Cash navigation projection, page localization and card mapping together; keep the already-verified pre-query source guards. Do not weaken destination route guards to make a link succeed.

## Remaining work and review

${review.remaining.map(s=>'- '+s).join('\n')}

Security/backend/architecture: source rights and destination rights remain distinct; current route denial is verified. UX/product: useful totals survive restricted navigation, language and Back are retained, explanations are visible. Finance/data/audit: no business writes or proof-rule changes. Quality/SRE: bound tests and runtime evidence; no production latency or full accessibility claim. Packaging/operations: no grant expansion or commercial changes. Country rules, migrations, offline and AI: not applicable to these read-only links.
`,{flag:'wx'});
const target=path.join(root,'reconcile-current-progress.cjs');let s=fs.readFileSync(target,'utf8');
s=s.replace('const cashSourcesCurrent =',`const cashNavigation = JSON.parse(fs.readFileSync(path.join(root, 'evidence/cash-navigation-review-2026-09-28.json')));
for (const row of [...cashNavigation.receipts, ...cashNavigation.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Cash navigation evidence changed');
for (const row of cashNavigation.priorImpact) if (cashSources.sourceHashes[row.file] !== row.before || cashNavigation.sourceHashes[row.file] !== row.after) throw new Error('Invalid Cash navigation impact');
const cashNavigationCurrent = Object.entries(cashNavigation.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashNavigationCurrent) throw new Error('Cash navigation dependency changed; review required');
const cashSourcesCurrent = cashNavigationCurrent &&`);
s=s.replace("=== expected);\nif (!cashSourcesCurrent)","=== (cashNavigation.priorImpact.find(row => row.file === source)?.after ?? expected));\nif (!cashSourcesCurrent)");
s=s.replaceAll('=== (cashSources.priorImpact.find','=== (cashNavigation.priorImpact.find(row => row.file === source)?.after ?? cashSources.priorImpact.find');
s=s.replace('...cashSources.verifiedSubcriteria]', '...cashSources.verifiedSubcriteria, ...cashNavigation.verifiedSubcriteria]');
s=s.replace('const currentCashLane =',`for (const report of [cashNavigation.report, 'evidence/cash-navigation-review-2026-09-28.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.navigationBindingCurrent = cashNavigationCurrent;
cashRead.implementationStatus = 'source_admission_and_inventory_payroll_navigation_verified';
cashRead.runtimeStatus = 'owned_en_fr_inventory_payroll_keyboard_back_and_current_destination_denial_verified';
cashRead.remaining = cashRead.remaining.filter(value => value !== 'Payroll destination permissions disagree with some card links; the stock card targets a nonexistent inventory/stock route. Verify and correct authorized handoffs.' && value !== 'Payroll destination permissions and stock route handoffs remain open.');
for (const gap of cashNavigation.remaining) if (!cashRead.remaining.includes(gap)) cashRead.remaining.push(gap);
const currentCashLane =`);
s=s.replace('Source/output admission, domain provenance, tenant isolation and retained reads | Handoffs, remaining proofs, EN/FR, honest states and posted payroll | Engineering | Correct and verify authorized handoffs','Source admission and EN/FR stock/payroll keyboard handoffs | Finance handoffs, proofs, EN/FR, honest states and posted payroll | Engineering | Finish finance destination checks');
const p=s.indexOf('**Since the previous report:**'),q=s.indexOf('**Backlog:**',p);assert.ok(p>0&&q>p);
s=s.slice(0,p)+`**Since the previous report:** Corrected the stock route and payroll destination permissions while preserving permitted aggregate values. Disabled links now have visible EN/FR explanations; all Cash navigation retains the current language. 197 tests/seven suites, lint and TypeScript passed. Six EN/FR actual keyboard journeys verify destination entry, Back and withdrawal against already-rendered links. [Evidence and guidance](CASH_COMMAND_NAVIGATION_2026-09-28.md). No workflow was added or closed.

**Remaining priority:** Align the drawer destination's extra finance permission and finish finance/action-queue handoffs. Investigate the intermittent hydration mismatch; a clean rerun does not prove it fixed. Complete EN/FR, honest observation/empty-forecast labels, other proofs and genuine posted payroll. Current checks cover three handoffs, not full downstream lifecycles. Nested payroll main landmarks were observed. Native screen-reader/browser zoom and production latency remain unverified. No migration, deployment or real cash operation occurred.

`+s.slice(q);
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,s);fs.renameSync(pending,target);console.log(JSON.stringify({report,priorImpact:priorImpact.map(row=>row.file)}));
