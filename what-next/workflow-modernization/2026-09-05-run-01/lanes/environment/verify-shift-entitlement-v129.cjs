const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const pos=require(path.join(f.root,'services/pos/pos.service.ts')),dbExport=require(path.join(f.root,'prisma/db.ts'));
const stamp=crypto.randomUUID(),files=['services/pos/pos.service.ts','services/pos/shift-opening-access.ts','services/modules/module-entitlement.service.ts','services/modules/module-admission.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),cases:[],scope:'Owned PostgreSQL actual shift services, fixture grants and controlled pre-admission interleaving. No tender/payment/provider operation; local close outbox retained, not delivered.'};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 for(const scenario of ['legacy','active','empty','read-only','expired','not-started','suspended-dependency','revoked-before-admission']){
  const organizationId='workflow_shift_access_'+scenario+'_'+stamp;
  await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Shift '+scenario,slug:organizationId,currency:'XAF'}});
  const user=await db.user.create({data:{organizationId,email:scenario+stamp+'@example.invalid',name:'Owned cashier'}});
  const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
  const terminal=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'Owned terminal',terminalNumber:'OWNED'}});
  const ctx={organizationId,userId:user.id,locationId:location.id,terminalId:terminal.id};
  const existing=await pos.openPOSShift({...ctx,openingBalance:0});assert.ok(existing?.id);
  const second=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'New shift terminal',terminalNumber:'SECOND'}});
  const next={...ctx,terminalId:second.id};
  if(scenario!=='legacy'){
   await db.tenantModuleConfiguration.create({data:{organizationId,manifestHash:'owned-'+stamp}});
   if(scenario!=='empty')for(const moduleSlug of ['pos','sales'])await db.tenantModuleGrant.create({data:{organizationId,moduleSlug,status:scenario==='suspended-dependency'&&moduleSlug==='sales'?'suspended':'active',source:'manual_override',readOnly:scenario==='read-only'&&moduleSlug==='pos',endsAt:scenario==='expired'&&moduleSlug==='pos'?new Date(0):null,startsAt:scenario==='not-started'&&moduleSlug==='pos'?new Date(Date.now()+86400000):null}});
  }
  if(scenario==='revoked-before-admission'){
   let changed=false;dbExport.db=db.$extends({query:{pOSStation:{async findFirst({args,query}){const value=await query(args);if(!changed&&args.where?.id===second.id){changed=true;await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId,moduleSlug:'pos'}},data:{readOnly:true}});}return value;}}}});
  }
  const allowed=['legacy','active'].includes(scenario),row={scenario};report.cases.push(row);
  try{
   if(allowed){const opened=await pos.openPOSShift({...next,openingBalance:0});assert.ok(opened?.id);await pos.closePOSShift({...next,sessionId:opened.id,actualBalance:'0'});row.newShift='admitted';}
   else{await assert.rejects(()=>pos.openPOSShift({...next,openingBalance:0}),e=>e.metadata?.reason==='POS_SHIFT_ENTITLEMENT_UNAVAILABLE');assert.equal(await db.pOSSession.count({where:{terminalId:second.id}}),0);assert.equal(await db.cashDrawer.count({where:{terminalId:second.id}}),0);assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:second.id}})).currentSessionId,null);assert.equal(await db.auditLog.count({where:{organizationId,entityId:second.id,action:'POS_SHIFT_OPEN_ENTITLEMENT_DENIED'}}),1);row.newShift='denied_without_session_or_drawer';}
  }finally{dbExport.db=db;}
  const retained=await pos.getActivePOSSession(ctx);assert.equal(retained.id,existing.id);
  await pos.closePOSShift({...ctx,sessionId:existing.id,actualBalance:'0'});assert.equal((await db.pOSSession.findUniqueOrThrow({where:{id:existing.id}})).status,'CLOSED');row.retainedClosure=true;
  await assert.rejects(()=>pos.openPOSShift({...next,organizationId:'wrong-org',openingBalance:0}),/Terminal not found/);
  assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);
 }
 report.passed=true;
}
main().catch(e=>{report.error=f.safe(e);process.exitCode=1;}).finally(async()=>{dbExport.db=db;report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'shift-entitlement-v129-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await db.$disconnect();}});
