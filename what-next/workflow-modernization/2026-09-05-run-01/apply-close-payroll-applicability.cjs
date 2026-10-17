const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),files=['services/accounting/close-assurance-pack.service.ts','services/accounting/__tests__/close-assurance-pack.service.test.ts'];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');const originals=Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
assert.equal(hash(originals[files[0]]),'3177efb4c7a5660adb34cb074d4e307e62b12a1b623b95607360029fdeae701d');
const archive='evidence/close-payroll-applicability-before-'+crypto.randomUUID()+'.json';fs.writeFileSync(path.join(__dirname,archive),JSON.stringify({at:new Date().toISOString(),sourceHashes:Object.fromEntries(files.map(file=>[file,hash(originals[file])])),sources:originals},null,2)+'\n',{flag:'wx'});
let s=originals[files[0]].replace(/\r\n/g,'\n');
s=s.replace('  closePeriodPayrollRunCount: number;','  closePeriodPayrollRunCount: number;\n  applicability?: "REQUIRED" | "NO_RECORDED_PAYROLL_PERIOD";\n  closePeriodPayrollPeriodCount?: number;\n  runCertificates?: PilotCertificationAnnex[];');
const start=s.indexOf('  const payrollRuns = await tx.payrollRun.findMany({',s.indexOf('async function loadPilotCertificationEvidenceForCloseRun('));const end=s.indexOf('\n}\n\nasync function evaluateInventoryAnnexFreshness',start);assert.ok(start>0&&end>start);
s=s.slice(0,start)+`  // Applicability follows retained period records, never module selection. Include
  // overlapping dates so a missing/wrong accounting link cannot hide payroll.
  const periods = await tx.payrollPeriod.findMany({
    where: {
      organizationId: run.organizationId,
      OR: [
        { accountingPeriodId: run.periodId },
        { periodStart: { lte: run.period.endDate }, periodEnd: { gte: run.period.startDate } },
      ],
    },
    select: { id: true, accountingPeriodId: true },
    orderBy: { id: "asc" },
  });
  if (periods.length === 0) {
    return {
      annex: {
        ...pilotCertificationEvidenceFromAudit(null, 0).annex,
        status: "NOT_APPLICABLE",
        applicability: "NO_RECORDED_PAYROLL_PERIOD",
        closePeriodPayrollPeriodCount: 0,
        runCertificates: [],
      },
      certificationBlockers: [],
    };
  }
  const payrollRuns = await tx.payrollRun.findMany({
    where: {
      organizationId: run.organizationId,
      deletedAt: null,
      payrollPeriod: { organizationId: run.organizationId, id: { in: periods.map(period => period.id) } },
    },
    select: { id: true, payrollPeriodId: true },
    orderBy: { id: "asc" },
  });
  const audits = payrollRuns.length ? await tx.auditLog.findMany({
    where: {
      organizationId: run.organizationId,
      entityType: PILOT_ENTITY_TYPE,
      action: PILOT_AUDIT_ACTION,
      entityId: { in: payrollRuns.map(payrollRun => payrollRun.id) },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, entityId: true, changes: true, createdAt: true },
  }) : [];
  const latestByRun = new Map<string, PilotAuditRow>();
  for (const audit of audits) if (!latestByRun.has(audit.entityId)) latestByRun.set(audit.entityId, audit);
  const evidence = payrollRuns.map(payrollRun => {
    const result = pilotCertificationEvidenceFromAudit(latestByRun.get(payrollRun.id) ?? null, 1);
    result.annex.payrollRunRef = redactClosePackEvidenceRef(payrollRun.id);
    return result;
  });
  const certificationBlockers = evidence.flatMap((item, index) =>
    item.certificationBlockers.map(blocker => "Payroll run " + (index + 1) + ": " + blocker),
  );
  const periodsWithRuns = new Set(payrollRuns.map(payrollRun => payrollRun.payrollPeriodId));
  const missingRuns = periods.filter(period => !periodsWithRuns.has(period.id)).length;
  if (missingRuns > 0) certificationBlockers.push(
    missingRuns + " payroll period(s) have no retained payroll run for pilot-cycle certification.",
  );
  const unlinkedPeriods = periods.filter(period => period.accountingPeriodId !== run.periodId).length;
  if (unlinkedPeriods > 0) certificationBlockers.push(
    unlinkedPeriods + " overlapping payroll period(s) require a matching accounting-period link before certification.",
  );
  return {
    annex: {
      ...(evidence.length === 1 ? evidence[0].annex : pilotCertificationEvidenceFromAudit(null, payrollRuns.length).annex),
      status: certificationBlockers.length > 0 ? "BLOCKED" : PILOT_CERTIFIED_STATUS,
      applicability: "REQUIRED",
      closePeriodPayrollPeriodCount: periods.length,
      closePeriodPayrollRunCount: payrollRuns.length,
      blockerCount: certificationBlockers.length,
      runCertificates: evidence.map(item => item.annex),
    },
    certificationBlockers,
  };`+s.slice(end);
let t=originals[files[1]].replace(/\r\n/g,'\n');
t=t.replace('    payrollRun: {','    payrollPeriod: { findMany: jest.fn() },\n    payrollRun: {');
t=t.replace('\n  payrollRun: {','\n  payrollPeriod: { findMany: jest.Mock }\n  payrollRun: {');
t=t.replaceAll('findFirst: jest.fn(),\n      create: jest.fn(),','findFirst: jest.fn(),\n      findMany: jest.fn(),\n      create: jest.fn(),');
t=t.replace('  auditLog: {\n    findFirst: jest.Mock','  auditLog: {\n    findMany: jest.Mock\n    findFirst: jest.Mock');
t=t.replace('mockDb.payrollRun.findMany.mockResolvedValue([{ id: "payroll-run-1" }])','mockDb.payrollPeriod.findMany.mockResolvedValue([{ id: "payroll-period-1", accountingPeriodId: "period-1" }])\n    mockDb.payrollRun.findMany.mockResolvedValue([{ id: "payroll-run-1", payrollPeriodId: "payroll-period-1" }])');
t=t.replace('mockDb.auditLog.findFirst.mockResolvedValue(pilotCertificationAudit())','mockDb.auditLog.findMany.mockResolvedValue([pilotCertificationAudit()])');
t=t.replace('mockDb.auditLog.findFirst.mockResolvedValue(null)','mockDb.auditLog.findMany.mockResolvedValue([])');
for(const [file,value]of [[files[0],s],[files[1],t]]){const target=path.join(root,file),fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value))}finally{fs.closeSync(fd)}}console.log(JSON.stringify({archive}));
