// Exact, bounded edits; writes a candidate beside the mapped source for File.Replace.
const fs=require('node:fs');
const file='services/payroll/payroll-control.service.ts';
const original=fs.readFileSync(file,'utf8');
const newline=original.includes('\r\n')?'\r\n':'\n';
let source=original.replace(/\r\n/g,'\n');
function replace(before,after){if(source.split(before).length!==2)throw Error('Expected one match: '+before);source=source.replace(before,after)}
for(const [state,action,subject] of [['REVIEWED','review','payrollRun.preparedById'],['APPROVED','approve','payrollRun.preparedById']]) {
 const before=`        PayrollRunStatus.${state},\n      );\n      return {`;
 replace(before,before.replace('      return {',`      await authorizePayrollRunTransition(tx, parsed, "payroll.run.${action}", payrollRun, ${subject});\n      return {`));
}
for(const [message,action,subject] of [['Emitted payroll run evidence is missing.','payroll.payslips.emit',''],['Posted payroll run ledger evidence is missing.','payroll.run.post',', payrollRun.approvedById']]) {
 const before=`          "${message}",\n        );\n      }\n      return {`;
 replace(before,before.replace('      return {',`      await authorizePayrollRunTransition(tx, parsed, "${action}", payrollRun${subject});\n      return {`));
}
for(const [kind,actor,resource,date,subject] of [['request','requestedById','existing','parseDate(parsed.now, paymentDate)',''],['release','releasedById','paymentBatch','releasedAt','subjectActorId: paymentBatch.approvedById,']]) {
 const before=`        "Payroll payment ${kind} idempotency key was reused with a different payload.",\n      );\n      return {`;
 replace(before,before.replace('      return {',`      const decision = evaluateSensitiveAction({
        action: "payroll.payment.${kind}", actorId: parsed.${actor},
        organizationId: parsed.organizationId, actorPermissions: parsed.actorPermissions,
        lastAuthAt: parsed.lastAuthAt, now: ${date},
        resourceType: "PayrollPaymentBatch", resourceId: ${resource}.id,
        ${subject}
        amount: ${resource}.amount, currency: ${resource}.currency,
      });
      await auditSensitiveActionDecision(tx, decision);
      assertSensitiveActionAllowed(decision);
      return {`));
}
// Move the existing legacy approval authority check before the retained replay branch.
const start=source.indexOf('export async function approveAndPostPayrollRun(');
const end=source.indexOf('\nexport async function ',start+20);
let part=source.slice(start,end);
const a=part.indexOf('    const correctionMetadata = payrollRunCorrectionMetadata(run);');
const b=part.indexOf('    assertPayrollProductionAdmission(run);',a);
if(a<0||b<a)throw Error('Legacy block not found');
const authorization=part.slice(a,b);
part=part.slice(0,a)+part.slice(b);
const marker='    if (run.status === PayrollRunStatus.POSTED) {';
part=part.replace(marker,authorization+'\n'+marker);
source=source.slice(0,start)+part+source.slice(end);
fs.writeFileSync(file+'.hr08-candidate',source.replace(/\n/g,newline));
console.log('Prepared payroll-control replay authorization candidate');
