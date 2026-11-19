// Local source/evidence indexing only. Does not import the app, connect to a DB, or update shared registers.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname,'../../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex');
const write = (file,value) => fs.writeFileSync(path.join(__dirname,file),JSON.stringify(value,null,2)+'\n');
const base = 'docs/database-seed/payroll-unblock-workpapers';
const generatedAt = new Date().toISOString();
const unsignedPaths = [
 `${base}/review-decision.return.working.json`,
 `${base}/maker-checker-approval.working.json`,
 'docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-decision.template.json',
 'docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/review-decision.return.template.json',
];
const returns = unsignedPaths.map(file=>{
 const value=read(file);const artifact=value.signedApprovalArtifact;
 return {file,sha256:digest(file),decisionStatus:value.decisionStatus??null,productionUseAllowed:value.productionUseAllowed??null,
 signedArtifactFile:artifact?.file??null,signedArtifactSha256:artifact?.sha256??null,signedAt:artifact?.signedAt??null,
 signatureVerificationStatus:artifact?.signatureVerification?.status??value.signatureVerification?.status??null,
 classification:'UNSIGNED_TEMPLATE_OR_WORKING_COPY_NOT_APPROVAL'};
});
write('reviewer-return-inventory.json',{
 schemaVersion:1,generatedAt,classification:'AVAILABILITY_AND_PREPARATION_NOT_REVIEW_DECISION',
 userConfirmedAvailability:{reportedBy:'User, relayed by parent task on 2026-11-02',signedReviewerDecisionsAvailable:false,independentFixturesAvailable:false,approvedCalculationContractAvailable:false,requestFurtherConfirmation:false},
 search:{roots:['docs/HR-Payroll','docs/HRIS-Payroll','docs/payroll-HRIS','docs/database-seed','docs/payroll-blockers','plans'],fileKinds:['JSON content','review/approval/signed/source filenames'],terms:['signedApprovalArtifact','APPROVED_FOR_USE','VERIFIED_SIGNATURE'],conclusion:'No genuine signed payroll review return or approved historical envelope found in the inspected source/evidence paths. Existing working/template files are unsigned. This is a bounded repository search, corroborated by user attestation; it is not a claim about external inboxes or unconnected storage.'},
 returns,statutoryApproval:false,productionUseAllowed:false,operatorUpdatesAllowed:false,
});
const priorIntegrity=read(`${base}/engineering-source-integrity.json`).sources.map(source=>{
 const actualSha256=digest(source.file);if(actualSha256!==source.sha256)throw new Error(`Retained source changed: ${source.file}`);
 return {file:source.file,sourceUrl:source.sourceUrl,sha256:source.sha256,bytes:fs.statSync(path.join(ROOT,source.file)).size,matches:true,kind:'PREVIOUSLY_RETAINED_CNPS_SOURCE',reviewerAttestation:false};
});
const oldCandidates=read(`${base}/official-source-candidates.json`);
function collectRetained(value,output=[]){
 if(!value||typeof value!=='object')return output;
 if(!Array.isArray(value)){
  const file=value.localArtifact??value.localFile??value.retainedFile??value.file;
  if(typeof file==='string'&&file.endsWith('.pdf')&&typeof value.sha256==='string'&&fs.existsSync(path.join(ROOT,file)))output.push({file,sourceUrl:value.artifactUrl??value.downloadUrl??value.pdfUrl??value.sourceUrl??null,sha256:value.sha256,bytes:fs.statSync(path.join(ROOT,file)).size,kind:'PREVIOUSLY_RETAINED_DGI_SOURCE',matches:digest(file)===value.sha256,reviewerAttestation:false});
 }
 for(const child of Object.values(value))if(child&&typeof child==='object')collectRetained(child,output);
 return output;
}
const priorDgi=collectRetained(oldCandidates);
if(priorDgi.length!==2)throw new Error('Expected two previously retained DGI source PDFs');
if(priorDgi.some(x=>!x.matches))throw new Error('Previously retained DGI source digest mismatch');
write('existing-source-integrity-refresh.json',{schemaVersion:1,generatedAt,classification:'AUTOMATED_BYTE_INTEGRITY_NOT_INDEPENDENT_REVIEW',sources:[...priorIntegrity,...priorDgi],statutoryInterpretationVerified:false});
const worksheet=read(`${base}/expanded-rule-review-worksheet.json`);
const sourceMapping={
 'payroll.cnps':['Existing CNPS decree, employer rules, FAQ and scale with verified retained bytes','Reviewer must establish 2025/2026 continuity, effective windows, sector/risk classes, branch-specific ceilings, rounding and contribution base.'],
 'payroll.irpp':['Existing CGI2026; new IRPP indicative table; 2025/2026 circulars; existing finance law2025 and new CGI2024 historical baseline','Consolidated CGI2025 remains unrecovered. Obtain it or a qualified complete amendment concordance. Approve bases, reliefs, brackets, CAC, rounding, monthly/annual YTD and correction/refund treatment.'],
 'payroll.productionAdmission':['All applicable source families plus employer profile and signed calculation contract','This is a software release decision, not a freestanding statutory citation. Reviewer must identify approved scope, excluded scenarios and dated rule/fixture dependencies.'],
 'payroll.compensation.allowances':['CGI2026 arts.30-34 as existing review locators; historical2025 evidence still incomplete','Map each allowance to tax/contribution treatment and exemption evidence; supply dated independent calculations.'],
 'payroll.compensation.benefits':['CGI2026 arts.30-34 as existing review locators; historical2025 evidence still incomplete','Approve benefit-in-kind valuation, caps/exclusions and tax/contribution treatment per employment scenario.'],
 'payroll.compensation.deductions':['Labour Code and applicable employment/collective instruments still require authoritative retained provision-level coverage','Approve deduction/recovery consent, limits, ordering, outstanding balances and non-statutory deductions; a tax table does not establish employment legality.'],
 'payroll.attendance.leave':['Existing legal register points to Labour Code arts.89-93; relevant implementing/collective rules unresolved','Retain applicable leave pay/proration/absence rules and employer agreements; establish dated scenarios.'],
 'payroll.attendance.overtime':['Existing legal register points to Labour Code art.80; overtime implementing/collective rules unresolved','Retain applicable overtime premiums, hours, night/rest-day/holiday handling, sector scope and employer terms.'],
 'payroll.composite.registerTieOut':['All component sources plus approved calculation/account mapping contract','No one tax-code article can approve this engineering reconciliation. Independent register-to-payslip-to-ledger-to-declaration/payment fixtures must bind the approved components.'],
 'payroll.declarations.default':['Existing CNPS employer rules; CGI2026 arts.81-84 locators; 2025/2026 fiscal circulars and TDL/IRPP tables','Obtain applicable authority template/schema, due dates, amendment/receipt procedure and obligation inventory including CFC/FNE/RAV/TDL/CAC. Do not invent submission acceptance or an authority API.'],
 'taxes.vat.standardRateBps':['CGI2024 baseline plus finance law2025 and circular2025 are retained; CGI2025 still missing; CGI2026 retained','Establish historical rate/base/CAC, exemptions, deductibility and actual supplier line classification for Nov/Dec2025. Qualified legal-owner publication must precede a dated registry entry.'],
 'taxes.withholding.supplierPayments':['Annual2025/2026 designation orders now retained plus corresponding CGI/finance laws','Determine employer/supplier applicability, base/rate/exemptions and payment-date effect. NOT_CONFIGURED from AP is not a legal finding that withholding is unnecessary.'],
};
const gaps=worksheet.rules.map(rule=>{
 const key=Object.keys(sourceMapping).find(k=>rule.parameterPath===k||rule.parameterPath.startsWith(k+'.'));
 return {parameterPath:rule.parameterPath,sourceCandidateIds:(rule.sourceCandidates??[]).map(s=>s.id),existingReviewDecision:rule.reviewDecision??null,
 availablePreparation:key?sourceMapping[key][0]:'Requires source mapping',remainingDecision:key?sourceMapping[key][1]:'Requires qualified scope review',
 historicalWindow:'2025-11-01 through 2025-12-31',currentWindow:'2026-01-01 through dataset observation end2026-10-28; planned Oct31 paydate requires separate actual-date decision',
 approved2025Envelope:null,approved2026Envelope:null,status:'PENDING_QUALIFIED_REVIEW',productionUseAllowed:false};
});
write('source-gap-matrix.json',{
 schemaVersion:1,generatedAt,classification:'NON_EXECUTABLE_REVIEWER_PREPARATION',gaps,
 requiredScenarioFamilies:worksheet.scenarioFamilies.map(f=>({family:f.family,parameterPaths:f.parameterPaths,requiredReviewTopics:f.requiredReviewTopics??[],requiredPurposeMatchers:f.requiredPurposeMatchers??f.purposeMatchers??[],independentExpectedResultsAvailable:false})),
 missingConsolidated2025Code:true,sourceRecoveryEvidence:'cgi-2025-recovery-attempts.json',
 historicalApFailureEvidence:{file:`${base}/historical-evidence-index.json`,count:18,months:['2025-11','2025-12'],classification:'RETAINED_PREVIOUS_OBSERVATION_NOT_CURRENT_DB_QUERY'},
 statutoryApproval:false,productionUseAllowed:false,operatorUpdatesAllowed:false,
});
const inspected=['services/purchasing/ap-control.service.ts','services/regulatory/country-packs/registry.ts','services/regulatory/country-packs/resolve.ts','services/regulatory/country-packs/validation.ts','services/regulatory/country-packs/schemas.ts','services/regulatory/country-packs/cameroon.ts','plans/stoquify-production-readiness-2026-10-28/work-register.json'];
write('source-inspection-provenance.json',{schemaVersion:1,generatedAt,classification:'SOURCE_INSPECTION_NOT_RUNTIME_PROOF',files:inspected.map(file=>({file,sha256:digest(file)})),verification:{workflowContract:'PASSED;196 package scripts outside reviewed manifest; no application commands executed',databaseTests:'NOT_RUN',unitTests:'NOT_RUN;no implementation changed',renderedEvidence:'Two retained circular cover pages rendered and visually inspected; no app/browser verification'},noSharedRegisterEdits:true,noRuntimePackPublication:true});
console.log(JSON.stringify({reviewerFiles:returns.length,priorSourcesVerified:priorIntegrity.length+priorDgi.length,gapRows:gaps.length,scenarioFamilies:worksheet.scenarioFamilies.length,statutoryApproval:false}));
