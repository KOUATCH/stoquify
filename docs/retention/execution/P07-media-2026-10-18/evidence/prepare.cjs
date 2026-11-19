const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../../../..'),prior=path.resolve(__dirname,'../../P07/evidence');
const owned=['services/onboarding/master-data-csv.ts','services/onboarding/master-data-import.service.ts','components/onboarding/MasterDataOnboardingWorkbench.tsx','services/onboarding/__tests__/master-data-csv.test.ts','docs/retention/execution/STATUS.md'];
const old=JSON.parse(fs.readFileSync(path.join(prior,'BASELINE.json'),'utf8'));
const status=execFileSync('git',['status','--short','--untracked-files=no'],{cwd:root,encoding:'utf8'});
const paths=[...new Set([...Object.keys(old.files),...owned,...status.trimEnd().split(/\r?\n/).filter(Boolean).map(s=>s.slice(3))])];
if(fs.existsSync(path.join(__dirname,'BASELINE.json')))throw Error('Baseline already exists');
const files={};for(const p of paths){const f=path.join(root,p);if(fs.existsSync(f))files[p]=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');}
for(const p of owned)fs.copyFileSync(path.join(root,p),path.join(__dirname,path.basename(p)+'.before'));
fs.writeFileSync(path.join(__dirname,'BASELINE.json'),JSON.stringify({at:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),owned,files,status},null,2));
for(const name of ['database.cjs','application.cjs','fixture.cjs','browser.cjs','browser-states.cjs','run-unit.cjs','jest.unit.cjs','run-db.cjs','jest.database.cjs','cleanup-check.cjs']){
 let source=fs.readFileSync(path.join(prior,name),'utf8').replaceAll('20261017','20261018').replaceAll('retention-p07-setup','retention-p07-media');
 if(name==='database.cjs') { const start=source.indexOf("  } else if (mode === 'lifecycle'");const end=source.indexOf("  } else if (mode === 'stop')",start);source=source.slice(0,start)+source.slice(end); }
 fs.writeFileSync(path.join(__dirname,name),source,{flag:'wx'});
}
console.log('Baseline and reviewable isolated runners saved');
