const fs=require('node:fs');
const file='services/hris/operational-time.service.ts';
const original=fs.readFileSync(file,'utf8');
let s=original.replace(/\r\n/g,'\n');
const start=s.indexOf('export async function buildOperationalAttendanceCertification(');
const queries=s.indexOf('  const period = await client.payrollPeriod.findFirst({',start);
const payload=s.indexOf('  const sourcePayload = {',queries);
const policy=s.indexOf('    policy: {',payload);
const approval=s.indexOf('    approval: {',policy);
if([start,queries,payload,policy,approval].some(x=>x<0))throw Error('Missing projection markers');
const reads=s.slice(queries,payload);
const proof=s.slice(policy,approval);
const helper=`// Internal source projection shared by certification and payroll consumption.
// It neither grants permissions nor fabricates an approval; callers own authorization.
async function readOperationalAttendanceSource(
  parsed: { organizationId: string; employeeId: string; payrollPeriodId: string },
  client: OperationalTimeClient,
) {
${reads}  return {
${proof}    totals,
  }
}

/** Revalidate operational proof while holding the same employee lock as input writers. */
export async function assertOperationalAttendanceCurrentInTx(
  tx: Prisma.TransactionClient,
  scope: { organizationId: string; employeeId: string; payrollPeriodId: string },
  snapshotMetadata: unknown,
) {
  const payload = attendanceMetadata(attendanceMetadata(snapshotMetadata).sourcePayload)
  if (payload.sourceSystem !== "STOQUIFY_HRIS_OPERATIONAL_TIME") return
  await lockOperationalEmployeeInTx(tx, scope.organizationId, scope.employeeId)
  const retained = hrisTimeLeaveAttendanceCertificationSchema.safeParse(payload)
  if (!retained.success || retained.data.sourceRecordId !== scope.employeeId + ":" + scope.payrollPeriodId) {
    throw new BusinessRuleError("HRIS_OPERATIONAL_ATTENDANCE_STALE: Re-certify complete operational attendance proof.")
  }
  const current = await readOperationalAttendanceSource(scope, tx)
  const previous = { policy: retained.data.policy, evidence: retained.data.evidence, totals: retained.data.totals }
  if (hash(previous) !== hash(current)) {
    throw new BusinessRuleError("HRIS_OPERATIONAL_ATTENDANCE_STALE: Operational inputs changed; obtain a fresh independent certification before payroll calculation.")
  }
}

`;
s=s.slice(0,start)+helper+s.slice(start,queries)+'  const source = await readOperationalAttendanceSource(parsed, client)\n  const totals = source.totals\n'+s.slice(payload,policy)+'    ...source,\n'+s.slice(approval);
s=s.replace('import { allocateOperationalMinutes } from "./time-allocation"','import { allocateOperationalMinutes } from "./time-allocation"\nimport { hrisTimeLeaveAttendanceCertificationSchema } from "./time-leave.contract"');
// Every approved time effect must use the payroll adjustment path once payroll is sealed.
const begin=s.indexOf('      const sealed = await tx.payrollRun.findFirst({');
const finish=s.indexOf('\n    // Own the pending transition',begin);
const old=s.slice(begin,finish);
if(!old.includes('current.entry.workDate'))throw Error('Missing sealed guard');
const replacement='    }\n    if (approved) {\n'+old.replace(/current\.entry\.workDate/g,'request.periodEnd').replace('periodEnd: { gte: request.periodEnd }','periodEnd: { gte: request.periodStart }');
s=s.slice(0,begin)+replacement+s.slice(finish);
fs.writeFileSync(file+'.hr08-candidate',s.replace(/\n/g,original.includes('\r\n')?'\r\n':'\n'));
console.log('Prepared shared operational source projection and sealed-time approval guard');
