const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../../..'),read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
for(const name of ['browser-1792340911022.json','browser-states-1792341446824.json','LINEAGE_AND_NO_OPENING_WRITES.json','CLEANUP.json'])if(read(name).status!=='PASS')throw Error('Unclosed evidence '+name);
for(const name of ['unit-1792340632787.results.json','database-1792341206330.results.json']){const r=read(name);if(!r.success||r.numFailedTests||r.numPendingTests||!r.numPassedTests)throw Error('Tests not complete');}
const prefix='> **18 October 2026 continuation:** The item-import/media blocker is resolved for the tested tenant-owned-media path. The complete synthetic import journey and recovery checks passed. See [current result](../P07-media-2026-10-18/RESULT.md) and [compatibility/recovery rules](../P07-media-2026-10-18/COMPATIBILITY_AND_RECOVERY.md). The original 17 October record below is retained as historical evidence; provider success and live cutover remain unproved.\n\n';
const updates=[];
for(const name of ['RESULT.md','ITEM_IMPORT_BLOCKER.md','SETUP_JOURNEY.md']){
 const relative='docs/retention/execution/P07/'+name,file=path.join(root,relative),before=fs.readFileSync(file,'utf8');
 if(before.startsWith(prefix))throw Error('Continuation link already published');
 const snapshot='P07-'+name+'.before';fs.writeFileSync(path.join(__dirname,snapshot),before,{flag:'wx'});
 fs.writeFileSync(file,prefix+before);updates.push({path:relative,before:snapshot,prefix,originalSha256:crypto.createHash('sha256').update(before).digest('hex')});
}
fs.writeFileSync(path.join(__dirname,'DOC_UPDATES.json'),JSON.stringify(updates,null,2));
const status=path.join(root,'docs/retention/execution/STATUS.md'),content=fs.readFileSync(status,'utf8');
const row='| [P07](../implementation-prompts/07_GUIDED_SETUP_FIRST_SLICE.md) | P03, P04 | Onboarding/full-stack engineer | R03/R04; M1 preparation | PASS — bounded guided readiness and tenant-owned media import | [18 October continuation](P07-media-2026-10-18/RESULT.md): 107 focused checks, 12 real PostgreSQL cases, complete authenticated customer/supplier/item imports and EN/FR recovery | Managed image references preserve tenant/media claims and independent approval. Original source/mappings retained; corrected legacy files require fresh review. Provider upload/read success and live cutover remain unproved. No opening completion claim. P08–P24 not run. |';
if(content.split(/\r?\n/).filter(l=>l.startsWith('| [P07]')).length!==1)throw Error('Expected one P07 row');
fs.writeFileSync(status,content.replace(/^\| \[P07\].*$/m,row));console.log('Published dated P07 completion links and P07-only status');
