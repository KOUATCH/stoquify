const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {root,state}=require('./environment.cjs');
const s=state(),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'source-baseline.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={head:baseline.head,checkedFiles:baseline.files.length,workspaceChangedSinceCapture:[],candidateChanged:[],productionAccess:false};
for(const f of baseline.files)for(const [base,key] of [[root,'workspaceChangedSinceCapture'],[s.candidate,'candidateChanged']]){const p=path.join(base,f.path);if(!fs.existsSync(p)||hash(fs.readFileSync(p))!==f.sha256)report[key].push(f.path)}
const file='services/onboarding/__tests__/fixtures/opening-position-contract.ts';
const before=fs.readFileSync(path.join(root,'.codex-tmp/phase8-before',file),'utf8');
let replacements=0;const expected=before.replace(/\b(\d+)n\b/g,(_,value)=>{replacements++;return 'BigInt("'+value+'")'});
report.fixtureChange={replacements,exactReplacementOnly:expected===fs.readFileSync(path.join(root,file),'utf8')};
report.passed=report.candidateChanged.length===0&&report.fixtureChange.exactReplacementOnly&&replacements===17;
fs.writeFileSync(path.join(__dirname,'preservation-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));process.exitCode=report.passed?0:1;
