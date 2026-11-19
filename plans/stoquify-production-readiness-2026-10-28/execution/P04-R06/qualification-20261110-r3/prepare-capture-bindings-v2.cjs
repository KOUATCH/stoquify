// Normalize only completed late source evidence into new capture/build inputs; no candidate/DB mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name))),write=(name,value)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
assert.equal(process.argv.length,2);
const manifestPath='inventory/CURRENT-SOURCE-MANIFEST-r2.json',manifestBytes=fs.readFileSync(path.join(__dirname,manifestPath)),manifest=JSON.parse(manifestBytes),selected=read('inventory/SELECTED-INPUTS-REFRESH-r2.json'),metadata=read('inventory/PRIVATE-METADATA-DISPOSITION-r3.json'),stage=read('dependency-staging-attempt03.json');
assert(stage.passed&&stage.physicalCopyExact&&stage.frozenDependencyTreeUnchanged);
assert(selected.all68CurrentMatch&&selected.all68CandidateMatch&&selected.files.length===68);
assert(Array.isArray(manifest.files)&&manifest.files.length>0);assert.equal(hash(JSON.stringify(manifest.files)),manifest.identitySha256);
assert.equal(metadata.metadataOnly,true);assert.equal(metadata.externalReferencedFilesRead,false);assert(Array.isArray(metadata.files)&&metadata.files.length>0);
const policy=metadata.files.map(row=>{assert.equal(manifest.files.find(file=>file.path===row.path)?.sha256,row.sha256);return{path:row.path,sha256:row.sha256};});assert.equal(new Set(policy.map(row=>row.path)).size,policy.length);
const runtimeInputs=selected.files.map(row=>({path:row.path,sha256:row.currentSha256}));assert.equal(new Set(runtimeInputs.map(row=>row.path)).size,68);assert(runtimeInputs.every(row=>/^[a-f0-9]{64}$/.test(row.sha256)));
write('inventory/capture-input.json',{manifestPath,manifestSha256:hash(manifestBytes),identitySha256:manifest.identitySha256,sourceMetadataDispositionSha256:hash(fs.readFileSync(path.join(__dirname,'inventory/PRIVATE-METADATA-DISPOSITION-r3.json')))});
write('inventory/source-after-manifest-runtime.json',{files:runtimeInputs,source:'Explicit path/currentSha256 mapping from late selected68 receipt',inputSha256:hash(fs.readFileSync(path.join(__dirname,'inventory/SELECTED-INPUTS-REFRESH-r2.json')))});
write('inventory/private-metadata-policy.json',policy);
console.log(JSON.stringify({prepared:true,sourceFiles:manifest.files.length,selectedInputs:runtimeInputs.length,privateMetadataReceipts:policy.length,candidateCaptureAdmitted:false}));
