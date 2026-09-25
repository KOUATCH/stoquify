// Audit-only CPU probe; database retrieval, concurrency and browser rendering are excluded.
const fs=require('node:fs');
const path=require('node:path');
const {performance}=require('node:perf_hooks');
const {load,D}=require('./behavior-probes.cjs');
async function main(){
 const samples=[];
 for(const count of [1000,10000,50000]){
  const rows=Array.from({length:count},(_,i)=>({id:'line-'+i,journalEntryId:'entry-'+i,debit:D(25),credit:D(0),description:null,journalEntry:{entryNumber:'J'+i,entryDate:new Date('2026-06-15'),journal:{code:'GEN'},period:{name:'June'}},account:{code:'cash',nameEn:'Cash'}}));
  const service=load('services/accounting/reports.service.ts',{'@/prisma/db':{db:{journalEntryLine:{findMany:async()=>rows}}}});
  const durations=[];let output;
  for(let repeat=0;repeat<3;repeat++){const start=performance.now();output=await service.getGeneralLedger({organizationId:'org',accountId:'cash'});durations.push(Number((performance.now()-start).toFixed(2)));}
  samples.push({rows:count,durationsMs:durations,medianMs:[...durations].sort((a,b)=>a-b)[1],serializedBytes:Buffer.byteLength(JSON.stringify(output)),lastBalance:output.at(-1).runningBalance});
 }
 const result={recordedAt:new Date().toISOString(),node:process.version,scope:'Synthetic in-memory rows through the current getGeneralLedger service. Three samples per size; CPU and JSON payload only. No database I/O, query plan, deployment, network, browser or concurrency measurement. Other local audit processes may be running.',samples};
 fs.writeFileSync(path.join(__dirname,'evidence/read-model-benchmark.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
