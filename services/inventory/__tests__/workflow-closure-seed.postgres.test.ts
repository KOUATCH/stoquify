import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { db } from '@/prisma/db'
import { hashPassword } from '@/lib/password'
import { baseFixture, assertDisposableTarget } from './cross-workflow.phase3.fixture'

it('seeds only synthetic authenticated closure actors and catalog on the explicit retained disposable target', async () => {
  assertDisposableTarget()
  const privatePath=join(process.cwd(),'.codex-tmp/workflow-closure-private.json'), saved=JSON.parse(readFileSync(privatePath,'utf8'))
  if(saved.actor) throw new Error('Closure fixture already exists; do not replace retained evidence')
  const f=await baseFixture(), permissions=['purchases.orders.create','purchases.orders.read','purchases.orders.update','purchases.orders.approve','purchases.orders.receive','inventory.items.read','inventory.items.create','inventory.movements.read','inventory.transfers.create','inventory.transfers.read','inventory.locations.read','suppliers.read','locations.read','pos.sales.read','pos.sales.create']
  const role=await db.role.create({data:{organizationId:f.organizationId,code:'CLOSURE_BUYER',nameEn:'Synthetic closure purchaser',permissions}})
  const password=await hashPassword(saved.password)
  const actor=await db.user.update({where:{id:f.userId},data:{isActive:true,isVerified:true,emailVerified:true,password,firstName:'Closure',lastName:'Purchaser',roles:{connect:{id:role.id}}}})
  await db.account.create({data:{id:randomUUID(),accountId:actor.id,userId:actor.id,providerId:'credential',password}})
  const supplier=await db.supplier.create({data:{organizationId:f.organizationId,code:randomUUID(),name:'Closure synthetic supplier'}})
  const other=await baseFixture()
  writeFileSync(privatePath,JSON.stringify({...saved,actor:{...f,email:actor.email,roleId:role.id,supplierId:supplier.id,permissions},foreign:{organizationId:other.organizationId,locationId:other.locationId,itemId:other.itemId}}))
  writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'browser-fixture.json'),JSON.stringify({synthetic:true,database:'stoquify_pos_audit_20261026_d30f',organizationId:f.organizationId,actorId:f.userId,roleId:role.id,locationId:f.locationId,itemId:f.itemId,supplierId:supplier.id},null,2))
  expect(actor.emailVerified).toBe(true)
})
afterAll(()=>db.$disconnect())
