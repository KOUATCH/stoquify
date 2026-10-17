const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const target=path.join(__dirname,'verify-cash-private.cjs');let s=fs.readFileSync(target,'utf8');
assert.ok(s.includes("'inventory','pos','cash_drawer'"));
s=s.replace("'inventory','pos','cash_drawer'","'inventory','sales','pos','cash_drawer'");
s=s.replace("['allowed','permission-revoked','module-suspended','retained-read']","['missing-dependency','allowed','permission-revoked','module-suspended','retained-read']");
s=s.replace("const denied=state==='permission-revoked'||state==='module-suspended';","const denied=state==='permission-revoked'||state==='module-suspended'||state==='missing-dependency';");
const marker="  const before=await effects();readCounts={drawer:0,diagnostics:0};";assert.ok(s.includes(marker));
s=s.replace(marker,()=>"  await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:own.org.id,moduleSlug:'sales'}},data:{status:state==='missing-dependency'?'suspended':'active'}});\n"+marker);
const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,s,{flag:'wx'});fs.renameSync(pending,target);
