const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const root = process.cwd();
const out = __dirname;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const hash = v => crypto.createHash('sha256').update(v).digest('hex');
const save = (p, v) => fs.writeFileSync(path.join(out, p), typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const csv = (rows) => { const keys = Object.keys(rows[0] || {}); return [keys, ...rows.map(r => keys.map(k => Array.isArray(r[k]) ? r[k].join('; ') : r[k]))].map(row => row.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n'); };
const dirs = ['app','actions','services','components','hooks','lib','config','prisma','scripts','tests','types'];
const files = cp.execFileSync('rg', ['--files', ...dirs], {cwd:root, encoding:'utf8', maxBuffer:30e6}).trim().split(/\r?\n/).map(p=>p.replace(/\\/g,'/')).filter(p=>/\.(tsx?|jsx?|cjs|json|sql|prisma|ya?ml)$/.test(p));
const sources = files.filter(p=>/\.(tsx?|jsx?|cjs)$/.test(p) && !/(^|\/)(__tests__|tests)\/|\.(test|spec)\./.test(p)).map(p=>({p,text:read(p)}));
const fingerprints = {};
for (const p of [...files,'package.json','jest.config.ts','jest.setup.ts','tsconfig.json','AGENTS.md']) fingerprints[p] = hash(fs.readFileSync(path.join(root,p)));
save('verification/source-fingerprints.json', {capturedAt:new Date().toISOString(), fingerprints});
save('verification/source-files.json',files);
const schema = read('prisma/schema.prisma');
const modelMatches = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
const modelNames = new Set(modelMatches.map(m=>m[1]));
const models = modelMatches.map(m=>{
 const name=m[1], body=m[2], accessor=name[0].toLowerCase()+name.slice(1), startLine=schema.slice(0,m.index).split('\n').length;
 const fields=body.split('\n').map((line,i)=>({line:startLine+i,text:line.trim()})).filter(x=>x.text&&!x.text.startsWith('//'));
 const writeRx=new RegExp('\\.'+accessor+'\\.(createMany|create|updateMany|update|upsert|deleteMany|delete)\\s*\\(', 'g');
 const readRx=new RegExp('\\.'+accessor+'\\.(findMany|findFirst|findUnique|count|aggregate|groupBy)\\s*\\(', 'g');
 const writers=[],readers=[];
 for (const s of sources) {if(writeRx.test(s.text)) writers.push(s.p);writeRx.lastIndex=0;if(readRx.test(s.text)) readers.push(s.p);readRx.lastIndex=0;}
 const relations=fields.filter(f=>/@relation/.test(f.text)).map(f=>({line:f.line,text:f.text}));
 const ids=fields.filter(f=>/^\w+Id\s+String/.test(f.text)).map(f=>f.text.split(/\s+/)[0]);
 const linked=new Set(relations.flatMap(f=>(f.text.match(/fields:\s*\[([^\]]+)/)||[])[1]?.split(',').map(v=>v.trim())||[]));
 return {name,startLine,table:(body.match(/@@map\("([^"\n]+)/)||[])[1]||name,fields,relations,writers,readers,
 directTenant:/^\s+organizationId\s/m.test(body),tenantRelations:relations.filter(f=>/fields:\s*\[organizationId,/.test(f.text)).length,
 constraints:fields.filter(f=>/^@@|@id|@unique/.test(f.text)).map(f=>f.text),
 unlinkedIdFields:ids.filter(f=>!linked.has(f)),decimals:fields.filter(f=>/\bDecimal\b|\bFloat\b/.test(f.text)).map(f=>f.text),
 lifecycle:fields.filter(f=>/^(status|deletedAt|version|effective\w*|valid\w*|archivedAt|postedAt|idempotencyKey)\s/.test(f.text)).map(f=>f.text),
 jsonFields:fields.filter(f=>/\bJson\??\b/.test(f.text)).map(f=>f.text),
 cascades:relations.filter(f=>/onDelete:\s*Cascade/.test(f.text)).map(f=>f.text)};
});
save('verification/schema-model-details.json',models);
save('schema-model-inventory.csv',csv(models.map(m=>({model:m.name,table:m.table,line:m.startLine,directTenant:m.directTenant,tenantCompositeRelations:m.tenantRelations,domainCandidates:[...new Set(m.writers.filter(p=>p.startsWith('services/')).map(p=>p.split('/')[1]))],writerCandidates:m.writers,readerCandidateCount:m.readers.length,lifecycle:m.lifecycle,unlinkedIdFields:m.unlinkedIdFields,decimalAndFloatFields:m.decimals,jsonFields:m.jsonFields,cascadeRelations:m.cascades,assessment:'Static inventory; writer matches exclude dynamic/raw SQL and are not authority proof; retention enforcement requires review'}))));
const migrations=files.filter(p=>p.endsWith('/migration.sql')).map(p=>{const t=read(p);return {path:p,sha256:hash(t),lines:t.split('\n').length,creates:[...t.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+"?(\w+)/gi)].map(m=>m[1]),triggers:[...t.matchAll(/CREATE (?:CONSTRAINT )?TRIGGER\s+"?(\w+)/gi)].map(m=>m[1]),hasCheck:/\bCHECK\s*\(/i.test(t),hasForeignKey:/FOREIGN KEY/i.test(t),hasDrop:/DROP (TABLE|COLUMN|TYPE)/i.test(t),hasRls:/ROW LEVEL SECURITY|CREATE POLICY/i.test(t)};});
save('verification/migration-inventory.json',migrations);
const graph={};
for(const name of ['actions','app','components','hooks','types']) {const g=JSON.parse(read('graphify-out/graph_'+name+'.json'));graph[name]={keys:Object.keys(g),nodes:g.nodes?.length,edges:(g.links||g.edges)?.length,samples:g.nodes?.filter(n=>/offline|payroll|posting|reconciliation|analytics/i.test(JSON.stringify(n))).slice(0,12)};}
save('verification/graph-navigation.json',graph);
const counts={}; for(const p of files){const k=p.startsWith('services/')?p.split('/').slice(0,2).join('/'):p.split('/')[0];counts[k]=(counts[k]||0)+1;}
save('verification/inventory-summary.json',{capturedAt:new Date().toISOString(),files:files.length,sourceFiles:sources.length,models:models.length,migrations:migrations.length,modelsWithoutDirectTenant:models.filter(m=>!m.directTenant).map(m=>m.name),counts});
console.log(JSON.stringify({files:files.length,models:models.length,migrations:migrations.length,modelsWithoutDirectTenant:models.filter(m=>!m.directTenant).map(m=>m.name),serviceDomains:Object.keys(counts).filter(k=>k.startsWith('services/'))},null,2));
