const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const modules=require('./modules.cjs');const root=process.cwd(),run=__dirname;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=cp.execFileSync('rg',['--files','services','actions','hooks','components','app','lib','config','types','scripts','prisma'],{encoding:'utf8'}).trim().split(/\r?\n/).map(p=>p.replaceAll('\\','/')).filter(p=>!p.includes('/graphify-out/')&&!p.endsWith('.orig'));
const graphNames=['actions','app','components','hooks','types'];
const graphs=graphNames.map(name=>({name,data:JSON.parse(fs.readFileSync(`graphify-out/graph_${name}.json`,'utf8'))}));
const schema=fs.readFileSync('prisma/schema.prisma','utf8').split(/\r?\n/);
const models=Object.fromEntries(schema.flatMap((s,i)=>{const m=/^model (\w+) /.exec(s);return m?[[m[1],i+1]]:[]}));
const manifests=[];const text=[];
for(const m of modules){
 const inventory=files.filter(f=>m.prefixes.some(p=>f.startsWith(p)));
 const primary=[m.primary,m.client,...inventory.filter(f=>f.startsWith('actions/')&&!f.includes('__tests__')).slice(0,2),...inventory.filter(f=>f.startsWith('hooks/')&&!f.includes('__tests__')).slice(0,2),...inventory.filter(f=>f.startsWith('components/')&&!f.includes('__tests__')).slice(0,2)];
 const sources=[...new Set(primary)].filter(f=>fs.existsSync(f)).map(file=>{const b=fs.readFileSync(file),a=b.toString('utf8').split(/\r?\n/);return {file,sha256:hash(b),lines:a.length,anchors:a.flatMap((s,i)=>/^(export |import )|\$transaction|queryKey:|invalidateQueries|isolationLevel|updateMany|idempotencyKey|makerChecker|evidenceHash|ALL_TIME|take:|XAF|executionAuthority/.test(s)?[{line:i+1,text:s.trim().slice(0,200)}]:[]).slice(0,55)}});
 const test=m.test&&fs.existsSync(m.test)?m.test:null;
 const testInfo=test?{file:test,sha256:hash(fs.readFileSync(test)),mockedPrisma:/jest\.mock\(["']@\/prisma\/db["']/.test(fs.readFileSync(test,'utf8')),externalIndicators:fs.readFileSync(test,'utf8').split(/\r?\n/).filter(s=>/new PrismaClient|DATABASE_URL|execSync|execFileSync|spawn\(|fetch\(|unmock|requireActual.*prisma/.test(s))}:null;
 const graphNodes=graphs.flatMap(g=>g.data.nodes.filter(n=>sources.some(s=>s.file===g.name+'/'+n.source_file?.replaceAll('\\','/'))).slice(0,2).map(n=>({graph:g.name,id:n.id,community:n.community,source:n.source_file,location:n.source_location})));
 manifests.push({...m,inventory,sources,testInfo,models:m.models.map(name=>({name,line:models[name]??null})),graphNodes});
 text.push(`### ${m.id} ${m.title}\n`+sources.map(s=>s.file+'\n'+s.anchors.slice(0,12).map(a=>a.line+': '+a.text).join('\n')).join('\n')+'\nTEST '+JSON.stringify(testInfo));
}
const status=cp.execFileSync('git',['status','--porcelain=v1','--untracked-files=normal'],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
const out={capturedAt:new Date().toISOString(),commit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),branch:cp.execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),statusSha256:hash(status),schemaSha256:hash(fs.readFileSync('prisma/schema.prisma')),graphs:graphs.map(g=>({name:g.name,nodes:g.data.nodes.length,links:g.data.links?.length})),modules:manifests};
fs.writeFileSync(path.join(run,'source-manifest.json'),JSON.stringify(out,null,2));fs.writeFileSync(path.join(run,'worktree-status.txt'),status);fs.writeFileSync(path.join(run,'source-excerpts.txt'),text.join('\n\n'));
console.log(JSON.stringify({modules:manifests.length,sourceFiles:new Set(manifests.flatMap(m=>m.sources.map(s=>s.file))).size,tests:manifests.map(m=>({id:m.id,...m.testInfo})),missing:manifests.flatMap(m=>m.models.filter(x=>!x.line).map(x=>m.id+':'+x.name))},null,2));
