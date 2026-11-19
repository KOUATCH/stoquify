// Target-bound tests only; no environment files are loaded into the application runtime.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=process.cwd(),fixture=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/workflow-closure-private.json'),'utf8')),url=new URL(fixture.url);
if(process.env.NODE_ENV==='production'||url.hostname!=='localhost'||url.pathname!=='/stoquify_pos_audit_20261026_d30f')throw Error('Wrong disposable target');
const mode=process.argv[2],tests={seed:'services/inventory/__tests__/workflow-closure-seed.postgres.test.ts',authoring:'services/inventory/__tests__/workflow-closure-authoring.postgres.test.ts',worker:'services/inventory/__tests__/workflow-closure-worker.postgres.test.ts',ap:'services/inventory/__tests__/workflow-closure-ap.postgres.test.ts'};
if(!tests[mode])throw Error('Unknown test mode');
const env={...process.env,NODE_ENV:'test',DATABASE_URL:fixture.url,DIRECT_URL:fixture.url,SHADOW_DATABASE_URL:fixture.url,WORKFLOW_PHASE3_DATABASE:'stoquify_pos_audit_20261026_d30f',PURCHASE_ORDER_AUTHORING_WRITES_ENABLED:'true',WORKFLOW_CLOSURE_EVIDENCE:__dirname};
const result=spawnSync(process.execPath,['node_modules/jest/bin/jest.js','--config','jest.cross-workflow-phase3.config.cjs','--runInBand','--no-cache','--runTestsByPath',tests[mode],'--json','--outputFile='+path.join(__dirname,mode+'-results.json')],{env,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:12*1024*1024});
const clean=s=>String(s??'').replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[redacted URL]');fs.writeFileSync(path.join(__dirname,mode+'.log'),clean(result.stdout)+clean(result.stderr));console.log(clean(result.stdout)+clean(result.stderr));if(result.error||result.status!==0)process.exitCode=1;
