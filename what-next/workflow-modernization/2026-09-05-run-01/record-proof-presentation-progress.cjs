const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../../..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file)));
const staticFile='evidence/proof-presentation-checks-e63c1aed-3a40-42db-9a60-59372ec70a37.json',runtimeFile='lanes/environment/proof-presentation-1c76826e-3508-4b23-bcfc-44ce48c96450.json';
const tests=read(staticFile),runtime=read(runtimeFile),prior=read('evidence/cash-proof-completeness-review-2026-09-30.json');
assert.ok(tests.passed&&tests.sourceStable&&tests.steps.length===3&&tests.steps.every(step=>step.status===0));assert.match(tests.steps[0].stderr,/Tests:\s+61 passed, 61 total/);
assert.ok(runtime.passed&&runtime.sourceStable&&runtime.noBusinessMutation);assert.equal(runtime.checks.length,12);
assert.ok(runtime.checks.every(row=>row.localizedReason&&row.actualResponse&&row.keyboardContainmentAndReturn&&row.noHorizontalOverflow&&row.freshPermissionRevocation&&row.noPageErrors));
const sourceHashes={...prior.sourceHashes,...tests.sourceAfter,...runtime.sourceAfter};for(const [file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const priorImpact=Object.entries(prior.sourceHashes).filter(([file,before])=>sourceHashes[file]!==before).map(([file,before])=>({file,before,after:sourceHashes[file]}));
assert.deepEqual(priorImpact.map(row=>row.file).sort(),['components/evidence/ProofTrailDrawer.tsx','components/evidence/__tests__/ProofTrailDrawer.test.tsx'].sort());
const report='CASH_PROOF_PRESENTATION_2026-09-30.md',reviewFile='evidence/cash-proof-presentation-review-2026-09-30.json';
const remaining=[...prior.remaining];remaining[0]='Finish successful posted/certified proof lifecycle evidence. All four deliberately blocked proof subjects, canonical EN/FR drawer content, transport recovery, keyboard containment/return and fresh permission revocation are verified at desktop/tablet/mobile widths. Custom source text and machine codes remain unchanged; synthetic journal rejection is not a successful posting.';
const review={at:new Date().toISOString(),workflow:'FA-CASH-COMMAND',completeWorkflowVerified:false,report,sourceHashes,priorImpact,
 verifiedSubcriteria:['proof_canonical_en_fr_presentation_preserves_server_identity_and_custom_source_text','four_blocked_proof_subjects_actual_browser_en_desktop_fr_tablet_mobile','proof_transport_retry_keyboard_containment_return_and_current_revocation','no_blockers_message_uses_informational_treatment'],
 receipts:[staticFile,runtimeFile].map(file=>({file,sha256:hash(path.join(__dirname,file))})),
 artifacts:runtime.checks.map(row=>{const file='lanes/environment/'+row.screenshot;return{file,sha256:hash(path.join(__dirname,file))};}),remaining,
 limits:['No genuine posting/signing/certification performed','Native screen-reader speech and browser zoom unverified','No production performance claim']};
let source=fs.readFileSync(path.join(__dirname,'reconcile-current-progress.cjs'),'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
const old="const cashProofCompletenessCurrent = Object.entries(cashProofCompleteness.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);";
replace(old,`const cashProofPresentation = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...cashProofPresentation.receipts, ...cashProofPresentation.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Proof presentation evidence changed');
for (const row of cashProofPresentation.priorImpact) if (cashProofCompleteness.sourceHashes[row.file] !== row.before || cashProofPresentation.sourceHashes[row.file] !== row.after) throw new Error('Invalid proof presentation impact');
const cashProofPresentationCurrent = Object.entries(cashProofPresentation.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === expected);
if (!cashProofPresentationCurrent) throw new Error('Proof presentation dependency changed; review required');
const cashProofCompletenessCurrent = cashProofPresentationCurrent && Object.entries(cashProofCompleteness.sourceHashes).every(([source, expected]) => crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') === (cashProofPresentation.priorImpact.find(row => row.file === source)?.after ?? expected));`);
const prefix='cashProofCompleteness.priorImpact.find(row => row.file === source)?.after ??';assert.equal(source.split(prefix).length-1,14);source=source.split(prefix).join('cashProofPresentation.priorImpact.find(row => row.file === source)?.after ?? '+prefix);
replace('...cashProofCompleteness.verifiedSubcriteria]','...cashProofCompleteness.verifiedSubcriteria, ...cashProofPresentation.verifiedSubcriteria]');
replace('cashRead.remaining = cashProofCompleteness.remaining;',`cashRead.remaining = cashProofPresentation.remaining;
for (const report of [cashProofPresentation.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);
cashRead.closureReview.proofPresentationBindingCurrent = cashProofPresentationCurrent;`);
replace("cashRead.runtimeStatus = 'owned_cash_handoffs_and_hidden_proof_blockers_with_unchanged_read_records_verified';",`cashRead.runtimeStatus = 'owned_cash_handoffs_and_four_blocked_proof_drawer_lifecycles_en_fr_verified';
cashRead.closureReview.note = 'Source admission, handoffs, EN/FR source and proof content, complete proof counts and four blocked drawer lifecycles are verified; successful financial proofs, genuine posted payroll and complete accessibility/latency remain open.';`);
const start=source.indexOf('**Since the previous report:**'),end=source.indexOf('\n\n**Remaining priority:**',start);assert.ok(start>0&&end>start);
source=source.slice(0,start)+'**Since the previous report:** Translated canonical proof reasons, nodes, relationships, blockers and redactions while preserving source identities and custom descriptions. No-blockers feedback is informational. All 61 focused tests, lint and TypeScript pass. Twelve actual payment, reconciliation, close and journal drawer cases passed across EN desktop and FR tablet/mobile, including transport retry, keyboard containment/return, fresh permission revocation and unchanged business records. [Evidence and guidance](CASH_PROOF_PRESENTATION_2026-09-30.md). Synthetic blocked fixtures do not prove successful posting or certification. No workflow added or closed.'+source.slice(end);
replace('Source admission; handoffs; EN/FR; complete proof blocker counts','Source admission; handoffs; EN/FR; four blocked proof lifecycles');
replace('Proof content, posted payroll, accessibility and latency','Successful proofs, posted payroll, accessibility and latency');
replace('Verify remaining proof subjects and source-record localization','Verify genuine posted payroll and successful proof transitions');
replace('Finish proof-subject lifecycle and proof-drawer source-record localization, genuine posted payroll and complete accessibility/latency checks.','Finish successful proof lifecycles, genuine posted payroll and complete accessibility/latency checks.');
fs.writeFileSync(path.join(__dirname,reviewFile),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'reconcile-current-progress.cjs'),source);console.log(JSON.stringify({reviewFile,priorImpact}));
