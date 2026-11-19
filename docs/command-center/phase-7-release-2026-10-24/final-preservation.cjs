const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {state}=require('./environment.cjs');const s=state(),results=[];
for(const [name,manifest,candidate] of [['authenticated-candidate','source-baseline.json',s.candidate],['current-type-candidate','current-type-source.json',path.join(s.work,'current-type-candidate')]]){
 const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,manifest))),changed=[];
 for(const file of baseline.files){const p=path.join(candidate,file.path);if(!fs.existsSync(p)||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==file.sha256)changed.push(file.path)}
 results.push({name,manifest,checkedFiles:baseline.files.length,changed,passed:changed.length===0});
}
fs.writeFileSync(path.join(__dirname,'final-preservation-results.json'),JSON.stringify({results},null,2));console.log(JSON.stringify(results));process.exitCode=results.every(r=>r.passed)?0:1;
