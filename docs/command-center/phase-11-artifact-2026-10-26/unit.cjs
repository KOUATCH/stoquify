// Reruns the same bounded mocked/pure suites with the clean candidate's own installed packages.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {root,state,environment}=require('./environment.cjs'),s=state(),prior=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/command-center-phase10-current.json')));
assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname,'dependency-results.json'))).passed,true);
const supplements=['docs/command-center/phase-6-integration-2026-10-24/test-setup.tsx','docs/command-center/phase-4-2026-10-24/fixtures.ts','docs/command-center/phase-2-2026-10-24/owner-browser-fixture.tsx'];
for(const file of supplements){const dest=path.join(s.candidate,file);assert.ok(!fs.existsSync(dest));fs.copyFileSync(path.join(root,file),dest)}
fs.writeFileSync(path.join(__dirname,'fixture-supplements.json'),JSON.stringify(supplements.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(s.candidate,file))).digest('hex')})),null,2));
const results=[];
for(const [name,configName] of [['command-center','acceptance'],['security','security'],['public-recovery','concurrent'],['middleware','middleware']]){
 console.log('Clean-dependency suite:',name);
 const original=fs.readFileSync(path.join(prior.work,configName+'-jest.config.cjs'),'utf8');assert.ok(original.includes(JSON.stringify(prior.candidate)));
 const config=original.replaceAll(JSON.stringify(prior.candidate),JSON.stringify(s.candidate)),configPath=path.join(s.work,name+'-jest.config.cjs');fs.writeFileSync(configPath,config);
 const env=environment();env.STOQUIFY_VERIFIED_CANDIDATE=s.candidate;env.NODE_OPTIONS+=' --require "'+path.join(__dirname,'no-shared-dependencies.cjs').replaceAll('\\','/')+'"';
 const output=path.join(__dirname,name+'-unit-results.json'),run=spawnSync(process.execPath,[path.join(s.candidate,'node_modules/jest/bin/jest.js'),'--config',configPath,'--runInBand','--no-cache','--json','--outputFile',output],{cwd:s.candidate,env,windowsHide:true,encoding:'utf8',timeout:600000,maxBuffer:30e6});
 fs.writeFileSync(path.join(__dirname,name+'-unit.log'),String(run.stdout||'')+String(run.stderr||''));
 const result=fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):null;results.push({name,exitCode:run.status,error:run.error?.message,passed:result?.numPassedTests,failed:result?.numFailedTests,skipped:result?.numPendingTests});console.log(JSON.stringify(results.at(-1)));if(run.status!==0)break;
}
const passed=results.length===4&&results.every(r=>r.exitCode===0&&r.failed===0&&r.skipped===0);fs.writeFileSync(path.join(__dirname,'unit-summary.json'),JSON.stringify({passed,results,scope:'Mocked/pure/component/framework evidence using reconstructed dependencies; no real database/browser runs'},null,2));process.exitCode=passed?0:1;
