const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=__dirname,expected='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public';
async function exercise(file,validEnvironment=false){
 const recovery=file.startsWith('run-recovery'),output=path.join(base,recovery?'recovery-results.json':'connected-results.json'),scratch=path.join(base,'synthetic-scratch');
 const manifest={runId:'synthetic',database:path.join(scratch,'database.dump'),fixture:path.join(scratch,'fixture.json'),hashes:{database:'original',fixture:'original'}};
 const memory=new Map([[output,JSON.stringify({status:'PASS_PRIOR_RUN'})],[path.join(base,'backup-manifest.json'),JSON.stringify(manifest)],[path.join(base,'connected-results.json'),JSON.stringify({status:'PASS_SCOPED_NATIVE_SERVICES',runId:'synthetic'})],[manifest.database,'tampered'],[manifest.fixture,'tampered']]);
 let databaseClients=0,spawned=0;const fakeFs={existsSync:p=>memory.has(p),readFileSync:p=>{if(!memory.has(p))throw Error('Missing fixture');return memory.get(p)},writeFileSync:(p,v)=>memory.set(p,String(v))};
 const processMock={env:{HRIS_CORRECTNESS_DATABASE_URL:validEnvironment?expected:'wrong-target'},argv:['node',file],exitCode:0};
 const context={__dirname:base,process:processMock,console:{log(){}},require:id=>id==='node:fs'?fakeFs:id==='node:path'?path:id==='node:child_process'?{spawnSync(){spawned++;throw Error('Unexpected child')}}:id==='@prisma/client'?{PrismaClient:class{constructor(){databaseClients++;throw Error('Unexpected database')}}}:id==='./snapshot.cjs'?{scratch,sha:()=> 'changed'}:require(id)};
 await vm.runInNewContext(fs.readFileSync(path.join(base,file),'utf8'),context);assert.equal(processMock.exitCode,1);assert.equal(JSON.parse(memory.get(output)).status,'FAILED');assert.equal(databaseClients,0);assert.equal(spawned,0);
}
test('invalid connected target replaces prior success with failure without running Jest',()=>exercise('run-connected.cjs'));
test('invalid recovery target replaces prior success with failure without opening database',()=>exercise('run-recovery.cjs'));
test('changed backup hash replaces prior success with failure before database creation',()=>exercise('run-recovery.cjs',true));
