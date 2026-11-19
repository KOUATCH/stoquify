const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {root,state}=require('./environment.cjs');
const s=state(),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'source-baseline.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={head:baseline.head,checkedFiles:baseline.files.length,originalChanged:[],candidateChanged:[]};
for(const f of baseline.files)for(const [base,key] of [[root,'originalChanged'],[s.candidate,'candidateChanged']]){const p=path.join(base,f.path);if(!fs.existsSync(p)||hash(fs.readFileSync(p))!==f.sha256)report[key].push(f.path)}
report.passed=report.originalChanged.length===0&&report.candidateChanged.length===0;
fs.writeFileSync(path.join(__dirname,'preservation-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));process.exitCode=report.passed?0:1;
