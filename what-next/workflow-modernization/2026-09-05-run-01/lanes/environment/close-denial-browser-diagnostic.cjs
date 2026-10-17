// Read-only diagnosis pinned to the failed owned browser attempt.
const f = require('./statement-recipient-fixtures.cjs');
const { fs, path, crypto, assert, db, helper } = f;
const receiptFile = path.join(__dirname, 'close-denial-recovery-browser-5dbf54af-742f-4103-a52b-32db77c02caa.json');
const before = fs.readFileSync(receiptFile), receipt = JSON.parse(before);
assert.equal(receipt.passed, false); assert.equal(receipt.sourceStable, true);
const report = { at: new Date().toISOString(), predecessor: path.basename(receiptFile), predecessorSha256: crypto.createHash('sha256').update(before).digest('hex'), fixtures: [] };
async function run() {
  await helper.withClient(f.target, helper.assertOwned);
  for (const fixture of receipt.fixtures) {
    assert.ok(fixture.organizationId.startsWith('workflow_close_write_browser-'));
    const organization = await db.organization.findUniqueOrThrow({ where: { id: fixture.organizationId }, select: { name: true } });
    assert.ok(organization.name.startsWith(helper.prefix));
    const runs = await db.closeRun.findMany({ where: { organizationId: fixture.organizationId }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, metadata: true, findings: { select: { title: true, detail: true, severity: true } } } });
    report.fixtures.push({ organizationId: fixture.organizationId, initialCloseRunId: fixture.closeRunId, runs: runs.map(row => ({ id: row.id, status: row.status, trustLevel: row.metadata?.trustLevel, findings: row.findings })) });
  }
  const file = path.join(__dirname, 'close-denial-browser-diagnostic-' + crypto.randomUUID() + '.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, fixtures: report.fixtures }));
}
run().catch(error => { console.error(f.safe(error)); process.exitCode = 1; }).finally(() => db.$disconnect());
