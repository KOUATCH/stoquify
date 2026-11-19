// A new local comparison candidate: exact failed source plus the one reviewed component delta.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../../..'),source=path.join(root,'.codex-tmp/af16-release-20261026'),artifact=path.join(root,'.codex-tmp/af16-artifact-20261026'),target=path.join(root,'.codex-tmp/p03-comparison-20261028-r1');
const digest='987da3ead9c716cdbf5d2a22ac1723aa8a8ed15113f40a6b8abd3c1fb64d151f',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const {verify}=require(path.join(root,'scripts/release-artifact.cjs')),{capture}=require(path.join(root,'scripts/candidate-snapshot.cjs'));
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].includes(k.toUpperCase())));
const receipt={startedAt:new Date().toISOString(),passed:false,sourceArtifact:digest,commands:[]};
function run(label,file,args,cwd,allowed=[0]){const fd=fs.openSync(path.join(__dirname,label+'.log'),'wx');let r;try{r=spawnSync(file,args,{cwd,env,windowsHide:true,stdio:['ignore',fd,fd],timeout:900000})}finally{fs.closeSync(fd)}receipt.commands.push({label,file,args,exitCode:r.status});if(r.error)throw r.error;assert(allowed.includes(r.status),label+' failed');return r.status}
try{
 assert.equal(process.argv.length,2);assert(process.env.NODE_ENV!=='production');assert(!fs.existsSync(target),'New candidate only');
 const manifest=verify(source,artifact,digest);const changed='components/accounting/AccountantAccessManager.tsx',before=fs.readFileSync(path.join(source,changed),'utf8'),current=fs.readFileSync(path.join(root,changed),'utf8');
 assert.equal(current,before.replace("<form action={grant} className=","<form onSubmit={(event) => {\n        event.preventDefault()\n        grant(new FormData(event.currentTarget))\n      }} className="));
 run('comparison-local-clone','git',['clone','--no-checkout','--shared','--',source,target],root);run('comparison-local-index','git',['read-tree','HEAD'],target);
 for(const row of manifest.source){const bytes=fs.readFileSync(path.join(source,row.path));assert.equal(hash(bytes),row.sha256);const dest=path.join(target,row.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'})}
 fs.writeFileSync(path.join(target,changed),current);
 const expected=manifest.source.map(x=>x.path===changed?{path:x.path,sha256:hash(current)}:x),actual=capture(target).files.map(({path,sha256})=>({path,sha256}));assert.deepEqual(actual,expected);
 fs.writeFileSync(path.join(__dirname,'comparison-source-manifest.json'),JSON.stringify({sourceArtifact:digest,scope:'Exact failed frozen candidate plus one grant form handler delta; newer current security hardening is not part of this comparison.',files:actual},null,2),{flag:'wx'});
 const deps=path.join(target,'node_modules');assert(!fs.existsSync(deps));assert(fs.realpathSync(target).startsWith(fs.realpathSync(path.join(root,'.codex-tmp'))+path.sep));
 run('comparison-dependency-copy','robocopy.exe',[path.join(source,'node_modules'),deps,'/E','/XJ','/R:0','/W:0','/MT:8','/NFL','/NDL','/NJH','/NP'],root,[0,1,2,3,4,5,6,7]);
 receipt.versions=Object.fromEntries(['next','react','react-dom','prisma','@prisma/client','typescript'].map(n=>[n,JSON.parse(fs.readFileSync(path.join(deps,n,'package.json'),'utf8')).version]));
 receipt.target=target;receipt.files=actual.length;receipt.changed=[{path:changed,before:hash(before),after:hash(current)}];receipt.dependencies='Physical copy of failed candidate installed dependencies, no installation; not clean-install reproducibility';receipt.environmentFilesCopied=false;receipt.passed=true;
}catch(e){receipt.error=e.message;process.exitCode=1}finally{receipt.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'comparison-preparation.json'),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({passed:receipt.passed,error:receipt.error,files:receipt.files}))}
