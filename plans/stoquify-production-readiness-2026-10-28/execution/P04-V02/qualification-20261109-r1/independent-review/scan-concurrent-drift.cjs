// Read-only independent comparison. Drift is recorded, never silently waived.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packet=path.resolve(__dirname,'..'),root=path.resolve(packet,'../../../../..'),read=p=>JSON.parse(fs.readFileSync(path.join(packet,p))),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const context=read('candidate-context.json'),before=read('root-source-manifest.json'),candidateManifest=read('candidate-source-manifest.json'),critical=read('inventory/source-manifest.json'),supplementary=read('independent-review/SUCCESSOR-SOURCE-REVIEW.json');
const {capture}=require(path.join(root,'scripts/candidate-snapshot.cjs'));
const current=capture(root).files.map(({path,sha256})=>({path,sha256})),prior=new Map(before.files.map(f=>[f.path,f.sha256])),now=new Map(current.map(f=>[f.path,f.sha256]));
const drift={added:current.filter(f=>!prior.has(f.path)),modified:current.filter(f=>prior.has(f.path)&&prior.get(f.path)!==f.sha256).map(f=>({...f,beforeSha256:prior.get(f.path)})),removed:before.files.filter(f=>!now.has(f.path)).map(({path,sha256})=>({path,sha256}))};
const inputRows=[...critical.files.map(f=>({path:f.path,expectedSha256:f.sha256})),...supplementary.rows.filter(f=>!critical.files.some(c=>c.path===f.path)).map(f=>({path:f.path,expectedSha256:f.rootSha256}))].map(f=>({...f,currentSha256:hash(path.join(root,f.path))}));
assert(inputRows.every(f=>f.currentSha256===f.expectedSha256),'An admitted critical/supplementary input changed');
assert.deepEqual(capture(context.source).files.map(({path,sha256})=>({path,sha256})),candidateManifest.files,'Frozen candidate changed');
const result={at:new Date().toISOString(),candidateId:context.candidateId,criticalInputsUnchanged:true,inputsChecked:inputRows.length,rows:inputRows,frozenCandidateUnchanged:true,wholeCurrentCheckoutUnchanged:false,currentRootFiles:current.length,drift,verdict:'requires_manual_scope_reconciliation_before_runtime'};
fs.writeFileSync(path.join(__dirname,'CONCURRENT-DRIFT-SCAN.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({candidateId:result.candidateId,inputsChecked:result.inputsChecked,drift}));
