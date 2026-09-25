const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {execFileSync} = require('child_process');
const root = process.cwd();
const run = path.resolve(__dirname, '..');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const json = (name, obj) => fs.writeFileSync(path.join(run, name), JSON.stringify(obj, null, 2) + '\n');
const listed = execFileSync('rg', ['--files', '--hidden', '-g', '!node_modules', '-g', '!.git', '-g', '!.next', '-g', '!what-next', '-g', '!artifacts', '-g', '!docs', '-g', '!graphify-out', '-g', '!.codex', '-g', '!.agents', '-g', '!coverage'], {encoding:'utf8', maxBuffer:20*1024*1024,windowsHide:true}).trim().split(/\r?\n/).map(p=>p.replace(/\\/g,'/'));
const roots = new Set(['app','actions','services','lib','components','hooks','config','types','prisma','scripts','tests','messages','.github','infra','infrastructure','docker','public']);
const extensions = /\.(?:[cm]?js|jsx|tsx?|json|prisma|sql|ya?ml|toml|css|scss|sh|ps1)$/i;
const excluded = [];
const files = [];
const candidates = [];
const patterns = {
  unsafeRawSql: /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/,
  htmlInjectionSink: /dangerouslySetInnerHTML/,
  dynamicExecution: /\b(?:eval|new Function)\s*\(/,
  tlsVerificationDisabled: /rejectUnauthorized\s*:\s*false/,
  publicEnvironmentSecretName: /NEXT_PUBLIC_[A-Z_]*(?:SECRET|PASSWORD|PRIVATE_KEY)/,
  directPrismaInAction: /\b(?:prisma|db)\.[a-zA-Z][a-zA-Z0-9]*\.(?:find|create|update|delete|upsert|count|aggregate)/,
};
for (const p of listed) {
  const top = p.split('/')[0];
  if (!extensions.test(p) || (!roots.has(top) && p.includes('/')) || /(?:^|\/)(?:generated|graphify-out|vendor|dist|build|coverage)(?:\/|$)/.test(p) || /(?:^|\/)\.env/.test(p) || /(?:credential|secret|password).*\.json$/i.test(p) && !p.startsWith('scripts/')) { excluded.push({path:p,reason:'outside selected first-party code/config inventory or potentially sensitive local configuration'}); continue; }
  const bytes = fs.readFileSync(path.join(root,p));
  const source = bytes.toString('utf8');
  const lines = source.split(/\r?\n/);
  const test = /(?:__tests__|tests\/|\.(?:test|spec)\.)/.test(p);
  const record = {path:p,area:p.includes('/')?top:'root',domain:p.split('/')[1]||'root',bytes:bytes.length,lines:lines.length,sha256:hash(bytes),isTest:test,depth:{inventoried:true,automaticallyChecked:extensions.test(p),manuallyReviewed:false,behaviorTested:false},checks:['fingerprint','review-pattern-triage']};
  files.push(record);
  if (!test && /\.[cm]?[jt]sx?$/.test(p)) for(let i=0;i<lines.length;i++) for(const [kind,re] of Object.entries(patterns)) if(re.test(lines[i]) && (kind!=='directPrismaInAction'||p.startsWith('actions/'))) candidates.push({path:p,line:i+1,kind,status:'triage_only_not_a_confirmed_finding'});
}
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const scripts = pkg.scripts;
const gateScripts = Object.entries(scripts).filter(([n,c])=>/(?:gate|boundary|readiness|preflight|verify:|build$|test:e2e)/.test(n)).map(([name,command])=>({name,command,dependencies:[...command.matchAll(/npm run ([\w:.-]+)/g)].map(m=>m[1]),directSources:[...command.matchAll(/(?:node|ts-node)[^;&]*?\s(scripts\/[\w./-]+\.[cm]?[jt]s)/g)].map(m=>m[1]),potentialEffects:{database:/migrate|seed|postgres|runtime/.test(command),execution:/--mode execute|--write|--update-register/.test(command),reportWrites:/--out|--json-out/.test(command)},inspectionStatus:'cataloged; inspect implementation before execution'}));
let git = {};
for(const [key,args] of [['commit',['rev-parse','HEAD']],['branch',['branch','--show-current']],['status',['status','--porcelain=v1','-unormal']]])git[key]=execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore'],windowsHide:true}).trim();
const byArea = {};
for(const f of files){byArea[f.area]??={files:0,lines:0,tests:0};byArea[f.area].files++;byArea[f.area].lines+=f.lines;byArea[f.area].tests+=Number(f.isTest);}
const schema = fs.readFileSync('prisma/schema.prisma','utf8');
const models = [...schema.matchAll(/^model\s+(\w+)/gm)].map(m=>m[1]);
const routes = files.filter(f=>/^app\//.test(f.path)&&/\/route\.[jt]s$/.test(f.path)).map(f=>({path:f.path,sha256:f.sha256}));
const graphs = [];
for(const name of ['graph_actions.json','graph_app.json','graph_components.json','graph_hooks.json','graph_types.json']){
 const p=path.join('graphify-out',name);if(!fs.existsSync(p))continue;
 const g=JSON.parse(fs.readFileSync(p,'utf8'));const nodes=g.nodes||[];
 const selected=nodes.filter(n=>/security|auth|payment|payroll|posting|reconcil|release|offline|supplier|approval/i.test(JSON.stringify(n))).slice(0,30);
 graphs.push({path:p,nodeCount:nodes.length,edgeCount:(g.links||g.edges||[]).length,selectedNodes:selected});
}
json('coverage.json',{schemaVersion:1,status:'IN_PROGRESS',startedAt:new Date().toISOString(),root,byArea,fileCount:files.length,modelCount:models.length,routeCount:routes.length,files,excluded,limitations:['Pattern matches are candidates, not vulnerabilities.','No claim that inventory or static triage is manual review.','Generated/vendor/history artifacts excluded from first-party counts.']});
json('evidence/baseline.json',{recordedAt:new Date().toISOString(),node:process.version,...git,sourceInventoryDigest:hash(JSON.stringify(files.map(f=>[f.path,f.sha256]))),byArea,models,routes,dependencyVersions:pkg.dependencies,devDependencyVersions:pkg.devDependencies});
json('evidence/gate-catalog.json',gateScripts);
json('evidence/static-candidates.json',candidates);
json('evidence/graph-context.json',graphs);
json('checkpoint.json',{phase:'discovery',status:'IN_PROGRESS',next:['inspect public and authenticated boundaries','run inspected baseline checks','trace critical domain workflows','reconcile current gates','implement and verify bounded fixes','publish findings and roadmap']});
console.log(JSON.stringify({fileCount:files.length,modelCount:models.length,routeCount:routes.length,byArea,gateScripts:gateScripts.length,triageCandidates:candidates.length,graphCounts:graphs.map(g=>({path:g.path,nodes:g.nodeCount,edges:g.edgeCount}))},null,2));
