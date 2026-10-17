// Read-only diagnosis of one explicit, retained owned-fixture receipt.
const p = require('./purchase-close-recovery-fixtures.cjs');
const { fs, path, assert, root } = p.f;
async function main() {
  const name = process.argv[2]; assert.match(name || '', /^payment-handoff-runtime-[a-f0-9-]{36}\.json$/);
  const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, name))), organizationId = receipt.organizationId;
  assert.ok(organizationId.startsWith('workflow_supplier_ack_')); await p.guard();
  const runs = await p.db.closeRun.findMany({ where: { organizationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, periodId: true, status: true, createdAt: true } });
  const period = await p.db.accountingPeriod.findUniqueOrThrow({ where: { id: runs[0].periodId } });
  const { getCloseReadinessSnapshot } = require(path.join(root, 'services/snapshots/close-readiness-snapshot.service.ts'));
  const snapshot = await getCloseReadinessSnapshot({ organizationId, periodStart: period.startDate, periodEnd: period.endDate, now: new Date() });
  const missing = await p.db.closeEvidenceItem.findMany({ where: { organizationId, available: false }, select: { id: true, closeRunId: true, evidenceType: true, sourceType: true, sourceTable: true, sourceId: true, sourceLabel: true } });
  const findings = await p.db.closeAssuranceFinding.findMany({ where: { organizationId, status: { in: ['OPEN','ASSIGNED','IN_REVIEW','REOPENED'] } }, select: { id: true, closeRunId: true, severity: true, status: true, title: true } });
  console.log(JSON.stringify({ runs, snapshot: { grade: snapshot.evidenceGrade, blockers: snapshot.blockers, metrics: snapshot.metrics }, missing, findings }, null, 2));
}
main().catch(error => { console.error(p.safeError(error)); process.exitCode = 1; }).finally(() => p.db.$disconnect());
