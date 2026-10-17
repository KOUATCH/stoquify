const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../../..');
function edit(file,work){const target=path.join(root,file),before=fs.readFileSync(target,'utf8'),after=work(before);if(before===after)throw Error('No change');const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,after,{flag:'wx'});fs.renameSync(pending,target);}
edit('actions/evidence/proof-trail.actions.ts',source=>{
 for(const [subject,moduleSlug] of [['journal.entry','accounting'],['reconciliation.run','payment_reconciliation'],['payment.transaction','payment_reconciliation'],['close.run','close_assurance']]){
  const marker='permission: SUBJECT_PERMISSION_MAP["'+subject+'"],';if(!source.includes(marker))throw Error('Missing subject '+subject);
  source=source.replace(marker,()=>marker+'\n    module: { moduleSlug: "'+moduleSlug+'", accessIntent: "read", mode: "enforce", audit: true, surface: "evidence.proof-trail.'+subject+'" },');
 }
 return source;
});
edit('what-next/workflow-modernization/2026-09-05-run-01/run-proof-portal-checks.cjs',s=>s.replace("const tests=[", "const tests=['actions/evidence/__tests__/proof-trail.module-boundary.test.ts','services/_shared/__tests__/protect.test.ts',").replace("const changed=[", "const changed=['actions/evidence/proof-trail.actions.ts','actions/evidence/__tests__/proof-trail.module-boundary.test.ts',").replace("'lib/security/rbac-permissions.ts'", "'lib/security/rbac-permissions.ts','services/_shared/protect.ts'"));
