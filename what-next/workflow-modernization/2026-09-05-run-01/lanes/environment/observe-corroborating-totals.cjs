const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper}=f;
const input=JSON.parse(fs.readFileSync(path.join(__dirname,'signed-corroborating-source-fa154cae-c111-4ef4-91ee-070d1ee82f76.json'),'utf8'));
const report={at:new Date().toISOString(),basis:'Owned verified corroborating-source fixture, read-only observation',cases:[]};
(async()=>{await helper.withClient(f.target,helper.assertOwned);for(const row of input.cases){
 const run=await db.reconciliationRun.findFirstOrThrow({where:{id:row.runId,organizationId:row.organizationId}});
 const suspense=await db.suspenseItem.findMany({where:{organizationId:row.organizationId,reconciliationRunId:row.runId},select:{id:true,status:true,amount:true,currencyCode:true}});
 const exceptions=await db.paymentException.findMany({where:{organizationId:row.organizationId,reconciliationRunId:row.runId},select:{id:true,status:true}});
 const payments=await db.paymentTransaction.findMany({where:{organizationId:row.organizationId},select:{id:true,amount:true,currencyCode:true}});
 const matches=await db.matchRecord.findMany({where:{organizationId:row.organizationId,reconciliationRunId:row.runId},select:{id:true,amountMatched:true,currencyCode:true}});
 assert.equal(run.status,'SIGNED');assert.equal(payments.length,1);assert.equal(matches.length,1);assert.ok(suspense.every(s=>s.status==='RESOLVED'));
 report.cases.push({kind:row.kind,runId:row.runId,organizationId:row.organizationId,totals:{internal:String(run.totalInternalAmount),external:String(run.totalExternalAmount),matched:String(run.matchedAmount),suspense:String(run.suspenseAmount)},suspense,exceptions,payments,matches,certificateTotals:run.certificatePayload?.totals??null});
}report.observed=true;})().catch(e=>{report.error=f.safe(e);process.exitCode=1;}).finally(async()=>{const output=path.join(__dirname,'corroborating-total-observation-'+crypto.randomUUID()+'.json');fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({output,...report}));await db.$disconnect();process.exit(process.exitCode||0);});
