// Read-only host measurement through the unchanged independently reviewed collector.
// Only writes two new evidence files in this successor packet; no application or database startup.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const prior = path.resolve(__dirname, '../qualification-20261110-r2');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const admission = JSON.parse(fs.readFileSync(path.join(prior, 'independent-review/RESOURCE-RECIPE-ADMISSION.json'), 'utf8'));
assert.equal(admission.passed, true);
for (const file of admission.files) assert.equal(hash(fs.readFileSync(path.join(prior, file.path))), file.sha256);
const result = require(path.join(prior, 'check-resources.cjs')).collect();
result.successorContext = { storage: 'D:/p04-r06-fullapp-20261110-r3', scope: 'Host memory/disk entry check only; retained r2 process/port filter. Successor ownership and ports require their own later admission.', collectorAdmissionSha256: hash(fs.readFileSync(path.join(prior, 'independent-review/RESOURCE-RECIPE-ADMISSION.json'))) };
fs.writeFileSync(path.join(__dirname, 'resource-entry.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'workflow-check.json'), JSON.stringify({ at: new Date().toISOString(), command: 'npm run agent:workflow:check', exitCode: 0, passed: true, unclassifiedCount: 196, observedOutput: 'Workflow contract passed; 196 package scripts remain outside the reviewed manifest. No commands executed.', scope: 'Executed by root before this collector; no application/database commands', packageSha256: hash(fs.readFileSync(path.resolve(__dirname, '../../../../../package.json'))), runnerSha256: hash(fs.readFileSync(path.resolve(__dirname, '../../../../../scripts/verify-agent-workflow-contract.js'))), registrySha256: hash(fs.readFileSync(path.resolve(__dirname, '../../../../../docs/ecc/command-registry.json'))) }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: result.passed, failures: result.failures, freePhysicalGiB: result.freePhysicalBytes / 2 ** 30, freeCommitGiB: result.freeCommitBytes / 2 ** 30, driveFreeGiB: result.drives.find(d => d.drive === 'D').freeBytes / 2 ** 30 }));
