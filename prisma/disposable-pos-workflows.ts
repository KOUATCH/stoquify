import { createHash } from 'node:crypto';
import { db } from './db';
import { openPOSShift, addPOSCartLine, getActivePOSCart, commitPOSSale } from '../services/pos/pos.service';
import { acquirePOSCheckout, preparePOSCheckout } from '../services/pos/checkout.service';
import { posCartRevision } from '../services/pos/cart-revision';

const stableUuid=(value:string)=>{const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
export async function seedPOSSales(org:string,actor:{actorId:string;sessionId:string;sessionToken:string}) {
  const evidence=[];
  for(let branch=0;branch<2;branch++) {
    const terminalId=`${org}_till_${branch}`,locationId=`${org}_loc_${branch}`;
    await db.pOSStation.upsert({where:{id:terminalId},update:{},create:{id:terminalId,organizationId:org,locationId,terminalNumber:`SYNTH-${branch+1}`,name:`Synthetic checkout ${branch+1}`,hasCashDrawer:true}});
    let session=await db.pOSSession.findFirst({where:{organizationId:org,terminalId,status:'ACTIVE'}});
    if(!session){await openPOSShift({organizationId:org,userId:actor.actorId,locationId,terminalId,openingBalance:0,notes:'Synthetic current-day trading'});session=await db.pOSSession.findFirstOrThrow({where:{organizationId:org,terminalId,status:'ACTIVE'}});}
    const scope={organizationId:org,userId:actor.actorId,locationId,terminalId,sessionId:session.id,checkoutLeaseId:stableUuid(terminalId)};
    for(let n=0;n<6;n++){
      const clientCommitId=`${org}:pos:${branch}:${n}`;
      const previous=await db.pOSCommitResult.findUnique({where:{organizationId_terminalId_clientCommitId:{organizationId:org,terminalId,clientCommitId}}});
      if(previous){if(previous.status!=='COMPLETED')throw new Error('Retained checkout requires recovery: '+clientCommitId);evidence.push({clientCommitId,salesOrderId:previous.salesOrderId,reused:true});continue;}
      await acquirePOSCheckout(scope);
      const cartBefore=await getActivePOSCart(scope);
      const expected=new Map(Array.from({length:3},(_,i)=>[`${org}_item_${(n*2+i)%12}`,1+(n%2)]));
      const existing=cartBefore?await db.salesOrder.findUniqueOrThrow({where:{id:cartBefore.id},include:{lines:true}}):null;
      const actual=new Map<string,number>();
      for(const line of existing?.lines||[])actual.set(line.itemId,(actual.get(line.itemId)||0)+Number(line.quantity));
      for(const [itemId,quantity]of actual)if(!expected.has(itemId)||quantity<0||quantity>expected.get(itemId)!)throw new Error('Unfinished POS cart conflicts with expected synthetic sale; review before recovery');
      // Recover interruption after any individual line without duplicating it.
      for(const [itemId,quantity]of expected){const missing=quantity-(actual.get(itemId)||0);if(missing)await addPOSCartLine({...scope,itemId,quantity:missing});}
      const cart=await getActivePOSCart(scope);
      if(!cart)throw new Error('No active POS cart');
      const source=await db.salesOrder.findUniqueOrThrow({where:{id:cart.id},include:{lines:true}});
      if(source.lines.length!==expected.size||source.lines.some(line=>Number(line.quantity)!==expected.get(line.itemId)))throw new Error('POS cart does not exactly match the expected synthetic sale');
      const request={...scope,salesOrderId:source.id,clientCommitId,expectedCartRevision:posCartRevision(source),tenders:[{method:'CASH' as const,amount:Number(source.total)}],receipt:{channel:'NONE' as const},notes:'Synthetic cash sale; no receipt delivery requested'};
      await preparePOSCheckout(request);
      await commitPOSSale(request,{sessionId:actor.sessionId,sessionToken:actor.sessionToken});
      const committed=await db.pOSCommitResult.findUniqueOrThrow({where:{organizationId_terminalId_clientCommitId:{organizationId:org,terminalId,clientCommitId}}});
      const replay=await commitPOSSale(request,{sessionId:actor.sessionId,sessionToken:actor.sessionToken});
      evidence.push({clientCommitId,salesOrderId:committed.salesOrderId,status:committed.status,replayReturned:!!replay});
    }
  }
  return evidence;
}
