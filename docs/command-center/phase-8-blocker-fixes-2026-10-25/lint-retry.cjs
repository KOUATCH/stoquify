const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {state,environment,root,redact}=require('./environment.cjs');const s=state();
const result=spawnSync(process.execPath,[path.join(root,'node_modules/eslint/bin/eslint.js'),'app','actions','components','config','hooks','lib','services','--ext','.js,.jsx,.ts,.tsx','--format','json','--output-file',path.join(__dirname,'candidate-eslint.json')],{cwd:s.candidate,env:environment(s,'test'),encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:20e6});
fs.writeFileSync(path.join(__dirname,'candidate-lint-retry.log'),redact(result.stdout)+redact(result.stderr));
const entry={name:'candidate-lint',exitCode:result.status,error:result.error?.message,timeoutMs:600000};
if(result.status===0){const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'candidate-eslint.json')));entry.files=rows.length;entry.errors=rows.reduce((n,row)=>n+row.errorCount,0);entry.warnings=rows.reduce((n,row)=>n+row.warningCount,0)}
fs.writeFileSync(path.join(__dirname,'candidate-lint-retry-result.json'),JSON.stringify(entry,null,2));
const reportPath=path.join(__dirname,'release-gates.json'),report=JSON.parse(fs.readFileSync(reportPath));report.retries=[...(report.retries||[]),entry];fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
console.log(JSON.stringify(entry));process.exitCode=result.status??1;
