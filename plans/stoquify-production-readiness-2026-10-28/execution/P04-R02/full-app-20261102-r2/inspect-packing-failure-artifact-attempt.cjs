// Hash-only inspection of the rejected isolated artifact; never serve or render assets.
const fs=require('node:fs'),path=require('node:path');
const c=JSON.parse(fs.readFileSync(path.join(__dirname,'candidate-context.json')));
const {filesUnder}=require(path.join(c.source,'scripts/release-artifact.cjs'));
const files=filesUnder(c.artifact), hashes=new Map(c.assetAnnex.map(a=>[a.sha256,a]));
const matches=files.filter(f=>hashes.has(f.sha256)).map(f=>({path:f.path,sha256:f.sha256,source:hashes.get(f.sha256).source,expectedDestination:'runtime/.private/uploads/'+hashes.get(f.sha256).source.slice('public/uploads/'.length)}));
const report={at:new Date().toISOString(),candidateId:c.candidateId,artifact:c.artifact,artifactFiles:files.length,matches,unexpected:matches.filter(f=>f.path!==f.expectedDestination),servedOrRendered:false,mutated:false};
fs.writeFileSync(path.join(__dirname,'packing-failure-inventory.json'),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({artifactFiles:files.length,matches:matches.length,unexpected:report.unexpected}));
