import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/prisma/db'
import { baseFixture, assertDisposableTarget } from './cross-workflow.phase3.fixture'
import { createPurchaseOrder as legacyCreate } from '@/services/purchase-order/purchase-order.service'
import { createPurchaseOrderFromLegacyIntent as create, hasRetainedPurchaseAuthoringIntent, savePurchaseAuthoring, preparePurchaseAuthoring } from '@/services/purchase-order/purchase-order-authoring.service'

const evidence: unknown[] = []
beforeAll(assertDisposableTarget)
afterAll(async () => { writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!, 'authoring-reconciliation.json'), JSON.stringify(evidence,null,2)); await db.$disconnect() })
async function fixture() {
 const f=await baseFixture(), permissions=['purchases.orders.create','purchases.orders.read']
 const role=await db.role.create({data:{organizationId:f.organizationId,code:'CLOSURE',nameEn:'Closure buyer',permissions}})
 await db.user.update({where:{id:f.userId},data:{isVerified:true,emailVerified:true,roles:{connect:{id:role.id}}}})
 const session=await db.session.create({data:{userId:f.userId,token:randomUUID(),expiresAt:new Date(Date.now()+3600000)}})
 const supplier=await db.supplier.create({data:{organizationId:f.organizationId,code:randomUUID(),name:'Closure supplier'}})
 const date=new Date().toISOString().slice(0,10)
 const payload={organizationId:f.organizationId,createdById:f.userId,supplierId:supplier.id,locationId:f.locationId,date,expectedDeliveryDate:date,shippingCost:0,orderLines:[{itemId:f.itemId,quantity:1,unitPrice:100,taxRate:0,discount:0}]}
 return {...f,roleId:role.id,ctx:{orgId:f.organizationId,userId:f.userId,permissions,sessionId:session.id,sessionToken:session.token},payload}
}
it('reproduces two legacy results and converges concurrent retained submissions on one durable result',async()=>{
 const f=await fixture()
 const old=await Promise.all([legacyCreate(f.payload),legacyCreate(f.payload)])
 expect(old[0].id).not.toBe(old[1].id)
 const command={id:randomUUID(),kind:'create' as const,payload:f.payload}
 const results=await Promise.all([create(f.ctx,command),create(f.ctx,command)])
 expect(results[0].receipt).toEqual(results[1].receipt)
 expect(await db.purchaseOrder.count({where:{organizationId:f.organizationId}})).toBe(3)
 expect(await db.businessEvent.count({where:{organizationId:f.organizationId,eventType:'purchase_order.authoring_created'}})).toBe(1)
 expect(await db.inventoryTransaction.count({where:{organizationId:f.organizationId}})).toBe(0)
 expect(await db.journalEntry.count({where:{organizationId:f.organizationId}})).toBe(0)
 await expect(create(f.ctx,{...command,payload:{...f.payload,notes:'changed'}})).rejects.toThrow()
 evidence.push({scenario:'B5 legacy reproduction / concurrent replay / changed payload',organizationId:f.organizationId,legacyIds:old.map(x=>x.id),receipt:results[0].receipt,orders:3,createdEvents:1,stockMovements:0,journals:0})
})
it('freezes clone source content and recovers its receipt with new writes disabled',async()=>{
 const f=await fixture(),source=await legacyCreate(f.payload),command={id:randomUUID(),kind:'clone' as const,payload:{id:source.id,organizationId:f.organizationId}}
 const first=await create(f.ctx,command)
 await db.purchaseOrder.update({where:{id:source.id},data:{notes:'source changed after first clone'}})
 process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED='false'
 try {
  expect(await hasRetainedPurchaseAuthoringIntent(f.organizationId,f.userId,command.id)).toBe(true)
  expect((await create(f.ctx,command)).receipt).toEqual(first.receipt)
  await expect(create(f.ctx,{...command,id:randomUUID()})).rejects.toThrow()
 } finally {process.env.PURCHASE_ORDER_AUTHORING_WRITES_ENABLED='true'}
 expect(await db.purchaseOrder.count({where:{organizationId:f.organizationId}})).toBe(2)
 evidence.push({scenario:'B5 frozen clone + flag rollback',receipt:first.receipt,orders:2})
})
it('rechecks stored permissions, live sessions and tenant-owned references',async()=>{
 const f=await fixture(),other=await fixture(),command={id:randomUUID(),kind:'create' as const,payload:f.payload}
 await db.role.update({where:{id:f.roleId},data:{permissions:[]}})
 await expect(create(f.ctx,command)).rejects.toThrow()
 await db.role.update({where:{id:f.roleId},data:{permissions:f.ctx.permissions}})
 await expect(create(f.ctx,{...command,payload:{...f.payload,locationId:other.locationId}})).rejects.toThrow()
 await db.session.delete({where:{id:f.ctx.sessionId}})
 await expect(create(f.ctx,command)).rejects.toThrow()
 expect(await db.purchaseOrder.count({where:{organizationId:f.organizationId}})).toBe(0)
 evidence.push({scenario:'B5 stored authority / session / foreign location',organizationId:f.organizationId,orders:0})
})
it('recovers an interrupted create transaction without another business result',async()=>{
 const f=await fixture(),command={id:randomUUID(),kind:'create' as const,payload:f.payload}
 // Fail the final audit insert after the PO insert; the trigger is scoped to this synthetic actor.
 const name='closure_'+randomUUID().replaceAll('-','')
 await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."userId" = '${f.userId}' AND NEW.action = 'PO_AUTHORING_CREATED' THEN RAISE EXCEPTION 'closure final-audit fault'; END IF; RETURN NEW; END $$`)
 await db.$executeRawUnsafe(`CREATE TRIGGER ${name} BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION ${name}()`)
 try { await expect(create(f.ctx,command)).rejects.toThrow(); expect(await db.purchaseOrder.count({where:{organizationId:f.organizationId}})).toBe(0) }
 finally { await db.$executeRawUnsafe(`DROP TRIGGER ${name} ON audit_logs`); await db.$executeRawUnsafe(`DROP FUNCTION ${name}()`)}
 const recovered=await create(f.ctx,command)
 expect(await db.purchaseOrder.count({where:{organizationId:f.organizationId}})).toBe(1)
 evidence.push({scenario:'B5 final transaction rollback and same-key recovery',receipt:recovered.receipt,orders:1})
})
it('prepares synthetic saved work for authenticated browser recovery, without creating an order',async()=>{
 const f=JSON.parse(readFileSync(join(process.cwd(),'.codex-tmp/workflow-closure-private.json'),'utf8')).actor
 const session=await db.session.findFirstOrThrow({where:{userId:f.userId,expiresAt:{gt:new Date()}},orderBy:{createdAt:'desc'}})
 const ctx={orgId:f.organizationId,userId:f.userId,permissions:f.permissions,sessionId:session.id,sessionToken:session.token}
 const date=new Date().toISOString().slice(0,10),rows=[]
 for(const locale of ['en','fr']) {
  const id=randomUUID(),content={supplierId:f.supplierId,locationId:f.locationId,date,expectedDeliveryDate:date,paymentTerms:'Net 30 days',notes:'Synthetic browser closure',shippingCost:'0',orderLines:[{itemId:f.itemId,quantity:'1',unitPrice:'100',taxRate:'0',discount:'0',notes:''}]}
  const title='Closure recovery '+locale+' '+id.slice(0,8)
  await savePurchaseAuthoring(ctx,{id,expectedRevision:0,title,content})
  await preparePurchaseAuthoring(ctx,{id,expectedRevision:1}); rows.push({id,locale,title})
 }
 writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'browser-prepared.json'),JSON.stringify(rows,null,2))
})
