const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const files=['services/reconciliation/reconciliation-additional-sources.service.ts','services/reconciliation/payment-reconciliation-run.service.ts','services/reconciliation/reconciliation-run-preparation-evidence.ts','services/reconciliation/__tests__/reconciliation-run-preparation-evidence.test.ts'];
files.push('actions/payments/reconciliation-preparation.actions.ts','actions/payments/__tests__/reconciliation-preparation.actions.test.ts','components/finance/ReconciliationPreparationWorkbench.tsx','components/finance/__tests__/ReconciliationPreparationWorkbench.test.tsx','components/finance/__tests__/ReconciliationAdditionalSourcesReview.test.tsx','services/reconciliation/reconciliation-run-preparation.service.ts','services/reconciliation/__tests__/reconciliation-run-preparation.service.test.ts','messages/en.json','messages/fr.json');
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const id=crypto.randomUUID(),output=path.join(__dirname,'evidence/additional-ui-checks-'+id+'.json');
const report={startedAt:new Date().toISOString(),sourceBefore:hashes(),steps:[]};
fs.writeFileSync(output,JSON.stringify(report),{flag:'wx'});
function save(){const value=JSON.stringify(report,null,2),fd=fs.openSync(output,'r+');try{fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value));}finally{fs.closeSync(fd);}}
const tests=['payment-reconciliation-run.service.test.ts','payment-reconciliation-certification.service.test.ts','payment-reconciliation-evidence.service.test.ts','reconciliation-run-preparation.service.test.ts','reconciliation-run-preparation-evidence.test.ts'].map(name=>'services/reconciliation/__tests__/'+name);
tests.push('actions/payments/__tests__/reconciliation-preparation.actions.test.ts','components/finance/__tests__/ReconciliationPreparationWorkbench.test.tsx','components/finance/__tests__/ReconciliationAdditionalSourcesReview.test.tsx');
for(const [name,args] of [['jest',['node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath',...tests]],['lint',['node_modules/eslint/bin/eslint.js',...files.filter(file=>!file.endsWith('.json'))]],['typecheck',['node_modules/typescript/bin/tsc','--noEmit','--pretty','false']]]){
  const step={name,args,startedAt:new Date().toISOString()};report.steps.push(step);save();
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:1200000,maxBuffer:2*1024*1024});
  Object.assign(step,{endedAt:new Date().toISOString(),status:result.status,error:result.error?.code??null,stdout:result.stdout,stderr:result.stderr});save();
  console.log(JSON.stringify({name,status:result.status,error:step.error}));
  if(result.status!==0||result.error)break;
}
report.sourceAfter=hashes();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.passed=report.steps.length===3&&report.steps.every(s=>s.status===0&&!s.error)&&report.sourceStable;report.endedAt=new Date().toISOString();save();console.log(JSON.stringify({output,passed:report.passed,sourceStable:report.sourceStable}));process.exitCode=report.passed?0:1;
