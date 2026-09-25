const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const receipt = read('evidence/supplier-proposal-evidence-receipt.json');
assert.equal(receipt.verification.tests.passed, 75);
const file = 'lanes/customer-supplier/WORKFLOW_REGISTER.json', bytes = fs.readFileSync(path.join(__dirname, file)), lane = JSON.parse(bytes);
// Invocation/revocation records also link to the now-verified common history.
// Remove only the precise superseded limitations, without upgrading their status.
for (const id of ['CS-SUPPLIER-INVITE', 'CS-SUPPLIER-REVOKE']) {
  const workflow = lane.workflows.find(item => item.id === id); assert.ok(workflow, id);
  workflow.remaining = workflow.remaining.filter(text => !text.startsWith('Envelope, note and state-lineage hashes are rechecked. Full reconstruction of historical proposal') && !text.startsWith('History token/proposal pagination has real PostgreSQL and component checks. A six-envelope browser traversal'));
  const limits = 'Native screen-reader operation, native zoom, comprehensive contrast, full production build and production latency remain unverified; some inherited French-shell labels remain English. Six-envelope history and proposal content/event verification are covered by the v48 checkpoint.';
  if (!workflow.remaining.includes(limits)) workflow.remaining.push(limits);
  workflow.evidence = [...new Set([...workflow.evidence, '../../evidence/supplier-proposal-evidence-receipt.json'])];
}
assert.ok(fs.readFileSync(path.join(__dirname, file)).equals(bytes), 'Register changed during preparation');
fs.writeFileSync(path.join(__dirname, file), JSON.stringify(lane, null, 2) + '\n');
console.log('Updated two inherited history references without changing their workflow completion status.');
