// P12 read-only evidence inventory; no application imports or environment loading.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
process.chdir(path.resolve(__dirname,'../../../../..'));
const base='docs/retention/execution/';
const read=p=>JSON.parse(fs.readFileSync(base+p,'utf8'));
const hash=p=>fs.existsSync(p)&&fs.statSync(p).isFile()?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null;
const git=a=>cp.execFileSync('git',a,{encoding:'utf8',maxBuffer:32*1024*1024});
const write=(f,v)=>fs.writeFileSync(path.join(__dirname,f),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const specs=[
 ['P01','P01/evidence/SOURCE_MANIFEST.json',j=>j],['P01 supplementary','P01/evidence/SUPPLEMENTARY_SOURCE_MANIFEST.json',j=>j],
 ['P02','P02/evidence/SOURCE_MANIFEST.json',j=>j],['P03','P03/evidence/SOURCE_MANIFEST.json',j=>j],['P04','P04/evidence/SOURCE_MANIFEST.json',j=>j],
 ['P05 closure','P05-P06-closure-2026-10-17/VALIDATION.json',j=>Object.entries(j.currentHashes).map(([path,sha256])=>({path,sha256}))],
 ['P06 operator','P06-operator-2026-10-17/VALIDATION.json',j=>Object.entries(j.sourceHashes).map(([path,sha256])=>({path,sha256}))],
 ['P07 media','P07-media-2026-10-18/evidence/VALIDATION.json',j=>j.files],
 ['P08 owned','P08/evidence/VALIDATION.json',j=>j.ownedSource],
 ['P08 dependency baseline','P08/evidence/BASELINE.json',j=>Object.entries(j.fingerprints).map(([path,sha256])=>({path,sha256})).filter(e=>/^(services\/pos|actions\/pos|lib\/pos|hooks\/pos|components\/pos|prisma\/|lib\/security|services\/_shared)/.test(e.path))],
 ['P09','P09/evidence/MANIFEST.json',j=>j.files],['P10','P10/evidence/MANIFEST.json',j=>j.files],['P11','P11/evidence/MANIFEST.json',j=>j.files],
 ['P11 inspected source','P11/evidence/SOURCE_REVIEW.json',j=>j.files]
];
const comparisons=specs.map(([id,file,extract])=>({id,manifest:base+file,entries:extract(read(file)).map(e=>{const p=e.path||e.file;const expected=e.sha256_raw||e.sha256;const current=hash(p);return {path:p,expected,current,matches:current===expected,ownership:e.ownership||null};})}));
write('PREREQUISITE_FINGERPRINTS.json',comparisons);
const paths=new Set(comparisons.flatMap(c=>c.entries.map(e=>e.path)));
const resultDirs=['P01','P02','P03','P04','P05','P06','P07','P08','P09','P10','P11','P05-P06-closure-2026-10-17','P06-operator-2026-10-17','P07-media-2026-10-18'];
for(const d of resultDirs){paths.add(base+d+'/RESULT.md');for(const f of fs.readdirSync(base+d))if(f.endsWith('.md'))paths.add(base+d+'/'+f);}
for(const p of git(['diff','HEAD','--name-only','-z']).split('\0').filter(Boolean))paths.add(p);
const contracts=[];
for(let i=1;i<=18;i++){const id='P'+String(i).padStart(2,'0');const file=fs.readdirSync('docs/retention/implementation-prompts').find(f=>f.startsWith(id.slice(1)+'_'));const p='docs/retention/implementation-prompts/'+file;paths.add(p);const text=fs.readFileSync(p,'utf8');const section=text.slice(text.indexOf('## Acceptance criteria'),text.indexOf('## Verification steps'));contracts.push({id,path:p,criteria:[...section.matchAll(/^- \[ \] (.+)$/gm)].map((m,n)=>({id:id+'-A'+(n+1),text:m[1].trim()})),dependencies:[...text.split(/\r?\n/).find(l=>l.startsWith('- Hard predecessor artifacts:')).matchAll(/\[(P\d+)\]/g)].map(m=>m[1])});}
write('PROMPT_CONTRACTS.json',contracts);
for(const p of ['AGENTS.md','docs/ecc/WORKFLOW.md','docs/ecc/skill-routing.md','docs/ecc/test-lanes.md','docs/retention/implementation-prompts/COMMON_EXECUTION_CONTRACT.md','docs/retention/implementation-prompts/VERIFICATION_GUIDE.md','docs/retention/STOQUIFY_OHADA_SME_VALUE_ROADMAP_2026-10-12.md'])paths.add(p);
write('BASELINE.json',{at:new Date().toISOString(),head:git(['rev-parse','HEAD']).trim(),status:git(['status','--short','--untracked-files=no']),untracked:git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean),files:[...paths].sort().map(p=>({path:p,sha256:hash(p)}))});
fs.writeFileSync(path.join(__dirname,'INITIAL_STATUS.md'),fs.readFileSync(base+'STATUS.md'),{flag:'wx'});
console.log(JSON.stringify(comparisons.map(c=>({id:c.id,count:c.entries.length,drift:c.entries.filter(e=>!e.matches).map(e=>e.path)})),null,2));
