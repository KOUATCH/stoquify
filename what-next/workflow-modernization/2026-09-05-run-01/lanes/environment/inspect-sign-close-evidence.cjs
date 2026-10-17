"use strict";
if (process.argv[2] !== '--inspect') { console.log('Inert read-only fixture inspection.'); process.exit(0); }
const h = require('./sign-close-fixtures.cjs'), { p, f, db } = h;
async function main() {
  await p.guard();
  for (const hash of process.argv.slice(3)) {
    f.assert.match(hash, /^[a-f0-9]{64}$/);
    const run = await db.reconciliationRun.findFirstOrThrow({ where: { certificateHash: hash }, include: { organization: { select: { name: true } } } });
    f.assert.ok(run.organization.name.startsWith(f.helper.prefix));
    const rows = await db.closeEvidenceItem.findMany({ where: { organizationId: run.organizationId, sourceType: 'ReconciliationRun', sourceId: run.id }, select: { closeRunId: true, evidenceType: true, sourceTable: true, sourceLabel: true, sourceHash: true, provenance: true }, orderBy: [{ closeRunId: 'asc' }, { evidenceType: 'asc' }] });
    const closeIds = [...new Set(rows.map(row => row.closeRunId))];
    const findings = await db.closeAssuranceFinding.findMany({ where: { organizationId: run.organizationId, closeRunId: { in: closeIds } }, select: { closeRunId: true, domain: true, severity: true, title: true, sourceType: true } });
    const result = { signatureHash: hash, runStatus: run.status, rows, findings };
    const file = f.path.join(__dirname, 'sign-close-evidence-inspection-' + f.crypto.randomUUID() + '.json'); f.fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ file, signatureHash: hash, runStatus: run.status, findings }));
  }
}
main().catch(error => { console.error(p.safeError(error)); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); process.exit(process.exitCode || 0); });
