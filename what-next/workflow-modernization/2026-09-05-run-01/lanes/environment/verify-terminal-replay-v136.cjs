const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f,{snapshot}=require('./verify-tender-access-v131.cjs');
const offline=require(path.join(f.root,'services/pos/offline-sync.service.ts')),pos=require(path.join(f.root,'services/pos/pos.service.ts'));
const stamp=crypto.randomUUID(),report={at:new Date().toISOString(),checks:[],scope:'Previously verified owned v135 replay fixtures; terminal evidence lookup only, with deliberate synthetic metadata corruption and real fixture void.'};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);assert.equal(process.env.NODE_ENV,'test');process.env.AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS='1';
 const event=await db.pOSOfflineEvent.findFirstOrThrow({where:{status:'REPLAYED',organization:{name:{startsWith:f.helper.prefix+'Tender legacy-review-'}}},orderBy:{createdAt:'desc'}});
 const sale=await db.salesOrder.findUniqueOrThrow({where:{id:event.metadata.offlineReplay.saleId}}),line=await db.salesOrderLine.findFirstOrThrow({where:{salesOrderId:sale.id}});
 const ctx={organizationId:event.organizationId,userId:sale.createdById,terminalId:event.terminalId,locationId:event.locationId,sessionId:event.sessionId},x={ctx,cartId:sale.id,itemId:line.itemId};
 const request={organizationId:ctx.organizationId,userId:ctx.userId,offlineEventId:event.id};
 async function state(){return JSON.stringify({financial:await snapshot(x),event:await db.pOSOfflineEvent.findUnique({where:{id:event.id}}),events:await db.businessEvent.findMany({where:{organizationId:ctx.organizationId},orderBy:{id:'asc'}})});}
 const before=await state(),verified=await offline.replayPendingOfflineSaleEnvelope(request);
 assert.equal(verified.status,'DUPLICATE_REPLAY');assert.equal(verified.saleId,sale.id);assert.equal(verified.currentSaleStatus,sale.status);assert.equal(await state(),before);
 report.checks.push('Terminal duplicate verifies exact original request, replay event and posted entry without changing financial/event history');
 await assert.rejects(()=>offline.replayPendingOfflineSaleEnvelope({...request,userId:'different-cashier'}),error=>error.code==='CONFLICT');assert.equal(await state(),before);
 report.checks.push('Different cashier cannot obtain terminal metadata as a successful replay');
 await db.pOSOfflineEvent.update({where:{id:event.id},data:{metadata:{...event.metadata,offlineReplay:{...event.metadata.offlineReplay,postingBatchId:'fabricated-batch'}}}});
 const corrupted=await state();await assert.rejects(()=>offline.replayPendingOfflineSaleEnvelope(request),error=>error.code==='CONFLICT');assert.equal(await state(),corrupted);
 await db.pOSOfflineEvent.update({where:{id:event.id},data:{metadata:event.metadata}});
 report.checks.push('Altered stored terminal metadata is rejected and not auto-repaired or rewritten');
 if(sale.status==='COMPLETED')await pos.voidPOSSale({...ctx,salesOrderId:sale.id,reason:'Owned v136 retained history verification'});
 const reversed=await state(),current=await offline.replayPendingOfflineSaleEnvelope(request);assert.equal(current.currentSaleStatus,'CANCELLED');assert.equal(current.status,'DUPLICATE_REPLAY');assert.equal(await state(),reversed);
 report.checks.push('Historical acknowledgement retained while current void status is returned without new effects');report.passed=true;
}
main().catch(error=>{report.error=f.safe(error);process.exitCode=1}).finally(async()=>{report.sources=Object.fromEntries(['services/pos/offline-sync.service.ts','services/pos/pos.service.ts'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));const file=path.join(__dirname,'terminal-replay-v136-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'})}finally{await db.$disconnect()}});
