// Negative evidence checks only: both child attempts fail before loading Prisma or creating a browser.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const result=path.join(__dirname,'preflight-results.json'),checks=[];
for(const flag of ['--preflight-probe','--missing-context-probe']){
 fs.writeFileSync(result,JSON.stringify({status:'PASS_SCOPED',syntheticStaleMarker:true}));
 const run=spawnSync(process.execPath,[path.join(__dirname,'browser.cjs'),flag],{cwd:process.cwd(),env:{...process.env,HRIS_CORRECTNESS_DATABASE_URL:'invalid-preflight-target'},encoding:'utf8',windowsHide:true,timeout:30000});
 assert.equal(run.status,1,run.stderr);const output=JSON.parse(fs.readFileSync(result));assert.equal(output.status,'FAILED');assert.equal(output.databaseClientCreated,false);assert.equal(output.steps.length,0);assert.equal(output.syntheticStaleMarker,undefined);assert.equal(output.failures.length,1);checks.push({flag,status:'PASS',databaseClientCreated:false,failure:output.failures[0].message});
}
fs.writeFileSync(path.join(__dirname,'preflight-checks.json'),JSON.stringify({status:'PASS',checks},null,2));console.log('PASS: 2 startup failures replaced stale evidence before database/browser creation');
