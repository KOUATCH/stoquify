// Isolated publication characterization; no real build, application startup, database or deployment.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),own=path.join(root,'.codex-tmp/p04-r02-20261029-r1'),mirror=path.join(own,'asset-mirror');
const {prepare,verify}=require(path.join(root,'scripts/release-artifact.cjs'));
const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'asset-inventory.json'),'utf8'));
const file=(p,b)=>{const dest=path.join(mirror,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b,{flag:'wx'})};
file('.next/BUILD_ID','P04-R02-SYNTHETIC-PACKING');file('.next/standalone/server.js','// Synthetic placeholder, never executed.');
for(const name of ['next','react','react-dom'])file('.next/standalone/node_modules/'+name+'/package.json',JSON.stringify({name,syntheticFixture:true}));
file('.next/static/synthetic.txt','P04 synthetic static control');
const identity=()=>inventory.assets.map(a=>({path:a.path,sha256:a.sha256}));
(async()=>{const destination=path.join(own,'publication-characterization');const result=await prepare(mirror,destination,{env:{},sourceIdentity:identity,runScript:async()=>{}});const manifest=verify(mirror,destination,result.sha256,{sourceIdentity:identity});
const exposed=inventory.assets.map(a=>{const entry=manifest.files.find(f=>f.path==='runtime/'+a.path);assert(entry);assert.equal(entry.sha256,a.sha256);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,a.path))).digest('hex'),a.sha256);return{source:a.path,artifactPath:entry.path,sha256:entry.sha256}});
const report={at:new Date().toISOString(),harnessCompleted:true,securityAcceptancePassed:false,evidenceClass:'actual packer with synthetic standalone build structure; build invocation stubbed',buildExecuted:false,runtimeServed:false,originalAssetsUnchanged:true,privateAssetsPublishedUnderPublic:exposed,artifact:result,sourcePackerSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'scripts/release-artifact.cjs'))).digest('hex')};fs.writeFileSync(path.join(__dirname,'publication-characterization.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));})().catch(e=>{console.error(e.message);process.exitCode=1});
