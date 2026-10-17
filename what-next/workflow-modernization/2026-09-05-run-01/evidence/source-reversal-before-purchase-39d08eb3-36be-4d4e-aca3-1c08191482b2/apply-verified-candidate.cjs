// One bounded application request after independent candidate proof. Filesystem only:
// no product imports, financial operation, database, migration, seed or deployment.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = process.cwd(), directory = __dirname, run = crypto.randomUUID();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const expected = [
  'services/purchasing/purchase-correction-ledger.service.ts', 'services/purchasing/purchase-return-credit.service.ts',
  'services/purchasing/__tests__/purchase-correction-ledger.service.test.ts', 'services/purchasing/__tests__/purchase-return-credit.service.test.ts',
  'services/inventory/inventory-stock-event.service.ts', 'services/inventory/__tests__/inventory-stock-event.service.test.ts',
  'services/accounting/close-assurance-pack.service.ts', 'services/accounting/__tests__/close-assurance-pack.service.test.ts',
  'actions/purchasing/purchase-return-credit.actions.ts', 'actions/purchasing/__tests__/purchase-return-credit.actions.test.ts',
].sort();
assert.equal(process.argv.length, 5, 'Use --review or --apply followed by exact passing typecheck and Jest receipt filenames');
assert.ok(['--review', '--apply'].includes(process.argv[2]));
const evidencePath = name => { assert.equal(path.basename(name), name); return path.join(directory, name); };
const typecheckPath = evidencePath(process.argv[3]), jestPath = evidencePath(process.argv[4]);
const typecheck = json(typecheckPath), jest = json(jestPath);
assert.equal(typecheck.kind, 'VIRTUAL_CANDIDATE_TYPECHECK_NO_EMIT'); assert.equal(typecheck.passed, true); assert.equal(typecheck.unchanged, true); assert.deepEqual(typecheck.diagnostics, []);
assert.equal(jest.kind, 'MOCKED_CANDIDATE_JEST_OVERLAY'); assert.equal(jest.passed, true); assert.equal(jest.unchanged, true); assert.equal(jest.candidateStable, true); assert.equal(jest.suites.total, 5); assert.equal(jest.tests.failed, 0);
assert.equal(sha(fs.readFileSync(jest.raw)), jest.rawSha256, 'Raw test receipt changed');
const baselines = new Map([...json(path.join(directory, 'manifest.json')).files, ...json(path.join(directory, 'registry-manifest.json'))].map(row => [row.path, row.sha256]));
for (const row of json(path.join(directory, '../source-reversal-before-actions-86596587-b770-4d20-b03f-7d6f96f53984/deferred-action-candidates.json'))) baselines.set(row.path, row.restored);
assert.deepEqual(typecheck.files.map(row => row.path).sort(), expected); assert.deepEqual(jest.files.map(row => row.path).sort(), expected);
const files = typecheck.files.map(row => {
  assert.ok(expected.includes(row.path));
  const target = path.resolve(root, row.path), candidate = path.resolve(row.candidate), before = fs.readFileSync(target), after = fs.readFileSync(candidate);
  assert.ok(target.startsWith(root + path.sep)); assert.ok(candidate.startsWith(path.resolve(directory, '..') + path.sep));
  assert.equal(sha(before), baselines.get(row.path), 'Concurrent application change: ' + row.path);
  assert.equal(sha(after), row.sha256, 'Candidate changed: ' + row.path);
  assert.equal(jest.candidatesAfter[row.path], row.sha256); assert.equal(jest.before[row.path], sha(before)); assert.equal(typecheck.productionAfter[row.path], sha(before));
  return { path: row.path, target, candidate, before, after, beforeSha256: sha(before), afterSha256: sha(after) };
});
for (const [file, hash] of Object.entries(typecheck.sharedAfter)) { assert.equal(sha(fs.readFileSync(path.join(root, file))), hash, 'Shared service changed: ' + file); assert.equal(jest.after[file], hash); }
const report = { run, at: new Date().toISOString(), mode: process.argv[2], scope: 'Ten verified candidate source/test files only. No financial execution or database access.',
  typecheck: { path: typecheckPath, sha256: sha(fs.readFileSync(typecheckPath)) }, jest: { path: jestPath, sha256: sha(fs.readFileSync(jestPath)) },
  files: files.map(({ path, candidate, beforeSha256, afterSha256 }) => ({ path, candidate, beforeSha256, afterSha256 })), applied: [], recovery: [] };
if (process.argv[2] === '--apply') {
  try {
    for (const file of files) {
      assert.equal(sha(fs.readFileSync(file.target)), file.beforeSha256, 'Concurrent edit immediately before write: ' + file.path);
      fs.writeFileSync(file.target, file.after); report.applied.push(file.path);
      assert.equal(sha(fs.readFileSync(file.target)), file.afterSha256);
    }
    report.passed = true;
  } catch (error) {
    report.error = String(error); report.passed = false;
    for (const file of files.filter(row => report.applied.includes(row.path)).reverse()) {
      const current = sha(fs.readFileSync(file.target));
      if (current !== file.afterSha256) { report.recovery.push({ path: file.path, restored: false, reason: 'Concurrent content retained' }); continue; }
      try { fs.writeFileSync(file.target, file.before); report.recovery.push({ path: file.path, restored: sha(fs.readFileSync(file.target)) === file.beforeSha256 }); }
      catch (rollbackError) { report.recovery.push({ path: file.path, restored: false, error: String(rollbackError) }); }
    }
  }
} else report.passed = true;
const output = path.join(directory, 'candidate-application-' + run + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, passed: report.passed, mode: report.mode, applied: report.applied, recovery: report.recovery }));
if (!report.passed) process.exitCode = 1;
