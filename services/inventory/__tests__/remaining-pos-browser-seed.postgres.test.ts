import {randomUUID} from 'node:crypto'
import {readFileSync,writeFileSync} from 'node:fs'
import {db} from '@/prisma/db'
import {Prisma} from '@prisma/client'
import {hashPassword} from '@/lib/password'
import {assertDisposableTarget} from './cross-workflow.phase3.fixture'
import {fixture,approvedOrder,receivingCommand} from './workflow-closure-ap.fixture'
import {confirmPurchaseReceiving} from '@/services/purchase-order/purchase-receiving-workbench.service'
it('prepares an isolated authenticated POS browser actor and received inventory',async()=>{
 assertDisposableTarget()
 const saved=JSON.parse(readFileSync('.codex-tmp/workflow-closure-private.json','utf8')),f=await fixture(),order=await approvedOrder(f,3,100)
 await confirmPurchaseReceiving(await receivingCommand(f,order,3),f.receiver)
 const permissions=['pos.use','pos.read','pos.session.start','pos.session.close','pos.transactions.read','pos.transactions.refund','pos.transactions.void','inventory.items.read','locations.read','customers.read']
 await db.role.update({where:{id:f.roleId},data:{permissions}})
 const password=await hashPassword(saved.password),user=await db.user.update({where:{id:f.userId},data:{isActive:true,isVerified:true,emailVerified:true,password,roles:{connect:{id:f.roleId}}}})
 await db.account.create({data:{id:randomUUID(),accountId:user.id,userId:user.id,providerId:'credential',password}})
 // Browser acquires its own lease and accepts the existing server cart.
 await db.pOSCheckoutWorkspace.updateMany({where:{organizationId:f.organizationId},data:{leaseId:null,leaseExpiresAt:null,pendingRequest:Prisma.DbNull}})
 writeFileSync('.codex-tmp/remaining-pos-browser-private.json',JSON.stringify({...saved,actor:{...f,email:user.email,permissions}}))
 expect(user.emailVerified).toBe(true)
})
afterAll(()=>db.$disconnect())
