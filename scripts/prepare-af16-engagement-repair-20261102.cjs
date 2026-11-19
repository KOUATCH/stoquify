// Retained AF16 source plus explicit existing repair; no primary source or old artifact mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{Client}=require('pg'),c=require('./af16-verification-context.cjs');
const {validate,capture}=require('./candidate-snapshot.cjs');
const output=path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-11-02-run-01');
const target=path.join(c.root,'.codex-tmp/af16-release-20261102');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 assert.notEqual(process.env.NODE_ENV,'production');assert.ok(!fs.existsSync(target)&&!fs.existsSync(output));fs.mkdirSync(output);
 const archive=fs.readFileSync(path.join(c.privateRoot,'af16-release-source-20261026.json.gz'));
 assert.equal(hash(archive),'0db1890ac0c8463838bc1910884cb9480c51750a8047b6658cb56b408c76b567');
 const snapshot=validate(JSON.parse(zlib.gunzipSync(archive)));
 const overlays=['components/accounting/AccountantAccessManager.tsx','components/accounting/__tests__/AccountantAccessManager.recovery.test.tsx','scripts/release-artifact.cjs'];
 const changes=[];
 for(const file of overlays){const before=snapshot.files.find(f=>f.path===file),bytes=fs.readFileSync(path.join(c.root,file));changes.push({path:file,beforeSha256:before?.sha256||null,afterSha256:hash(bytes)});const entry={path:file,bytes:bytes.length,sha256:hash(bytes),content:bytes.toString('base64')};if(before)Object.assign(before,entry);else snapshot.files.push(entry);}
 snapshot.files.sort((a,b)=>a.path<b.path?-1:1);
 const cloned=spawnSync('git',['clone','--no-checkout','--shared','--',c.root,target],{windowsHide:true,encoding:'utf8'});assert.equal(cloned.status,0,cloned.stderr);
 assert.equal(spawnSync('git',['read-tree','HEAD'],{cwd:target,windowsHide:true}).status,0);
 for(const entry of snapshot.files){const file=path.join(target,entry.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.from(entry.content,'base64'),{flag:'wx'});}
 assert.deepEqual(capture(target).files.map(({path,sha256})=>({path,sha256})),snapshot.files.map(({path,sha256})=>({path,sha256})));
 fs.writeFileSync(path.join(output,'source-manifest.json'),JSON.stringify({...snapshot,files:snapshot.files.map(({content,...e})=>e),overlays:changes},null,2),{flag:'wx'});
 const copied=spawnSync('robocopy.exe',[path.join(c.root,'.codex-tmp/af16-release-20261026/node_modules'),path.join(target,'node_modules'),'/E','/XJ','/R:0','/W:0','/MT:8','/NFL','/NDL','/NJH','/NP'],{windowsHide:true,encoding:'utf8',timeout:900000});
 fs.writeFileSync(path.join(output,'dependency-copy.log'),copied.stdout+copied.stderr,{flag:'wx'});assert.ok(copied.status>=0&&copied.status<=7);
 const admin=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/postgres'});await admin.connect();
 try{await c.guard(admin);const name='stoquify_local_af16_20261102_build_r1';assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount,0);await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${c.database('template')}"`);}finally{await admin.end();}
 fs.writeFileSync(path.join(output,'candidate-preparation.json'),JSON.stringify({target,baseSourceArchiveSha256:hash(archive),overlays:changes,sourceFiles:snapshot.files.length,dependencyCopyExitCode:copied.status,dependencies:'Physical copy of retained candidate dependencies; not clean installation',applicationSourceChanges:['components/accounting/AccountantAccessManager.tsx'],packaging:'Existing current release-artifact v2 helper retained as explicit overlay; legacy uploads are private'},null,2),{flag:'wx'});
 console.log('Prepared separately identified candidate with three explicit overlays.');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
