// Explicitly synthetic, owned loopback database; no migration, seed or delivery.
if(require.main===module&&process.argv[2]!=='--run') console.log('Prepared only; --run requires source freeze and owned database verification.');
else {
 const h=require('./close-pack-write-race-runtime.cjs'),{f,db,root,helper}=h,{fs,path,crypto,assert}=f;
 const load=file=>require(path.join(root,file));
 const service=load('services/accounting/close-assurance.service.ts'), replacement=load('services/accounting/close-evidence-replacement.service.ts'), collection=load('services/accounting/close-evidence-collection.ts');
 const payment=load('services/reconciliation/payment-reconciliation-dashboard.service.ts'),{getCloseReadinessSnapshot}=load('services/snapshots/close-readiness-snapshot.service.ts'),{getProofTrail}=load('services/evidence/proof-trail.service.ts');
 const pack=load('services/accounting/close-assurance-pack.service.ts');
 const stamp=crypto.randomUUID(),report={at:new Date().toISOString(),run:stamp,checks:[],scope:'Owned disposable loopback database only. Actual accounting setup, assessment, missing-evidence request/response/acceptance, snapshots and historical proof. Payment collector exception is explicit test fault injection. Receipts never claim real customer/statutory approval.'};
 const files=[...new Set([__filename,...Object.keys(require.cache).filter(file=>file.startsWith(root+path.sep)&&!file.includes(path.sep+'node_modules'+path.sep)&&!file.includes(path.sep+'.auth'+path.sep)&&/\.(ts|js|cjs|json)$/.test(file))])];
 const sources=()=>({...h.sources(),...Object.fromEntries(files.map(file=>[path.relative(root,file).replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))});
 const outside=async()=>{const base=await h.outside();const comments=await db.accountantComment.findMany({where:{organizationId:{notIn:h.organizations}},orderBy:{id:'asc'}});return{hash:f.hash({base,comments}),base,commentCount:comments.length};};
 const snapshot=x=>getCloseReadinessSnapshot({organizationId:x.organizationId,periodStart:x.period.startDate,periodEnd:x.period.endDate,now:new Date()});
 const preview=(x,findingId)=>db.$transaction(tx=>replacement.getCloseEvidenceReplacementInTx(tx,x.organizationId,findingId),{isolationLevel:'RepeatableRead'});
 const accepted=x=>({actorId:x.certifierId,actorPermissions:['accounting.close.accountant.review'],freshAuth:{actorId:x.certifierId,organizationId:x.organizationId,lastAuthAt:new Date()}});
 async function denied(work,code){let err;try{await work();}catch(e){err=e;}assert.ok(err,'Expected rejection');if(code)assert.equal(err.code,code);return{code:err.code,message:f.safe(err)};}
 async function retain(x){return{run:await db.closeRun.findUniqueOrThrow({where:{id:x.oldRunId}}),evidence:await db.closeEvidenceItem.findMany({where:{closeRunId:x.oldRunId},orderBy:{id:'asc'}}),exports:await db.closePackExport.findMany({where:{closeRunId:x.oldRunId},orderBy:{id:'asc'}})};}
 async function main(){
  report.sourceBefore=sources();report.outsideBefore=await outside();
  const x=await h.fixture('replacement');x.period=await db.accountingPeriod.findUniqueOrThrow({where:{id:x.periodId}});report.fixture=x.info;
  report.financialBefore=await h.financial();
  const actual=payment.getPaymentReconciliationDashboardData;
  try{payment.getPaymentReconciliationDashboardData=async()=>{throw new Error('Explicit owned-test payment collector unavailable');};const failed=await service.runCloseAssurance(x.organizationId,{periodId:x.periodId,correlationId:'replacement-fault-'+stamp},{actorId:x.makerId});x.oldRunId=failed.run.id;}
  finally{payment.getPaymentReconciliationDashboardData=actual;}
  const finding=await db.closeAssuranceFinding.findFirstOrThrow({where:{organizationId:x.organizationId,closeRunId:x.oldRunId,checklistItem:{key:'payment-reconciliation'}}});
  const missing=await db.closeEvidenceItem.findMany({where:{organizationId:x.organizationId,closeRunId:x.oldRunId,available:false,checklistItem:{key:'payment-reconciliation'}}});assert.equal(missing.length,1);
  const absent=await preview(x,finding.id);assert.equal(absent.status,'UNAVAILABLE');
  await pack.exportClosePack(x.organizationId,{closeRunId:x.oldRunId,mode:'DRAFT_NOT_CERTIFIED'},{actorId:x.certifierId,actorPermissions:['accounting.close.export']});
  const retainedHash=f.hash(await retain(x));
  const request=await service.requestMissingCloseEvidence(x.organizationId,{findingId:finding.id,requestedFromId:x.makerId,requestText:'Synthetic test: restore the payment collector and provide a fresh Close observation.',dueAt:new Date(Date.now()+86400000),correlationId:'replacement-request-'+stamp},{actorId:x.certifierId});
  const response=await service.respondToMissingCloseEvidence(x.organizationId,{requestId:request.id,responseText:'Synthetic test collector restored; the new assessment will supply the source observation.',correlationId:'replacement-response-'+stamp},{actorId:x.makerId});
  const input={requestId:request.id,responseId:response.id,resolutionNotes:'Synthetic local reviewer inspected actual replacement collector evidence.',correlationId:'replacement-accept-'+stamp};
  const refusal=await denied(()=>service.acceptMissingCloseEvidenceResponse(x.organizationId,input,accepted(x)),'CONFLICT');
  assert.equal((await db.closeAssuranceFinding.findUniqueOrThrow({where:{id:finding.id}})).status,'IN_REVIEW');
  report.checks.push({id:'missing-source-and-text-only-refusal',status:'passed',refusal,originalRunId:x.oldRunId,findingId:finding.id,missingIds:missing.map(row=>row.id)});
  const recovered=await service.runCloseAssurance(x.organizationId,{periodId:x.periodId,correlationId:'replacement-recovered-'+stamp},{actorId:x.makerId});
  const candidate=await preview(x,finding.id);assert.equal(candidate.status,'AVAILABLE');assert.equal(candidate.binding.replacementRunId,recovered.run.id);
  const observed=await db.closeChecklistItem.findUniqueOrThrow({where:{id:candidate.selection.checklistItemId},include:{evidenceItems:true}});
  assert.equal(observed.evidenceItems.length,0,'Actual empty payment dashboard must be retained as an empty collection');
  assert.equal(collection.verifyCloseEvidenceCollectionReceipt(observed,observed.evidenceItems,observed.metadata.collectionReceipt),true);
  const before=await snapshot(x);assert.ok(before.metrics.unavailableEvidenceCount>=missing.length);
  report.checks.push({id:'actual-successful-empty-collector-and-preview',status:'passed',replacementRunId:recovered.run.id,checklistId:observed.id,receiptHash:observed.metadata.collectionReceipt.hash,unavailableBefore:before.metrics.unavailableEvidenceCount});
  input.replacement=candidate.selection;
  await denied(()=>service.acceptMissingCloseEvidenceResponse(x.organizationId,{...input,replacement:{...input.replacement,bindingHash:'sha256:'+'0'.repeat(64)}},accepted(x)),'CONFLICT');
  await denied(()=>service.acceptMissingCloseEvidenceResponse(x.organizationId,input,{...accepted(x),actorId:x.makerId,freshAuth:{actorId:x.makerId,organizationId:x.organizationId,lastAuthAt:new Date()}}),'FORBIDDEN');
  const [first,duplicate]=await Promise.all([service.acceptMissingCloseEvidenceResponse(x.organizationId,input,accepted(x)),service.acceptMissingCloseEvidenceResponse(x.organizationId,input,accepted(x))]);
  assert.equal(first.id,duplicate.id);assert.deepEqual(first.replacement,candidate.selection);
  const records=await db.accountantComment.findMany({where:{organizationId:x.organizationId,visibility:'ACCOUNTANT_RESPONSE_ACCEPTED'}});assert.equal(records.length,1);
  assert.equal(records[0].metadata.replacementBinding.replacementRunId,recovered.run.id);
  assert.ok(records[0].createdAt>=new Date(candidate.observedAt));
  const after=await snapshot(x);assert.equal(after.metrics.unavailableEvidenceCount,before.metrics.unavailableEvidenceCount-missing.length);
  assert.equal(f.hash(await retain(x)),retainedHash);
  const oldProof=await getProofTrail({organizationId:x.organizationId,subjectType:'close.run',subjectId:x.oldRunId},db);assert.equal(oldProof.evidenceGrade,'blocked');assert.ok(oldProof.blockers.some(row=>row.id==='close-evidence-unavailable'));
  report.checks.push({id:'actual-reviewed-acceptance-duplicate-and-historical-retention',status:'passed',acceptanceId:first.id,unavailableAfter:after.metrics.unavailableEvidenceCount,retainedHash,oldProofGrade:oldProof.evidenceGrade,duplicateSameId:true});
  await denied(()=>service.acceptMissingCloseEvidenceResponse(x.organizationId,{...input,replacement:{...input.replacement,checklistItemId:'wrong-receipt'}},accepted(x)),'CONFLICT');
  const sentinel=new Error('owned test transaction rollback');let tampered;
  try{await db.$transaction(async tx=>{await tx.closeChecklistItem.update({where:{id:observed.id},data:{metadata:{collectionReceipt:{...observed.metadata.collectionReceipt,hash:'0'.repeat(64)}}}});tampered=await replacement.getVerifiedCloseEvidenceReplacementsInTx(tx,x.organizationId);assert.equal(tampered.evidenceIds.length,0);throw sentinel;});}catch(e){if(e!==sentinel)throw e;}
  assert.equal(collection.verifyCloseEvidenceCollectionReceipt(observed,observed.evidenceItems,(await db.closeChecklistItem.findUniqueOrThrow({where:{id:observed.id}})).metadata.collectionReceipt),true);
  const later=await service.runCloseAssurance(x.organizationId,{periodId:x.periodId,correlationId:'replacement-later-'+stamp},{actorId:x.makerId});
  const laterSnapshot=await snapshot(x);assert.equal(laterSnapshot.metrics.unavailableEvidenceCount,after.metrics.unavailableEvidenceCount);assert.equal(f.hash(await retain(x)),retainedHash);
  report.checks.push({id:'tamper-refusal-rollback-and-later-assessment-retention',status:'passed',laterRunId:later.run.id,tamperedBindingCount:tampered.evidenceIds.length,historicalBindingRetained:true});
 }
 async function run(){try{await main();}catch(e){report.error=f.safe(e);report.stack=f.safe(e.stack||e);}finally{try{report.sourceAfter=sources();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.outsideAfter=await outside();report.outsideUnchanged=report.outsideBefore?.hash===report.outsideAfter.hash;report.financialAfter=await h.financial();report.noOperationFinancialEffects=report.financialBefore?.hash===report.financialAfter.hash;}catch(e){report.finalizationError=f.safe(e);}report.passed=!report.error&&!report.finalizationError&&report.checks.length===4&&report.sourceStable&&report.outsideUnchanged&&report.noOperationFinancialEffects;const file=path.join(__dirname,'close-replacement-runtime-'+stamp+'.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:report.passed,error:report.error,checks:report.checks.length,sourceStable:report.sourceStable,outsideUnchanged:report.outsideUnchanged,noOperationFinancialEffects:report.noOperationFinancialEffects}));await db.$disconnect();process.exitCode=report.passed?0:1;}}
 if(require.main===module)run();
}
