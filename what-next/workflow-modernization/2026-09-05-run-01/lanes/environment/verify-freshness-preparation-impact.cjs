const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root}=f;
const {fixture}=require('./verify-signoff-request-order.cjs');
const preparation=require(path.join(root,'services/reconciliation/reconciliation-run-preparation.service.ts'));
const certification=require(path.join(root,'services/reconciliation/payment-reconciliation-certification.service.ts'));
const files=['services/accounting/close-assurance-pack.service.ts','services/reconciliation/reconciliation-run-preparation.service.ts','services/reconciliation/payment-reconciliation-certification.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const stamp=crypto.randomUUID(),result={at:new Date().toISOString(),sourceBefore:hashes(),syntheticOnly:true};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const x=await fixture('freshness-preparation-'+stamp),scope={organizationId:x.org.id};
 const control=()=>{const now=new Date();return {...scope,actorId:x.maker.id,actorPermissions:['payments.reconciliation.read','payments.reconciliation.run','accounting.journal.read'],now,lastAuthAt:now}};
 const preview=await preparation.previewReconciliationPreparation({runId:x.run.runId},control());assert.equal(preview.canPrepare,true);
 const command={runId:x.run.runId,expectedRevision:preview.revision,reason:'Owned freshness dependency regression',idempotencyKey:crypto.randomUUID()};
 const prepared=await preparation.prepareReconciliationRun(command,control()),replay=await preparation.prepareReconciliationRun(command,control());assert.equal(prepared.replayed,false);assert.equal(replay.replayed,true);assert.equal(prepared.receiptId,replay.receiptId);
 const review=await certification.previewReconciliationSignOff({...scope,runId:x.run.runId,actorId:x.signer.id,actorPermissions:['payments.reconciliation.read','payments.reconciliation.sign']});assert.equal(review.canSign,true);
 const now=new Date();const signed=await certification.signReconciliationRun({...scope,runId:x.run.runId,signedById:x.signer.id,expectedSourceVersionHash:review.expectedSourceVersionHash,expectedEvidenceRevision:review.expectedEvidenceRevision,control:{actorPermissions:['payments.reconciliation.read','payments.reconciliation.sign'],now,lastAuthAt:now}});
 const finalReplay=await preparation.prepareReconciliationRun(command,control());assert.equal(finalReplay.currentStatus,'SIGNED');assert.equal(finalReplay.receiptId,prepared.receiptId);
 const history=await preparation.readReconciliationPreparation({kind:'history',runId:x.run.runId},control());assert.equal(history.records[0].id,prepared.receiptId);
 assert.equal(await db.ledgerAuditEvent.count({where:{...scope,action:'RECONCILIATION_RUN_PREPARE'}}),1);
 assert.equal(await db.journalEntry.count({where:scope}),0);assert.equal(await db.payment.count({where:scope}),0);
 assert.equal((await db.reconciliationRun.findUniqueOrThrow({where:{id:x.run.runId}})).certificateHash,signed.certificateHash);
 result.runtime={preparationAndReplay:true,independentSigning:true,retainedSignedHistory:true,noDuplicatePreparationOrFinancialEffects:true};result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error)}).finally(async()=>{result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='freshness-preparation-impact-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,...result}));await db.$disconnect();process.exit(result.passed?0:1)});
