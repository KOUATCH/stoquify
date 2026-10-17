const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const existing=['services/purchasing/ap-control.service.ts','services/purchasing/invoice-preparation.service.ts','services/purchasing/invoice-correction.service.ts','services/purchasing/__tests__/ap-control.service.test.ts'];
const changed=[...existing,'services/purchasing/receipt-invoice-capacity.ts','services/purchasing/__tests__/receipt-invoice-capacity.test.ts'];
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
if(process.argv[2]==='capture'){
 const file='evidence/receipt-capacity-before-'+crypto.randomUUID()+'.json';
 fs.writeFileSync(path.join(__dirname,file),JSON.stringify(existing.map(file=>({file,sha256:hash(file),content:fs.readFileSync(path.join(root,file),'utf8')})),null,2)+'\n',{flag:'wx'});console.log(file);process.exit(0);
}
const inventory=['services/inventory/inventory-stock-event.service.ts','services/inventory/__tests__/inventory-stock-event.service.test.ts'];
const tests=[...changed.filter(f=>f.includes('/__tests__/')),...inventory.filter(f=>f.includes('/__tests__/')),'services/purchasing/__tests__/invoice-receipt-recognition.test.ts','services/purchasing/__tests__/purchase-return-credit.service.test.ts','services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts','components/purchasing/__tests__/InvoicePreparationWorkbench.test.tsx','components/purchasing/__tests__/InvoiceCorrectionWorkbench.test.tsx'];
tests.push('services/accounting/__tests__/accounting-settings.service.test.ts','services/accounting/__tests__/journal-currency-regression.service.test.ts');
const files=[...new Set([...changed,...inventory,...tests,'services/accounting/accounting-settings.service.ts','services/accounting/journals.service.ts'])];
const hashes=()=>Object.fromEntries(files.map(file=>[file,hash(file)]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),steps:[]};
for(const[name,args]of [['jest',['node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath',...tests]],['lint',['node_modules/eslint/bin/eslint.js',...changed,...inventory]],['typecheck',['node_modules/typescript/bin/tsc','--noEmit','--pretty','false']]]){
 const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:1200000,maxBuffer:3*1024*1024});result.steps.push({name,args,status:r.status,error:r.error?.code??null,stdout:r.stdout,stderr:r.stderr});console.log(JSON.stringify({name,status:r.status}));if(r.status!==0||r.error)break;
}
result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=result.sourceStable&&result.steps.length===3&&result.steps.every(s=>s.status===0&&!s.error);
const file='evidence/receipt-capacity-checks-'+crypto.randomUUID()+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed}));process.exitCode=result.passed?0:1;
