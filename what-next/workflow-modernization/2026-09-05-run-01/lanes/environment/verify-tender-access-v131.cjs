const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const pos=require(path.join(f.root,'services/pos/pos.service.ts')),periods=require(path.join(f.root,'services/accounting/periods.service.ts'));
const stamp=crypto.randomUUID(),after=process.argv.includes('--after'),report={at:new Date().toISOString(),phase:after?'after':'before',checks:[],scope:'Owned local PostgreSQL, actual cash sale/posting/correction services, synthetic accounts and rules; no external payment, delivery, statutory approval or live activation.'};
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,'services/pos/pos.service.ts'))).digest('hex');report.sourceBefore=hash();
async function fixture(label){
 const organizationId='workflow_tender_'+label+'_'+stamp;
 await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Tender '+label,slug:organizationId,currency:'XAF'}});
 const user=await db.user.create({data:{organizationId,email:label+stamp+'@example.invalid',name:'Owned cashier'}}),location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}}),terminal=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'Owned terminal',terminalNumber:'OWNED'}});
 const ctx={organizationId,userId:user.id,locationId:location.id,terminalId:terminal.id};
 const shift=await pos.openPOSShift({...ctx,openingBalance:0});ctx.sessionId=shift.id;
 const item=await db.item.create({data:{organizationId,slug:'owned',sku:'OWNED',nameEn:'Owned item',nameFr:'Article de test',sellingPrice:100,costPrice:20,imageUrls:[]}});
 await db.inventoryLevel.create({data:{itemId:item.id,locationId:location.id,quantityOnHand:20,quantityAvailable:20,averageCost:20,totalValue:400}});
 const cart=await pos.addPOSCartLine({...ctx,itemId:item.id,quantity:1});
 await periods.createFiscalYearWithPeriods(organizationId,{name:'Owned 2026',startDate:new Date('2026-01-01T00:00:00Z'),endDate:new Date('2026-12-31T23:59:59.999Z')},user.id);
 const accounts=[];for(const [code,type,normalBalance]of [['OWNED-AR','ASSET','DEBIT'],['OWNED-SALES','REVENUE','CREDIT'],['OWNED-CASH','ASSET','DEBIT']])accounts.push(await db.chartOfAccount.create({data:{organizationId,code,nameEn:'Synthetic '+code,type,normalBalance}}));
 for(const type of ['SALES','CASH','GENERAL'])await db.journal.create({data:{organizationId,code:'OWNED-'+type,nameEn:'Synthetic '+type,type,isDefault:true,isActive:true}});
 for(const [sourceType,postingPurpose,debit,credit]of [['POS_SALE','SALE_COMPLETION',accounts[0],accounts[1]],['POS_PAYMENT','PAYMENT_RECEIPT',accounts[2],accounts[0]]])await db.postingRule.create({data:{organizationId,code:'OWNED-'+sourceType,nameEn:'Synthetic rule; no statutory approval',sourceType,postingPurpose,lines:{create:[{organizationId,lineNumber:1,side:'DEBIT',accountId:debit.id,amountSource:'GROSS_AMOUNT'},{organizationId,lineNumber:2,side:'CREDIT',accountId:credit.id,amountSource:'GROSS_AMOUNT'}]}}});
 for(const [sourceType,postingPurpose]of [['POS_REFUND','REFUND'],['POS_VOID','VOID']])await db.postingRule.create({data:{organizationId,code:'OWNED-'+sourceType,nameEn:'Synthetic reversal; no statutory approval',sourceType,postingPurpose,lines:{create:[{organizationId,lineNumber:1,side:'DEBIT',accountId:accounts[1].id,amountSource:'GROSS_AMOUNT'},{organizationId,lineNumber:2,side:'CREDIT',accountId:accounts[2].id,amountSource:'GROSS_AMOUNT'}]}}});
 return{ctx,itemId:item.id,cartId:cart.id,commit:{...ctx,expectedCartRevision:cart.revision,clientCommitId:'owned-'+stamp,salesOrderId:cart.id,tenders:[{method:'CASH',amount:100}],receipt:{channel:'NONE'}},correction:{...ctx,salesOrderId:cart.id,reason:'Owned controlled correction'}};
}
async function restrict(x){await db.tenantModuleConfiguration.create({data:{organizationId:x.ctx.organizationId,manifestHash:'owned-'+stamp}});for(const moduleSlug of ['pos','sales'])await db.tenantModuleGrant.create({data:{organizationId:x.ctx.organizationId,moduleSlug,status:'active',source:'manual_override',readOnly:moduleSlug==='pos'}});}
async function snapshot(x){const organizationId=x.ctx.organizationId,orderBy={id:'asc'};return JSON.stringify(await Promise.all([db.salesOrder.findUnique({where:{id:x.cartId}}),db.inventoryLevel.findMany({where:{itemId:x.itemId},orderBy}),db.payment.findMany({where:{organizationId},orderBy}),db.paymentRefund.findMany({where:{organizationId},orderBy}),db.journalEntry.findMany({where:{organizationId},orderBy}),db.pOSSession.findUnique({where:{id:x.ctx.sessionId}}),db.cashDrawer.findMany({where:{terminalId:x.ctx.terminalId},orderBy}),db.pOSCommitResult.findMany({where:{organizationId},orderBy})]));}
async function main(){await f.helper.withClient(f.target,f.helper.assertOwned);
 for(const operation of ['commit','refund','void']){
  const x=await fixture(operation);if(operation!=='commit'){const committed=await pos.commitPOSSale(x.commit);assert.equal(committed.status,'COMPLETED');assert.equal(await db.journalEntry.count({where:{organizationId:x.ctx.organizationId,status:'POSTED'}}),2);}
  const preflight=await require(path.join(f.root,'services/modules/module-entitlement.service.ts')).observeModuleAccess({organizationId:x.ctx.organizationId,userId:x.ctx.userId,actorPermissions:['pos.use','pos.transactions.refund','pos.transactions.void'],moduleSlug:'pos',surfaceType:'action',surface:`actions/pos/tender.actions.ts:${operation}POSSaleAction`,accessIntent:'write',mode:'enforce',audit:false});assert.equal(preflight.allowed,true);
  await restrict(x);const before=await snapshot(x),call=()=>operation==='commit'?pos.commitPOSSale(x.commit):operation==='refund'?pos.refundPOSSale(x.correction):pos.voidPOSSale(x.correction);
  if(after){await assert.rejects(call,e=>e.metadata?.reason==='POS_TENDER_WRITE_UNAVAILABLE');assert.equal(await snapshot(x),before);assert.equal(await db.auditLog.count({where:{organizationId:x.ctx.organizationId,action:'POS_TENDER_WRITE_ENTITLEMENT_DENIED'}}),1);}else await call();
  if(after){
   await db.tenantModuleGrant.updateMany({where:{organizationId:x.ctx.organizationId,moduleSlug:'pos'},data:{readOnly:false}});
   const result=await call();assert.equal(result.status,operation==='commit'?'COMPLETED':operation==='refund'?'RETURNED':'CANCELLED');
   const entries=await db.journalEntry.findMany({where:{organizationId:x.ctx.organizationId},include:{lines:true}});
   for(const entry of entries){assert.equal(entry.status,'POSTED');assert.equal(entry.lines.reduce((n,l)=>n+Number(l.debit)-Number(l.credit),0),0);}
   assert.equal(entries.length,operation==='commit'?2:3);
   const stock=await db.inventoryLevel.findFirstOrThrow({where:{itemId:x.itemId}});assert.equal(Number(stock.quantityOnHand),operation==='commit'?19:20);
   await db.tenantModuleGrant.updateMany({where:{organizationId:x.ctx.organizationId,moduleSlug:'pos'},data:{readOnly:true}});
   const persisted=await snapshot(x);const replay=await pos.commitPOSSale(x.commit);assert.equal(replay.replayed,true);assert.equal(await snapshot(x),persisted);
   await assert.rejects(()=>pos.commitPOSSale({...x.commit,userId:'foreign-cashier'}));assert.equal(await snapshot(x),persisted);
   report.checks.push({operation,preflightAllowedBeforeGrantChanged:true,restrictedWrite:'denied_all_financial_state_unchanged',authorizedExplicitRecovery:true,balancedPostedEntries:entries.length,stockQuantity:Number(stock.quantityOnHand),exactServiceReplayAfterRestriction:true,foreignActorReplayDenied:true,passed:true});
  }else report.checks.push({operation,restrictedWrite:'admitted',passed:true});
 }
 report.passed=true;
}
module.exports={fixture,restrict,snapshot};
if(require.main===module)main().catch(e=>{report.error=f.safe(e);process.exitCode=1}).finally(async()=>{report.sourceAfter=hash();report.sourceStable=report.sourceBefore===report.sourceAfter;const file=path.join(__dirname,'tender-access-v131-'+report.phase+'-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'})}finally{await db.$disconnect()}});
