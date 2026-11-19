// Read-only source/Git/migration comparison; writes phase-3 provenance files only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=process.cwd(),out=__dirname,base=path.dirname(out),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const prior=JSON.parse(fs.readFileSync(path.join(base,'phase2/source-manifest.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(base,'source-catalog.json'),'utf8'));
const own=['services/inventory/__tests__/cross-workflow.phase3.fixture.ts','services/inventory/__tests__/cross-workflow.phase3.postgres.test.ts','jest.cross-workflow-phase3.config.cjs','jest.cross-workflow-phase3-ui.config.cjs','tsconfig.cross-workflow-phase3.json'];
const extra=['package.json','package-lock.json','jest.setup.ts','app/globals.css','tailwind.config.ts','messages/en.json','messages/fr.json','services/pos/__tests__/pos-full-commit.postgres.test.ts','components/purchase-orders/PurchaseReceivingWorkbench.tsx','components/purchase-orders/ReceiptLedgerRecoveryDialog.tsx','components/pos/offline/LocalOfflineRecovery.tsx','components/inventory/movements/InventoryMovementHistoryTable.tsx','components/pos/__tests__/LocalOfflineRecovery.test.tsx','components/purchase-orders/__tests__/PurchaseReceivingHistoryCurrency.test.tsx','components/inventory/movements/__tests__/InventoryMovementHistoryTable.test.tsx'];
for(const file of fs.readdirSync(out))if(/\.(cjs|tsx?)$/.test(file))extra.push(path.relative(root,path.join(out,file)).replaceAll('\\','/'));
const files=[...new Set([...prior.files.map(x=>x.path),...catalog.map(x=>x.file),...own,...extra])].sort().filter(p=>fs.existsSync(path.join(root,p))).map(p=>({path:p,sha256:hash(p)}));
const drift=prior.files.filter(f=>hash(f.path)!==f.sha256).map(f=>f.path);
const target=JSON.parse(fs.readFileSync(path.join(out,'target.json'),'utf8'));
const migrations=target.migrations.map(m=>({name:m.migration_name,finished:!!m.finished_at,rolledBack:!!m.rolled_back_at,checksumMatches:m.checksum===hash('prisma/migrations/'+m.migration_name+'/migration.sql')}));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
const status=execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});fs.writeFileSync(path.join(out,'working-tree-end.txt'),status);
fs.writeFileSync(path.join(out,'final-source-manifest.json'),JSON.stringify({at:new Date().toISOString(),head,phase2OwnedDrift:drift,files,migrations},null,2));
fs.writeFileSync(path.join(out,'current-owned.diff'),execFileSync('git',['diff','--',...prior.files.map(x=>x.path)],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024}));
const summaries={};for(const name of ['pos','chain','browser','component']){const p=path.join(out,name+'-results.json');if(fs.existsSync(p)){const r=JSON.parse(fs.readFileSync(p,'utf8'));summaries[name]={passed:r.numPassedTests,failed:r.numFailedTests,skipped:r.numPendingTests,startTime:r.startTime,tests:r.testResults.flatMap(s=>s.assertionResults.map(t=>({name:t.fullName,status:t.status})))}}}
const ui=JSON.parse(fs.readFileSync(path.join(out,'ui-results.json'),'utf8'));summaries.rendered={passed:ui.filter(r=>r.status==='PASS').length,total:ui.length,violations:ui.reduce((n,r)=>n+(r.axe?.length??0),0)};
summaries.source={head,phase2OwnedDrift:drift,files:files.length,migrations:migrations.length,checksumsMatch:migrations.every(m=>m.finished&&!m.rolledBack&&m.checksumMatches)};
fs.writeFileSync(path.join(out,'verification-summary.json'),JSON.stringify(summaries,null,2));console.log(JSON.stringify({source:summaries.source,rendered:summaries.rendered,tests:Object.fromEntries(Object.entries(summaries).filter(([k])=>!['source','rendered'].includes(k)).map(([k,v])=>[k,{passed:v.passed,failed:v.failed,skipped:v.skipped}]))}));
if(drift.length||!summaries.source.checksumsMatch)process.exitCode=1;
