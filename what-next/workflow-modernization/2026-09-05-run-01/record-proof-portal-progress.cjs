const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,repo=path.resolve(root,'../../..'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const testFile='evidence/proof-portal-checks-54966775-b83b-4038-a5ad-e6385376676f.json',portalFile='lanes/environment/proof-portal-fd60a0ea-c222-44c3-97be-1e092ab490cc.json',moduleFile=process.argv[2];
assert.ok(/^lanes\/environment\/proof-module-[a-f0-9-]+\.json$/.test(moduleFile));
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file))),tests=read(testFile),portal=read(portalFile),modules=read(moduleFile);
assert.ok(tests.passed&&portal.passed&&modules.passed&&portal.checks.length===6&&modules.checks.length===8);
assert.ok(portal.noPaymentMutation&&modules.noPaymentMutation);
const sourceHashes={...portal.sourceAfter,...tests.sourceAfter,...modules.sourceAfter};for(const [file,expected] of Object.entries(sourceHashes))assert.equal(sha(path.join(repo,file)),expected,file);
const previous=read('evidence/cash-proof-state-review-2026-09-28.json');
const priorImpact=Object.entries(previous.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row=>row.file),['components/cash-command/CashCommandDashboard.tsx']);
const contrast=portal.checks.flatMap(row=>row.visual.rows),report='CASH_COMMAND_PROOF_PORTAL_2026-09-28.md';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',report,completeWorkflowVerified:false,sourceHashes,priorImpact,
 receipts:[testFile,portalFile,moduleFile,'lanes/environment/proof-module-26e65938-cee9-4942-aa3f-1942c545601d.json','evidence/proof-portal-checks-a1703e12-1dd7-4a8f-914f-9b4be35bddda.json'].map(file=>({file,sha256:sha(path.join(root,file))})),
 artifacts:portal.checks.flatMap(row=>[row.screenshot,row.enlarged]).map(name=>({file:'lanes/environment/'+name,sha256:sha(path.join(root,'lanes/environment',name))})),
 verifiedSubcriteria:['owned_en_fr_proof_portal_tokens_opaque_background_and_text_contrast','owned_proof_desktop_tablet_mobile_keyboard_containment_and_reduced_motion','owned_proof_controlled_text_enlargement_reflow','unit_all_four_proof_action_current_module_admission_before_data','owned_cached_payment_proof_module_suspension_expiry_and_retained_read'],
 remaining:'Proof portal tokens and its own EN/FR controls are corrected. Server-authored proof reasons/nodes remain English, other proof subjects need actual browser lifecycle evidence, and native screen-reader/browser zoom remain unverified. Source read scoping and finance/payroll/inventory handoffs remain open.',
 contrast:{samples:contrast.length,minRatio:Math.min(...contrast.map(row=>row.ratio)),threshold:4.5},
 sharedImpact:'ProofTrailDrawer uses the existing product aliases in its own portal; all consumers receive an opaque background. BIProofDrawerHost adds an optional locale with unchanged English default. SheetContent adds an optional overlay class with unchanged default behavior. Cash Command passes its existing locale. Four existing proof actions now enforce their owning module read contract; RBAC and server tenant derivation remain unchanged. No evidence-grade semantics, financial records or domain service operations were changed.',
 limits:['Native assistive-technology speech and browser-chrome zoom not certified. Doubled root text size is controlled reflow evidence.','Contrast covers all 96 text samples in the real synthetic payment proof across six views; it does not certify all possible proof contents.','Payment subject module access exercised against the real database; all four subject/action dispatch boundaries covered by unit tests.','Earlier aggregate runtime reused: service projection unchanged; focused Cash UI tests rerun and current real page paths exercised.']};
