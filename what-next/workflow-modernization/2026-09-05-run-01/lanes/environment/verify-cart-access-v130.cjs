const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const pos=require(path.join(f.root,'services/pos/pos.service.ts'));
const stamp=crypto.randomUUID(),after=process.argv.includes('--after');
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,'services/pos/pos.service.ts'))).digest('hex');
const report={at:new Date().toISOString(),phase:after?'after':'before',sourceBefore:hash(),cases:[],scope:'Owned local PostgreSQL; actual shift/cart services and synthetic commercial grants. No checkout/payment/provider operation.'};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 for(const scenario of after?['legacy','active','empty','read-only','expired','suspended-dependency']:['read-only']){
  const organizationId='workflow_cart_access_'+scenario+'_'+stamp;
  await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Cart '+scenario,slug:organizationId,currency:'XAF'}});
  const user=await db.user.create({data:{organizationId,email:scenario+stamp+'@example.invalid',name:'Owned cashier'}});
  const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
  const terminal=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'Owned terminal',terminalNumber:'OWNED'}});
  const ctx={organizationId,userId:user.id,locationId:location.id,terminalId:terminal.id};
  const shift=await pos.openPOSShift({...ctx,openingBalance:0});ctx.sessionId=shift.id;
  const item=await db.item.create({data:{organizationId,slug:'owned',sku:'OWNED',nameEn:'Owned item',nameFr:'Article de test',sellingPrice:100,imageUrls:[]}});
  await db.inventoryLevel.create({data:{itemId:item.id,locationId:location.id,quantityOnHand:20,quantityAvailable:20}});
  const initial=await pos.addPOSCartLine({...ctx,itemId:item.id,quantity:1}),lineId=initial.lines[0].id;
  if(scenario!=='legacy'){
   await db.tenantModuleConfiguration.create({data:{organizationId,manifestHash:'owned-'+stamp}});
   if(scenario!=='empty')for(const moduleSlug of ['pos','sales'])await db.tenantModuleGrant.create({data:{organizationId,moduleSlug,status:scenario==='suspended-dependency'&&moduleSlug==='sales'?'suspended':'active',source:'manual_override',readOnly:scenario==='read-only'&&moduleSlug==='pos',endsAt:scenario==='expired'&&moduleSlug==='pos'?new Date(0):null}});
  }
  const operations=[()=>pos.addPOSCartLine({...ctx,itemId:item.id,quantity:1}),()=>pos.updatePOSCartLine({...ctx,salesOrderId:initial.id,lineId,quantity:3}),()=>pos.removePOSCartLine({...ctx,salesOrderId:initial.id,lineId})];
  const denied=after&&!['legacy','active'].includes(scenario);
  for(const operation of operations){if(denied)await assert.rejects(operation,e=>e.metadata?.reason==='POS_CART_WRITE_UNAVAILABLE');else await operation();}
  const retained=await pos.getActivePOSCart(ctx);assert.equal(retained.lines.length,denied?1:0);if(denied){assert.equal(retained.lines[0].quantity,1);assert.equal(retained.total,100);assert.equal(await db.auditLog.count({where:{organizationId,action:'POS_CART_WRITE_ENTITLEMENT_DENIED'}}),3);}
  await pos.closePOSShift({...ctx,actualBalance:'0'});assert.equal((await db.pOSSession.findUniqueOrThrow({where:{id:shift.id}})).status,'CLOSED');
  assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);
  report.cases.push({scenario,cartWrites:denied?'all_denied_and_cart_unchanged':'all_admitted',retainedRead:true,retainedClosure:true});
 }
 report.passed=true;
}
main().catch(e=>{report.error=f.safe(e);process.exitCode=1;}).finally(async()=>{report.sourceAfter=hash();report.sourceStable=report.sourceBefore===report.sourceAfter;const file=path.join(__dirname,'cart-access-v130-'+report.phase+'-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await db.$disconnect();}});
