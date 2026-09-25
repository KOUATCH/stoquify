// Audit-only evidence collector. No business-data writes or migrations.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const root = process.cwd();
const evidence = path.join(__dirname, 'evidence');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? (['node_modules','.next','graphify-out'].includes(e.name) ? [] : walk(path.join(dir,e.name))) : [path.join(dir,e.name)]);
}
const json = (name, value) => fs.writeFileSync(path.join(evidence,name+'.json'), JSON.stringify(value,null,2)+'\n');
async function main() {
 const [mode, ...args] = process.argv.slice(2);
 if (mode === 'read') {
  for (const spec of args) {
   const [file,start='1',end='100000'] = spec.split('@');
   const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
   console.log('\nFILE '+file+' ('+lines.length+' lines)');
   console.log(lines.slice(+start-1,+end).map((l,i)=>(i+(+start))+': '+l).join('\n'));
  }
 } else if (mode === 'inventory') {
  const folders = ['services/accounting','actions/accounting','components/accounting','app/[locale]/(dashboard)/dashboard/accounting','hooks/accounting','services/events','services/purchasing','services/payments','services/payroll','services/inventory','services/pos','services/finance','services/order-to-cash','services/regulatory'];
  const files = [...new Set(folders.flatMap(walk).concat(['prisma/schema.prisma','hooks/useAccountingControlCenter.ts','hooks/useAccountantPortal.ts','types/queryKeys.ts','package.json','jest.config.ts','jest.setup.ts']))].filter(f=>fs.existsSync(f));
  const inventory = files.map(file=>({file:file.replaceAll('\\','/'),lines:fs.readFileSync(file,'utf8').split(/\r?\n/).length,sha256:sha(fs.readFileSync(file)),test:/__tests__|\.test\.|\.spec\./.test(file)}));
  json('source-inventory',inventory);
  console.log(JSON.stringify({total:inventory.length,tests:inventory.filter(f=>f.test).length,folders:folders.map(folder=>({folder,files:inventory.filter(f=>f.file.startsWith(folder+'/')).length}))},null,2));
  const graphs=[];
  for(const suffix of ['actions','app','components','hooks','types']) {
   const file='graphify-out/graph_'+suffix+'.json';
   const graph=JSON.parse(fs.readFileSync(file,'utf8'));
   const nodes=graph.nodes || [];
   const relevant=nodes.filter(n=>/accounting|ledger|journal|close.assurance|trial.balance/i.test(JSON.stringify(n)));
   const ids=new Set(relevant.map(n=>n.id));
   const edges=(graph.edges||graph.links||[]).filter(e=>ids.has(e.source)||ids.has(e.target));
   graphs.push({file,keys:Object.keys(graph),totalNodes:nodes.length,relevantNodes:relevant,relatedEdges:edges});
  }
  json('graph-accounting-extract',graphs);
  console.log(JSON.stringify(graphs.map(g=>({file:g.file,totalNodes:g.totalNodes,relevant:g.relevantNodes.length,example:g.relevantNodes.slice(0,4)})),null,2));
 } else if (mode === 'run') {
  const [label, tool, ...toolArgs] = args;
  const executable = tool === 'node' ? process.execPath : tool;
  const startedAt = new Date().toISOString();
  const chunks=[];
  const child=spawn(executable,toolArgs,{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',x=>chunks.push(x.toString()));child.stderr.on('data',x=>chunks.push(x.toString()));
  child.on('error',error=>chunks.push(String(error)));
  const code=await new Promise(resolve=>child.on('close',resolve));
  const log=chunks.join('').replace(/postgres(?:ql)?:\/\/[^\s"']+/gi,'[REDACTED_DATABASE_URL]');
  fs.writeFileSync(path.join(evidence,label+'.log'),log);
  const result={label,executable:tool,args:toolArgs,startedAt,endedAt:new Date().toISOString(),exitCode:code,log:label+'.log'};
  json(label+'-command',result);console.log(JSON.stringify(result,null,2));console.log(log.slice(-7000));
  process.exitCode=code===0?0:1;
 } else throw new Error('Unknown mode');
}
main().catch(e=>{console.error(e);process.exitCode=1});
