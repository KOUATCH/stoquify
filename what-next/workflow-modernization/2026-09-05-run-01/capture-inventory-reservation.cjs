const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'evidence/source-baseline-v4.json'), 'utf8'));
const production = ['actions/inventory/inventoryMovementActions.ts', 'actions/inventory/inventoryActions.ts', 'hooks/useInventoryMovementQueries.ts', 'messages/en.json', 'messages/fr.json'];
const tests = ['actions/inventory/__tests__/inventoryReservationActions.test.ts', 'hooks/__tests__/useInventoryMovementQueries.reservation.test.tsx'];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const result = JSON.parse(fs.readFileSync(path.join(__dirname, 'evidence/inventory-reservation-after.json'), 'utf8'));
const before = production.map(file => { const source = baseline.sources.find(item => item.path === file); if (!source) throw new Error(`Missing baseline ${file}`); return { path: file, sha256: source.sha256 }; });
const receipt = {
  recordedAt: new Date().toISOString(),
  before: { failed: 21, passed: 5, suites: 2, seconds: 36.982, exitCode: 1, toolSession: 54059, finalToolChunk: '49302f', report: null, limitation: 'The npm.ps1 invocation did not forward the requested serial/JSON flags. Console proved these two suites and counts; no JSON baseline or serial execution is claimed. Production bytes are bound to source-baseline-v4, also unchanged throughout the preceding build.' },
  after: { failed: result.numFailedTests, passed: result.numPassedTests, suites: result.numPassedTestSuites, success: result.success, report: 'evidence/inventory-reservation-after.json', toolSession: 19987, finalToolChunk: '33d447', runner: 'Bundled Node invokes node_modules/jest/bin/jest.js directly with --runInBand --runTestsByPath --json; 26 new regressions plus existing movement and entitlement suites.' },
  lint: { files: [...production.filter(file => !file.endsWith('.json')), ...tests], exitCode: 0, toolSession: 71903, finalToolChunk: '33e351' },
  productionBefore: before,
  sourcesAfter: [...production, ...tests].map(file => ({ path: file, sha256: sha(file) })),
  limits: ['RBAC, module observer and stock collaborators are mocked at the action tests; shared module suites exercise current evaluator rules separately.', 'Real hook/mutation behavior is tested in EN/FR; the hook has no located production UI consumer and no browser journey is claimed.', 'Existing inventory request-boundary entitlement policy is reused. Reservation stop admission, release/expiry, partial batch effects, durable command idempotency and revocation during a stock transaction remain open.', 'No stock kernel, valuation, ledger owner, schema or rejected offline/POS candidate changed.'],
};
fs.writeFileSync(path.join(__dirname, 'evidence/inventory-reservation-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ before: { failed: 21, passed: 5 }, after: receipt.after, sources: receipt.sourcesAfter.length }));
