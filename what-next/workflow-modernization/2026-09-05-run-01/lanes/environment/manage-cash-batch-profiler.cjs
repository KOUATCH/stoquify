const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../../..'),saved=path.join(__dirname,'cash-batch-profiler-source-2026-09-30.json');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const importLine='import { profileCashStage } from "@/what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/cash-batch-profiler"';
const files=['app/[locale]/(dashboard)/dashboard/layout.tsx','app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx'];
function write(file,text){const fd=fs.openSync(path.join(root,file),'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd);}}
if(process.argv[2]==='apply'){
  const rows=files.map(file=>{const original=fs.readFileSync(path.join(root,file),'utf8');let updated=importLine+(original.includes('\r\n')?'\r\n':'\n')+original;const replace=(a,b)=>{assert.ok(updated.includes(a),a);updated=updated.replace(a,b);};
    if(file.endsWith('/layout.tsx')){replace('await getSession()','await profileCashStage("shell.session", () => getSession())');replace('await requireRbacContext()','await profileCashStage("shell.rbac", () => requireRbacContext())');replace('await getModuleNavigationSnapshot(rbacContext.orgId)','await profileCashStage("shell.modules", () => getModuleNavigationSnapshot(rbacContext.orgId))');}
    else{const eol=original.includes('\r\n')?'\r\n':'\n';replace('data = await getCashCommandData({','data = await profileCashStage("cash.service", () => getCashCommandData({');replace('isSuperUser: context.isSuperUser,'+eol+'        })','isSuperUser: context.isSuperUser,'+eol+'        }))');}
    return{file,original,updated,before:digest(original),during:digest(updated)};});
  fs.writeFileSync(saved,JSON.stringify({at:new Date().toISOString(),rows},null,2)+'\n',{flag:'wx'});
  for(const row of rows)write(row.file,row.updated);console.log(JSON.stringify({applied:rows.map(row=>({file:row.file,during:row.during}))}));
}else if(process.argv[2]==='restore'){
  const data=JSON.parse(fs.readFileSync(saved));for(const row of data.rows)assert.equal(digest(fs.readFileSync(path.join(root,row.file))),row.during,'Concurrent edit detected; do not overwrite');
  for(const row of data.rows){write(row.file,row.original);assert.equal(digest(fs.readFileSync(path.join(root,row.file))),row.before);}
  const receipt={at:new Date().toISOString(),restored:true,rows:data.rows.map(({file,before,during})=>({file,before,during,after:digest(fs.readFileSync(path.join(root,file)))}))};fs.writeFileSync(path.join(__dirname,'cash-batch-profiler-restored-2026-09-30.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
}else throw new Error('Use apply or restore');