fs.writeFileSync(path.join(root,'evidence/proof-portal-review-2026-09-28.json'),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,report),`# Cash Command proof portal and current access

${review.at}. Parent workflow remains In progress.

## Delivered behavior

The proof portal now establishes its own aliases to Stoquify product tokens, has an opaque canvas, wraps long identifiers and honors reduced motion in its panel and overlay. Shared labels, close control, loading/empty/error states, grade labels and freshness are EN/FR. Server-authored evidence is preserved verbatim; this is not full proof-content localization. Loading is announced as status and failure as alert. Current proof request-state protections remain intact.

The stale-button browser test reproduced a security defect: after payment_reconciliation was suspended, the actual proof action still returned the protected transaction. The four protected proof actions now require their owning module with read intent, enforcement and audit before calling the proof service. Suspended and expired modules deny; active and retained read modules allow. The central module policy remains the authority.

## Verification

- ${testFile}: 90 tests/nine suites, changed-file lint and full TypeScript passed. Real protected wrappers verify dispatcher and dedicated actions for all four proof subjects; no data query follows RBAC/module denial or a module lookup failure.
- ${portalFile}: six real EN/FR views at 1440, 768 and 320px. ${contrast.length} text contrast samples, minimum ${review.contrast.minRatio.toFixed(3)}:1, exceeded 4.5:1. Opaque background, keyboard containment, Escape/focus return, actual proof retry, reduced motion and 200% controlled root-text reflow passed. Twelve viewport screenshots retained.
- ${moduleFile}: eight real EN/FR cached-button cases with active, suspended, expired and read_only grants. Access changes occurred after rendering. Actual response inspection confirmed denied identifiers absent and permitted proof present; synthetic payment remained unchanged.
- Before-fix security reproduction: lanes/environment/proof-module-26e65938-cee9-4942-aa3f-1942c545601d.json. Earlier portal run fa67860a failed reduced-motion specificity; the open-state animation overrode the initial class. Corrected with state-specific reduced-motion variants. Initial unit test loader failure f3c529a3 was an ESM icon import; existing icon mocking resolved it while retaining the real drawer/portal tests.

Exact source, receipt, screenshot and prior proof-state impact bindings are in evidence/proof-portal-review-2026-09-28.json. ${review.sharedImpact}

## User and operator guidance

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command and choose an available proof. On failure close and reopen to retry. Escape returns to the opening button. A current suspended/expired workspace cannot serve proof from an old button. Authorized historical access requires the owning module's supported retained-read state and the subject permission; it does not authorize new work. The organization administrator supplies the role and module configuration through existing controls. No new document, external approval or live activation is required for this code correction.

## Remaining and recovery

${review.remaining}

No migration, real payment, external delivery or production deployment occurred. Reverting the module gate would reopen the reproduced disclosure; prefer withholding proof access while diagnosing a regression. Revert only a faulty visual change independently if necessary. Existing audit/read behavior remains enabled. Full rollout and Cash Command closure still require the registered source/handoff/lifecycle work.

## Review responsibilities

Architecture/backend/security: shared portal ownership and current action gate verified. Data/finance/audit: no business mutation, no new assurance or posting claim. Frontend/workflow/localization/accessibility: six real views and explicit limits above. Quality/SRE: isolated environment, serialized checks and failed attempts retained; no production performance claim. Product/SaaS operations: retained read remains distinct from operational entitlement. Statutory/country packs, pricing, providers, offline, agents and migrations: not applicable to these changes; no behavior altered.
`,{flag:'wx'});
const skillPath=path.join(repo,'what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_05_ROBUST_STATES_REPORT_2026-09-28_CASH_PROOF.md');
fs.mkdirSync(path.dirname(skillPath),{recursive:true});fs.writeFileSync(skillPath,`# Robust states — Cash Command proof scope\n\nSkill: aqstoqflow-uiux-05-robust-states. Applied to the observed proof portal failure and its loading/error/recovery states; this is not whole-phase closure. Existing route error/state components were inspected and preserved.\n\nImplementation, exact evidence, review responsibilities, recovery and limits: [Cash Command proof portal](../workflow-modernization/2026-09-05-run-01/${report}).\n`,{flag:'wx'});
const target=path.join(root,'reconcile-current-progress.cjs');let source=fs.readFileSync(target,'utf8');
const marker='const cashProofStateCurrent =';const index=source.indexOf(marker);assert.ok(index>0);
source=source.slice(0,index)+`const cashPortal = JSON.parse(fs.readFileSync(path.join(root, 'evidence/proof-portal-review-2026-09-28.json')));
for (const row of [...cashPortal.receipts, ...cashPortal.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Proof portal evidence changed: ' + row.file);
const cashPortalCurrent = Object.entries(cashPortal.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
for (const row of cashPortal.priorImpact) if (cashProofState.sourceHashes[row.file] !== row.before || cashPortal.sourceHashes[row.file] !== row.after) throw new Error('Invalid portal impact');
`+source.slice(index);
source=source.replace('const cashProofStateCurrent = Object.entries(cashProofState.sourceHashes).every(([source, expected]) => crypto.createHash', 'const cashProofStateCurrent = cashPortalCurrent && Object.entries(cashProofState.sourceHashes).every(([source, expected]) => crypto.createHash');
source=source.replace("=== expected);\nfor (const row of cashProofState.aggregateImpact)","=== (cashPortal.priorImpact.find(row => row.file === source)?.after ?? expected));\nfor (const row of cashProofState.aggregateImpact)");
source=source.replace('(cashProofState.aggregateImpact.find(row => row.file === source)?.after ?? expected)', '(cashPortal.priorImpact.find(row => row.file === source)?.after ?? cashProofState.aggregateImpact.find(row => row.file === source)?.after ?? expected)');
source=source.replace('...cashProofState.verifiedSubcriteria]', '...cashProofState.verifiedSubcriteria, ...cashPortal.verifiedSubcriteria]');
source=source.replace('if (!cashRead.remaining.includes(portalGap)) cashRead.remaining.push(portalGap);',`cashRead.remaining = cashRead.remaining.filter(value => value !== portalGap && value !== cashProofState.remaining);
if (!cashRead.remaining.includes(cashPortal.remaining)) cashRead.remaining.push(cashPortal.remaining);
for (const report of [cashPortal.report, 'evidence/proof-portal-review-2026-09-28.json']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
source=source.replace('Actual proof portal readability is defective;', 'Proof portal contrast and current module actions are verified within their recorded scope;');
source=source.replace('Restore proof portal readability, then scope queries','Scope source queries and verify domain handoffs');
const a=source.indexOf('**Since the previous report:**'),b=source.indexOf('**Backlog:**',a);assert.ok(a>0&&b>a);
source=source.slice(0,a)+`**Since the previous report:** Restored proof portal tokens, opaque background and its own EN/FR controls. Six actual desktop/tablet/mobile views passed keyboard containment, focus return, reduced motion and doubled-text reflow; 96 text samples had minimum contrast 6.779:1. A stale button then exposed a security defect: proof data remained readable after module suspension. All four protected proof actions now check current module read access before data. Eight actual EN/FR cases verified active, suspended, expired and retained-read access. Ninety tests/nine suites, lint and TypeScript passed. Existing aggregate service evidence remains unchanged; current source/impact bindings are recorded in [portal and access verification](CASH_COMMAND_PROOF_PORTAL_2026-09-28.md). No workflow was added or closed.

**Remaining priority:** Broad snapshots still load before domain output authorization. Scope source queries and preserve useful domain-specific provenance. Payroll/inventory handoffs, server-authored proof translations, remaining proof types and genuinely posted payroll lifecycle remain open. Contrast evidence covers the sampled payment proof, not all content; native screen-reader speech and browser zoom are unverified. No migration, deployment or live customer change occurred.

`+source.slice(b);
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,source,{flag:'wx'});fs.renameSync(pending,target);console.log(JSON.stringify({report,criteria:review.verifiedSubcriteria.length,contrast:review.contrast}));
