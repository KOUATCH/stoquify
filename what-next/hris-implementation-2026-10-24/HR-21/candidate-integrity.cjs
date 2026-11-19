const fs=require('node:fs'),crypto=require('node:crypto'),base='what-next/hris-implementation-2026-10-24',latest=new Map(),dependencies=[];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(let i=8;i<=19;i++){
 const id='HR-'+String(i).padStart(2,'0'),path=base+'/'+id+'/evidence.json';if(!fs.existsSync(path))throw Error('Missing dependency manifest '+id);
 const e=JSON.parse(fs.readFileSync(path,'utf8'));if(!String(e.status).startsWith('VERIFIED'))throw Error('Dependency entry remains open '+id);
 dependencies.push({id,status:e.status,evidence:path,evidenceHash:hash(path),scope:'Historical engineering evidence; not pilot acceptance'});
 for(const values of [e.hashes,e.fileHashes,e.files,e.dependencyOwnerHashes].filter(Boolean)){
  const rows=Array.isArray(values)?values:Object.entries(values).map(([path,sha256])=>({path,sha256}));
  for(const row of rows){const p=row.path,h=row.sha256;if(typeof p!=='string'||typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h)||! /^(services|actions|components|app|config|lib|prisma|scripts|jest\.)[\/]/.test(p)&&!p.startsWith('jest.'))continue;latest.set(p,{path:p,lastSlice:id,recordedHash:h})}
 }
}
const sources=[...latest.values()].sort((a,b)=>a.path.localeCompare(b.path)).map(x=>({...x,currentHash:fs.existsSync(x.path)?hash(x.path):null})).map(x=>({...x,status:x.currentHash===x.recordedHash?'UNCHANGED_FROM_LATEST_SCOPED_EVIDENCE':x.currentHash?'CHANGED_REVIEW_REQUIRED':'MISSING'}));
const result={createdAt:new Date().toISOString(),baseline:'9ab93a2a1d81e37ef7e0b10357885b48a3bc5886',mode:'HR_CORE_WITH_HANDOFF',dependencies,sourceCount:sources.length,unchanged:sources.filter(x=>x.status.startsWith('UNCHANGED')).length,changed:sources.filter(x=>!x.status.startsWith('UNCHANGED')),sources,migrations:sources.filter(x=>x.path.startsWith('prisma/migrations/')).map(x=>({path:x.path,sha256:x.currentHash,qualification:'Review originating slice for exact isolated application/replay; cumulative customer upgrade not proven'})),limits:['Hash identity is not runtime or operator acceptance','Prior synchronized test schema is not cumulative migration proof','Synthetic browser transports do not qualify actual authenticated sessions','Document provider/key recovery and employer policy admission remain open']};
fs.writeFileSync(base+'/HR-21/candidate-integrity.json',JSON.stringify(result,null,2));console.log(JSON.stringify({dependencies:dependencies.length,sources:result.sourceCount,unchanged:result.unchanged,changed:result.changed.map(x=>({path:x.path,lastSlice:x.lastSlice}))}));
