const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const files=['components/finance/PaymentReconciliationWorkbench.tsx','services/reconciliation/reconciliation-sign-notification.worker.ts','services/reconciliation/payment-reconciliation-notifications.ts','services/reconciliation/__tests__/reconciliation-sign-notification.worker.test.ts','scripts/reconciliation-sign-notification-worker.ts','scripts/__tests__/reconciliation-sign-notification-worker.test.ts','messages/en.json','messages/fr.json'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const id=crypto.randomUUID(),output=path.join(__dirname,'evidence/sign-notification-checks-'+id+'.json');
const report={startedAt:new Date().toISOString(),sourceBefore:hashes(),steps:[]};
fs.writeFileSync(output,JSON.stringify(report),{flag:'wx'});
function save(){const value=JSON.stringify(report,null,2),fd=fs.openSync(output,'r+');try{fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value));}finally{fs.closeSync(fd);}}
const tests=['components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx','services/reconciliation/__tests__/reconciliation-sign-notification.worker.test.ts','services/reconciliation/__tests__/payment-reconciliation-notifications.test.ts','services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts','services/events/__tests__/business-event-outbox.service.test.ts','scripts/__tests__/reconciliation-sign-notification-worker.test.ts'];
for(const [name,args] of [['jest',['node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath',...tests]],['lint',['node_modules/eslint/bin/eslint.js',...files.filter(file=>!file.endsWith('.json'))]],['typecheck',['node_modules/typescript/bin/tsc','--noEmit','--pretty','false']]]){
  const step={name,args,startedAt:new Date().toISOString()};report.steps.push(step);save();
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:1200000,maxBuffer:2*1024*1024});
  Object.assign(step,{endedAt:new Date().toISOString(),status:result.status,error:result.error?.code??null,stdout:result.stdout,stderr:result.stderr});save();
  console.log(JSON.stringify({name,status:result.status,error:step.error}));
  if(result.status!==0||result.error)break;
}
report.sourceAfter=hashes();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.passed=report.steps.length===3&&report.steps.every(s=>s.status===0&&!s.error)&&report.sourceStable;report.endedAt=new Date().toISOString();save();console.log(JSON.stringify({output,passed:report.passed,sourceStable:report.sourceStable}));process.exitCode=report.passed?0:1;
