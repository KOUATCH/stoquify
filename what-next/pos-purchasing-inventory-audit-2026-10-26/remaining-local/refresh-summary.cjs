// Evidence-only closeout: verify owned source has not moved since the manifest,
// separate unrelated concurrent work, and bind the final report/receipts.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const dir=__dirname,hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const summary=JSON.parse(fs.readFileSync(path.join(dir,'summary.json'),'utf8'));
const owned=new Set([...summary.applicationFiles.map(f=>f.file),'actions/pos/__tests__/tender.actions.test.ts','services/pos/__tests__/pos.service.test.ts','services/inventory/__tests__/remaining-local.fixture.ts','services/inventory/__tests__/remaining-local.postgres.test.ts','services/inventory/__tests__/remaining-authority.postgres.test.ts','services/inventory/__tests__/remaining-pos-browser-seed.postgres.test.ts','jest.remaining-local.config.cjs','tsconfig.remaining-local.json']);
summary.ownedSourceChanges=summary.changedSourceFiles.filter(f=>owned.has(f.file));
summary.unrelatedConcurrentChanges=summary.changedSourceFiles.filter(f=>!owned.has(f.file));
for(const f of summary.ownedSourceChanges)assert.equal(hash(f.file),f.sha256,'Owned source changed since manifest: '+f.file);
summary.isolatedApplicationSource=summary.applicationFiles.map(f=>{const isolatedHash=hash(path.join('.codex-tmp/workflow-closure-app',f.file));assert.equal(isolatedHash,f.after);return{file:f.file,sha256:isolatedHash,matchesWorkspace:true}});
summary.closeoutAt=new Date().toISOString();
summary.artifacts=fs.readdirSync(dir).filter(n=>/\.(json|log|cjs|md|png|txt|patch)$/.test(n)&&!['summary.json','final-source-manifest.json','working-tree-final.txt'].includes(n)).map(file=>({file,sha256:hash(path.join(dir,file))}));
summary.registerHash=hash(path.join(dir,'../EVIDENCE_REGISTER.md'));
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({ownedFilesVerified:summary.ownedSourceChanges.length,isolatedAppFilesMatched:summary.isolatedApplicationSource.length,unrelatedConcurrentFiles:summary.unrelatedConcurrentChanges.length,status:summary.status},null,2));
