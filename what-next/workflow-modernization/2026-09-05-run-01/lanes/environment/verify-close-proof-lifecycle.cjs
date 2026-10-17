// Isolated synthetic preconditions; real assessment/export/invalidation services.
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {getProofTrail}=require(path.join(root,'services/evidence/proof-trail.service.ts'));
const {runCloseAssurance,updateAccountantReview}=require(path.join(root,'services/accounting/close-assurance.service.ts'));
const {exportClosePack,recordCloseCertificationInvalidation}=require(path.join(root,'services/accounting/close-assurance-pack.service.ts'));
const stamp=crypto.randomUUID(),baseline=process.argv.includes('--baseline');
const files=['services/evidence/proof-trail.service.ts','services/evidence/evidence-grade.service.ts','components/evidence/proof-trail-presentation.ts','services/accounting/close-assurance.service.ts','services/accounting/close-assurance-pack.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const result={at:new Date().toISOString(),baseline,syntheticOnly:true,sourceBefore:hashes(),checks:[]};
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 if(baseline)fs.writeFileSync(path.join(__dirname,'close-proof-source-before-'+stamp+'.json'),JSON.stringify(Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')])),null,2),{flag:'wx'});
 const org=await db.organization.create({data:{name:helper.prefix+'Close proof '+stamp,slug:'close-proof-'+stamp,currency:'XAF'}}),scope={organizationId:org.id};
 const runner=await db.user.create({data:{...scope,email:'close-runner-'+stamp+'@example.invalid',isActive:true}}),reviewer=await db.user.create({data:{...scope,email:'close-reviewer-'+stamp+'@example.invalid',isActive:true}});
 const now=new Date(),startDate=new Date(now.getFullYear(),now.getMonth(),1),endDate=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59,999);
 const year=await db.fiscalYear.create({data:{...scope,name:'Owned close year',startDate,endDate}}),period=await db.accountingPeriod.create({data:{...scope,fiscalYearId:year.id,periodNumber:1,name:'Owned close proof period',startDate,endDate}});
 const scopePeriod={...scope,periodId:period.id};
 const snapshot=async()=>f.hash(await Promise.all(['closeRun','closePackExport','journalEntry','payment','businessEvent'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}}))));
 async function proof(runId,label,expected,nodeExpected){const before=await snapshot(),value=await getProofTrail({...scope,subjectType:'close.run',subjectId:runId},db);assert.equal(await snapshot(),before);const pack=value.nodes.find(n=>n.nodeType==='close.pack_export');result.checks.push({label,expected,actual:value.evidenceGrade,packGrade:pack?.evidenceGrade,packLabel:pack?.label,blockers:value.blockers.map(b=>b.id),readPreservedBusinessRecords:true});if(!baseline){assert.equal(value.evidenceGrade,expected,label);if(nodeExpected)assert.equal(pack?.evidenceGrade,nodeExpected,label);}return value;}
 // Adversarial historical rows test read truth; these are NOT genuine certifications.
 const orphan=await db.closeRun.create({data:{...scopePeriod,status:'CERTIFIED'}});
 await proof(orphan.id,'status-without-any-certified-export','blocked');
 const historical=await db.closeRun.create({data:{...scopePeriod,status:'EXPORTED'}});
 const pack=await db.closePackExport.create({data:{...scopePeriod,closeRunId:historical.id,fileType:'json',watermarkId:'owned-'+stamp,contentHash:'sha256:'+crypto.createHash('sha256').update('synthetic historical fixture').digest('hex'),rowCount:1,isCertified:true,exportedById:reviewer.id}});
 await recordCloseCertificationInvalidation(org.id,{closeRunId:historical.id,closePackExportId:pack.id,sourceModel:'InventoryValuationAnnex',sourceId:period.id,sourceEventName:'inventory.valuation.annex.checked',staleReason:'Synthetic source revision changed',previousEvidenceHash:pack.contentHash,newEvidenceHash:'sha256:'+crypto.createHash('sha256').update('changed').digest('hex')},{actorId:reviewer.id});
 await proof(historical.id,'actual-invalidation-of-retained-export','blocked','blocked');
 const unavailable=await db.closeRun.create({data:{...scopePeriod,status:'READY'}});
 await db.closeChecklistItem.create({data:{...scopePeriod,closeRunId:unavailable.id,key:'owned-unavailable',domain:'LEDGER',status:'UNAVAILABLE',severity:'HIGH',label:'Owned unavailable control',detail:'Verification only',sourceService:'owned-fixture'}});
 await proof(unavailable.id,'unavailable-high-risk-checklist','blocked');
 result.fixture={organizationId:org.id,runnerId:runner.id,reviewerId:reviewer.id,periodId:period.id,historicalRunId:historical.id,packId:pack.id};
 if(!baseline){
  const assessment=await runCloseAssurance(org.id,{periodId:period.id},{actorId:runner.id,actorPermissions:['accounting.close.run']});
  const assessed=await db.closeRun.findFirstOrThrow({where:{...scope,periodId:period.id,runById:runner.id},orderBy:{createdAt:'desc'}});
  result.assessment={runId:assessed.id,status:assessed.status,criticalBlockerCount:assessed.criticalBlockerCount,highBlockerCount:assessed.highBlockerCount,trustLevel:assessment.source.trustLevel};
  assert.equal(assessed.status,'BLOCKED');await proof(assessed.id,'actual-assessment-preserves-blockers','blocked');
  const review=await updateAccountantReview(org.id,{closeRunId:assessed.id,status:'CHANGES_REQUESTED',decisionNotes:'Synthetic verification: keep unresolved controls visible.'},{actorId:reviewer.id});
  result.review={id:review.id,status:review.status};
  const draft=await exportClosePack(org.id,{closeRunId:assessed.id,mode:'DRAFT_NOT_CERTIFIED'},{actorId:reviewer.id,actorPermissions:['accounting.close.export']});
  assert.equal(draft.isCertified,false);assert.ok(draft.content.includes('DRAFT_NOT_CERTIFIED'));
  const stored=await db.closePackExport.findUniqueOrThrow({where:{id:draft.exportId}});assert.equal(stored.contentHash,draft.contentHash);
  result.draft={exportId:draft.exportId,contentHash:draft.contentHash,isCertified:draft.isCertified,blockers:stored.metadata.certificationBlockers};
  const before=await snapshot();
  await assert.rejects(()=>exportClosePack(org.id,{closeRunId:assessed.id,mode:'CERTIFIED'},{actorId:reviewer.id,actorPermissions:['accounting.close.certify'],now,lastAuthAt:now}),error=>{result.certificationDenial=f.safe(error);return /Certified close pack is blocked/.test(error.message)});
  assert.equal(await snapshot(),before);result.deniedExportHadNoBusinessEffects=true;
  await proof(assessed.id,'draft-export-does-not-certify','blocked','operational');
  await assert.rejects(()=>getProofTrail({organizationId:'foreign-'+stamp,subjectType:'close.run',subjectId:assessed.id},db),error=>error.code==='NOT_FOUND');
  assert.equal(await db.journalEntry.count({where:scope}),0);assert.equal(await db.payment.count({where:scope}),0);
 }
 result.reproduced=result.checks.filter(c=>c.expected!==c.actual||c.label==='actual-invalidation-of-retained-export'&&c.packGrade!=='blocked').map(c=>c.label);
 if(baseline)assert.equal(result.reproduced.length,3);
 result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error)}).finally(async()=>{result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='close-proof-'+(baseline?'baseline-':'corrected-')+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,...result}));await db.$disconnect();process.exit(result.passed?0:1)});
