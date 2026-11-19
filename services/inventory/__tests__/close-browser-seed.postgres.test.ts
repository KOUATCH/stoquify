import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { db } from '@/prisma/db'
import { hashPassword } from '@/lib/password'
import { certifiedFixture, approveSchedules } from './certified-close.fixture'
import { assertDisposableTarget } from './cross-workflow.phase3.fixture'

it('prepares independent authenticated EN/FR close actors with real source evidence', async () => {
 assertDisposableTarget()
 const secret=JSON.parse(readFileSync('.codex-tmp/workflow-closure-private.json','utf8'))
 const password=await hashPassword(secret.password), fixtures=[]
 for(const locale of ['en','fr']) {
  const f=await certifiedFixture()
  await db.organization.update({where:{id:f.organizationId},data:{requestedModules:['accounting','close_assurance'],name:'Synthetic '+locale+' close browser'}})
  const permissions=['accounting.close.read','accounting.close.run','accounting.close.export','accounting.close.certify','accounting.close.accountant.review','accounting.close.review','accounting.settings.read','accounting.period.close','accounting.period.reopen','accounting.dashboard.read']
  const actors=[]
  for(const [kind,id] of [['preparer',f.buyer.actorId],['reviewer',f.reviewerId]]) {
   const role=await db.role.create({data:{organizationId:f.organizationId,code:'CLOSE_BROWSER_'+kind,nameEn:'Synthetic close '+kind,permissions}})
   const user=await db.user.update({where:{id},data:{password,roles:{set:[{id:role.id}]}}})
   await db.account.create({data:{id:randomUUID(),accountId:id,userId:id,providerId:'credential',password}})
   actors.push({kind,id,email:user.email,roleId:role.id,permissions})
  }
  await approveSchedules(f)
  fixtures.push({locale,organizationId:f.organizationId,periodId:f.period.id,actors})
 }
 writeFileSync('.codex-tmp/close-browser-private.json',JSON.stringify({url:secret.url,password:secret.password,secret:secret.secret,base:'http://127.0.0.1:3169',fixtures}))
 writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'fixtures.json'),JSON.stringify({database:'stoquify_pos_audit_20261026_d30f',fixtures:fixtures.map(f=>({...f,actors:f.actors.map(({email,...a})=>a)}))},null,2))
},480000)
afterAll(()=>db.$disconnect())
