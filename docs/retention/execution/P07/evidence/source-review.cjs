const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../../..');
const g=JSON.parse(fs.readFileSync(path.join(root,'graphify-out/ordered-code-graph.json'),'utf8'));
const nodes=(g.nodes||[]).filter(n=>/postopeningstock|backfillcustomerreceivabledocuments|markaccountingsetupready|createapledgerposting|approvesupplierinvoice|master.data|onboarding/i.test(JSON.stringify(n)));
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'BASELINE.json'),'utf8'));
const predecessors=Object.entries(baseline.files).filter(([p])=>p.startsWith('docs/retention/execution/P03/')||p.startsWith('docs/retention/execution/P04/')||p.includes('opening-position-')).map(([p,hash])=>({path:p,unchanged:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')===hash}));
const historical=JSON.parse(fs.readFileSync(path.join(root,'docs/retention/execution/P04/evidence/SOURCE_MANIFEST.json'),'utf8')).filter(row=>/onboarding|rbac|module-entitlement|settings-route/.test(row.path)).map(row=>{
  const current=baseline.files[row.path]??crypto.createHash('sha256').update(fs.readFileSync(path.join(root,row.path))).digest('hex');
  return {path:row.path,priorSha256:row.sha256_raw,baselineSha256:current,matches:current===row.sha256_raw};
});
fs.writeFileSync(path.join(__dirname,'SOURCE_REVIEW.json'),JSON.stringify({at:new Date().toISOString(),graphDate:'2026-08-09',graphRegenerated:false,nodes,predecessors,historical},null,2));
console.log(JSON.stringify({nodes:nodes.map(n=>({id:n.id,community:n.community})),predecessorFiles:predecessors.length,allUnchanged:predecessors.every(n=>n.unchanged)}));
