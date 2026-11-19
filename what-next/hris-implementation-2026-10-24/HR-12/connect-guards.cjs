const fs=require('node:fs');
for(const file of ['services/hris/leave-balance.service.ts','services/hris/operational-time.service.ts']){
 let text=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 text=text.replace('import { assertLeaveEligibility } from "./leave-policy"','import { assertEmployeeLeaveEligibility } from "./leave-eligibility.service"\nimport { assertLeavePolicyOpen, getHrisLeaveBalances } from "./leave-entitlement.service"');
 if(file.includes('leave-balance'))text=text.replace('  const policy = await client.hrisLeavePolicy.findFirst({ where: { id: parsed.leavePolicyId, organizationId: parsed.organizationId } })\n  assertLeaveEligibility(policy, parsed.employeeId, parsed.effectiveAt)', '  await assertEmployeeLeaveEligibility(client, parsed.organizationId, parsed.employeeId, parsed.leavePolicyId, parsed.effectiveAt)\n  await assertLeavePolicyOpen(client, parsed.organizationId, parsed.employeeId, parsed.leavePolicyId)');
 else {
 text=text.replace('      const policy = await tx.hrisLeavePolicy.findFirst({ where: { id: parsed.leavePolicyId, organizationId: parsed.organizationId } })\n      assertLeaveEligibility(policy, employeeId, parsed.periodStart, parsed.periodEnd)', '      await assertEmployeeLeaveEligibility(tx, parsed.organizationId, employeeId, parsed.leavePolicyId!, parsed.periodStart, parsed.periodEnd)\n      await assertLeavePolicyOpen(tx, parsed.organizationId, employeeId, parsed.leavePolicyId!)');
 text=text.replace('      const policy = await tx.hrisLeavePolicy.findFirst({ where: { id: request.leavePolicyId, organizationId: parsed.organizationId } })\n      assertLeaveEligibility(policy, request.employeeId, request.periodStart, request.periodEnd)', '      await assertEmployeeLeaveEligibility(tx, parsed.organizationId, request.employeeId, request.leavePolicyId, request.periodStart, request.periodEnd)\n      await assertLeavePolicyOpen(tx, parsed.organizationId, request.employeeId, request.leavePolicyId)');
 text=text.replace('const [requests, balances, entries, corrections] = await Promise.all([','const [requests, leave, entries, corrections] = await Promise.all([');
 const start=text.indexOf('    client.hrisLeaveBalanceEntry.groupBy({',text.indexOf('export async function getOwnOperationalTime'));
 const end=text.indexOf('    client.hrisTimeEntry.findMany(',start);
 if(start<0||end<0)throw Error('Read query missing');
 text=text.slice(0,start)+'    getHrisLeaveBalances({ ...parsed, employeeId }, client),\n'+text.slice(end);
 text=text.replace('    balances: balances.map((item) => ({\n      leavePolicyId: item.leavePolicyId,\n      availableMinutes: item._sum.deltaMinutes ?? 0,\n    })),','    balances: leave.policies,\n    balanceAsOf: leave.asOf,\n    unresolvedPolicyCount: leave.unresolvedPolicyCount,');
 }
 fs.writeFileSync(file+'.hr12-candidate',text);
}
