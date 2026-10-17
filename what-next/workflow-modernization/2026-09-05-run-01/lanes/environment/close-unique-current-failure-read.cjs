// Read only: inspect the exact failed verifier fixture, no writes or repairs.
const h = require('./close-pack-write-race-runtime.cjs'), { f, db, helper } = h;
async function main() {
  await helper.withClient(f.target, helper.assertOwned);
  const organizationId = 'workflow_close_write_unique-creator-first_787a0280-1a2a-4bf8-9ca8-e9ece0defffb';
  const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId } }); f.assert.ok(org.name.startsWith(helper.prefix));
  const rows = await db.closeRun.findMany({ where: { organizationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { checklistItems: true, findings: true, evidenceItems: true } });
  console.log(JSON.stringify(rows.map(row => ({ id: row.id, status: row.status, trust: row.metadata?.trustLevel, metadata: row.metadata, checks: row.checklistItems.filter(value => ['FAILED', 'UNAVAILABLE'].includes(value.status)), findings: row.findings, unavailable: row.evidenceItems.filter(value => !value.available) })), null, 2));
}
main().catch(error => { console.log(f.safe(error)); process.exitCode = 1; }).finally(() => db.$disconnect());
