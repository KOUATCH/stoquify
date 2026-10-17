const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),root=path.resolve(__dirname,'../../..');
const tests=['components/evidence/__tests__/ProofTrailDrawer.test.tsx','components/cash-command/__tests__/CashCommandDashboard.test.tsx','services/evidence/__tests__/proof-trail.service.test.ts','actions/evidence/__tests__/proof-trail.actions.test.ts','actions/evidence/__tests__/proof-trail.module-boundary.test.ts'];
const changed=['components/evidence/proof-trail-presentation.ts','components/evidence/ProofTrailDrawer.tsx',tests[0]];
const files=[...new Set([...changed,...tests,'services/evidence/proof-trail.service.ts','services/evidence/evidence-grade.service.ts','services/evidence/evidence-contracts.ts','actions/evidence/proof-trail.actions.ts','components/cash-command/CashCommandDashboard.tsx'])];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),steps:[]};
for(const [name,args] of [['jest',['node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath',...tests]],['lint',['node_modules/eslint/bin/eslint.js',...changed]],['typecheck',['node_modules/typescript/bin/tsc','--noEmit','--pretty','false']]]){
 const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:1200000,maxBuffer:3*1024*1024});result.steps.push({name,args,status:r.status,error:r.error?.code??null,stdout:r.stdout,stderr:r.stderr});console.log(JSON.stringify({name,status:r.status}));if(r.status!==0||r.error)break;
}
result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=result.sourceStable&&result.steps.length===3&&result.steps.every(s=>s.status===0&&!s.error);
const file='evidence/proof-presentation-checks-'+crypto.randomUUID()+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed}));process.exitCode=result.passed?0:1;
