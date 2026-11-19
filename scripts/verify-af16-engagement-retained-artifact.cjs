const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {verify,filesUnder}=require('./release-artifact.cjs'),c=require('./af16-verification-context.cjs');
const output=path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-28-run-02');
const digest='987da3ead9c716cdbf5d2a22ac1723aa8a8ed15113f40a6b8abd3c1fb64d151f';
const result={startedAt:new Date().toISOString(),passed:false};
try{
 console.log('Verifying retained artifact, source and runtime after the failed browser and diagnostic.');
 const manifest=verify(path.join(c.root,'.codex-tmp/af16-release-20261026'),path.join(c.root,'.codex-tmp/af16-artifact-20261026'),digest);
 console.log('Artifact and frozen source verified; checking runtime copy.');
 assert.deepEqual(filesUnder(path.join(c.privateRoot,'af16-sealed-runtime-20261026')),manifest.files.filter(f=>f.path.startsWith('runtime/')).map(f=>({path:f.path.slice(8),sha256:f.sha256})));
 Object.assign(result,{passed:true,buildId:manifest.buildId,artifactSha256:digest,files:manifest.files.length,sourceFiles:manifest.source.length,runtimeCopyUnchanged:true});
}catch(error){result.error=error.message;process.exitCode=1}
finally{result.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'post-run-integrity.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));}
