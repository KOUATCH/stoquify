// Task-owned documentation generator. Reads literal source/retained evidence only.
// No application imports, environment loading, database, provider or network calls.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const ts = require(path.join(root, 'node_modules/typescript'));
const base = 'docs/database-seed';
const out = `${base}/payroll-unblock-workpapers`;
const dossier = 'docs/HR-Payroll/evidence/country-packs/CM/2026-07-19';
const packet = `${dossier}/review-package`;
const dataset = 'docs/engineering/database/disposable-dataset-2026-10-28';
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const exists = p => fs.existsSync(path.join(root, p));
const stamp = new Date().toISOString();
function save(p, value) {
  if (!p.startsWith(`${base}/`)) throw Error('Output outside owned documentation directory');
  fs.mkdirSync(path.dirname(path.join(root, p)), {recursive:true});
  fs.writeFileSync(path.join(root, p), typeof value === 'string' ? value : JSON.stringify(value,null,2)+'\n');
}
// A deliberately limited AST reader; never evaluate application JavaScript.
const declarations = new Map();
const sourcePaths = [
  'services/regulatory/country-packs/cameroon.constants.ts',
  'services/regulatory/country-packs/cameroon.ts',
  'services/payroll/payroll-statutory-scenario-coverage.service.ts',
];
for (const p of sourcePaths) {
  const ast = ts.createSourceFile(p, read(p), ts.ScriptTarget.Latest, true);
  for (const s of ast.statements) if(ts.isVariableStatement(s)) for(const d of s.declarationList.declarations)
    if(ts.isIdentifier(d.name) && d.initializer) declarations.set(d.name.text,d.initializer);
}
function literal(n, chain=[]) {
  if(ts.isAsExpression(n)||ts.isParenthesizedExpression(n)||ts.isSatisfiesExpression(n)) return literal(n.expression,chain);
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if(ts.isNumericLiteral(n)) return Number(n.text);
  if(n.kind===ts.SyntaxKind.TrueKeyword) return true;
  if(n.kind===ts.SyntaxKind.FalseKeyword) return false;
  if(n.kind===ts.SyntaxKind.NullKeyword) return null;
  if(ts.isIdentifier(n) && declarations.has(n.text) && !chain.includes(n.text)) return literal(declarations.get(n.text),[...chain,n.text]);
  if(ts.isArrayLiteralExpression(n)) return n.elements.flatMap(e=>ts.isSpreadElement(e)?literal(e.expression,chain):[literal(e,chain)]);
  if(ts.isObjectLiteralExpression(n)) {
    const v={};
    for(const p of n.properties) {
      if(ts.isSpreadAssignment(p)) Object.assign(v,literal(p.expression,chain));
      else if(ts.isPropertyAssignment(p)) v[p.name.text]=literal(p.initializer,chain);
      else throw Error('Unsupported object member: '+p.getText());
    }
    return v;
  }
  return {unresolvedStaticExpression:n.getText()};
}
const pack=literal(declarations.get('cameroonCountryPackUnsealed'));
const families=literal(declarations.get('FAMILY_SPECS'));
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const paths=['payroll.cnps.pensionRatesBps','payroll.cnps.familyAllowanceRatesBps','payroll.cnps.occupationalRiskRatesBps','payroll.cnps.employerRules','payroll.irpp.incomeTaxRules','payroll.productionAdmission','payroll.compensation.allowances','payroll.compensation.benefits','payroll.compensation.deductions','payroll.attendance.leave','payroll.attendance.overtime','payroll.composite.registerTieOut','payroll.declarations.default','taxes.vat.standardRateBps','taxes.withholding.supplierPayments'];
const rules=paths.map(parameterPath=>({parameterPath,envelopes:get(pack.parameters,parameterPath)??null,capability:Object.entries(pack.header.capabilityMatrix).sort((a,b)=>b[0].length-a[0].length).find(([p])=>parameterPath===p||parameterPath.startsWith(p+'.'))?.[1]??null}));
const fixtures=pack.goldenFixtures.filter(f=>paths.includes(f.parameterPath));
if(JSON.stringify({rules,fixtures,families}).includes('unresolvedStaticExpression')) throw Error('Unresolved expression in scoped payroll/AP facts');
const inspectedSourcePaths=[...sourcePaths,'services/regulatory/country-packs/schemas.ts','services/regulatory/country-packs/registry.ts','services/payroll/payroll-control.service.ts','services/payroll/payroll-tax-rule-evaluator.ts','services/payroll/payroll-production-admission.ts','services/payroll/payroll-country-pack-review-intake.service.ts','services/payroll/payroll-country-pack-review-intake-persistence.service.ts','services/payroll/payroll-country-pack-fixture-runner.ts','services/purchasing/ap-control.service.ts','prisma/disposable-business-workflows.ts','prisma/disposable-people-workflows.ts','scripts/statutory-country-pack-review-package.js','scripts/statutory-country-pack-review-preflight.js'];
save(`${out}/current-source-facts.json`,{generatedAt:stamp,classification:'STATIC_SOURCE_EXTRACTION_NOT_RUNTIME_VALIDATION',headerHashIsUnsealedPlaceholder:true,header:pack.header,rules,fixtures,families,sourceFiles:inspectedSourcePaths.map(file=>({file,sha256:sha(file)}))});
const entries=[];
function add(id,category,destination,field,currentValue,requirement,owner,action,evidence,status='PENDING',dependencies=[],scope={country:'CM',packVersion:'2025 coverage unresolved; CM-2026.1 current only'}) {
  entries.push({id,category,destination,field,currentValue,requiredType:currentValue===null?'See requirement':Array.isArray(currentValue)?'array':typeof currentValue,requirement,owner,action,evidence:Array.isArray(evidence)?evidence:[evidence],status,dependencies,scope,proposedValue:null,verification:requirement});
}
const manifest=json(`${dossier}/manifest.json`), supplement=json(`${dossier}/authoritative-source-supplement-2026-07-26.json`);
const sources=json(`${packet}/evidence-index.json`).sourceArtifacts.map(a=>{
  const file=path.posix.normalize(`${packet}/${a.file}`), metadata=[...manifest.artifacts,...supplement.artifacts].find(m=>m.legalRef===a.legalRef);
  const actualSha256=exists(file)?sha(file):null,byteLength=exists(file)?fs.statSync(path.join(root,file)).size:null;
  return {...a,file,sourceUrl:metadata?.sourceUrl??null,retrievedAt:manifest.artifacts.some(m=>m.legalRef===a.legalRef)?manifest.retrievedAt:supplement.retrievedAt,actualSha256,actualByteLength:byteLength,matches:actualSha256===a.sha256&&byteLength===a.byteLength};
});
save(`${out}/engineering-source-integrity.json`,{generatedAt:stamp,performedBy:'Codex automated byte verification',independentReviewerAttestation:false,statutoryInterpretationVerified:false,sources});
sources.forEach((s,i)=>add(`SOURCE-${String(i+1).padStart(2,'0')}`,'source integrity',`${out}/engineering-source-integrity.json`,`sources[${i}]`,s,'Retained bytes match index SHA-256 and length; source metadata is copied with original retrieval date. This is not independent reviewer attestation.','Engineering','Independent reviewer must recompute separately before attesting.',[`${packet}/evidence-index.json`,s.file],s.matches?'VERIFIED':'BLOCKED'));
// Working copies are intentionally not placed at canonical approval intake paths.
const templates=['fixture-review-workbook','maker-checker-approval','review-decision.return','reviewer-qualification-conflict','source-hash-verification'];
function leaves(v,p='') {
  if(Array.isArray(v)&&v.length) return v.flatMap((x,i)=>leaves(x,`${p}[${i}]`));
  if(v&&typeof v==='object'&&!Array.isArray(v)) return Object.entries(v).flatMap(([k,x])=>leaves(x,p?`${p}.${k}`:k));
  return [[p,v]];
}
for(const name of templates) {
  const source=`${packet}/${name}.template.json`,dest=`${out}/${name}.working.json`;
  // Preserve manual edits on rerun: only initialize missing working documents.
  if(!exists(dest)) save(dest,json(source));
  const working=json(dest);
  if(name==='source-hash-verification') {
    for(const artifact of working.artifacts) {
      const retained=sources.find(s=>s.legalRef===artifact.legalRef);
      if(retained && artifact.file===`../${path.posix.basename(retained.file)}`)
        artifact.file=path.posix.relative(out,retained.file);
    }
    save(dest,working);
  }
  for(const [field,value] of leaves(working)) {
    if(/systemScenarios|implementedValue|candidateSources|canonicalization|privacy\.(publicRepositoryFields|controlledEvidenceStoreOnly)/.test(field)) continue;
    const pending=value===null||(Array.isArray(value)&&value.length===0)|| /PENDING/.test(String(value))||/digestRecomputedByReviewer|reviewerGeneratedTieOuts|productionUseAllowed|acceptedForManifestTransition/.test(field);
    const optional=/effectiveTo$|exceptionsAndLimitations$|reviewerComments$|\.notes$|\.conditions$|excludedFixtureFamilies$|otherActualOrPotentialConflicts$/.test(field);
    const derived=/actualSha256|byteLength|\.result$/.test(field);
    const checker=name==='maker-checker-approval'||field.includes('signatureVerification');
    const owner=checker?'Authorized independent checker':name==='source-hash-verification'?'Independent evidence verifier':'Qualified Cameroon payroll reviewer';
    let requirement='Authentic reviewer-supplied value consistent with signed decision and exact artifact scope; see originating template and FIELD_MAPPING.md.';
    if(/sha256|Sha256/.test(field)) requirement='64 lowercase hexadecimal characters computed from exact retained artifact bytes; review attestation remains human-owned.';
    if(/TieOutHash/.test(field)) requirement='sha256: plus 64 lowercase hexadecimal characters from completed independentReview through fixture-hashes; not from system outputs.';
    if(/At$|signedAt$/.test(field)) requirement='Genuine ISO timestamp for the stated event; never substitute document-generation time.';
    if(/effectiveFrom$/.test(field)) requirement='Reviewer-confirmed YYYY-MM-DD bound to relied-on legal provision and intended pay dates.';
    if(/decision$/.test(field)) requirement='APPROVED, REJECTED, CHANGES_REQUIRED or MORE_EVIDENCE_REQUIRED; only authentic APPROVED family decisions permit transition.';
    if(/signatureMethod$/.test(field)) requirement='PADES_SIGNED_PDF, QUALIFIED_ELECTRONIC_SIGNATURE, ADVANCED_ELECTRONIC_SIGNATURE, ORGANIZATION_DIGITAL_CERTIFICATE, CMS_PKCS7_DETACHED, PGP_DETACHED, or HANDWRITTEN_WITH_CONTROLLED_IDENTITY_VERIFICATION; authentic artifact and independent checker required.';
    if(/effectiveTo$/.test(field)) requirement='YYYY-MM-DD or null for an approved open-ended interval; null is not automatically a missing field.';
    if(optional) requirement+=' Optional/conditional: absence alone is not a blocker, but reviewer must state applicable limitations.';
    const state=!pending?'RECORDED':optional?'OPTIONAL_OR_CONDITIONAL':derived?'PENDING_INDEPENDENT_RECOMPUTATION':'PENDING_HUMAN';
    add(`REVIEW-${name}-${field}`,'review return',dest,field,value,requirement,owner,pending?'Complete only from authentic independent return; do not infer from template.':'Retain template fact; reviewer validates scope.',[source,`${packet}/FIELD_MAPPING.md`],state);
  }
}
const reviewWorksheet={generatedAt:stamp,classification:'ENGINEERING_PREPARATION_NOT_APPROVED_COUNTRY_PACK',runtimeImportAllowed:false,rules:rules.map(r=>({...r,proposed2025Envelope:null,proposed2026Envelope:null,reviewDecision:null,sourceCandidates:pack.header.legalRefs.filter(l=>r.envelopes?.some(e=>e.legalRef===l.id))})),scenarioFamilies:families.map(f=>({...f,requiredReviewTopics:[...new Set(f.parameterPaths.flatMap(p=>(get(pack.parameters,p)||[]).flatMap(e=>e.value?.requiredReviewedCoverage||[])))],existingFixtureIds:fixtures.filter(x=>f.parameterPaths.includes(x.parameterPath)&&f.purposeMatchers.some(m=>x.purpose===m||x.purpose?.startsWith(m+'_'))).map(x=>x.id),independentExpectedResults:null,reviewer:null,reviewDate:null,legalEvidence:null,decision:null}))};
save(`${out}/expanded-rule-review-worksheet.json`,reviewWorksheet);
for(const [i,r] of reviewWorksheet.rules.entries()) {
  for(const field of ['id','title','jurisdiction','issuedBy','sourceUrl','retrievedOn','article']) {
    const existing=r.sourceCandidates.map(s=>s[field]??null);
    add(`LEGAL-${String(i+1).padStart(2,'0')}-${field}`,'legal source metadata','services/regulatory/country-packs/cameroon.ts',`header.legalRefs[referenced by ${r.parameterPath}].${field}`,existing,field==='article'?'Optional schema metadata; null here is valid. Precise statutory provisions must still be supplied in the signed reviewer decisions.':'Source-backed legal-reference metadata; existing metadata is a candidate, not renewed expert approval.','Legal evidence owner','Retain source bytes and metadata for every approved 2025/2026 rule; resolve superseded or unavailable URLs.',[`${out}/expanded-rule-review-worksheet.json`,`${out}/official-source-candidates.json`],r.parameterPath==='taxes.withholding.supplierPayments'?'CONDITIONAL':field==='article'?'OPTIONAL_OR_CONDITIONAL':existing.length&&existing.every(v=>v!==null)?'RECORDED':'PENDING_RESEARCH');
  }
}
const requiredFields={value:'Executable reviewed rule values; preserve employee/employer split, ceilings, rounding and scenario-specific treatment.',legalRef:'Nonempty ID resolving to a retained authoritative source and precise provision.',effectiveFrom:'YYYY-MM-DD, independently approved; cover actual pay/invoice date.',effectiveTo:'YYYY-MM-DD or null for approved open-ended applicability.',verifiedOn:'YYYY-MM-DD of authentic verification.',verifiedBy:'Genuine qualified verifier identity or explicitly labeled source-only author.',verificationStatus:'EXPERT_REVIEWED or REGULATOR_CONFIRMED for payroll admission; regulator evidence is required only for the stronger claim.'};
rules.forEach((r,i)=>{
  const prefix=`RULE-${String(i+1).padStart(2,'0')}`;
  const notImmediate=r.parameterPath==='taxes.withholding.supplierPayments';
  for(const [field,requirement] of Object.entries(requiredFields)) add(`${prefix}-${field}`,'rule envelope','services/regulatory/country-packs/cameroon.ts',`parameters.${r.parameterPath}[*].${field}`,r.envelopes?.map(e=>e[field]??null)??null,requirement,'Qualified reviewer / pack maintainer',notImmediate?'Assess when supplier withholding is required; not the immediate historical invoice blocker.':'Supply reviewed effective-dated envelope for each applicable 2025/2026 interval.', ['services/regulatory/country-packs/schemas.ts','services/payroll/payroll-production-admission.ts',`${out}/expanded-rule-review-worksheet.json`],notImmediate?'CONDITIONAL':field==='effectiveTo'?'OPTIONAL_OR_CONDITIONAL':'PENDING_HUMAN');
  add(`${prefix}-capability`,'rule envelope','services/regulatory/country-packs/cameroon.ts',`header.capabilityMatrix / ${r.parameterPath}`,r.capability,'SUPPORTED or SUPPORTED_CERTIFIED where payroll production admission requires it. AP has separate resolver rules.','Release owner','Publish only after review and engineering proof.', ['services/payroll/payroll-production-admission.ts','services/purchasing/ap-control.service.ts'],notImmediate?'CONDITIONAL':'BLOCKED',[]);
});
for(const [field,value] of Object.entries({status:'APPROVED',calculatorContract:'stoquify-payroll-calculator.v1',scope:'CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER',obligationCatalogueHash:null,releaseEvidenceHash:null})) {
  add(`ADMISSION-${field}`,'production admission','services/regulatory/country-packs/cameroon.ts',`parameters.payroll.productionAdmission[*].value.${field}`,null,field.endsWith('Hash')?'sha256: plus 64 lowercase hex; bind exact retained approved catalogue/release evidence.':`Required value ${value}; do not set without complete approved release evidence.`,'Legal owner / release owner','Complete after authentic review, scenario acceptance and service-level integration proof.','services/payroll/payroll-production-admission.ts','BLOCKED',['ENG-01','ENG-07']);
  entries.at(-1).proposedValue=value;
}
for(const f of reviewWorksheet.scenarioFamilies) {
  const fields={input:'Scenario-specific inputs, currency, pay date, bases, rates, caps, ordering and correction identity.',expectedOutput:'Independent expected amounts and lifecycle proofs; not copied from implementation results.',reviewStatus:'EXPERT_REVIEWED or REGULATOR_CONFIRMED with authentic review.',reviewedBy:'Qualified reviewer identity.',reviewedOn:'Actual review date YYYY-MM-DD.',legalRef:'Retained applicable legal reference.',sourceEvidenceHash:'sha256: plus actual 64 lowercase hex binding retained approved evidence.',coveredReviewTopics:'Cover every required topic without deleting or weakening coverage requirements.'};
  for(const [field,req] of Object.entries(fields)) add(`SCENARIO-${f.family}-${field}`,'scenario fixture','services/regulatory/country-packs/cameroon.ts',`goldenFixtures[family=${f.family}].calculationScenario.${['input','expectedOutput','reviewStatus'].includes(field)?'':'reviewEvidence.'}${field}`,field==='coveredReviewTopics'?f.requiredReviewTopics:null,req,'Qualified reviewer / payroll engineer','Provide independently reviewed executable fixtures for each required purpose and date window. Family selector identifies all matching purposes; see worksheet for existing fixture IDs.',['services/regulatory/country-packs/schemas.ts','services/payroll/payroll-statutory-scenario-coverage.service.ts','services/payroll/payroll-country-pack-fixture-runner.ts'],'PENDING_HUMAN');
  for(const proof of f.requiredLifecycleProofFields||[]) add(`PROOF-${f.family}-${proof}`,'lifecycle proof','services/regulatory/country-packs/cameroon.ts',`goldenFixtures[family=${f.family}].calculationScenario.expectedOutput.${proof}`,null,'Nonempty valid hash from actual corresponding service lifecycle; never invented merely to satisfy shape.','Payroll engineer','Generate and bind proof after service execution against reviewed fixtures.','services/payroll/payroll-statutory-scenario-coverage.service.ts','BLOCKED',['ENG-07']);
}
const engineering=[
 ['ENG-01','Reviewed calculation contract','Specify cumulative/annualized mode, tax year, adjusted base and prior withholding identities, same-day/off-cycle order, corrections/reversals, refunds and zero floor.','Qualified reviewer + payroll owner','Independently reviewed boundary fixtures including January reset and corrections.','services/payroll/payroll-tax-rule-evaluator.ts'],
 ['ENG-02','Bind YTD and adjustment inputs','calculatePayrollRun currently passes taxableBaseAmount, capabilityStatus and currency only. Supply authoritative prior taxable base/withholding and named adjustment values after ENG-01.','Payroll engineer','Two successive months yield independent expected totals through calculatePayrollRun, not evaluator alone.','services/payroll/payroll-control.service.ts'],
 ['ENG-03','History completeness and tax-year basis','Replace or justify missing-snapshot/zero fallbacks; define tax-year selection independently of tenant fiscal year.','Payroll engineer','Missing, stale and partial history is rejected; reviewed non-calendar fiscal-year fixture passes.','services/payroll/payroll-control.service.ts'],
 ['ENG-04','Ordering and concurrency','Current query uses strictly earlier pay dates and creation ordering; calculation uses inTransaction without explicit isolation. Design reviewed same-day/off-cycle ordering and stable concurrent history.','Payroll engineer','Real PostgreSQL concurrent contenders, retry/replay and rollback preserve one correct result.','services/payroll/payroll-control.service.ts'],
 ['ENG-05','Corrections and reversal identities','Current correction delta occurs after tax evaluation. Bind original/replacement/reversal chain without double-counting.','Payroll engineer','Multiple corrections and reversals reconcile prior withholding and downstream records.','services/payroll/payroll-control.service.ts'],
 ['ENG-06','Adjusted snapshot and refund behavior','Snapshot currentAmounts keeps the pre-adjustment taxable base; evaluator floors raw negative tax. Align authoritative stored bases and refund treatment with ENG-01.','Payroll engineer','Taxable adjustments, tax adjustments, refund/zero cases and replay agree with independent fixtures.','services/payroll/payroll-tax-rule-evaluator.ts'],
 ['ENG-07','Service-level acceptance evidence','Produce reviewed payroll-service cross-month, register, payslip, posting, declaration/payment and close-invalidation proofs.','QA + payroll engineer','Unit plus real PostgreSQL evidence with independent expected results, source hashes and scope; evaluator-only tests insufficient.','services/payroll/payroll-production-admission.ts'],
 ['ENG-08','Complete the 12-month runner','Existing seed calculates only m===10 (September 2026). Add ordered, idempotent remaining-month lifecycle operations only after prerequisites.','Dataset engineer','All intended organization/month workflows have evidence and replay creates no duplicates.','prisma/disposable-business-workflows.ts'],
 ['ENG-09','Resolve October attendance cutoff','Pay date is October 31 but retained observations stop October 28; current helper returns CURRENT_PERIOD_PENDING. Decide close/completion versus explicitly pending October.','Dataset owner','No fabricated certification for unobserved days; approved scope and dates recorded.','prisma/disposable-people-workflows.ts'],
 ['ENG-10','Reconcile review-tool contract discrepancies','Reconciled family decisions and reviewed manifest states; preflight invokes shared signature/checker validation. Added approval-binding/date and incomplete-workbook regression checks.','Review tooling maintainer','Fresh isolated unit results bound to current source hashes; real reviewer authentication and production admission remain separate.','scripts/statutory-country-pack-review-preflight.js'],
];
for(const [id,title,detail,owner,test,evidence] of engineering) add(id,'engineering',evidence,title,detail,test,owner,detail,evidence,id==='ENG-01'||id==='ENG-09'?'PENDING_HUMAN':'PENDING_ENGINEERING',id==='ENG-01'||id==='ENG-09'||id==='ENG-10'?[]:['ENG-01']);
const engineeringEvidence = `${out}/engineering-results.json`;
if(exists(engineeringEvidence)) {
  const result=json(engineeringEvidence), entry=entries.find(e=>e.id==='ENG-10');
  entry.evidence.push(engineeringEvidence);
  const current=result.status==='COMPLETED_ENGINEERING' && result.after.passed && [...result.sourceFiles,...result.testArtifacts].every(s=>exists(s.file)&&sha(s.file)===s.sha256);
  entry.status=current?'COMPLETED_ENGINEERING':'PENDING_ENGINEERING';
  entry.action=current?'Completed; preserve authentic review/admission gates. Re-run the isolated suite after tool changes.':'Re-run and retain unit evidence against current tool sources.';
}
entries.find(e=>e.id==='ENG-07').dependencies=['ENG-01','ENG-02','ENG-03','ENG-04','ENG-05','ENG-06'];
entries.find(e=>e.id==='ENG-08').dependencies=['ENG-01','ENG-07','ENG-09'];
const operations=[
 ['OPS-01','Publish approved packs','Validate signed return, independent checker/signature, preflight 12/12, persisted legal-owner intake and reviewed runtime authority transition.','Release owner'],
 ['OPS-02','Resolve inputs and periods','Create/reuse 36 periods, resolve applicable compensation/lifecycle inputs, certify attendance and freeze current snapshots.','HR/payroll operator'],
 ['OPS-03','Calculate and approve','Calculate in reviewed chronological order, reconcile register/employer charges; independent actor approves each run.','Payroll preparer and independent approver'],
 ['OPS-04','Payslips and posting','Emit retained payslips and balanced accounting entries with evidence binding.','Payroll/accounting operator'],
 ['OPS-05','Synthetic payments and declarations','Prepare/release synthetic payments and declarations through ordinary controls; reconcile retained evidence.','Independent payment/declaration operators'],
 ['OPS-06','Close tie-out and replay','Verify payroll/register/ledger/payment/declaration totals, corrections and downstream close invalidation; replay idempotently.','QA/accounting owner'],
 ['OPS-07','Historical AP invoices','Re-preview the 18 documented November/December invoices after approved date-effective VAT publication; approve through normal workflow.','AP independent approver'],
];
for(const [id,title,action,owner] of operations) add(id,'dataset operation','prisma/disposable-business-workflows.ts',title,null,'Fresh guarded service/PostgreSQL evidence on the explicit disposable target; historical report does not certify current state.',owner,action,[`${dataset}/history-results.json`,'services/payroll/payroll-production-admission.ts'], 'BLOCKED',id==='OPS-07'?['RULE-14-effectiveFrom']:id==='OPS-01'?['INTAKE-01','ENG-07']:['OPS-01','ENG-07','ENG-08']);
// One row per month per organization, with actual seed pay-date derivation.
const organizations=['synth12_douala','synth12_yaounde','synth12_bafoussam'];
const dateCoverage=[];
for(let m=0;m<12;m++) {
  const start=new Date(Date.UTC(2025,10+m,1)).toISOString().slice(0,10),payDate=new Date(Date.UTC(2025,11+m,0)).toISOString().slice(0,10);
  for(const organizationId of organizations) dateCoverage.push({organizationId,month:start.slice(0,7),periodStart:start,payDate,payDateSource:'prisma/disposable-business-workflows.ts: month-end date(m) loop',currentPackHeaderCoversDate:payDate>=pack.header.effectiveFrom,payrollRulesAdmitted:false,attendanceScope:m===11?'PARTIAL_THROUGH_2026-10-28_CURRENT_PERIOD_PENDING':'RAW_OBSERVATIONS_REPORTED_NOT_CERTIFIED',requiredAction:m<2?'Reviewed 2025 pack/envelopes plus full admission':m===11?'Resolve October cutoff then certify inputs; all admission requirements still apply':'Reviewed rules plus full admission and certified inputs'});
}
save(`${out}/pay-date-coverage.json`,{generatedAt:stamp,dateBasis:'Existing seed intent; not approved payroll schedule or executed periods',target:json(`${dataset}/manifest.json`).target,rows:dateCoverage});
add('DATES-01','dataset scope',`${out}/pay-date-coverage.json`,'rows',dateCoverage,'36 organization/month rows; dates derived from current seed; 2025 gaps and partial October explicit.','Dataset owner','Confirm October treatment; use this coverage matrix when reviewing pack windows.','prisma/disposable-business-workflows.ts','RECORDED');
add('INTAKE-01','legal-owner approval','services/payroll/payroll-country-pack-review-intake-persistence.service.ts','approvePayrollCountryPackReviewIntakeCertificate',null,'Persist authentic legal-owner approval bound to exact proposed pack, review certificate and evidence hashes through protected action.','Authorized legal owner','Authenticate real return, build valid intake certificate, persist approval; publication is a separate step.','services/payroll/payroll-country-pack-review-intake-persistence.service.ts','PENDING_HUMAN',['ENG-07']);
add('SOURCE-2025','legal source research',`${out}/official-source-candidates.json`,'CGI2025',null,'Obtain official 2025 tax code and applicable amendments/provisions covering VAT and payroll dates.','Legal evidence owner','Existing source URL returned 404; recover official publication, retain bytes and verify applicability.','services/regulatory/country-packs/cameroon.ts','PENDING_RESEARCH');
for(const candidate of json(`${out}/official-source-candidates.json`).sources.filter(s=>s.localArtifact)) {
  add(`RETAINED-${candidate.id}`,'source integrity',`${out}/official-source-candidates.json`,`sources[id=${candidate.id}]`,candidate,'Official-source download has PDF header and exact recorded SHA-256/length; source content and legal applicability still need independent review.','Legal evidence owner',candidate.requiredNextAction,[`${out}/official-source-candidates.json`,candidate.localArtifact],sha(candidate.localArtifact)===candidate.sha256?'VERIFIED':'BLOCKED');
}
// Traverse local Markdown links in the two document sets, recording unresolved references.
const references=[];
const docFiles=[`${base}/README.md`,`${base}/PAYROLL-UNBLOCK.md`,...fs.readdirSync(path.join(root,dossier)).filter(x=>x.endsWith('.md')).map(x=>`${dossier}/${x}`),...fs.readdirSync(path.join(root,packet)).filter(x=>x.endsWith('.md')).map(x=>`${packet}/${x}`),...fs.readdirSync(path.join(root,dataset)).filter(x=>x.endsWith('.md')).map(x=>`${dataset}/${x}`)];
for(const file of docFiles) for(const match of read(file).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
  const link=match[1]; if(/^(https?:|#)/.test(link))continue;
  const resolved=path.posix.normalize(`${path.posix.dirname(file)}/${link.split('#')[0]}`);
  references.push({from:file,link,resolved,status:exists(resolved)?'FOUND':'MISSING'});
}
const expectedReturns=['review-decision.json','review-package/fixture-review-workbook.json','review-package/source-hash-verification.json','review-package/reviewer-qualification-conflict.json','review-package/maker-checker-approval.json'];
for(const name of expectedReturns) references.push({from:`${packet}/README.md`,link:name,resolved:`${dossier}/${name}`,status:exists(`${dossier}/${name}`)?'FOUND':'MISSING_AUTHENTIC_RETURN'});
save(`${out}/reference-audit.json`,{generatedAt:stamp,scope:'Local Markdown links in both dataset document sets and CNPS review dossier; expected authentic returns. Named source symbols and artifact paths also retained in register/source facts.',references,graphEvidence:{status:'UNUSABLE',reason:'Graph files present but one-byte placeholders; current source used, no regeneration.'}});
const artifactNames=['manifest.json','verification.json','replay-result.json','additional-scenarios.json','history-results.json','result-summary.json','seed-results.json','remaining-people-results.json','remaining-people-assessment.json','table-inventory.json','negative-probes.json','browser-evidence.json','typecheck.json','hr-structure-notes.md','bank-scenario-notes.md'];
const historical=[];
for(const name of artifactNames) {
  const file=`${dataset}/${name}`; if(!exists(file))continue;
  const data=name.endsWith('.json')?json(file):null;
  historical.push({file,sha256:sha(file),generatedAt:data?.generatedAt??data?.createdAt??null,classification:'RETAINED_HISTORICAL_EVIDENCE_NOT_RERUN',topLevelKeys:data?Object.keys(data):[]});
}
const history=json(`${dataset}/history-results.json`);
const apIssues=(history.issues||[]).filter(i=>i.scenario==='invoice-country-prerequisite');
save(`${out}/historical-evidence-index.json`,{generatedAt:stamp,artifacts:historical,apCountrySetupIssues:apIssues,apIssueCount:apIssues.length,warning:'Counts reflect retained history output, not a fresh database query; later scenario evidence exists and may supersede base coverage counts.'});
for(const e of entries) {
  if(e.category==='legal source metadata') e.requiredType='string (article optional)';
  else if(e.category==='engineering'||e.category==='dataset operation') e.requiredType='work item with retained acceptance evidence';
  else if(e.category==='scenario fixture') e.requiredType=/\.(input|expectedOutput)$/.test(e.field)?'JSON object':e.field.endsWith('coveredReviewTopics')?'array of nonempty strings':'string';
  else if(e.category==='lifecycle proof'||e.category==='production admission') e.requiredType='nonempty string; required literal or SHA-256 format in requirement';
  else if(e.category==='rule envelope') e.requiredType=e.field.endsWith('.value')?'reviewed rule payload (object or scalar according to parameter contract)':e.field.endsWith('.effectiveTo')?'YYYY-MM-DD string or null':'nonempty string';
  else if(e.requiredType==='See requirement') {
    if(/(At|On|effectiveFrom)$/.test(e.field)) e.requiredType='ISO date/timestamp string (actual event)';
    else if(e.field.endsWith('effectiveTo')) e.requiredType='YYYY-MM-DD string or null';
    else if(/byteLength$/.test(e.field)) e.requiredType='nonnegative integer';
    else if(/^(checks|independence|scopeAccepted)\.|differentNaturalPersonFromReviewer$|performedIndependently$|redactionApplied$/.test(e.field)&& !/Declaration$|Conflicts$/.test(e.field)) e.requiredType='reviewer/checker boolean determination';
    else e.requiredType='reviewer-supplied text or structured evidence per originating template; no executable field schema assumed';
  }
}
const counts={}; for(const e of entries)counts[e.status]=(counts[e.status]||0)+1;
const register={schemaVersion:1,generatedAt:stamp,scope:{target:json(`${dataset}/manifest.json`).target,dateStart:'2025-11-01',dateEnd:'2026-10-31',observationEnd:'2026-10-28',sourceRevision:'80e4abb283216b9f8e04b94e5020393f7dcabf62',workingTree:'Pre-existing unrelated changes; source hashes capture inspected local content'},statusDefinitions:{VERIFIED:'Technical byte-integrity check passed; not statutory approval',RECORDED:'Existing fact or scope recorded; not an unblocking approval',PENDING_HUMAN:'Authentic reviewer/owner input needed',PENDING_INDEPENDENT_RECOMPUTATION:'Independent verifier must calculate and attest; engineering hashes separately available',PENDING_ENGINEERING:'Implementation or engineering proof remains',PENDING_RESEARCH:'Missing authoritative evidence',BLOCKED:'Dependent gate or workflow not satisfied',OPTIONAL_OR_CONDITIONAL:'Null/absence is not itself a mandatory blocker',CONDITIONAL:'Not the immediate blocker; applicability must be assessed'},counts,entries};
register.statusDefinitions.COMPLETED_ENGINEERING='Scoped engineering change verified by retained unit evidence and current source hashes; not statutory or production approval';
save(`${base}/payroll-unblock-register.json`,register);
const esc=v=>String(v??'null').replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
let md='# Payroll unblock register\n\nGenerated: '+stamp+'\n\nEvidence inventory and scoped engineering status. Runtime payroll and production remain blocked. **RECORDED** means a fact is documented, not that its associated gate passed. **VERIFIED** refers only to retained source bytes. **COMPLETED_ENGINEERING** means scoped unit evidence matches current source hashes; it is not statutory approval. Optional/conditional rows are not counted as mandatory missing inputs.\n\n';
md+='[Machine-readable register](payroll-unblock-register.json) · [Completion packet](PAYROLL-UNBLOCK-COMPLETION-PACKET.md) · [Date coverage](payroll-unblock-workpapers/pay-date-coverage.json) · [Source facts](payroll-unblock-workpapers/current-source-facts.json) · [Reference audit](payroll-unblock-workpapers/reference-audit.json)\n\n';
md+='## Counts\n\n| Status | Entries |\n|---|---:|\n'+Object.entries(counts).map(([k,v])=>`| ${k} | ${v} |`).join('\n')+'\n\nField rows include repeated requirements for distinct families/artifacts. They are not unique human questions or a legal-obligation count.\n';
for(const category of [...new Set(entries.map(e=>e.category))]) {
  md+=`\n## ${category}\n\n| ID | Destination / field | Status | Owner / action | Evidence / acceptance |\n|---|---|---|---|---|\n`;
  for(const e of entries.filter(x=>x.category===category))md+=`| ${esc(e.id)} | ${esc(e.destination)} :: ${esc(e.field)} | ${e.status} | ${esc(e.owner)} — ${esc(e.action)} | ${esc(e.evidence.join('; '))} — ${esc(e.requirement)} |\n`;
}
save(`${base}/PAYROLL-UNBLOCK-REGISTER.md`,md);
console.log(JSON.stringify({entries:entries.length,counts,sourceHashes:sources.map(s=>({legalRef:s.legalRef,matches:s.matches})),rules:rules.map(r=>({path:r.parameterPath,envelopes:r.envelopes?.length??0,capability:r.capability})),fixtures:fixtures.length,referenceCount:references.length,apIssues:apIssues.length}));
