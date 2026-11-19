import {randomUUID} from 'node:crypto'
import {writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {db} from '@/prisma/db'
import {baseFixture,assertDisposableTarget} from './cross-workflow.phase3.fixture'
import {leasePaymentReconciliationInboxItems as lease,completePaymentReconciliationInboxItem as complete,failPaymentReconciliationInboxItem as fail} from '@/services/payments/payment-reconciliation-inbox-worker.service'
const evidence:unknown[]=[]
beforeAll(assertDisposableTarget)
afterAll(async()=>{writeFileSync(join(process.env.WORKFLOW_CLOSURE_EVIDENCE!,'worker-reconciliation.json'),JSON.stringify(evidence,null,2));await db.$disconnect()})
it('allows one lease, recovers an expired worker and fences stale completion across tenants',async()=>{
 const f=await baseFixture(),other=await baseFixture(),now=new Date()
 const item=await db.paymentReconciliationInboxItem.create({data:{organizationId:f.organizationId,source:'PROVIDER_EVENT',idempotencyKey:randomUUID(),payloadHash:'synthetic-hash',payloadSummary:{eventType:'synthetic'}}})
 const input={organizationId:f.organizationId,leasedBy:'worker-a',leaseSeconds:1,now}
 const concurrent=await Promise.all([lease(input),lease({...input,leasedBy:'worker-b'})]),winners=concurrent.flatMap(r=>r.leasedItems)
 expect(winners).toHaveLength(1)
 const original=winners[0],recovery=await lease({...input,leasedBy:'worker-c',now:new Date(now.getTime()+2000)})
 expect(recovery.leasedItems).toHaveLength(1)
 const recovered=recovery.leasedItems[0]
 await expect(complete({organizationId:f.organizationId,inboxItemId:item.id,leasedBy:original.leasedBy!,leaseToken:original.leaseToken!})).rejects.toThrow()
 await expect(complete({organizationId:other.organizationId,inboxItemId:item.id,leasedBy:'worker-c',leaseToken:recovered.leaseToken!})).rejects.toThrow()
 const result=await complete({organizationId:f.organizationId,inboxItemId:item.id,leasedBy:'worker-c',leaseToken:recovered.leaseToken!})
 expect(result.item.status).toBe('PROCESSED')
 await expect(complete({organizationId:f.organizationId,inboxItemId:item.id,leasedBy:'worker-c',leaseToken:recovered.leaseToken!})).rejects.toThrow()
 expect(await db.payment.count({where:{organizationId:f.organizationId}})).toBe(0)
 evidence.push({scenario:'competing workers / expired lease / stale and foreign completion',itemId:item.id,attempts:result.item.attempts,status:result.item.status,payments:0})
})
it('retains retry and dead-letter evidence without leaking error content',async()=>{
 const f=await baseFixture(),now=new Date()
 const item=await db.paymentReconciliationInboxItem.create({data:{organizationId:f.organizationId,source:'PROVIDER_EVENT',idempotencyKey:randomUUID(),payloadHash:'synthetic-hash',payloadSummary:{eventType:'synthetic'}}})
 const first=(await lease({organizationId:f.organizationId,leasedBy:'worker',now,maxAttempts:2})).leasedItems[0]
 const failed=await fail({organizationId:f.organizationId,inboxItemId:item.id,leasedBy:'worker',leaseToken:first.leaseToken!,errorCode:'private raw provider error',now,retryAfterSeconds:1,maxAttempts:2})
 expect(failed.item.status).toBe('FAILED');expect(failed.item.lastErrorCode).toBe('PROVIDER_INBOX_WORKER_FAILED')
 expect((await lease({organizationId:f.organizationId,leasedBy:'early',now})).leasedItems).toHaveLength(0)
 const second=(await lease({organizationId:f.organizationId,leasedBy:'retry',now:new Date(now.getTime()+2000),maxAttempts:2})).leasedItems[0]
 const dead=await fail({organizationId:f.organizationId,inboxItemId:item.id,leasedBy:'retry',leaseToken:second.leaseToken!,errorCode:'PROVIDER_TIMEOUT',maxAttempts:2})
 expect(dead.item.status).toBe('DEAD_LETTER');expect(dead.item.lastErrorCode).toBe('MAX_ATTEMPTS_EXCEEDED')
 evidence.push({scenario:'backoff / bounded retry / sanitized dead letter',itemId:item.id,status:dead.item.status,attempts:dead.item.attempts})
})
