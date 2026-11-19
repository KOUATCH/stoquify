const fs=require('node:fs');
function edit(file,changes){let text=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');for(const [before,after] of changes){if(!text.includes(before))throw Error('Missing target: '+file+' '+before.slice(0,60));text=text.replace(before,after)}fs.writeFileSync(file+'.hr12-candidate',text)}
edit('services/hris/leave-balance.service.ts',[
 ['import { lockOperationalEmployeeInTx } from "./attendance-correction"','import { lockOperationalEmployeeInTx } from "./attendance-correction"\nimport { assertLeaveEligibility } from "./leave-policy"'],
 ['  idempotencyKey: z.string().trim().min(8).max(160),','  idempotencyKey: z.string().trim().min(8).max(160),\n  reason: z.string().trim().min(8).max(1000).optional(),'],
 ['  const policy = await client.hrisLeavePolicy.findFirst({\n    where: {\n      id: parsed.leavePolicyId,\n      organizationId: parsed.organizationId,\n      status: "ACTIVE",\n      effectiveFrom: { lte: parsed.effectiveAt },\n      OR: [\n        { effectiveTo: null },\n        { effectiveTo: { gte: parsed.effectiveAt } },\n      ],\n    },\n    select: { id: true },\n  })\n  if (!policy) throw new NotFoundError("Active leave policy was not found.")\n',''],
 ['    sourceId: parsed.sourceId,\n  })','    sourceId: parsed.sourceId,\n    ...(parsed.reason ? { reason: parsed.reason } : {}),\n  })'],
 ['const legacyReplay = existing.sourceHash === legacyHash','const legacyReplay = !parsed.reason && existing.sourceHash === legacyHash'],
 ['  const scope = { organizationId:', '  const policy = await client.hrisLeavePolicy.findFirst({ where: { id: parsed.leavePolicyId, organizationId: parsed.organizationId } })\n  assertLeaveEligibility(policy, parsed.employeeId, parsed.effectiveAt)\n  const scope = { organizationId:'],
]);
const file='services/hris/operational-time.service.ts';let original=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');const start=original.indexOf('  if (parsed.leavePolicyId) {',original.indexOf('export async function requestOperationalTime'));const end=original.indexOf('  const sourceHash = hash({',start);if(start<0||end<0)throw Error('Missing policy precheck');
edit(file,[
 ['import { allocateOperationalMinutes } from "./time-allocation"','import { allocateOperationalMinutes } from "./time-allocation"\nimport { assertLeaveEligibility } from "./leave-policy"'],
 [original.slice(start,end),''],
 ['    let correction: z.output<typeof correctionEvidenceSchema> | undefined','    if (parsed.type === "LEAVE") {\n      const policy = await tx.hrisLeavePolicy.findFirst({ where: { id: parsed.leavePolicyId, organizationId: parsed.organizationId } })\n      assertLeaveEligibility(policy, employeeId, parsed.periodStart, parsed.periodEnd)\n    }\n    let correction: z.output<typeof correctionEvidenceSchema> | undefined'],
 ['      if (!request.leavePolicyId) throw new BusinessRuleError("HRIS_LEAVE_POLICY_REQUIRED")','      if (!request.leavePolicyId) throw new BusinessRuleError("HRIS_LEAVE_POLICY_REQUIRED")\n      const policy = await tx.hrisLeavePolicy.findFirst({ where: { id: request.leavePolicyId, organizationId: parsed.organizationId } })\n      assertLeaveEligibility(policy, request.employeeId, request.periodStart, request.periodEnd)'],
]);
