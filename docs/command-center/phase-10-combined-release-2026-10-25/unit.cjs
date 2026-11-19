const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {state,environment,root,redact}=require('./environment.cjs');const s=state();
// Current integration setup mocks follow-up actions. Supplement fixtures excluded by the source snapshot's docs policy.
const supplements=['docs/command-center/phase-6-integration-2026-10-24/test-setup.tsx','docs/command-center/phase-4-2026-10-24/fixtures.ts','docs/command-center/phase-2-2026-10-24/owner-browser-fixture.tsx'];
for(const file of supplements){const dest=path.join(s.candidate,file);if(!fs.existsSync(dest))fs.copyFileSync(path.join(root,file),dest)}
fs.writeFileSync(path.join(__dirname,'fixture-supplements.json'),JSON.stringify(supplements.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(s.candidate,file))).digest('hex')})),null,2));
for(const name of ['unit.log','unit-results.json']){const file=path.join(__dirname,name),initial=path.join(__dirname,'initial-'+name);if(fs.existsSync(file)&&!fs.existsSync(initial))fs.copyFileSync(file,initial)}
const original=path.join(root,'docs/command-center/phase-6-integration-2026-10-24/jest.config.cjs');
const config=fs.readFileSync(original,'utf8').replace("const root=path.resolve(__dirname,'../../..')",'const root='+JSON.stringify(s.candidate));
const configPath=path.join(s.work,'acceptance-jest.config.cjs');fs.writeFileSync(configPath,config);
const run=spawnSync(process.execPath,[path.join(root,'node_modules/jest/bin/jest.js'),'--config',configPath,'--runInBand','--no-cache','--json','--outputFile',path.join(__dirname,'unit-results.json')],{cwd:s.candidate,env:environment(s,'test'),windowsHide:true,encoding:'utf8',timeout:300000,maxBuffer:20e6});fs.writeFileSync(path.join(__dirname,'unit.log'),redact(run.stdout)+redact(run.stderr));console.log(JSON.stringify({exitCode:run.status,error:run.error?.message}));process.exitCode=run.status??1;
