const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const files=['services/purchase-order/purchase-order.service.ts','services/purchase-order/purchase-order-approval.ts','services/purchase-order/purchase-order-approval-contracts.ts','services/purchase-order/purchase-order-capabilities.ts','services/purchase-order/__tests__/purchase-order.service.test.ts','services/purchase-order/__tests__/purchase-order-capabilities.test.ts','actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts','actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts','hooks/useRecentPurchaseOrderQueries.ts','hooks/__tests__/useRecentPurchaseOrderQueries.boundary.test.tsx','components/purchase-orders/PurchaseOrderApprovalDialog.tsx','components/purchase-orders/__tests__/PurchaseOrderApprovalDialog.test.tsx','components/purchase-orders/ModernPurchaseOrderDetailPage.tsx','components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx','components/ui/groups/purchase-orders/__tests__/PurchaseOrderManagement.test.tsx'];
const hashes=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));
const report={at:new Date().toISOString(),sourceBefore:hashes(),commands:[]};
const testsPath=path.join(__dirname,'evidence/purchase-approval-tests-06.json');
if(fs.existsSync(testsPath))throw Error('Final test receipt already exists; use a new attempt name.');
const testFiles=JSON.parse(fs.readFileSync(path.join(__dirname,'evidence/purchase-approval-tests-03.json'),'utf8')).testResults.map(t=>path.relative(root,t.name).replaceAll('\\','/'));
for(const [name,args]of [['tests',['node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath',...testFiles,'--json','--outputFile='+path.relative(root,testsPath)]],['typecheck',['node_modules/typescript/bin/tsc','--noEmit','--pretty','false']],['lint',['node_modules/eslint/bin/eslint.js',...files]]]){
 const start=Date.now(),result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:1024*1024});
 report.commands.push({name,executable:process.execPath,args,workingDirectory:root,exit:result.status,signal:result.signal,error:result.error?.code,elapsedMs:Date.now()-start,stdout:result.stdout,stderr:result.stderr});
 console.log(JSON.stringify({name,exit:result.status,elapsedMs:Date.now()-start,stdout:result.stdout,stderr:result.stderr}));if(result.status!==0){process.exitCode=1;break}
}
report.sourceAfter=hashes();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);if(!report.sourceStable)process.exitCode=1;
const file='evidence/purchase-approval-final-checks-'+crypto.randomUUID().slice(0,12)+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({file,sourceStable:report.sourceStable}));
