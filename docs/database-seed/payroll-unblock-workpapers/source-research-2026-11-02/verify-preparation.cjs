// Verify local research artifacts only; write one report in this owned folder.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const read=file=>JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex');
const checks=[];
function check(name,passed,details){checks.push({name,passed,details});}
const retained=read('retained-source-manifest.json');
for(const entry of retained.entries)check(`source:${entry.file}`,entry.status==='RETAINED'&&digest(entry.file)===entry.sha256&&fs.statSync(path.join(__dirname,entry.file)).size===entry.bytes,'Exact retained bytes and digest');
const recovery=read('cgi-2025-recovery-attempts.json');
for(const entry of recovery.results)check(`recovery:${entry.file}`,digest(entry.file)===entry.sha256&&fs.statSync(path.join(__dirname,entry.file)).size===entry.bytes,`Retained HTTP ${entry.httpStatus}, not a recovered statute`);
const pdf=read('pdf-inspection.json');
check('seven-parseable-pdfs',pdf.entries.length===7&&pdf.entries.every(e=>e.pageCount>0)&&pdf.entries.reduce((a,e)=>a+e.pageCount,0)===1327,'Seven PDFs, 1327 pages; parsing is not statutory interpretation');
const previous=read('existing-source-integrity-refresh.json');
check('eight-existing-source-digests',previous.sources.length===8&&previous.sources.every(e=>e.matches===true),'Existing CNPS/DGI byte checks; no reviewer attestation');
const reviewers=read('reviewer-return-inventory.json');
check('reviewer-absence-recorded-without-approval',reviewers.returns.length===4&&reviewers.returns.every(e=>!e.signedArtifactFile&&!e.signedArtifactSha256&&!e.signedAt)&&reviewers.userConfirmedAvailability.signedReviewerDecisionsAvailable===false&&reviewers.statutoryApproval===false,'Bounded repository inspection plus user-confirmed unavailable signed returns');
const gaps=read('source-gap-matrix.json');
check('all-15-rule-paths-and-11-families',gaps.gaps.length===15&&new Set(gaps.gaps.map(e=>e.parameterPath)).size===15&&gaps.requiredScenarioFamilies.length===11,'Inherited worksheet scope fully mapped');
check('no-fabricated-approval-or-effective-envelope',gaps.productionUseAllowed===false&&gaps.operatorUpdatesAllowed===false&&gaps.gaps.every(e=>e.approved2025Envelope===null&&e.approved2026Envelope===null&&e.productionUseAllowed===false),'All review-dependent values remain unset');
check('2025-recovery-still-truthful',gaps.missingConsolidated2025Code===true&&recovery.results.filter(e=>e.file.includes('CGI2025')).every(e=>e.httpStatus===404),'Two source targets returned 404; no substitution or backdating');
const report={schemaVersion:1,generatedAt:new Date().toISOString(),classification:'LOCAL_RESEARCH_EVIDENCE_VERIFICATION',passed:checks.every(e=>e.passed),checkCount:checks.length,checks,databaseConnected:false,runtimePackPublished:false,statutoryApproval:false};
fs.writeFileSync(path.join(__dirname,'preparation-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,checkCount:report.checkCount,failed:checks.filter(e=>!e.passed).map(e=>e.name)}));
process.exitCode=report.passed?0:1;
