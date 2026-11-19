const fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
const {root,state,environment}=require('./environment.cjs');
const {capture,restore}=require(path.join(root,'scripts/candidate-snapshot.cjs'));
const s=state(),candidate=path.join(s.work,'current-type-candidate');
let snapshot;
if(process.argv.includes('--existing')){snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'current-type-source.json')));if(!fs.existsSync(path.join(candidate,'tsconfig.json')))throw Error('Expected isolated source capture missing')}
else{if(fs.existsSync(candidate))throw Error('Current type-check candidate already exists; do not overwrite it');snapshot=capture(root);restore(snapshot,candidate);fs.symlinkSync(path.join(root,'node_modules'),path.join(candidate,'node_modules'),'junction');fs.writeFileSync(path.join(__dirname,'current-type-source.json'),JSON.stringify({capturedAt:new Date().toISOString(),head:snapshot.head,files:snapshot.files.map(({content,...f})=>f)},null,2))}
// Next's installed typegen scans routes and writes only this candidate's generated types.
// Dependencies already exist; no install or application/database execution is required.
for(const dependency of ['typescript','@types/node/package.json','@types/react/package.json'])require.resolve(dependency);
const types=spawnSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'typegen'],{cwd:candidate,env:environment(s,'production'),encoding:'utf8',windowsHide:true,timeout:120000});
fs.writeFileSync(path.join(__dirname,'current-route-types.log'),String(types.stdout??'')+String(types.stderr??''));if(types.status!==0)throw Error('Route type generation failed: '+types.status);
const log=fs.openSync(path.join(__dirname,'current-typecheck.log'),'w');
const child=spawn(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'-p',path.join(candidate,'tsconfig.json'),'--noEmit','--incremental','false','--pretty','false'],{cwd:candidate,env:environment(s,'test'),windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
console.log('Fresh source type-check started for '+snapshot.files.length+' captured files.');
child.on('error',e=>{console.error(e.message);process.exitCode=1});
child.on('exit',code=>{fs.writeFileSync(path.join(__dirname,'current-typecheck-result.json'),JSON.stringify({exitCode:code,candidate,sourceFiles:snapshot.files.length,productionAccess:false,scope:'Current captured source type-check only; no artifact build or browser rerun'},null,2));console.log('Current source type-check exit: '+code);process.exitCode=code??1});
