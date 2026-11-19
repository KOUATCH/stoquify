// New helper definitions only. Old E31 helpers and all historical evidence stay unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const changes=[],hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function copy(from,to,edits=[]){const before=fs.readFileSync(path.resolve(__dirname,from),'utf8');let after=before;const applied=[];for(const[oldText,newText,count]of edits){const actual=after.split(oldText).length-1;assert.equal(actual,count,'Exact source substitution count: '+from+' / '+oldText);after=after.split(oldText).join(newText);applied.push({before:oldText,after:newText,count});}const destination=path.resolve(__dirname,to);assert(destination.startsWith(__dirname+path.sep));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,after,{flag:'wx'});changes.push({from,to,beforeSha256:hash(before),afterSha256:hash(after),substitutions:applied});}
for(const name of['fixture-control.cjs','login-fixture-control.cjs','read-authority-utc.cjs'])copy('database/'+name,'database-current/'+name);
copy('database/fixture-definition.cjs','database-current/fixture-definition.cjs',[["['p04-r06-a','p04-r06-b']","['p04-r06-r3-a','p04-r06-r3-b']",1],["'p04r06-synthetic'","'p04r06-r3-synthetic'",1],["id='p04r06-'+alias","id='p04r06-r3-'+alias",1]]);
copy('database/direct-api-child.cjs','database-current/direct-api-child.cjs',[['stoquify_local_p04r06_20261110_full_r2','stoquify_local_p04r06_20261110_full_r3',2]]);
copy('database/finalize.cjs','database-current/finalize.cjs');
copy('database/stop.cjs','database-current/stop.cjs');
copy('../qualification-20261110-r2/database/seed-fixture.cjs','database-current/seed-fixture.cjs',[['DATABASE-RECIPE-ADMISSION.json','DATABASE-CURRENT-RECIPE-ADMISSION.json',1],["path.join(__dirname,'..',item.path)","path.resolve(__dirname,'..',item.path)",1]]);
copy('direct-api-driver.cjs','direct-api-driver-v2.cjs',[['stoquify_local_p04r06_20261110_full_r2','stoquify_local_p04r06_20261110_full_r3',2],['database/direct-api-child.cjs','database-current/direct-api-child.cjs',1]]);
for(const name of['run-protected-core.cjs','run-credential-probes.cjs','run-origin-probes.cjs'])copy('runtime/'+name,'runtime-current/'+name);
copy('runtime/run-retained-expiry.cjs','runtime-current/run-retained-expiry.cjs',[['../database/','../database-current/',2]]);
copy('runtime/run-expanded.cjs','runtime-current/run-expanded.cjs',[['../database/','../database-current/',3]]);
copy('runtime/runtime-bridge.cjs','runtime-current/runtime-bridge.cjs',[['stoquify_local_p04r06_20261110_full_r2','stoquify_local_p04r06_20261110_full_r3',2]]);
copy('runtime/qualification-contract.json','runtime-current/qualification-contract.json');
fs.writeFileSync(path.join(__dirname,'current-helper-copy-definitions.json'),JSON.stringify({at:new Date().toISOString(),definitionPreparationOnly:true,applicationOrDatabaseExecuted:false,changes},null,2)+'\n',{flag:'wx'});
