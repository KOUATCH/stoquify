const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const MarkdownIt=require('markdown-it');
const root=process.cwd(),out=path.dirname(__dirname),evidence=__dirname;
const md=new MarkdownIt({html:false}),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write=(file,value)=>fs.writeFileSync(path.join(out,file),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const required=['BLUEPRINT.md','CURRENT_STATE.md','MODULE_CATALOG.md','CONTRACTS.md','LIFECYCLE_AND_CONTROLS.md','EXPERIENCE.md','IMPLEMENTATION_ROADMAP.md','DECISIONS_NEEDED.md'];
const files=required.map(name=>path.join(out,name));
const errors=[],links=[],refs=new Map(),diagrams=[];
for(const file of files){
 if(!fs.existsSync(file)){errors.push('Missing '+file);continue}
 const source=fs.readFileSync(file,'utf8').replaceAll('</E:/','<E:/');fs.writeFileSync(file,source);
 const tokens=md.parse(source,{}),walk=items=>{for(const token of items){for(const [kind,value]of token.attrs??[]){if(['href','src'].includes(kind))links.push({document:path.basename(file),value})}if(token.children)walk(token.children);if(token.type==='fence'&&token.info.trim()==='mermaid'){const name=path.basename(file,'.md').toLowerCase()+'-'+(diagrams.length+1)+'.mmd';write('evidence/'+name,token.content);diagrams.push(name)}}};walk(tokens);
 if(!md.render(source).includes('<h1>'))errors.push('Missing title '+file);
}
for(const link of links){
 let raw=decodeURIComponent(link.value);if(/^(https?:|mailto:|#)/i.test(raw))continue;
 const line=raw.match(/:(\d+)$/);if(line)raw=raw.slice(0,-line[0].length);
 const absolute=path.isAbsolute(raw)?path.normalize(raw):path.resolve(out,raw);
 if(!fs.existsSync(absolute)){errors.push('Missing link '+link.document+' -> '+raw);continue}
 if(line&&Number(line[1])>fs.readFileSync(absolute,'utf8').split(/\r?\n/).length)errors.push('Invalid line '+link.value);
 if(!absolute.startsWith(out))refs.set(absolute,{path:path.relative(root,absolute).replaceAll('\\','/'),sha256:hash(absolute)});
}
write('evidence/source-references.json',{recordedAt:new Date().toISOString(),sources:[...refs.values()],links:links.filter(x=>/^[A-Z]:/i.test(decodeURIComponent(x.value)))});
const baseline=JSON.parse(fs.readFileSync(path.join(evidence,'baseline.json')));
const comparisons=baseline.files.map(entry=>({...entry,currentSha256:hash(path.join(root,entry.path)),unchanged:hash(path.join(root,entry.path))===entry.sha256}));
const model=JSON.parse(fs.readFileSync(path.join(evidence,'model-verification.json'))),browser=JSON.parse(fs.readFileSync(path.join(evidence,'browser-verification.json')));
if(model.passed!==model.total||model.results.some(x=>x.status==='failed')||browser.checks.some(x=>x.status==='failed'))errors.push('Verification failures');
const sourceChanges=comparisons.filter(x=>!x.unchanged);if(sourceChanges.length)errors.push('Baseline source changed; assess drift before completion');
const currentStatus=cp.execFileSync('git',['status','--porcelain=v1','-unormal'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();
const oldStatus=new Set(baseline.dirtyWorktree.split('\n'));const newStatusLines=currentStatus.split('\n').filter(x=>!oldStatus.has(x));
const result={recordedAt:new Date().toISOString(),status:errors.length?'needs_review':'passed',requiredDocuments:required,localLinkChecks:links.filter(x=>!/^https?:/i.test(x.value)).length,uniqueRepositorySources:refs.size,diagrams,sourceBaseline:comparisons,newWorkingTreeStatusLines:newStatusLines,model,browser:{passed:browser.checks.filter(x=>x.status==='passed').length,failed:browser.checks.filter(x=>x.status==='failed').length,errors:browser.errors},errors};
write('evidence/artifact-validation.json',result);
write('checkpoint.json',{status:errors.length?'needs_review':'complete',scope:'Design blueprint and isolated interactive prototype only',completed:required.concat(['current source evidence','52 model scenarios','19 browser scenarios','diagrams and screenshots','owner guide','artifact verification']),remainingProductionWork:'Implementation roadmap is proposed; no production modules, approvals or live activation changed',completedAt:new Date().toISOString(),errors});
const all=[];function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())visit(file);else if(item.name!=='artifact-manifest.json')all.push({path:path.relative(out,file).replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:hash(file)})}}visit(out);
write('evidence/artifact-manifest.json',{recordedAt:new Date().toISOString(),files:all});
console.log(JSON.stringify({status:result.status,documents:required.length,links:result.localLinkChecks,repositorySources:refs.size,diagrams:diagrams.length,unchangedSourceFiles:comparisons.filter(x=>x.unchanged).length,model: model.summary??model.total,browser:result.browser,errors},null,2));
if(errors.length)process.exitCode=1;
