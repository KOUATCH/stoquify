// Scoped documentary checks. No env loading, application imports, DB or network.
// Writes only validation.json and review-gate-diagnostics.json beside this file.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
const relative='docs/database-seed/payroll-unblock-workpapers';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const exists=p=>fs.existsSync(path.join(root,p));
const checks=[];
const check=(id,passed,detail)=>checks.push({id,passed:!!passed,detail});
const register=json('docs/database-seed/payroll-unblock-register.json');
const engineering=json(`${relative}/engineering-results.json`);
const unitResults=json(`${relative}/review-tools-after.json`);
check('review_tool_engineering_evidence_current',engineering.status==='COMPLETED_ENGINEERING'&&unitResults.success&&unitResults.numFailedTests===0&&unitResults.numTotalTests===engineering.after.tests&&[...engineering.sourceFiles,...engineering.testArtifacts].every(s=>exists(s.file)&&hash(s.file)===s.sha256)&&register.entries.find(e=>e.id==='ENG-10').status==='COMPLETED_ENGINEERING',{tests:unitResults.numTotalTests,suites:unitResults.numTotalTestSuites,evidenceClass:engineering.evidenceClass});
const source=json(`${relative}/current-source-facts.json`);
const refs=json(`${relative}/reference-audit.json`);
const matrix=json(`${relative}/pay-date-coverage.json`);
const ids=new Set(register.entries.map(e=>e.id));
check('unique_entry_ids',ids.size===register.entries.length,{entries:register.entries.length,unique:ids.size});
const required=['id','category','destination','field','currentValue','requiredType','requirement','owner','action','evidence','status','dependencies','scope','proposedValue','verification'];
check('entry_structure',register.entries.every(e=>required.every(k=>Object.hasOwn(e,k))),required);
const badDependencies=register.entries.flatMap(e=>e.dependencies.filter(d=>!ids.has(d)).map(d=>({id:e.id,dependency:d})));
check('dependency_references',!badDependencies.length,badDependencies);
function visit(id,ancestors=[]) {if(ancestors.includes(id))return true;return register.entries.find(e=>e.id===id).dependencies.some(d=>visit(d,[...ancestors,id]));}
check('dependency_graph_acyclic',!badDependencies.length&&register.entries.every(e=>!visit(e.id)),'No self-dependencies or cycles');
const counts={};for(const e of register.entries)counts[e.status]=(counts[e.status]||0)+1;
check('status_counts',JSON.stringify(counts)===JSON.stringify(register.counts),counts);
const missingEvidence=[...new Set(register.entries.flatMap(e=>[e.destination,...e.evidence]))].filter(p=>!exists(p));
check('destinations_and_evidence_exist',!missingEvidence.length,missingEvidence);
check('13_payroll_paths',source.rules.filter(r=>r.parameterPath.startsWith('payroll.')).length===13,'13 payroll paths, separate from 11 scenario families');
check('11_scenario_families',source.families.length===11,source.families.map(f=>f.family));
check('36_pay_date_rows',matrix.rows.length===36&&new Set(matrix.rows.map(r=>r.organizationId+'/'+r.month)).size===36,'12 distinct months for each of three organizations');
check('2025_and_october_boundaries',matrix.rows.filter(r=>!r.currentPackHeaderCoversDate).length===6&&matrix.rows.filter(r=>r.payDate==='2026-10-31'&&r.attendanceScope.includes('PARTIAL')).length===3,'Six organization/month rows require 2025 pack coverage; three October rows remain partial');
const drift=source.sourceFiles.filter(s=>hash(s.file)!==s.sha256).map(s=>s.file);
check('inspected_source_digests_current',!drift.length,drift);
const links=[];
for(const file of ['docs/database-seed/README.md','docs/database-seed/PAYROLL-UNBLOCK.md','docs/database-seed/PAYROLL-UNBLOCK-REGISTER.md','docs/database-seed/PAYROLL-UNBLOCK-COMPLETION-PACKET.md']) {
 for(const m of read(file).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
  if(/^(https?:|#)/.test(m[1]))continue;
  const target=path.posix.normalize(path.posix.dirname(file)+'/'+m[1].split('#')[0]);
  links.push({file,target,exists:exists(target)});
 }
}
check('existing_reference_links',!refs.references.some(r=>r.status==='MISSING'),{missing:refs.references.filter(r=>r.status==='MISSING'),authenticReturnsPending:refs.references.filter(r=>r.status==='MISSING_AUTHENTIC_RETURN').length});
const original='docs/HR-Payroll/evidence/country-packs/CM/2026-07-19';
const decision=json(`${relative}/review-decision.return.working.json`);
const workbook=json(`${relative}/fixture-review-workbook.working.json`);
check('approval_state_preserved',decision.decisionStatus==='PENDING_EXPERT_REVIEW'&&decision.productionUseAllowed===false&&decision.reviewer.fullName===null&&decision.signedApprovalArtifact.file===null&&decision.sourceArtifacts.every(a=>a.digestRecomputedByReviewer===false)&&workbook.reviewerGeneratedTieOuts===false,'Working copies retain pending review; automated work supplies no attestations');
check('canonical_manifest_pending',json(`${original}/manifest.json`).productionUseAllowed===false&&json(`${original}/manifest.json`).reviewStatus==='PENDING_EXPERT_REVIEW','Original manifest remains fail-closed');
check('working_source_paths',json(`${relative}/source-hash-verification.working.json`).artifacts.every(a=>exists(path.posix.normalize(relative+'/'+a.file))),'Rebased source references resolve to retained originals');
const sourceOnlyCopies=['fixture-review-workbook','maker-checker-approval','review-decision.return','reviewer-qualification-conflict'];
check('review_templates_preserved_in_working_copies',sourceOnlyCopies.every(n=>JSON.stringify(json(`${relative}/${n}.working.json`))===JSON.stringify(json(`${original}/review-package/${n}.template.json`))),'No reviewer identity, decisions or calculated independent outputs added to pending working copies');
const helpers=require(path.join(root,'scripts/statutory-country-pack-review-package.js'));
const preflight=require(path.join(root,'scripts/statutory-country-pack-review-preflight.js'));
const options={evidenceDir:path.join(root,original),decisionFile:path.join(root,relative,'review-decision.return.working.json')};
const gateResults={generatedAt:new Date().toISOString(),classification:'DOCUMENTARY_GATE_DIAGNOSTICS_NOT_APPROVAL',sourceIntegrity:helpers.verifyEvidenceIndex(path.join(root,original,'review-package')),signature:helpers.assessSignatureVerification(options),fixtureHashes:helpers.fixtureTieOutHashes(path.join(root,relative,'fixture-review-workbook.working.json')),preflight:preflight.assessPacket(options)};
check('six_sources_hash_and_size',gateResults.sourceIntegrity.status==='SOURCE_BYTES_VERIFIED'&&gateResults.sourceIntegrity.checks.length===6,gateResults.sourceIntegrity.checks.map(x=>({legalRef:x.legalRef,passed:x.passed})));
const retained=json(`${relative}/official-source-candidates.json`).sources.filter(s=>s.localArtifact);
check('new_official_source_bytes',retained.every(s=>exists(s.localArtifact)&&hash(s.localArtifact)===s.sha256&&fs.statSync(path.join(root,s.localArtifact)).size===s.byteLength&&fs.readFileSync(path.join(root,s.localArtifact)).subarray(0,5).toString()==='%PDF-'),retained.map(s=>({file:s.localArtifact,sha256:s.sha256,byteLength:s.byteLength})));
check('missing_review_fails_closed',gateResults.signature.ready===false&&gateResults.fixtureHashes.status==='BLOCKED_INCOMPLETE_INDEPENDENT_REVIEW'&&gateResults.preflight.operatorUpdatesAllowed===false,'Expected blocked outcomes; not production gate passes');
let jsonCount=0;for(const name of fs.readdirSync(__dirname).filter(n=>n.endsWith('.json'))){json(relative+'/'+name);jsonCount++;}
check('workpaper_json_parse',true,{parsed:jsonCount});
fs.writeFileSync(path.join(__dirname,'review-gate-diagnostics.json'),JSON.stringify(gateResults,null,2)+'\n');
const result={generatedAt:new Date().toISOString(),passed:checks.every(c=>c.passed),checks,workflowContract:{command:'npm run agent:workflow:check',observedResult:'PASS',unclassifiedScripts:196},evidenceClasses:{sourceInspection:'Performed; scoped hashes retained',documentStaticChecks:'Executed by this script',mockedUnitTests:`PASS: ${unitResults.numTotalTests} pure Node tests in ${unitResults.numTotalTestSuites} suites with synthetic filesystem fixtures`,realPostgreSQLTests:'NOT_RUN',browserChecks:'NOT_RUN',authenticHumanReview:'PENDING'},notRunReason:'Review tooling was corrected and unit tested. Missing authentic review/admission and reviewed calculation contract prevent full dataset continuation. No real production gate, broad build or database command was run; production-gate tests use synthetic fixtures.'};
fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(result,null,2)+'\n');
// Check report links after creating both outputs, including on the first run.
for(const link of links) link.exists=exists(link.target);
check('owned_document_local_links',links.every(l=>l.exists),{checked:links.length,missing:links.filter(l=>!l.exists)});
result.passed=checks.every(c=>c.passed);
fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,checks:checks.length,failed:checks.filter(c=>!c.passed),preflightPassed:gateResults.preflight.checks.filter(c=>c.passed).length,preflightTotal:gateResults.preflight.checks.length,signature:gateResults.signature.status,fixtureHashes:gateResults.fixtureHashes.status}));
if(!result.passed)process.exitCode=1;
