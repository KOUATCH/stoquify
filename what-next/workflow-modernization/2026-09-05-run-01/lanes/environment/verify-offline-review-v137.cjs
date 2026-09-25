const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f,{fixture,snapshot}=require('./verify-tender-access-v131.cjs');
const review=require(path.join(f.root,'services/pos/offline-review.service.ts')),stamp=crypto.randomUUID(),report={at:new Date().toISOString(),checks:[]};
async function make(){const x=await fixture('operator-review-'+crypto.randomUUID());const device=await db.pOSOfflineDevice.create({data:{organizationId:x.ctx.organizationId,locationId:x.ctx.locationId,terminalId:x.ctx.terminalId,deviceLabel:'Owned review device',deviceFingerprintHash:crypto.randomUUID()}});const conflict=await db.pOSOfflineSyncConflict.create({data:{organizationId:x.ctx.organizationId,deviceId:device.id,conflictType:'UNPOSTED_ACCEPTED_EVENT',severity:'HIGH',message:'Owned unresolved event',metadata:{originalEvidence:'retained'}}});return{x,conflict};}
async function main(){await f.helper.withClient(f.target,f.helper.assertOwned);const{x,conflict}=await make(),input={organizationId:x.ctx.organizationId,userId:x.ctx.userId,conflictId:conflict.id};
 const detail=await review.getOfflineConflictReview(input),before=await snapshot(x),request={...input,expectedRevision:detail.revision,note:'Review source records before any replay.'};
 await assert.rejects(()=>review.getOfflineConflictReview({...input,organizationId:'other-org'}));
 const saved=await review.acknowledgeOfflineConflict(request);assert.equal(saved.review.status,'ACKNOWLEDGED');assert.equal(saved.replayed,false);assert.equal(await snapshot(x),before);
 assert.equal(await db.pOSOfflineSyncConflict.count({where:{organizationId:input.organizationId,status:{in:['OPEN','ACKNOWLEDGED']}}}),1);
 assert.equal((await db.pOSOfflineSyncConflict.findUniqueOrThrow({where:{id:conflict.id}})).metadata.originalEvidence,'retained');
 report.checks.push('Scoped review persists named actor/note while financial snapshots and open-blocker count stay unchanged');
 assert.equal((await review.acknowledgeOfflineConflict(request)).replayed,true);assert.equal(await db.auditLog.count({where:{organizationId:input.organizationId,action:'POS_OFFLINE_CONFLICT_REVIEWED'}}),1);
 await assert.rejects(()=>review.acknowledgeOfflineConflict({...request,note:'Different text on stale original evidence.'}),error=>error.code==='CONFLICT');
 report.checks.push('Exact retry has one review audit; changed stale input is rejected');
 const current=await review.getOfflineConflictReview(input),results=await Promise.allSettled(['First concurrent review note.','Second concurrent review note.'].map(note=>review.acknowledgeOfflineConflict({...input,note,expectedRevision:current.revision})));
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.filter(result=>result.status==='rejected').length,1);assert.equal(await db.auditLog.count({where:{organizationId:input.organizationId,action:'POS_OFFLINE_CONFLICT_REVIEWED'}}),2);assert.equal(await snapshot(x),before);
 report.checks.push('Concurrent reviewers cannot overwrite the same reviewed revision; exactly one wins');report.passed=true;
}
module.exports={make};
if(require.main===module)main().catch(error=>{report.error=f.safe(error);process.exitCode=1}).finally(async()=>{report.source=crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,'services/pos/offline-review.service.ts'))).digest('hex');const file=path.join(__dirname,'offline-review-v137-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'})}finally{await db.$disconnect()}});
