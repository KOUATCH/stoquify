const fs=require('fs'),path=require('path'),cp=require('child_process');
const stage=process.argv[2],root=process.cwd(),dir=__dirname;
const files=JSON.parse(fs.readFileSync(path.join(dir,'verification/source-files.json'),'utf8'));
const groups={commerce:['pos','inventory','purchasing','purchase-order','payments','reconciliation','customer'],people:['hris','payroll','regulatory','compliance'],finance:['accounting','analytics','bi','finance','cash-command','order-to-cash','stock-to-cash','snapshots'],platform:['modules','security','controls','events','assurance','agents','ai','operating-access','onboarding']};
const run=(name,script,args)=>{const r=cp.spawnSync(process.execPath,[path.join(dir,'run-check.cjs'),name,script,...args],{cwd:root,encoding:'utf8',windowsHide:true,timeout:440000,maxBuffer:30e6});console.log(r.stdout);if(r.error)console.log(r.error.message);};
if(groups[stage]){
 const chosen=files.filter(p=>groups[stage].some(d=>p.startsWith('services/'+d+'/__tests__/'))&&/\.test\.(ts|tsx|js)$/.test(p)&&!/postgres|integration/.test(p));
 if(stage==='commerce')chosen.push('lib/pos/__tests__/offline-local-queue.test.ts');
 const excluded=[];const safe=chosen.filter(p=>{const t=fs.readFileSync(path.join(root,p),'utf8');if(/child_process|new PrismaClient\s*\(|execSync|spawnSync/.test(t)){excluded.push(p);return false;}return true;});
 fs.writeFileSync(path.join(dir,'verification',stage+'-test-selection.json'),JSON.stringify({chosen:safe,excluded,scope:'existing unit/service tests; PostgreSQL and integration suites excluded; real database disabled'},null,2));
 run('tests-'+stage+'-direct','node_modules/jest/bin/jest.js',['--config',path.join(dir,'jest-direct.config.cjs'),'--runInBand','--watch=false','--no-cache','--json','--outputFile',path.join(dir,'verification','tests-'+stage+'-direct.jest.json'),'--runTestsByPath',...safe]);
}else if(stage==='gates'){
 const gates=['inventory-boundary-gate','inventory-valuation-truth-gate','ledger-close-truth-gate','payment-cash-truth-gate','purchasing-ap-consolidation-gate','offline-pos-fiscal-replay-gate','payroll-presence-readiness-gate','payroll-trust-spine-readiness-gate','report-trust-export-gate','service-boundary-gate'];
 for(const g of gates)run(g,'scripts/'+g+'.js',['--mode','fail','--out',path.join(dir,'verification',g+'.md'),'--json-out',path.join(dir,'verification',g+'.json')]);
}else throw Error('Unknown stage');
