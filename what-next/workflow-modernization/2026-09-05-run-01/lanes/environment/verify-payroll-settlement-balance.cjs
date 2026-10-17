// Real settlement writer on explicitly synthetic released-payment fixtures.
// Does not prove payment release, bank transfer or statutory readiness.
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper,root}=f;
const {recordPayrollPaymentSettlementEvidence:record}=require(path.join(root,'services/payroll/payment-reconciliation.service.ts'));
const {resolveSettlementBalance}=require(path.join(root,'services/payroll/payment-settlement-balance.ts'));
const stamp=crypto.randomUUID(),result={at:new Date().toISOString(),syntheticReleaseFixture:true,checks:[]};
const files=['services/payroll/payment-reconciliation.service.ts','services/payroll/payment-settlement-balance.ts','services/payroll/payroll-finance-forecast.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));result.sourceBefore=hashes();
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'payroll-posting-proof-83e84e0e-86f5-42a0-b264-18145720fcbe.json')));assert.ok(prior.passed);
 const scope={organizationId:prior.result.organizationId};const org=await db.organization.findUniqueOrThrow({where:{id:scope.organizationId}});assert.ok(org.name.startsWith(helper.prefix));
 const actor=await db.user.create({data:{...scope,name:'Owned settlement verifier',email:stamp+'@example.invalid'}});
 const releaser=await db.user.findFirstOrThrow({where:{...scope,id:{not:actor.id}}});
 const metadata={verificationOnly:true,componentRegisterProofHash:'synthetic',componentRegisterProofStatus:'MATCHED',payrollComponentMappingHash:'synthetic',payrollComponentMappingStatus:'BLOCKED_REQUIRES_EXPERT_REVIEW',yearToDatePolicyHash:'synthetic',yearToDateAccumulatorHashes:['synthetic'],paymentAdapterProofHash:'synthetic',paymentAdapterRegistryVersion:1,paymentProviderAdapterContractHash:'synthetic',paymentAdapterStatus:'MANUAL_PROVIDER_SETTLEMENT_REQUIRED',paymentProviderAdapterKey:'BANK_TRANSFER:MANUAL_DISBURSEMENT_FILE'};
 async function fixture(label){
  const batch=await db.payrollPaymentBatch.create({data:{...scope,payrollRunId:prior.result.payrollRunId,batchNumber:stamp+'-'+label,status:'RELEASED',method:'BANK_TRANSFER',amount:'100.00',currency:'XAF',paymentDate:new Date(),requestedById:releaser.id,releasedById:releaser.id,ledgerPostingBatchId:prior.result.ledgerPostingBatchId,postedBusinessEventId:prior.steps[3].eventId,metadata}});
  await db.paymentTransaction.create({data:{...scope,sourceType:'PAYROLL_PAYMENT',sourceId:batch.id,direction:'OUTBOUND',state:'PENDING',amount:'100.00',currencyCode:'XAF',occurredAt:new Date(),idempotencyKey:stamp+'-'+label,payloadHash:'synthetic'}});return batch;
 }
 const now=new Date();
 function input(batch,key,amount,status='partially_settled'){return{...scope,payrollPaymentBatchId:batch.id,actorId:actor.id,actorPermissions:['payroll.payments.reconcile'],lastAuthAt:now,now,settlementStatus:status,settlementAmount:amount,statementFileHash:'synthetic-statement-'+key,evidenceHash:'synthetic-input-'+key,sourceRegisterHash:'synthetic-register',idempotencyKey:key};}
 const batch=await fixture('sequential');const first=input(batch,'first','30.10');
 await record(first,db);assert.ok((await record(first,db)).idempotent);
 await assert.rejects(record({...first,settlementAmount:'31.10'},db),/different command/);
 await assert.rejects(record(input(batch,'over','70.00','settled'),db),/remaining/);
 await record(input(batch,'second','20.20'),db);
 async function balance(batch){const current=await db.payrollPaymentBatch.findUniqueOrThrow({where:{id:batch.id}});const events=await db.businessEvent.findMany({where:{...scope,sourceId:batch.id,eventType:'payroll.payment_batch.reconciled'}});return{events,value:resolveSettlementBalance(current,events),current};}
 let state=await balance(batch);assert.equal(state.value.remaining.toFixed(2),'49.70');assert.equal(state.events.length,2);
 await record(input(batch,'final',undefined,'settled'),db);state=await balance(batch);assert.equal(state.value.remaining.toFixed(2),'0.00');assert.equal(state.current.status,'SETTLED');assert.equal(state.events.length,3);result.checks.push('sequential_delta_remainder_replay_conflict_and_completion');
 const concurrent=await fixture('concurrent');const outcomes=await Promise.allSettled([record(input(concurrent,'race1','60.00'),db),record(input(concurrent,'race2','60.00'),db)]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);state=await balance(concurrent);assert.equal(state.value.remaining.toFixed(2),'40.00');assert.equal(state.events.length,1);result.checks.push('concurrent_over_settlement_rejected_without_lost_update');
 const legacy=await fixture('legacy');await db.payrollPaymentBatch.update({where:{id:legacy.id},data:{status:'PARTIALLY_SETTLED'}});await assert.rejects(record(input(legacy,'legacy','10'),db),/history cannot establish/);result.checks.push('legacy_unproven_balance_denied');
 const foreign=await db.organization.create({data:{name:helper.prefix+'Settlement foreign '+stamp,slug:'settlement-foreign-'+stamp}});await assert.rejects(record({...input(concurrent,'foreign','1'),organizationId:foreign.id},db),/not found/);result.checks.push('cross_tenant_batch_denied');
 result.passed=true;
}
main().catch(e=>{result.passed=false;result.error=f.safe(e);process.exitCode=1}).finally(async()=>{result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}await db.$disconnect();const file='payroll-settlement-balance-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));});
