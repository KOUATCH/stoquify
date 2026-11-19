/** Local synthetic operations: signed offline evidence and derived reporting projections. */
import { createHash, createPrivateKey, createPublicKey, createECDH, sign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { signIn } from './disposable-business-workflows';
import { registerOfflineDevice, ingestOfflineSyncBatch, buildOfflineEventEntryHash } from '../services/pos/offline-sync.service';
import { hashBusinessPayload } from '../services/events/business-event.service';
import { createCashShortagePolicyDraft, approveCashShortagePolicy } from '../services/leakage/cash-shortage-policy.service';
import { ensurePosCashShortageWorkerCheckpoint } from '../services/leakage/pos-cash-shortage-worker-checkpoint-persistence.service';
import { proposeNoActivityEvidence, decideNoActivityEvidence } from '../services/reconciliation/no-activity-evidence.service';
type Actor=Awaited<ReturnType<typeof signIn>>;
const sha=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
function ensure(value:unknown,message:string):asserts value {if(!value)throw Error(message);}
export async function seedRemainingCommerceOperations(org:string,actors:Record<string,Actor>,out:string) {
 const {OUT,assertManifestTarget}=require('../scripts/disposable-business-dataset.cjs');
 const manifest=JSON.parse(readFileSync(path.join(out,'manifest.json'),'utf8'));
 ensure(process.env.NODE_ENV==='test'&&path.resolve(out)===path.resolve(OUT)&&/^synth12_(douala|yaounde|bafoussam)$/.test(org),'Owned synthetic context required');
 assertManifestTarget(new URL(process.env.DATABASE_URL!),manifest);
 const report:{scenarios:any[],issues:any[]}={scenarios:[],issues:[]};
 const run=async(name:string,action:()=>Promise<unknown>)=>{console.log('Commerce operations',org,name);try{report.scenarios.push({name,result:await action()});}catch(error){report.issues.push({scenario:name,message:error instanceof Error?error.message:String(error)});}};
 await run('signed-offline-session-and-signature-quarantine',async()=>{
  const terminalId=org+'_remaining_offline_terminal',locationId=org+'_loc_1',key=org+':remaining:offline:p256';
  await db.pOSStation.upsert({where:{id:terminalId},update:{},create:{id:terminalId,organizationId:org,locationId,terminalNumber:'SYN-OFFLINE',name:'Synthetic offline signature test terminal',hasCashDrawer:false}});
  // The shipped verifier explicitly uses SHA-256, so enroll a P-256 signing key.
  // Earlier unsupported Ed25519 attempts remain quarantined as honest negative evidence.
  const secret=Buffer.from(sha(process.env.AUTH_SECRET+':'+key),'hex'),ec=createECDH('prime256v1');ec.setPrivateKey(secret);
  const point=ec.getPublicKey(undefined,'uncompressed');
  const privateKey=createPrivateKey({key:{kty:'EC',crv:'P-256',d:secret.toString('base64url'),x:point.subarray(1,33).toString('base64url'),y:point.subarray(33,65).toString('base64url')},format:'jwk'});
  const signingPublicKeyPem=createPublicKey(privateKey).export({format:'pem',type:'spki'}).toString();
  const fingerprint=sha(key),policySnapshotHash=sha(key+':policy'),sourceSnapshotHash=sha(key+':source');
  let device=await db.pOSOfflineDevice.findUnique({where:{organizationId_deviceFingerprintHash:{organizationId:org,deviceFingerprintHash:fingerprint}}});
  if(!device){const registered=await registerOfflineDevice({organizationId:org,userId:actors.cashier.actorId,terminalId,locationId,deviceLabel:'Synthetic P-256 signed till',deviceFingerprintHash:fingerprint,signingPublicKeyPem,policySnapshotHash,sourceSnapshotHash,policyExpiresAt:new Date('2026-11-01T00:00:00Z'),metadata:{synthetic:true}});device=await db.pOSOfflineDevice.findUniqueOrThrow({where:{id:registered.id}});}
  let previousHash:string|null=null;
  for(let sequence=1;sequence<=2;sequence++){
   const payload={classification:'SYNTHETIC_TEST_ONLY',event:'offline-session-observation',cashOpening:0,financialTransactionClaimed:false,sequence};
   const payloadHash=hashBusinessPayload(payload),entryHash=buildOfflineEventEntryHash({deviceId:device.id,deviceSeq:sequence,eventType:'OFFLINE_SESSION_EVIDENCE',schemaVersion:1,payloadHash,prevHash:previousHash});
   const signature=(sequence===1?sign('sha256',Buffer.from(entryHash,'utf8'),privateKey):Buffer.alloc(64)).toString('base64');
   const batchKey=key+':batch:'+sequence;
   if(!await db.pOSOfflineSyncBatch.findFirst({where:{organizationId:org,deviceId:device.id,metadata:{path:['syntheticBatchKey'],equals:batchKey}}}))await ingestOfflineSyncBatch({organizationId:org,userId:actors.cashier.actorId,deviceId:device.id,terminalId,locationId,batchIdempotencyKey:batchKey,events:[{eventType:'OFFLINE_SESSION_EVIDENCE',schemaVersion:1,deviceSeq:sequence,idempotencyKey:key+':event:'+sequence,payloadHash,prevHash:previousHash,entryHash,signature,capturedAtDevice:new Date('2026-10-28T18:00:00Z'),payload,policySnapshotHash,sourceSnapshotHash}],metadata:{synthetic:true,syntheticBatchKey:batchKey,expectedInvalidSignature:sequence===2}});
   previousHash=entryHash;
  }
  const events=await db.pOSOfflineEvent.findMany({where:{organizationId:org,deviceId:device.id},orderBy:{deviceSeq:'asc'}});
  const conflicts=await db.pOSOfflineSyncConflict.findMany({where:{organizationId:org,deviceId:device.id}});
  ensure(events.length===2&&events[0].status==='PENDING_REPLAY'&&events[1].status==='QUARANTINED'&&conflicts.some(x=>x.conflictType==='SIGNATURE_INVALID'),'Offline signature boundary failed: '+JSON.stringify({events:events.map(x=>({sequence:x.deviceSeq,status:x.status,blocker:x.blockerCode})),conflicts:conflicts.map(x=>x.conflictType)}));
  return {deviceId:device.id,eventIds:events.map(x=>x.id),validEvidenceStatus:events[0].status,rejectedSignatureStatus:events[1].status,conflicts:conflicts.map(x=>({id:x.id,type:x.conflictType})),financialPostingPerformed:false};
 });
 await run('cash-shortage-policy-and-idle-worker-checkpoint',async()=>{
  let policy=await db.cashShortagePolicy.findFirst({where:{organizationId:org,currency:'XAF',effectiveFrom:new Date('2026-10-28T00:00:00Z')}});
  if(!policy){const created=await createCashShortagePolicyDraft({organizationId:org,currency:'XAF',reviewThreshold:'1000',highThreshold:'10000',minorUnitScale:0,roundingMode:'HALF_UP',effectiveFrom:new Date('2026-10-28T00:00:00Z'),mode:'observe'},actors.owner);policy=await db.cashShortagePolicy.findUniqueOrThrow({where:{id:created.policy.policyId}});}
  if(policy.status==='DRAFT')await approveCashShortagePolicy({organizationId:org,policyId:policy.id},actors.manager);
  const checkpoint=await ensurePosCashShortageWorkerCheckpoint({organizationId:org,recordedFromInclusive:'2026-10-28T00:00:00Z',recordedThroughExclusive:'2026-10-28T20:00:00Z',correlationId:org+':remaining:cash-worker',metadata:{classification:'SYNTHETIC_TEST_ONLY',dispatchPerformed:false}});
  const saved=await db.cashShortagePolicy.findUniqueOrThrow({where:{id:policy.id}});ensure(saved.status==='APPROVED'&&saved.approvedById!==saved.createdById,'Policy independent approval missing');
  return {policyId:policy.id,status:saved.status,checkpoint,externalDispatchPerformed:false};
 });
 await run('independently-reviewed-no-activity-evidence',async()=>{
  const fixtureClock=(Date as any).clock,previousTime=Date.now();
  const actual=(await db.$queryRaw<Array<{now:Date}>>`SELECT clock_timestamp() AS now`)[0].now;fixtureClock.setSystemTime(actual);
  try {
  const credentials=JSON.parse(readFileSync('.seed-artifacts/disposable-dataset-2026-10-28/credentials.json','utf8'));
  const actualOwner=await signIn(credentials.find((x:any)=>x.organizationId===org&&x.role==='owner')),actualManager=await signIn(credentials.find((x:any)=>x.organizationId===org&&x.role==='manager'));
  const account=await db.providerAccount.findFirstOrThrow({where:{organizationId:org},orderBy:{id:'asc'}});
  const period=await db.accountingPeriod.findFirstOrThrow({where:{organizationId:org,startDate:{gte:new Date('2026-09-01T00:00:00Z'),lt:new Date('2026-09-02T00:00:00Z')}}});
  const key=org+':remaining:no-activity:2026-09';
  const contents=JSON.stringify({classification:'SYNTHETIC_TEST_ONLY',providerAccountId:account.id,periodId:period.id,periodStart:period.startDate,periodEnd:period.endDate,observation:'No synthetic provider movements or open obligations in this period; checked again by the application on independent approval.'},null,2)+'\n';
  const file=path.join(out,'synthetic-documents',org+'-no-activity-2026-09.json');if(existsSync(file))ensure(readFileSync(file,'utf8')===contents,'No-activity evidence changed');else writeFileSync(file,contents);
  let evidence=await proposeNoActivityEvidence({providerAccountId:account.id,periodId:period.id,idempotencyKey:key,sourceReference:'http://127.0.0.1:3188/'+path.basename(file),sourceDocumentHash:'sha256:'+sha(contents),reason:'Synthetic local provider has no activity during September; no external bank confirmation claimed.'},actualOwner);
  if(evidence.status==='PROPOSED')evidence=await decideNoActivityEvidence({evidenceId:evidence.id,expectedEvidenceHash:evidence.evidenceHash,decision:'APPROVE'},actualManager);
  ensure(evidence.status==='APPROVED'&&evidence.proposedById!==evidence.approvedById,'Independent no-activity approval missing');
  return {evidenceId:evidence.id,status:evidence.status,providerAccountId:account.id,periodId:period.id};
  } finally {fixtureClock.setSystemTime(previousTime);}
 });
 await run('twelve-month-expense-and-daily-sales-projections',async()=>{
  // These legacy reporting tables have no business command writer. Project existing posted
  // journals and closed shifts without creating a second expense, sale, payment, or stock flow.
  let expenseCount=0;
  for(const [kind,label,fr] of [['rent','Premises rent','Loyer des locaux'],['utilities','Utilities','Eau et électricité']]){
   const categoryId=org+'_expense_'+kind;
   await db.expenseCategory.upsert({where:{id:categoryId},update:{},create:{id:categoryId,organizationId:org,nameEn:label,nameFr:fr,descriptionEn:'Synthetic reporting category for already-posted monthly journals'}});
   const journals=await db.journalEntry.findMany({where:{organizationId:org,status:'POSTED',reference:{contains:'-'+kind+'-'}},include:{lines:true},orderBy:{reference:'asc'}});
   ensure(journals.length===36,'Expected twelve months of expense journals across three branches');
   for(const journal of journals){const line=journal.lines.find(x=>Number(x.debit)>0);ensure(line&&line.locationId,'Expense source journal debit missing');
    const id=org+'_expense_'+journal.id;
    await db.expense.upsert({where:{id},update:{},create:{id,organizationId:org,expenseNumber:'SYN-'+journal.reference,description:journal.memo||label,amount:line.debit,expenseDate:journal.entryDate,categoryId,locationId:line.locationId,paymentMethod:'CASH',createdById:actors.maker.actorId,notes:JSON.stringify({classification:'SYNTHETIC_DERIVED_PROJECTION',journalEntryId:journal.id,sourceReference:journal.reference,additionalLedgerPostingPerformed:false})}});expenseCount++;
   }
  }
  let reportCount=0,lineCount=0,cashEventCount=0;
  const reservations=new Set(['RESERVATION','RESERVATION_RELEASE']);
  for(let m=0;m<12;m++)for(let branch=0;branch<2;branch++){
   const month=new Date(Date.UTC(2025,10+m,10)).toISOString().slice(0,7),date=new Date(month+'-10T00:00:00Z'),end=new Date(date.getTime()+86400000),locationId=org+'_loc_'+branch;
   const session=await db.pOSSession.findFirstOrThrow({where:{organizationId:org,terminalId:org+'_hist_'+month+'_'+branch,status:'CLOSED'},include:{cashDrawerTransactions:{include:{user:true}},salesOrders:{where:{status:'COMPLETED'},include:{lines:{include:{item:true}},payments:true}}}});
   const orders=session.salesOrders;ensure(orders.length===6,'Closed historical shift must retain six completed sales');
   const id=org+'_daily_'+month+'_'+branch;
   const allLines=orders.flatMap(x=>x.lines),ids=[...new Set(allLines.map(x=>x.itemId))];
   const flows=await db.inventoryTransaction.findMany({where:{organizationId:org,locationId,itemId:{in:ids},effectiveAt:{lt:end}}});
   const items=ids.map(itemId=>{const rows=allLines.filter(x=>x.itemId===itemId),item=rows[0].item,quantity=rows.reduce((a,x)=>a+Number(x.quantity),0),revenue=rows.reduce((a,x)=>a+Number(x.lineTotal),0),cost=quantity*Number(item.costPrice);
    const stock=(cutoff:Date)=>flows.filter(x=>x.itemId===itemId&&x.effectiveAt<cutoff&&!reservations.has(x.type)).reduce((a,x)=>a+Number(x.quantity),0);
    return {id:id+'_'+itemId,itemId,itemNameEn:item.nameEn,itemNameFr:item.nameFr,itemSku:item.sku,costPrice:item.costPrice,sellingPrice:revenue/quantity,startingQuantity:stock(date),quantitySold:quantity,endingQuantity:stock(end),cashSales:revenue,cardSales:0,mobileMoneySales:0,bankTransferSales:0,creditSales:0,totalRevenue:revenue,totalCost:cost,grossProfit:revenue-cost,margin:revenue?(revenue-cost)/revenue*100:0};});
   const totalRevenue=orders.reduce((a,x)=>a+Number(x.total),0),totalCost=items.reduce((a,x)=>a+x.totalCost,0),totalQuantitySold=items.reduce((a,x)=>a+x.quantitySold,0);
   ensure(orders.every(x=>x.payments.every(p=>p.method==='CASH')),'Historical reporting fixture expects cash-only payments');
   const cashEvents=session.cashDrawerTransactions.map(x=>({id:id+'_'+x.id,transactionType:x.type,amount:x.amount,reason:x.reason,notes:'Derived from cash drawer transaction '+x.id,balanceBefore:x.balanceBefore,balanceAfter:x.balanceAfter,timestamp:x.createdAt,userId:x.userId,userName:x.user.name}));
   const expenses=await db.expense.aggregate({where:{organizationId:org,locationId,expenseDate:{gte:date,lt:end}},_sum:{amount:true}}),totalExpenses=Number(expenses._sum.amount||0);
   const cashIn=cashEvents.reduce((a,x)=>a+Math.max(0,Number(x.balanceAfter)-Number(x.balanceBefore)),0),cashOut=cashEvents.reduce((a,x)=>a+Math.max(0,Number(x.balanceBefore)-Number(x.balanceAfter)),0);
   await db.dailySalesReport.upsert({where:{id},update:{},create:{id,organizationId:org,locationId,date,totalRevenue,totalCost,grossProfit:totalRevenue-totalCost,grossMargin:totalRevenue?(totalRevenue-totalCost)/totalRevenue*100:0,totalQuantitySold,totalTransactions:orders.length,averageTransactionValue:totalRevenue/orders.length,itemsSold:items.length,cashSales:totalRevenue,cardSales:0,mobileMoneySales:0,bankTransferSales:0,creditSales:0,totalExpenses,netProfit:totalRevenue-totalCost-totalExpenses,openingBalance:session.openingBalance,closingBalance:session.closingBalance||0,cashIn,cashOut,variance:session.variance||0,reportGeneratedById:actors.owner.actorId,isFinalized:false,notes:JSON.stringify({classification:'SYNTHETIC_DERIVED_PROJECTION',sessionId:session.id,sourceSaleIds:orders.map(x=>x.id),valuationBasis:'Constant unit cost verified in core fixture; chronological signed movements for quantities',additionalFinancialPostingPerformed:false}),itemSales:{create:items},cashDrawerTransactions:{create:cashEvents}}});
   let saved=await db.dailySalesReport.findUniqueOrThrow({where:{id},include:{itemSales:true,cashDrawerTransactions:true}});
   ensure(JSON.parse(saved.notes||'{}').classification==='SYNTHETIC_DERIVED_PROJECTION','Only owned derived reporting rows may be refreshed');
   for(const expected of items){const actual=saved.itemSales.find(x=>x.id===expected.id);ensure(actual,'Derived report item missing');if(Number(actual.startingQuantity)!==expected.startingQuantity||Number(actual.endingQuantity)!==expected.endingQuantity)await db.dailySalesReportItem.update({where:{id:actual.id},data:{startingQuantity:expected.startingQuantity,endingQuantity:expected.endingQuantity}});}
   saved=await db.dailySalesReport.findUniqueOrThrow({where:{id},include:{itemSales:true,cashDrawerTransactions:true}});
   ensure(Number(saved.totalRevenue)===totalRevenue&&saved.itemSales.length===items.length&&saved.cashDrawerTransactions.length===cashEvents.length,'Derived daily sales report differs from source');
   ensure(saved.itemSales.every(x=>{const expected=items.find(i=>i.id===x.id)!;return Number(x.startingQuantity)===expected.startingQuantity&&Number(x.endingQuantity)===expected.endingQuantity;}),'Derived chronological signed inventory quantities differ');
   reportCount++;lineCount+=items.length;cashEventCount+=cashEvents.length;
  }
  return {expenseCount,dailyReports:reportCount,reportLines:lineCount,cashEvents:cashEventCount,periods:12,additionalFinancialPostingPerformed:false};
 });
 await run('locked-unissued-synthetic-fiscal-sequence',async()=>{
  const id=org+'_fiscal_synthetic_locked';
  const sequence=await db.fiscalSequence.upsert({where:{id},update:{},create:{id,organizationId:org,countryCode:'CM',documentType:'SALES_INVOICE',fiscalYear:'2026',fiscalPeriodKey:'SYNTHETIC-TEST',scopeKey:'SYNTHETIC-UNISSUED',prefix:'TEST-DO-NOT-ISSUE',status:'LOCKED',nextNumber:1,lastIssuedNumber:0,lockedAt:new Date(),lockedById:actors.owner.actorId,metadata:{classification:'SYNTHETIC_TEST_ONLY',legalDocumentIssued:false,reason:'Unissued locked configuration; country approval is still required'}}});
  ensure(sequence.status==='LOCKED'&&sequence.lastIssuedNumber===0,'Test fiscal sequence must remain unissued');return {sequenceId:id,status:sequence.status,legalDocumentIssued:false};
 });
 return report;
}
