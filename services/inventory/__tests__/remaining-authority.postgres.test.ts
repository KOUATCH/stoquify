import {randomUUID} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {PrismaClient} from '@prisma/client'
import {db} from '@/prisma/db'
import {assertDisposableTarget} from './cross-workflow.phase3.fixture'
import {fixture,approvedOrder,receivingCommand} from './workflow-closure-ap.fixture'
import {confirmPurchaseReceiving} from '@/services/purchase-order/purchase-receiving-workbench.service'
import {commitPOSSale,refundPOSSale,voidPOSSale} from '@/services/pos/pos.service'

const evidence:unknown[]=[]
beforeAll(assertDisposableTarget)
afterAll(async()=>{writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'authority-reconciliation.json'),JSON.stringify(evidence,null,2));await db.$disconnect()})
async function posFixture(){
 const f=await fixture(),order=await approvedOrder(f,3,100)
 await confirmPurchaseReceiving(await receivingCommand(f,order,3),f.receiver)
 await db.user.update({where:{id:f.userId},data:{isActive:true,isVerified:true,emailVerified:true,roles:{connect:{id:f.roleId}}}})
 const role=await db.role.findUniqueOrThrow({where:{id:f.roleId}})
 await db.role.update({where:{id:f.roleId},data:{permissions:[...role.permissions,'pos.use','pos.transactions.refund','pos.transactions.void']}})
 const session=await db.session.create({data:{userId:f.userId,token:randomUUID(),expiresAt:new Date(Date.now()+3600000),assuranceOrganizationId:f.organizationId,assuranceMethod:'password',assuranceLevel:1,assuranceVerifiedAt:new Date()}})
 return {...f,authority:{sessionId:session.id,sessionToken:session.token}}
}
async function effects(f:Awaited<ReturnType<typeof fixture>>){
 const level=await db.inventoryLevel.findUniqueOrThrow({where:{itemId_locationId:{itemId:f.itemId,locationId:f.locationId}}})
 return {quantity:level.quantityOnHand.toFixed(3),value:level.totalValue.toFixed(2),commits:await db.pOSCommitResult.count({where:{organizationId:f.organizationId}}),payments:await db.payment.count({where:{organizationId:f.organizationId}}),sale:(await db.salesOrder.findUniqueOrThrow({where:{id:f.salesOrderId}})).status}
}
// Pass the action's server-owned session separately from parsed client input.
const commit=commitPOSSale as (input:any,authority?:{sessionId:string;sessionToken:string})=>Promise<any>
const refund=refundPOSSale as typeof commit,voidSale=voidPOSSale as typeof commit
it.each(['role','session','account'] as const)('LOCAL-POS-AUTH rejects %s revoked after action admission and before financial commit',async kind=>{
 const f=await posFixture(),before=await effects(f)
 if(kind==='role')await db.role.update({where:{id:f.roleId},data:{permissions:[]}})
 if(kind==='session')await db.session.delete({where:{id:f.authority.sessionId}})
 if(kind==='account')await db.user.update({where:{id:f.userId},data:{isActive:false}})
 await expect(commit(f.request,f.authority)).rejects.toMatchObject({code:'FORBIDDEN'})
 expect(await effects(f)).toEqual(before)
 evidence.push({scenario:'LOCAL-POS-AUTH',kind,organizationId:f.organizationId,before,after:await effects(f)})
})
it.each(['refund','void'] as const)('LOCAL-POS-CORRECTION rejects revoked %s permission without stock or money changes',async operation=>{
 const f=await posFixture();await commit(f.request,f.authority)
 const before=await effects(f)
 await db.role.update({where:{id:f.roleId},data:{permissions:['pos.use']}})
 await expect((operation==='refund'?refund:voidSale)({...f.request,reason:'Synthetic authority denial'},f.authority)).rejects.toMatchObject({code:'FORBIDDEN'})
 expect(await effects(f)).toEqual(before)
 evidence.push({scenario:'LOCAL-POS-CORRECTION',operation,organizationId:f.organizationId,before,after:await effects(f)})
})
it.each(['refund','void'] as const)('LOCAL-POS-ALLOWED permits current authenticated %s and restores exact stock',async operation=>{
 const f=await posFixture();await commit(f.request,f.authority)
 await (operation==='refund'?refund:voidSale)({...f.request,reason:'Current independently checked authority'},f.authority)
 const after=await effects(f)
 expect(after.quantity).toBe('3.000');expect(after.value).toBe('300.00')
 evidence.push({scenario:'LOCAL-POS-ALLOWED',operation,organizationId:f.organizationId,after})
})
it.each(['role','session'] as const)('LOCAL-POS-WAIT observes %s revocation while transaction admission is waiting',async kind=>{
 const f=await posFixture(),before=await effects(f),observer=new PrismaClient()
 let unlock!:()=>void,ready!:()=>void,pid=0
 const released=new Promise<void>(r=>unlock=r),locked=new Promise<void>(r=>ready=r)
 const holder=observer.$transaction(async tx=>{const rows=await tx.$queryRaw<Array<{pid:number}>>`SELECT id, pg_backend_pid() AS pid FROM users WHERE id=${f.userId} FOR UPDATE`;pid=rows[0].pid;ready();await released},{timeout:20000})
 await Promise.race([locked,holder.then(()=>{throw Error('Lock holder ended early')})])
 const pending=commit(f.request,f.authority).then(value=>({ok:true,value}),error=>({ok:false,code:error.code}))
 let waits:unknown[]=[]
 try{
  const end=Date.now()+6000
  while(Date.now()<end){waits=await db.$queryRaw`SELECT pid,query FROM pg_stat_activity WHERE ${pid}=ANY(pg_blocking_pids(pid))`;if(waits.length)break;await delay(20)}
  expect(waits.length).toBeGreaterThan(0)
  if(kind==='role')await db.role.update({where:{id:f.roleId},data:{permissions:[]}})
  else await db.session.delete({where:{id:f.authority.sessionId}})
 }finally{unlock();await holder;await observer.$disconnect()}
 const outcome=await pending;expect(outcome).toMatchObject({ok:false,code:'FORBIDDEN'})
 expect(await effects(f)).toEqual(before)
 evidence.push({scenario:'LOCAL-POS-WAIT',kind,organizationId:f.organizationId,waits,outcome,before,after:await effects(f)})
})
it('LOCAL-POS-LOCATION denies a foreign location and a terminal reassigned after checkout preparation',async()=>{
 const f=await posFixture(),other=await fixture(),before=await effects(f)
 await expect(commit({...f.request,locationId:other.locationId},f.authority)).rejects.toThrow()
 const moved=await db.location.create({data:{organizationId:f.organizationId,name:'Synthetic alternate branch',code:randomUUID(),type:'STORE'}})
 await db.pOSStation.update({where:{id:f.terminalId},data:{locationId:moved.id}})
 await expect(commit(f.request,f.authority)).rejects.toThrow()
 expect(await effects(f)).toEqual(before)
 evidence.push({scenario:'LOCAL-POS-LOCATION',organizationId:f.organizationId,before,after:await effects(f),policy:'No user-location assignment relation exists; active tenant/terminal/shift binding is enforced.'})
})
it('LOCAL-RECEIVING-RACE revocation serializes behind admitted transaction and blocks subsequent work',async()=>{
 const f=await fixture(),order=await approvedOrder(f,3,100),command=await receivingCommand(f,order,1)
 const observer=new PrismaClient();let unlock!:()=>void,ready!:()=>void,pid=0
 const released=new Promise<void>(r=>unlock=r),locked=new Promise<void>(r=>ready=r)
 const holder=observer.$transaction(async tx=>{const rows=await tx.$queryRaw<Array<{pid:number}>>`SELECT id, pg_backend_pid() AS pid FROM suppliers WHERE id=${f.supplierId} FOR UPDATE`;pid=rows[0].pid;ready();await released},{timeout:25000})
 await Promise.race([locked,holder.then(()=>{throw Error('Lock holder ended early')})])
 const pending=confirmPurchaseReceiving(command,f.receiver)
 let revoke:Promise<unknown>|undefined,waits:unknown[]=[]
 try{
  const deadline=Date.now()+7000
  while(Date.now()<deadline){const rows=await db.$queryRaw<Array<{pid:number}>>`SELECT pid FROM pg_stat_activity WHERE ${pid}=ANY(pg_blocking_pids(pid))`;if(rows.length){break}await delay(20)}
  revoke=db.role.update({where:{id:f.roleId},data:{permissions:['purchases.orders.read']}}).then(x=>x)
  const end=Date.now()+7000
  while(Date.now()<end){waits=await db.$queryRaw`WITH RECURSIVE blocked(pid) AS (SELECT pid FROM pg_stat_activity WHERE ${pid}=ANY(pg_blocking_pids(pid)) UNION SELECT a.pid FROM pg_stat_activity a JOIN blocked b ON b.pid=ANY(pg_blocking_pids(a.pid))) SELECT DISTINCT a.pid,a.query FROM pg_stat_activity a JOIN blocked b USING(pid)`;if(waits.length>=2)break;await delay(20)}
 }finally{unlock();await holder;await observer.$disconnect()}
 await pending;await revoke
 expect(waits.length).toBeGreaterThanOrEqual(2)
 const before=await effects(f)
 await expect(confirmPurchaseReceiving({...command,idempotencyKey:randomUUID()},f.receiver)).rejects.toMatchObject({code:'FORBIDDEN'})
 expect(await effects(f)).toEqual(before)
 evidence.push({scenario:'LOCAL-RECEIVING-RACE',organizationId:f.organizationId,waits,after:before})
})
