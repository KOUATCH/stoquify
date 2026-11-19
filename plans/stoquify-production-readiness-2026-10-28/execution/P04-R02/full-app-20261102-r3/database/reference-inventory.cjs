// Read-only inventory of the three declared synthetic item references only.
const { fs, path, assert, root, candidate, target, hash, receipt, connect } = require('./database-common.cjs');
const { items } = require('./fixture-definition.cjs');
const report = { at: new Date().toISOString(), passed: false, database: target.full,
  evidenceClass: 'real_isolated_database_read_only_synthetic_reference_inventory',
  limit: 'Three declared synthetic item references only; not a live original-tenant database census or delivery qualification.',
  applicationOrSchemaOrDataWrites: false };
async function main() {
  assert.equal(process.argv.length, 2);
  const context = JSON.parse(fs.readFileSync(path.join(__dirname, '../candidate-context.json')));
  const admission = JSON.parse(fs.readFileSync(path.join(__dirname, '../candidate-admission.json')));
  const ready = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-readiness.json')));
  assert.equal(path.resolve(context.root), root); assert.equal(path.resolve(context.source), candidate);
  assert.equal(fs.realpathSync(candidate), candidate);
  assert.equal(admission.passed, true); assert.equal(admission.candidateId, context.candidateId);
  assert.equal(ready.passed, true); assert.equal(ready.candidateId, context.candidateId);
  assert.equal(ready.database, target.full); assert.equal(items.length, 3);
  report.candidateId = context.candidateId;
  const expected = items.map(({ id, organizationId, imageUrl }) => ({ id, organizationId, imageUrl }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const synthetic = context.assetAnnex.filter(a => a.synthetic === true);
  assert.equal(synthetic.length, 3);
  assert(new Set(synthetic.map(a => a.source)).size === 3, 'Synthetic annex paths must be unique');
  const mappings = expected.map(item => {
    assert(/^p04r02-item-(a|b|disabled)$/.test(item.id));
    assert(/^p04-upload-(a|b|disabled)$/.test(item.organizationId));
    assert.equal(item.imageUrl, '/uploads/' + item.organizationId + '/sentinel.png');
    const source = 'public' + item.imageUrl;
    const asset = synthetic.find(a => a.source === source);
    assert(asset && /^[a-f0-9]{64}$/.test(asset.sha256), 'Expected synthetic asset mapping missing');
    const bytes = fs.readFileSync(path.join(candidate, source));
    assert.equal(hash(bytes), asset.sha256, 'Synthetic asset bytes changed');
    return { ...item, apiUrl: '/api' + item.imageUrl, candidateAssetPath: source,
      assetSha256: asset.sha256, assetBytes: bytes.length,
      expectedPrivateRuntimePath: '.private' + item.imageUrl };
  });
  const client = await connect(target.full);
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    report.transactionReadOnly = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
    assert.equal(report.transactionReadOnly, 'on');
    const total = (await client.query('SELECT count(*)::int AS count FROM items')).rows[0].count;
    assert.equal(total, 3, 'Synthetic fixture must contain exactly three items');
    const rows = (await client.query('SELECT id,"organizationId","imageUrls",thumbnail FROM items WHERE id = ANY($1::text[]) ORDER BY id',
      [expected.map(item => item.id)])).rows;
    assert.equal(rows.length, 3, 'Declared synthetic references incomplete');
    const expectedStored = expected.map(({id,organizationId,imageUrl}) => ({id,organizationId,imageUrls:[imageUrl],thumbnail:imageUrl}));
    assert(JSON.stringify(rows) === JSON.stringify(expectedStored), 'Stored synthetic imageUrls/thumbnail references differ from fixture definition');
    await client.query('COMMIT');
    report.totalFixtureItems = total; report.referenceColumns = ['imageUrls', 'thumbnail']; report.mappings = mappings; report.passed = true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
main().catch(error => { report.error = String(error.message).slice(0, 1000); process.exitCode = 1; })
  .finally(() => {
    report.finishedAt = new Date().toISOString(); receipt('reference-inventory', report);
    console.log(JSON.stringify({ passed: report.passed, candidateId: report.candidateId,
      references: report.mappings?.length, error: report.error }));
  });
