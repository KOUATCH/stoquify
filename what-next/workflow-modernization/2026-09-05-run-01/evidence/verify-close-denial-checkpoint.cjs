// Read back the two recovered files and every current evidence binding; write one completion receipt.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..'), runRoot = path.resolve(__dirname, '..'), stamp = 'aa6493a2-976d-4135-926d-784a488f46f4';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const register = path.join(runRoot, 'WORKFLOW_REGISTER.json'), progress = path.join(runRoot, 'CURRENT_PROGRESS.md');
assert.equal(hash(register), hash(path.join(__dirname, 'close-denial-register-proposed-' + stamp + '.json')));
assert.equal(hash(progress), hash(path.join(__dirname, 'close-denial-progress-proposed-' + stamp + '.md')));
const reviewFile = path.join(__dirname, 'close-denial-recovery-review-' + stamp + '.json'), review = JSON.parse(fs.readFileSync(reviewFile, 'utf8'));
for (const [file, expected] of Object.entries(review.bindings)) assert.equal(hash(path.join(root, file)), expected, file);
for (const record of [...review.evidence, ...review.artifacts]) assert.equal(hash(path.join(runRoot, record.file)), record.sha256, record.file);
const contents = JSON.parse(fs.readFileSync(register, 'utf8')), words = fs.readFileSync(progress, 'utf8').split(/\s+/).length;
assert.ok(words <= 700); assert.equal(contents.workflows.length, 270);
const observed = Object.fromEntries(Object.keys(contents.coverage.statusCounts).map(status => [status, contents.workflows.filter(row => row.status === status).length]));
assert.deepEqual(observed, contents.coverage.statusCounts); assert.equal(observed['Complete—verified'], 4); assert.equal(observed['In progress'], 2);
const report = { at: new Date().toISOString(), passed: true, reviewFile: path.basename(reviewFile), registerSha256: hash(register), progressSha256: hash(progress), progressWords: words, counts: observed, sourceAndEvidenceBindingsCurrent: true, completeWorkflowVerified: false, recovery: 'The initial native write failed before modifying the register. The retained proposed diff was applied through the workspace file tool; exact hashes now match.', retainedFailure: 'close-denial-checkpoint-write-failure-' + stamp + '.json' };
fs.writeFileSync(path.join(__dirname, 'close-denial-recovery-register-followup-' + stamp + '.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report));
