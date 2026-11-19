import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {randomUUID,createHash} from 'node:crypto'
import {db} from '@/prisma/db'
import {assertDisposableTarget} from './cross-workflow.phase3.fixture'
import {certifiedFixture,approveSchedules} from './certified-close.fixture'
import {runCloseAssurance,updateAccountantReview} from '@/services/accounting/close-assurance.service'
import {getAccountantPortalData} from '@/services/accounting/data-trust.service'
import {exportClosePack} from '@/services/accounting/close-assurance-pack.service'
import {closeAccountingPeriod} from '@/services/accounting/periods.service'
import {reopenAccountingPeriod} from '@/services/accounting/period-control.service'
import {postPurchaseReturn} from '@/services/purchasing/purchase-return-credit.service'
const evidence:unknown[]=[]
function retain(value:unknown){evidence.push(value);writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'lifecycle-reconciliation.json'),JSON.stringify(evidence,null,2))}
function canonical(value:any):string{return value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}'}
function verifyPack(pack:Awaited<ReturnType<typeof exportClosePack>>,name:string){
 const payload=JSON.parse(pack.content),claimed=payload.export.contentHash;delete payload.export.contentHash
 expect('sha256:'+createHash('sha256').update(canonical(payload)).digest('hex')).toBe(claimed)
 expect(claimed).toBe(pack.contentHash);expect(payload.export.watermarkId).toBe(pack.watermarkId)
 writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,name+'.json'),pack.content)
 return {exportId:pack.exportId,contentHash:pack.contentHash,mode:pack.mode,watermarkId:pack.watermarkId,runId:pack.closeRunId}
}
async function financialState(org:string){
 const stock=await db.inventoryLevel.findMany({where:{item:{organizationId:org}}})
 const journals=await db.journalEntry.findMany({where:{organizationId:org},include:{lines:true}})
 for(const j of journals)expect(j.lines.reduce((v,l)=>v+Number(l.debit)-Number(l.credit),0)).toBe(0)
 return {stock:stock.map(l=>({quantity:l.quantityOnHand.toFixed(3),value:l.totalValue.toFixed(2)})),journalCount:journals.length,returns:await db.purchaseReturn.count({where:{organizationId:org}}),payments:await db.supplierPayment.count({where:{organizationId:org}}),transactions:await db.paymentTransaction.count({where:{organizationId:org}})}
}
async function failAudit(org:string,action:string,work:()=>Promise<unknown>){
 const name='close_lifecycle_'+randomUUID().replaceAll('-','')
 // Unique, tenant/action-scoped disposable fault. No application guard disabled.
 await db.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${org}' AND NEW.action = '${action}' THEN RAISE EXCEPTION 'Synthetic close audit failure'; END IF; RETURN NEW; END $$`)
 try{await db.$executeRawUnsafe(`CREATE TRIGGER ${name} BEFORE INSERT ON ledger_audit_events FOR EACH ROW EXECUTE FUNCTION ${name}()`);await expect(work()).rejects.toThrow('Synthetic close audit failure')}
 finally{await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON ledger_audit_events`);await db.$executeRawUnsafe(`DROP FUNCTION ${name}()`)}
}
beforeAll(assertDisposableTarget)
afterAll(async()=>{writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'lifecycle-reconciliation.json'),JSON.stringify(evidence,null,2));await db.$disconnect()})
it('CLOSE-LIFECYCLE earns certification, seals, reopens, corrects and recertifies through actual owners',async()=>{
 const f=await certifiedFixture(),period=f.period
 const control=()=>({actorId:f.reviewerId,actorPermissions:['accounting.close.certify','accounting.close.export'],lastAuthAt:new Date()})
 const assess=()=>runCloseAssurance(f.organizationId,{periodId:period.id},{actorId:f.buyer.actorId,actorPermissions:['accounting.close.run']})
 const blocked=await assess();expect(blocked.run.status).toBe('BLOCKED')
 const blockedDraft=await exportClosePack(f.organizationId,{closeRunId:blocked.run.id!,mode:'DRAFT_NOT_CERTIFIED'},control())
 expect(blockedDraft.isCertified).toBe(false)
 await expect(exportClosePack(f.organizationId,{closeRunId:blocked.run.id!,mode:'CERTIFIED'},control())).rejects.toThrow()
 retain({scenario:'BLOCKED_DRAFT',organizationId:f.organizationId,periodId:period.id,run:blocked.run,checklist:blocked.checklist,pack:verifyPack(blockedDraft,'blocked-draft')})
 const schedules=await approveSchedules(f)
 const run=await assess()
 const portal=await getAccountantPortalData({organizationId:f.organizationId,periodId:period.id})
 retain({scenario:'REAL_READY',organizationId:f.organizationId,periodId:period.id,schedules,run,blockers:portal.blockers,cashReceipt:{id:f.cashReceipt.receiptId,status:f.cashReceipt.status}})
 expect(run.run.status).toBe('READY')
 expect(portal.certificate.level).toBe('T4');expect(portal.blockers).toEqual([])
 const input={closeRunId:run.run.id!,mode:'CERTIFIED' as const},before=await financialState(f.organizationId)
 await expect(exportClosePack(f.organizationId,input,{...control(),actorPermissions:[]})).rejects.toThrow(/permission/)
 await expect(exportClosePack(f.organizationId,input,{...control(),lastAuthAt:new Date(Date.now()-600000)})).rejects.toThrow(/Fresh/)
 await expect(exportClosePack(f.organizationId,input,{...control(),actorId:f.buyer.actorId})).rejects.toThrow(/runner/)
 await expect(exportClosePack('foreign-'+randomUUID(),input,control())).rejects.toThrow(/not found/)
 await expect(exportClosePack(f.organizationId,{...input,closeRunId:blocked.run.id!},control())).rejects.toThrow()
 expect(await financialState(f.organizationId)).toEqual(before)
 retain({scenario:'CERTIFICATION_DENIALS',permission:true,staleAuth:true,selfCertification:true,foreignTenant:true,obsoleteAssessment:true,financialState:before})
 const review=await updateAccountantReview(f.organizationId,{closeRunId:run.run.id!,status:'APPROVED_FOR_CLOSE',decisionNotes:'Independent synthetic close review after exact schedule reconciliation'},{actorId:f.reviewerId,actorPermissions:['accounting.close.review']})
 await failAudit(f.organizationId,'CLOSE_PACK_CERTIFIED_EXPORT',()=>exportClosePack(f.organizationId,input,control()))
 expect(await db.closePackExport.count({where:{closeRunId:run.run.id!,isCertified:true}})).toBe(0)
 expect((await db.closeRun.findUniqueOrThrow({where:{id:run.run.id!}})).status).toBe('READY')
 const attempts=await Promise.allSettled([exportClosePack(f.organizationId,input,control()),exportClosePack(f.organizationId,input,control())])
 expect(attempts.filter(r=>r.status==='fulfilled')).toHaveLength(1)
 const pack=(attempts.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof exportClosePack>>>).value
 expect(pack.isCertified).toBe(true);expect(pack.content).not.toContain(f.buyer.sessionToken);expect(pack.content).not.toContain(f.receiver.sessionToken)
 const proof=verifyPack(pack,'certified-first');expect(await db.closePackExport.count({where:{closeRunId:run.run.id!,isCertified:true}})).toBe(1)
 retain({scenario:'CERTIFY_ROLLBACK_AND_RACE',auditFailureRolledBack:true,attempts:attempts.map(r=>r.status),review,pack:proof,financialState:await financialState(f.organizationId)})
 const close=()=>closeAccountingPeriod(f.organizationId,period.id,f.reviewerId,{expectedVersion:0,actorPermissions:['accounting.period.close'],lastAuthAt:new Date()})
 await failAudit(f.organizationId,'ACCOUNTING_PERIOD_CLOSE',close)
 expect((await db.accountingPeriod.findUniqueOrThrow({where:{id:period.id}})).status).toBe('OPEN')
 expect(await db.periodControlEvent.count({where:{organizationId:f.organizationId}})).toBe(0)
 const closed=await close();expect(closed?.status).toBe('CLOSED')
 const firstSeal=await db.periodControlEvent.findFirstOrThrow({where:{organizationId:f.organizationId,operation:'CLOSE'}})
 expect(firstSeal.approval).toMatchObject({certifiedExportId:pack.exportId,contentHash:pack.contentHash})
 await expect(close()).rejects.toThrow()
 const returnCommand={organizationId:f.organizationId,purchaseOrderId:f.order.id,goodsReceiptId:f.receipt.id,postedById:f.receiver.actorId,idempotencyKey:randomUUID(),reason:'Controlled correction of one invoiced received unit',occurredAt:period.endDate,lines:[{sourceGoodsReceiptLineId:f.receipt.lines[0].id,quantity:'1'}]}
 await expect(postPurchaseReturn(returnCommand)).rejects.toThrow()
 expect(await financialState(f.organizationId)).toEqual(before)
 retain({scenario:'PERIOD_SEAL',auditRollback:true,seal:firstSeal,closedWriteDenied:true,financialState:before})
 const reopen={periodId:period.id,expectedVersion:1,idempotencyKey:randomUUID(),reason:'Controlled reopening for synthetic supplier return correction'},reopenControl={organizationId:f.organizationId,actorId:f.reviewerId,actorPermissions:['accounting.period.reopen'],lastAuthAt:new Date()}
 const reopened=await reopenAccountingPeriod(reopen,reopenControl)
 expect((await reopenAccountingPeriod(reopen,reopenControl)).event.id).toBe(reopened.event.id)
 await expect(reopenAccountingPeriod({...reopen,reason:'Changed retained reopening purpose'},reopenControl)).rejects.toThrow()
 const old=await db.closePackExport.findUniqueOrThrow({where:{id:pack.exportId}})
 expect(old.contentHash).toBe(pack.contentHash);expect(old.metadata).toMatchObject({staleState:{status:'EVIDENCE_STALE'}})
 await expect(exportClosePack(f.organizationId,input,control())).rejects.toThrow()
 const returned=await postPurchaseReturn(returnCommand);expect(returned.ledgerStatus).toBe('POSTED')
 expect((await postPurchaseReturn(returnCommand)).purchaseReturn.id).toBe(returned.purchaseReturn.id)
 const corrected=await financialState(f.organizationId);expect(corrected.stock).toEqual([{quantity:'1.000',value:'100.00'}]);expect(corrected.transactions).toBe(1);expect(corrected.payments).toBe(1)
 const stale=await assess();expect(stale.run.status).toBe('BLOCKED')
 retain({scenario:'REOPEN_CORRECT_INVALIDATE',reopenEvent:reopened.event,oldCertificate:{id:old.id,hash:old.contentHash,metadata:old.metadata},returnId:returned.purchaseReturn.id,corrected,staleAssessment:stale.run})
 const newSchedules=await approveSchedules(f),newRun=await assess();expect(newRun.run.status).toBe('READY')
 const newPack=await exportClosePack(f.organizationId,{closeRunId:newRun.run.id!,mode:'CERTIFIED'},control())
 expect(newPack.contentHash).not.toBe(pack.contentHash)
 const finalClose=await closeAccountingPeriod(f.organizationId,period.id,f.reviewerId,{expectedVersion:2,actorPermissions:['accounting.period.close'],lastAuthAt:new Date()})
 expect(finalClose?.status).toBe('CLOSED');expect(finalClose?.controlVersion).toBe(3)
 const seals=await db.periodControlEvent.findMany({where:{organizationId:f.organizationId},orderBy:{version:'asc'}})
 expect(seals.map(e=>e.operation)).toEqual(['CLOSE','REOPEN','CLOSE'])
 expect(seals[2].approval).toMatchObject({certifiedExportId:newPack.exportId,contentHash:newPack.contentHash})
 expect((await db.closePackExport.findUniqueOrThrow({where:{id:pack.exportId}})).contentHash).toBe(pack.contentHash)
 retain({scenario:'RECERTIFY_AND_RESEAL',schedules:newSchedules,run:newRun.run,pack:verifyPack(newPack,'certified-corrected'),seals,finalState:await financialState(f.organizationId),scope:'System-certified synthetic cash close; no provider or statutory certification'})
},480000)
