const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..'),plan=path.resolve(__dirname,'../..');
async function main(){
 const baseline=JSON.parse(await fs.readFile(path.join(plan,'execution/P01/candidate.json'),'utf8'));
 const compiler=JSON.parse(await fs.readFile(path.join(plan,'execution/P02/compiler-inputs.json'),'utf8'));
 const inputs=new Map();for(const entry of [...baseline.files,...compiler.inputs]){if(inputs.has(entry.path)&&inputs.get(entry.path)!==entry.sha256)throw Error('Conflicting baseline '+entry.path);inputs.set(entry.path,entry.sha256)}
 const expected=['components/accounting/AccountantAccessManager.tsx','services/accounting/accountant-access.service.ts','services/accounting/accountant-access.schemas.ts','services/accounting/accountant-client-invite.service.ts','actions/accounting/__tests__/accountant-access.actions.test.ts','CLAUDE.md','docs/ecc/test-lanes.md'];
 const report={startedAt:new Date().toISOString(),passed:false,inputs:inputs.size,changed:[],missing:[],expectedOwnedChanges:expected,newOwnedSources:[]};
 const entries=[...inputs];let cursor=0;
 await Promise.all(Array.from({length:16},async()=>{while(cursor<entries.length){const [name,before]=entries[cursor++];try{const after=crypto.createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex');if(before!==after)report.changed.push({path:name,before,after,expectedOwned:expected.includes(name)})}catch(e){report.missing.push({path:name,error:e.code})}}}));
 for(const name of ['components/accounting/__tests__/AccountantAccessManager.recovery.test.tsx','services/accounting/__tests__/accountant-grant-replay.service.test.ts','services/accounting/__tests__/accountant-grant-replay.postgres.test.ts'])report.newOwnedSources.push({path:name,sha256:crypto.createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex')});
 report.changed.sort((a,b)=>a.path.localeCompare(b.path));report.passed=!report.missing.length&&report.changed.every(x=>x.expectedOwned);report.finishedAt=new Date().toISOString();await fs.writeFile(path.join(__dirname,'final-input-delta.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
