const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const pos=require(path.join(f.root,'services/pos/pos.service.ts')),modules=require(path.join(f.root,'services/modules/module-entitlement.service.ts'));
const stamp=crypto.randomUUID(),files=['services/pos/pos.service.ts','services/modules/module-entitlement.service.ts','services/modules/module-admission.service.ts','actions/pos/session.actions.ts','actions/pos/tender.actions.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),sourcesBefore:hashes(),cases:[],scope:'Owned PostgreSQL real services. Commercial guard evaluated directly, not a live tender action. No sale commit, provider or payment executed. Permitted shift close creates local event/outbox/audit only; no delivery worker invoked.'};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 for(const scenario of ['active','empty-grants','read-only','expired','suspended-dependency','stopped-pos','stopped-sales']){
  const organizationId='workflow_pos_policy_'+scenario+'_'+stamp;
  await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'POS '+scenario,slug:organizationId,currency:'XAF'}});
  const user=await db.user.create({data:{organizationId,email:scenario+stamp+'@example.invalid',name:'Owned cashier'}});
  const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
  const terminal=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'Owned terminal',terminalNumber:'OWNED'}});
  const ctx={organizationId,userId:user.id,locationId:location.id,terminalId:terminal.id};
  await db.tenantModuleConfiguration.create({data:{organizationId,manifestHash:'owned-'+stamp,newWorkStoppedModules:scenario==='stopped-pos'?['pos']:scenario==='stopped-sales'?['sales']:[]}});
  if(scenario!=='empty-grants')for(const moduleSlug of ['pos','sales'])await db.tenantModuleGrant.create({data:{organizationId,moduleSlug,status:scenario==='suspended-dependency'&&moduleSlug==='sales'?'suspended':'active',source:'manual_override',readOnly:scenario==='read-only'&&moduleSlug==='pos',endsAt:scenario==='expired'&&moduleSlug==='pos'?new Date(0):null}});
  const guard=await modules.observeModuleAccess({organizationId,userId:user.id,moduleSlug:'pos',surfaceType:'action',surface:'owned-policy-observation',accessIntent:'write',mode:'enforce',audit:false});
  const readGuard=await modules.observeModuleAccess({organizationId,userId:user.id,moduleSlug:'pos',surfaceType:'action',surface:'owned-policy-observation',accessIntent:'read',mode:'enforce',audit:false});
  const row={scenario,commercialWriteAllowed:guard.allowed,commercialReadAllowed:readGuard.allowed,commercialReason:guard.reason};report.cases.push(row);
  if(scenario.startsWith('stopped')){
   await assert.rejects(()=>pos.openPOSShift({...ctx,openingBalance:0}),e=>e.metadata?.reason==='MODULE_NEW_WORK_STOPPED');
   assert.equal(await db.pOSSession.count({where:{organizationId}}),0);row.shiftOpen='denied_by_stop_policy';
  }else{
   const shift=await pos.openPOSShift({...ctx,openingBalance:0});assert.ok(shift?.id);row.shiftOpen='admitted';
   await db.tenantModuleConfiguration.update({where:{organizationId},data:{newWorkStoppedModules:['pos']}});
   const retained=await pos.getActivePOSSession(ctx);assert.equal(retained.id,shift.id);
   const closed=await pos.closePOSShift({...ctx,sessionId:shift.id,actualBalance:'0'});assert.equal(closed.sessionId,shift.id);assert.equal((await db.pOSSession.findUniqueOrThrow({where:{id:shift.id}})).status,'CLOSED');
   assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}})).currentSessionId,null);
   row.closeAfterStop='closed_with_retained_event';assert.equal(await db.auditLog.count({where:{organizationId,action:'POS_SHIFT_CLOSED'}}),1);
  }
  assert.equal(guard.allowed,['active','stopped-pos','stopped-sales'].includes(scenario));
  assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);
 }
 report.observationsVerified=true;report.finding='Commercial denial does not prevent opening a shift; stop-new-work policy does. Closure remains possible after stop, including commercially restricted fixtures. This is an access-consistency gap, not a passing security certification.';
}
main().catch(e=>{report.error=f.safe(e);process.exitCode=1;}).finally(async()=>{report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);const file=path.join(__dirname,'pos-policy-v128-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await db.$disconnect();}});
