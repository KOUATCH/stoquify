const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const base=__dirname,results=[];
for(const flag of ['--preflight-probe','--missing-context-probe']){
 const result=spawnSync(process.execPath,[path.join(base,'browser.cjs'),flag],{cwd:process.cwd(),env:{...process.env,HRIS_CORRECTNESS_DATABASE_URL:'intentionally-invalid'},encoding:'utf8',timeout:30000,windowsHide:true});
 assert.equal(result.status,1);const observed=JSON.parse(fs.readFileSync(path.join(base,'preflight-results.json')));assert.equal(observed.databaseClientCreated,false);assert.equal(observed.steps.length,0);results.push({flag,status:'PASS',databaseClientCreated:false});
}
fs.writeFileSync(path.join(base,'startup-checks.json'),JSON.stringify({status:'PASS',results},null,2));console.log('Two startup denial checks passed before database initialization');
