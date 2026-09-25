const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f,{fixture,restrict,snapshot}=require('./verify-tender-access-v131.cjs');
const pos=require(path.join(f.root,'services/pos/pos.service.ts')),stamp=crypto.randomUUID();
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,'services/pos/pos.service.ts'))).digest('hex');
const report={at:new Date().toISOString(),sourceBefore:hash(),checks:[],scope:'Owned PostgreSQL with actual cash posting and refund. Synthetic result-lifecycle/corruption fixtures; no external payment, receipt delivery or live approval.'};
async function unchanged(x,read){const before=await snapshot(x),result=await read();assert.equal(await snapshot(x),before);return result;}
async function main(){await f.helper.withClient(f.target,f.helper.assertOwned);const x=await fixture('recovery-'+stamp);
 assert.equal((await unchanged(x,()=>pos.getPOSSaleCommitStatus(x.commit))).kind,'NOT_FOUND');report.checks.push('Missing exact result is explicit and creates no sale');
 await pos.commitPOSSale(x.commit);await restrict(x);
 const recorded=await unchanged(x,()=>pos.getPOSSaleCommitStatus(x.commit));assert.equal(recorded.kind,'RECORDED');assert.equal(recorded.currentStatus,'COMPLETED');assert.equal(recorded.total,100);report.checks.push('Own recorded sale readable under read-only grant without effects');
 for(const scope of [{userId:'another-cashier'},{organizationId:'another-tenant'},{terminalId:'another-terminal'},{salesOrderId:'another-sale'}])assert.equal((await unchanged(x,()=>pos.getPOSSaleCommitStatus({...x.commit,...scope}))).kind,'NOT_FOUND');
 await assert.rejects(()=>unchanged(x,()=>pos.getPOSSaleCommitStatus({...x.commit,tenders:[{method:'CASH',amount:200}]})));report.checks.push('Cross-scope reads reveal no result; altered original request rejected');
 await db.tenantModuleGrant.updateMany({where:{organizationId:x.ctx.organizationId,moduleSlug:'pos'},data:{readOnly:false}});await pos.refundPOSSale(x.correction);await db.tenantModuleGrant.updateMany({where:{organizationId:x.ctx.organizationId,moduleSlug:'pos'},data:{readOnly:true}});
 const refunded=await unchanged(x,()=>pos.getPOSSaleCommitStatus(x.commit));assert.equal(refunded.originalStatus,'COMPLETED');assert.equal(refunded.currentStatus,'RETURNED');report.checks.push('Current refunded status distinguished from original committed response');
 const record=await db.pOSCommitResult.findFirstOrThrow({where:{organizationId:x.ctx.organizationId}});
 const stable=await snapshot(x);await assert.rejects(()=>db.pOSCommitResult.update({where:{id:record.id},data:{status:'COMMITTED'}}),/immutable/);assert.equal(await snapshot(x),stable);report.checks.push('Database refuses modification of completed result evidence; no trigger disabled');report.passed=true;
}
main().catch(e=>{report.error=f.safe(e);process.exitCode=1}).finally(async()=>{report.sourceAfter=hash();report.sourceStable=report.sourceBefore===report.sourceAfter;const file=path.join(__dirname,'commit-recovery-v132-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'})}finally{await db.$disconnect()}});
