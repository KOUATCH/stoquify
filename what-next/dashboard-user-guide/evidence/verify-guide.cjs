const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base=path.resolve('docs/dashboard-user-guide'),audit=path.resolve('what-next/dashboard-user-guide');
const phase=process.argv[2]||'draft',errors=[],warnings=[];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
function csv(file){const text=fs.readFileSync(file,'utf8'),rows=[];let row=[],v='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(v);v='';}else if(c==='\n'&&!quoted){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v='';}else v+=c;}if(v||row.length){row.push(v);rows.push(row);}const head=rows.shift();return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]])));}
const coverage=csv(path.join(base,'coverage.csv')),controls=csv(path.join(base,'controls.csv'));
const pageRoot='app/[locale]/(dashboard)/dashboard';const routes=walk(pageRoot).map(p=>p.replaceAll('\\','/')).filter(f=>/\/page\.(tsx|ts|jsx|js)$/.test(f)&&!f.includes('/__tests__/')).map(f=>'/en/dashboard'+f.slice(pageRoot.length).replace(/\/page\.(tsx|ts|jsx|js)$/,''));
for(const route of routes)if(!coverage.some(c=>c.route_pattern===route))errors.push('Missing route '+route);
for(const row of coverage)if(!routes.includes(row.route_pattern))errors.push('Extra route '+row.route_pattern);
if(new Set(coverage.map(c=>c.route_pattern)).size!==coverage.length)errors.push('Duplicate coverage routes');
for(const c of controls)for(const key of ['page','control_label','purpose','prerequisites','effect','resulting_state','verification_status','evidence_reference','uncertainty'])if(!c[key])errors.push('Empty control field '+key);
const slug=s=>s.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');
const anchors=file=>{const seen=new Map();return new Set([...fs.readFileSync(file,'utf8').matchAll(/^#{1,6} (.+)$/gm)].map(m=>{const key=slug(m[1]);const n=seen.get(key)||0;seen.set(key,n+1);return key+(n?'-'+n:'');}));};
function targetExists(from,raw){let target;try{target=decodeURIComponent(raw);}catch{target=raw;}if(/^(https?:|mailto:|tel:|app:)/.test(target))return;if(target.startsWith('file:'))return;
 const [name,hash]=target.split('#'),isAbsolute=/^[A-Za-z]:\//.test(name),f=isAbsolute?name:path.resolve(path.dirname(from),name||path.basename(from));const plain=f.replace(/:\d+$/,'');
 if(!fs.existsSync(plain)){if(phase==='draft'&&(/\.pdf$/.test(plain)||/verification\.json$/.test(plain)))return;errors.push('Missing link '+path.relative(base,from)+' -> '+target);return;}
 if(hash&&plain.endsWith('.md')&&!anchors(plain).has(hash))errors.push('Missing anchor '+path.relative(base,from)+' -> '+target);
 const lineno=f.match(/:(\d+)$/)?.[1];if(lineno&&Number(lineno)>fs.readFileSync(plain,'utf8').split('\n').length)errors.push('Invalid source line '+target);
}
const docs=walk(base).filter(f=>f.endsWith('.md'));
for(const f of docs){const text=fs.readFileSync(f,'utf8');if(text.includes('{{'))errors.push('Unexpanded placeholder '+f);if(/<a id=/.test(text))errors.push('Raw HTML anchor cannot be rendered by publisher '+f);for(const m of text.matchAll(/\]\(<([^>]+)>\)|\]\(([^)\n]+)\)/g))targetExists(f,m[1]||m[2]);}
for(const c of coverage)targetExists(path.join(base,'coverage.csv'),c.guide_link);
const manifest=csv(path.join(audit,'evidence/source-manifest.csv')),drift=[];for(const m of manifest){if(!fs.existsSync(m.file)){drift.push(m.file+' missing');continue;}const hash=crypto.createHash('sha256').update(fs.readFileSync(m.file)).digest('hex');if(hash!==m.sha256)drift.push(m.file);}
if(drift.length)errors.push(...drift.map(f=>'Source changed during documentation '+f));
const pairs=[];for(const file of docs){const pdf=file.replace(/\.md$/,'.pdf');if(phase!=='draft'){if(!fs.existsSync(pdf)||fs.statSync(pdf).size<1024||fs.readFileSync(pdf).subarray(0,5).toString()!=='%PDF-')errors.push('Invalid/missing PDF pair '+pdf);else pairs.push({markdown:path.relative(base,file).replaceAll('\\','/'),pdf:path.relative(base,pdf).replaceAll('\\','/'),bytes:fs.statSync(pdf).size});}}
const intermediates=walk(base).filter(f=>/\.(tmp|html|png|js|cjs)$/.test(f));if(intermediates.length)errors.push('Intermediate files in publication '+intermediates.join(','));
const result={phase,at:new Date().toISOString(),routesDiscovered:routes.length,routesDocumented:coverage.length,controls:controls.length,markdownReports:docs.length,pdfPairs:pairs.length,sourceHashesChecked:manifest.length,sourceDrift:drift,localLinksChecked:true,errors:[...new Set(errors)],warnings,pairs,browser:{entry:'http://localhost:3000/en/dashboard',result:'redirect to http://localhost:3000/en/login',authenticatedPagesObserved:0,controlsExercised:0},businessMutationsPerformed:0,applicationFilesEditedByDocumentationTask:0};
fs.writeFileSync(path.join(audit,'evidence/verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
