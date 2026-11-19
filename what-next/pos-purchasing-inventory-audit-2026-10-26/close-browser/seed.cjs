const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const f=JSON.parse(fs.readFileSync('.codex-tmp/workflow-closure-private.json','utf8')),u=new URL(f.url);
if(process.env.NODE_ENV==='production'||u.hostname!=='localhost'||u.pathname!=='/stoquify_pos_audit_20261026_d30f')throw Error('Wrong disposable target');
if(fs.existsSync('.codex-tmp/close-browser-private.json'))throw Error('Retained browser fixture exists');
const env={...process.env,NODE_ENV:'test',DATABASE_URL:f.url,DIRECT_URL:f.url,SHADOW_DATABASE_URL:f.url,WORKFLOW_PHASE3_DATABASE:'stoquify_pos_audit_20261026_d30f',WORKFLOW_CLOSURE_EVIDENCE:__dirname};
const r=spawnSync(process.execPath,['node_modules/jest/bin/jest.js','--config','jest.cross-workflow-phase3.config.cjs','--runInBand','--no-cache','--runTestsByPath','services/inventory/__tests__/close-browser-seed.postgres.test.ts','--json','--outputFile='+path.join(__dirname,'seed-results.json')],{env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:12*1024*1024});
const clean=s=>String(s??'').replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[redacted URL]');fs.writeFileSync(path.join(__dirname,'seed.log'),clean(r.stdout)+clean(r.stderr));console.log(clean(r.stdout)+clean(r.stderr));if(r.error||r.status!==0)process.exitCode=1;
