import { Prisma } from '@prisma/client';
import { nextSettlementBalance, resolveSettlementBalance } from '../payment-settlement-balance';

const batch = { id:'batch', organizationId:'org', amount:new Prisma.Decimal('100.00'), currency:'XAF', status:'RELEASED' };
const initial = () => resolveSettlementBalance(batch,[])!;
const first = () => nextSettlementBalance(batch,initial(),'30.10','partially_settled');
const event = () => ({id:'event1', organizationId:'org', sourceId:'batch', status:'APPLIED', payload:{payrollPaymentBatchId:'batch', nextStatus:'PARTIALLY_SETTLED', settlementBalance:first()}});

it('accumulates increments exactly and settles only the remainder', () => {
 const balance=resolveSettlementBalance({...batch,status:'PARTIALLY_SETTLED'},[event()])!;
 expect(balance.remaining.toFixed(2)).toBe('69.90');
 const final=nextSettlementBalance(batch,balance,undefined,'settled');
 expect(final).toMatchObject({settlementAmount:'69.90',cumulativeSettledAmount:'100.00',remainingAmount:'0.00',sequence:2,previousEventId:'event1'});
 expect(resolveSettlementBalance({...batch,status:'SETTLED'},[event(),{...event(),id:'event2',payload:{payrollPaymentBatchId:'batch',nextStatus:'SETTLED',settlementBalance:final}}])?.remaining.toFixed(2)).toBe('0.00');
});
it.each([['30','settled'],['100','partially_settled'],[undefined,'partially_settled'],['101','settled'],['0','partially_settled']] as const)('rejects amount/status mismatch %s/%s', (amount,status) => {
 expect(()=>nextSettlementBalance(batch,initial(),amount,status)).toThrow();
});
it.each(['foreign','gap','tampered','legacy','unapplied','duplicate','status'] as const)('withholds %s event history', kind => {
 const row=event();let events=[row];let status='PARTIALLY_SETTLED';
 if(kind==='foreign')row.organizationId='other';
 if(kind==='gap')row.payload.settlementBalance.sequence=2;
 if(kind==='tampered')row.payload.settlementBalance.remainingAmount='1.00';
 if(kind==='legacy')delete (row.payload as {settlementBalance?:unknown}).settlementBalance;
 if(kind==='unapplied')row.status='RECORDED';
 if(kind==='duplicate')events=[row,row];
 if(kind==='status')status='RELEASED';
 expect(resolveSettlementBalance({...batch,status},events)).toBeNull();
});
