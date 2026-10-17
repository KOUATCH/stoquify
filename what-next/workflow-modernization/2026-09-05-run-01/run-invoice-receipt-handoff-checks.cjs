const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const changed=['services/purchasing/ap-control.service.ts','services/purchasing/invoice-approval.service.ts','services/purchasing/invoice-ledger-recovery.service.ts','services/purchasing/invoice-receipt-recognition.ts','services/accounting/default-posting-rules.ts','services/purchasing/__tests__/invoice-receipt-recognition.test.ts','services/purchasing/__tests__/ap-control.service.test.ts','services/purchasing/__tests__/ap-ledger-retry.test.ts'];
const tests=[...changed.filter(f=>f.includes('/__tests__/')),'services/accounting/__tests__/default-posting-rules.service.test.ts','services/purchasing/__tests__/purchase-correction-ledger.service.test.ts','services/purchasing/__tests__/purchase-return-credit.service.test.ts','services/purchase-order/__tests__/purchase-receipt-accounting-evidence.test.ts','components/purchasing/__tests__/InvoiceApprovalWorkbench.test.tsx','components/purchasing/__tests__/InvoiceLedgerRecoveryWorkbench.test.tsx'];
const hashes=()=>Object.fromEntries([...new Set([...changed,...tests])].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),steps:[]};
const reuseFile=process.argv[2];
if(reuseFile){
 const previous=JSON.parse(fs.readFileSync(path.join(__dirname,reuseFile),'utf8'));
 assert.ok(previous.sourceStable);assert.deepEqual(previous.sourceAfter,result.sourceBefore);
 result.reusedFrom={file:reuseFile,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,reuseFile))).digest('hex')};
 for(const name of ['jest','lint']){const step=previous.steps.find(s=>s.name===name);assert.ok(step&&step.status===0&&!step.error);result.steps.push({...step,reusedFrom:reuseFile});}
}
const contextHash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'services/accounting/reports.service.ts'))).digest('hex');
result.typecheckContextBefore={reportsService:contextHash()};
for(const [name,args]of [['jest',['node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath',...tests]],['lint',['node_modules/eslint/bin/eslint.js',...changed]],['typecheck',['node_modules/typescript/bin/tsc','--noEmit','--pretty','false']]]){
 if(reuseFile&&name!=='typecheck')continue;
 const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:1200000,maxBuffer:3*1024*1024});
 result.steps.push({name,args,status:r.status,error:r.error?.code??null,stdout:r.stdout,stderr:r.stderr});console.log(JSON.stringify({name,status:r.status}));if(r.status!==0||r.error)break;
}
result.typecheckContextAfter={reportsService:contextHash()};
result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=result.sourceStable&&JSON.stringify(result.typecheckContextBefore)===JSON.stringify(result.typecheckContextAfter)&&result.steps.length===3&&result.steps.every(row=>row.status===0&&!row.error);
const file='evidence/invoice-receipt-handoff-checks-'+crypto.randomUUID()+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed}));process.exitCode=result.passed?0:1;
