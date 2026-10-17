// Synthetic read-only proof checks on the ownership-guarded disposable database.
const {fs,path,crypto,assert,helper,root,db,safe}=require('./statement-recipient-fixtures.cjs');
const {getProofTrail}=require(path.join(root,'services/evidence/proof-trail.service.ts'));
const run=crypto.randomUUID(),mode=process.argv.includes('--baseline')?'baseline':'corrected';
const files=['services/evidence/proof-trail.service.ts','services/evidence/evidence-grade.service.ts','services/evidence/evidence-contracts.ts','prisma/schema.prisma'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const receipt={at:new Date().toISOString(),mode,syntheticOnly:true,sourceBefore:hashes(),checks:[]};
async function main(){
 const organizationId='workflow_proof_completeness_'+run;
 await db.organization.create({data:{id:organizationId,name:helper.prefix+'proof completeness '+run,slug:'proof-completeness-'+run,currency:'XAF'}});
 const scope={organizationId},now=new Date(),old=new Date(now.getTime()-86400000);
 const rail=await db.paymentRail.create({data:{...scope,type:'MOBILE_MONEY',code:'OWNED',name:'Synthetic proof rail'}});
 const account=await db.providerAccount.create({data:{...scope,paymentRailId:rail.id,providerCode:'OWNED',displayName:'Synthetic account',externalAccountHash:run}});
 const recon=await db.reconciliationRun.create({data:{...scope,paymentRailId:rail.id,providerAccountId:account.id,businessDate:now,periodStart:old,periodEnd:now,status:'READY_FOR_SIGNOFF'}});
 const payment=await db.paymentTransaction.create({data:{...scope,direction:'INBOUND',state:'CONFIRMED',amount:123,currencyCode:'XAF',occurredAt:now,sourceType:'PAYMENT_RECONCILIATION',sourceId:run}});
 const linkage={...scope,reconciliationRunId:recon.id,paymentTransactionId:payment.id};
 await db.paymentException.createMany({data:Array.from({length:11},(_,i)=>({...linkage,type:'OTHER',severity:'HIGH',status:i===0?'OPEN':'RESOLVED',createdAt:i===0?old:now}))});
 await db.suspenseItem.createMany({data:Array.from({length:11},(_,i)=>({...linkage,type:'OTHER',amount:1,severity:'HIGH',status:i===0?'OPEN':'RESOLVED',createdAt:i===0?old:now}))});
 const year=await db.fiscalYear.create({data:{...scope,name:'Synthetic proof year',startDate:old,endDate:now}});
 const period=await db.accountingPeriod.create({data:{...scope,fiscalYearId:year.id,periodNumber:1,name:'Synthetic proof period',startDate:old,endDate:now}});
 const close=await db.closeRun.create({data:{...scope,periodId:period.id,status:'READY'}});
 const closeScope={...scope,periodId:period.id,closeRunId:close.id};
 await db.closeChecklistItem.createMany({data:Array.from({length:21},(_,i)=>({...closeScope,key:'owned-'+i,domain:'LEDGER',status:i===20?'FAILED':'PASSED',severity:'HIGH',label:'Synthetic control '+i,detail:'Verification only',sourceService:'owned-fixture',createdAt:i===20?now:old}))});
 await db.closeAssuranceFinding.createMany({data:Array.from({length:21},(_,i)=>({...closeScope,domain:'LEDGER',status:i===0?'OPEN':'RESOLVED',severity:'HIGH',title:'Synthetic finding '+i,detail:'Verification only',sourceService:'owned-fixture',createdAt:i===0?old:now}))});
 await db.closeEvidenceItem.createMany({data:Array.from({length:21},(_,i)=>({...closeScope,evidenceType:'JOURNAL_ENTRY',sourceLabel:'Synthetic evidence '+i,available:i!==0,createdAt:i===0?old:now}))});
 async function fingerprint(){
  const rows=await Promise.all(['reconciliationRun','paymentTransaction','paymentException','suspenseItem','closeRun','closeChecklistItem','closeAssuranceFinding','closeEvidenceItem','businessEvent'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}})));
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
 }
 async function verify(subjectType,subjectId,ids){
  const before=await fingerprint(),started=performance.now();
  const result=await getProofTrail({...scope,subjectType,subjectId},db);
  const durationMs=Math.round(performance.now()-started),after=await fingerprint();assert.equal(after,before);
  const row={subjectType,grade:result.evidenceGrade,blockers:result.blockers.map(b=>({id:b.id,detail:b.detail})),nodeCount:result.nodes.length,durationMs,noBusinessMutation:before===after};
  receipt.checks.push(row);
  if(mode==='baseline'){assert.notEqual(result.evidenceGrade,'blocked');assert.equal(result.blockers.length,0);}
  else {assert.equal(result.evidenceGrade,'blocked');for(const id of ids)assert.ok(result.blockers.some(b=>b.id===id),id);}
 }
 await verify('reconciliation.run',recon.id,['reconciliation-open-exceptions','reconciliation-open-suspense']);
 await verify('payment.transaction',payment.id,['payment-transaction-open-exceptions','payment-transaction-open-suspense']);
 await verify('close.run',close.id,['close-open-findings','close-checklist-failed','close-evidence-unavailable']);
 // Resolve only synthetic fixture blockers, then isolate an older failed event.
 await db.paymentException.updateMany({where:scope,data:{status:'RESOLVED'}});
 await db.suspenseItem.updateMany({where:scope,data:{status:'RESOLVED'}});
 const clear=await getProofTrail({...scope,subjectType:'payment.transaction',subjectId:payment.id},db);
 assert.equal(clear.evidenceGrade,'operational');assert.equal(clear.blockers.length,0);receipt.resolvedPaymentClear=true;
 await db.businessEvent.createMany({data:Array.from({length:11},(_,i)=>({...scope,eventType:'owned.proof.event',idempotencyKey:run+'-'+i,payloadHash:run+'-'+i,payload:{synthetic:true},occurredAt:old,recordedAt:i===0?old:now,status:i===0?'FAILED':'APPLIED',sourceType:'PAYMENT_RECONCILIATION',sourceId:run}))});
 await verify('payment.transaction',payment.id,['business-events-outside-display']);
 await assert.rejects(getProofTrail({organizationId:'missing-'+run,subjectType:'close.run',subjectId:close.id},db),/not found/);
 receipt.crossTenantDenied=true;
 receipt.financialEffects={payments:await db.payment.count({where:scope}),journals:await db.journalEntry.count({where:scope})};
 assert.deepEqual(receipt.financialEffects,{payments:0,journals:0});
 receipt.sourceAfter=hashes();receipt.sourceStable=JSON.stringify(receipt.sourceBefore)===JSON.stringify(receipt.sourceAfter);assert.ok(receipt.sourceStable);receipt.passed=true;
}
main().catch(e=>{receipt.passed=false;receipt.error=safe(e);process.exitCode=1}).finally(async()=>{await db.$disconnect();const file='proof-completeness-'+mode+'-'+run+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:receipt.passed,error:receipt.error}));});
