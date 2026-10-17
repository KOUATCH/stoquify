const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {captureProviderEvent}=require(path.join(root,'services/payments/provider-event.service.ts'));
const {MobileMoneyHmacAdapter}=require(path.join(root,'services/payments/adapters/mobile-money-hmac.adapter.ts'));
const {proposeManualMatch,approveManualMatch}=require(path.join(root,'services/reconciliation/payment-reconciliation-manual-match.service.ts'));
const {getProofTrail}=require(path.join(root,'services/evidence/proof-trail.service.ts'));
const stamp=crypto.randomUUID(),baseline=process.argv.includes('--baseline'),files=['services/evidence/proof-trail.service.ts','services/evidence/evidence-grade.service.ts','services/evidence/__tests__/proof-trail.service.test.ts','services/reconciliation/manual-match-evidence.ts','services/reconciliation/payment-reconciliation-manual-match.service.ts','services/reconciliation/payment-reconciliation-certification.service.ts','services/payments/provider-event.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const result={at:new Date().toISOString(),baseline,syntheticOnly:true,sourceBefore:hashes(),stages:[]};
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 if(baseline)fs.writeFileSync(path.join(__dirname,'payment-match-proof-source-before-'+stamp+'.json'),JSON.stringify(Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')])),null,2),{flag:'wx'});
 const org=await db.organization.create({data:{name:helper.prefix+'Cash match proof '+stamp,slug:'cash-match-proof-'+stamp,currency:'XAF'}}),scope={organizationId:org.id};
 const maker=await db.user.create({data:{...scope,email:'maker-'+stamp+'@example.invalid',isActive:true}}),checker=await db.user.create({data:{...scope,email:'checker-'+stamp+'@example.invalid',isActive:true}});
 const rail=await db.paymentRail.create({data:{...scope,type:'MOBILE_MONEY',code:'OWNED-PROOF',name:'Synthetic proof rail'}}),adapter=new MobileMoneyHmacAdapter('OWNED-PROOF');
 const provider=await db.providerAccount.create({data:{...scope,paymentRailId:rail.id,providerCode:adapter.providerCode,displayName:'Owned payment proof',externalAccountHash:stamp,status:'ACTIVE',currencyCode:'XAF'}});
 const now=new Date(),payment=await db.paymentTransaction.create({data:{...scope,providerAccountId:provider.id,amount:'100.00',currencyCode:'XAF',direction:'INBOUND',state:'CONFIRMED',occurredAt:now,confirmedAt:now,sourceType:'SYNTHETIC_WORKFLOW_VERIFICATION',metadata:{synthetic:true,noLivePaymentAuthority:true}}});
 result.fixture={organizationId:org.id,paymentId:payment.id,makerId:maker.id,checkerId:checker.id};
 const businessHash=async()=>f.hash(await Promise.all(['paymentTransaction','matchRecord','providerEvent','journalEntry','payment'].map(model=>db[model].findMany({where:scope,orderBy:{id:'asc'}}))));
 async function proof(stage,expected){const before=await businessHash();const value=await getProofTrail({...scope,subjectType:'payment.transaction',subjectId:payment.id},db);assert.equal(await businessHash(),before);result.stages.push({stage,expected,actual:value.evidenceGrade,reason:value.reason??value.gradeReason,unchangedBusinessRecords:true});if(!baseline)assert.equal(value.evidenceGrade,expected,stage);return value;}
 async function proposal(amount){const reference=crypto.randomUUID(),rawBody=JSON.stringify({eventId:reference,transactionId:reference,reference,eventType:'PAYMENT_CONFIRMED',direction:'INBOUND',amount,currency:'XAF',occurredAt:now.toISOString()}),secret=crypto.randomBytes(32).toString('hex'),timestamp=String(now.getTime()),signature=crypto.createHmac('sha256',secret).update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`).digest('hex');
  const captured=await captureProviderEvent({...scope,providerAccountId:provider.id,adapter,rawBody,headers:{'x-provider-timestamp':timestamp,'x-provider-signature':signature},secret,now,receivedAt:now});assert.equal(captured.status,'CAPTURED');
  const input={...scope,providerAccountId:provider.id,paymentTransactionId:payment.id,providerEventId:captured.providerEventRecordId,proposedById:maker.id,amountMatched:amount,currencyCode:'XAF',idempotencyKey:crypto.randomUUID(),control:{actorPermissions:['payments.reconciliation.match']}};
  const made=await proposeManualMatch(input),replay=await proposeManualMatch(input);assert.equal(replay.matchId,made.matchId);return db.matchRecord.findUniqueOrThrow({where:{id:made.matchId}});
 }
 async function approve(row){const at=new Date(),input={...scope,proposedMatchId:row.id,approvedById:checker.id,expectedEvidenceRevision:row.metadata.evidenceRevision,control:{actorPermissions:['payments.reconciliation.override'],now:at,lastAuthAt:at}};
  const before=await db.matchRecord.count({where:scope});await assert.rejects(()=>approveManualMatch({...input,approvedById:maker.id}),error=>error.code==='SOD_VIOLATION');assert.equal(await db.matchRecord.count({where:scope}),before);
  const approved=await approveManualMatch(input),replay=await approveManualMatch(input);assert.equal(approved.matchId,replay.matchId);assert.equal(await db.matchRecord.count({where:scope}),before+1);return approved;
 }
 await proof('confirmed-without-match','operational');const first=await proposal('60.00');await proof('proposal-awaiting-independent-approval','operational');await approve(first);await proof('approved-partial-60-of-100','operational');
 const second=await proposal('40.00');await proof('remaining-proposal-not-yet-approved','operational');await approve(second);await proof('independently-approved-full-coverage','reconciled');
 // Adversarial retained display history is deliberately seeded, not a writer lifecycle.
 await db.matchRecord.createMany({data:Array.from({length:11},(_,i)=>({...scope,providerAccountId:provider.id,paymentTransactionId:payment.id,rule:'MANUAL',status:i%2?'REJECTED':'VOIDED',confidence:0,currencyCode:'XAF',createdAt:new Date(now.getTime()+60000+i),metadata:{syntheticDisplayHistory:true}}))});
 await proof('accepted-coverage-outside-ten-display-rows','reconciled');
 await assert.rejects(()=>getProofTrail({organizationId:'foreign-'+stamp,subjectType:'payment.transaction',subjectId:payment.id},db),error=>error.code==='NOT_FOUND');
 assert.equal(await db.journalEntry.count({where:scope}),0);assert.equal(await db.payment.count({where:scope}),0);
 if(!baseline){
  const {fixture}=require('./verify-signoff-request-order.cjs'),certification=require(path.join(root,'services/reconciliation/payment-reconciliation-certification.service.ts'));
  const x=await fixture('cash-proof-'+stamp),where={organizationId:x.org.id};
  const before=await getProofTrail({...where,subjectType:'reconciliation.run',subjectId:x.run.runId},db);assert.equal(before.evidenceGrade,'reconciled');
  const at=new Date(),command={...where,runId:x.run.runId,signedById:x.signer.id,expectedSourceVersionHash:x.review.expectedSourceVersionHash,expectedEvidenceRevision:x.review.expectedEvidenceRevision,control:{actorPermissions:['payments.reconciliation.read','payments.reconciliation.sign'],now:at,lastAuthAt:at}};
  const signature=await certification.signReconciliationRun(command),replay=await certification.signReconciliationRun(command);assert.equal(signature.certificateHash,replay.certificateHash);assert.equal(replay.replayed,true);
  const signed=await getProofTrail({...where,subjectType:'reconciliation.run',subjectId:x.run.runId},db);assert.equal(signed.evidenceGrade,'certified');
  assert.equal(await db.ledgerAuditEvent.count({where:{...where,action:'PAYMENT_RECONCILIATION_RUN_SIGN'}}),1);assert.equal(await db.businessEvent.count({where:{...where,eventType:'payment.reconciliation.signed'}}),1);assert.equal(await db.journalEntry.count({where}),0);
  result.reconciliation={organizationId:x.org.id,runId:x.run.runId,before:before.evidenceGrade,after:signed.evidenceGrade,certificateHash:signature.certificateHash,signingReplayWithoutDuplicate:true,syntheticSetupAndAuthenticationPreconditions:true};
 }
 result.passed=true;result.reproducedIncorrectStages=result.stages.filter(row=>row.actual!==row.expected).map(row=>row.stage);
 if(baseline)assert.ok(result.reproducedIncorrectStages.includes('proposal-awaiting-independent-approval'));
}
main().catch(error=>{result.passed=false;result.error=f.safe(error);process.exitCode=1;}).finally(async()=>{result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='payment-match-proof-'+(baseline?'baseline-':'corrected-')+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,...result}));await db.$disconnect();process.exit(result.passed?0:1);});
