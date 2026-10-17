// Resume the verified checkpoint whose existing-register write failed. No product or DB operations.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const checkpoint = 'aa6493a2-976d-4135-926d-784a488f46f4';
const review = JSON.parse(fs.readFileSync(path.join(__dirname, 'close-denial-recovery-review-' + checkpoint + '.json'), 'utf8'));
let source = fs.readFileSync(path.join(__dirname, 'finalize-close-denial-recovery.cjs'), 'utf8');
source = source.replace('const run = crypto.randomUUID(), at = new Date().toISOString(),', 'const run = ' + JSON.stringify(checkpoint) + ', at = ' + JSON.stringify(review.at) + ',');
source = source.slice(0, source.indexOf('fs.writeFileSync(path.join(__dirname, `close-denial-recovery-register-before-'));
source += `
const proposedRegister = path.join(__dirname, 'close-denial-register-proposed-' + run + '.json');
const proposedProgress = path.join(__dirname, 'close-denial-progress-proposed-' + run + '.md');
fs.writeFileSync(proposedRegister, updated, { flag: 'wx' });
fs.writeFileSync(proposedProgress, progress, { flag: 'wx' });
const { spawnSync } = require('node:child_process');
const updates = [[registerPath, proposedRegister], [path.join(runRoot, 'CURRENT_PROGRESS.md'), proposedProgress]];
let patch = '*** Begin Patch\\n';
for (const [target, proposed] of updates) {
  const diff = spawnSync('git', ['diff', '--no-index', '--unified=3', '--', target, proposed], { encoding: 'utf8', windowsHide: true });
  assert.equal(diff.status, 1);
  const lines = diff.stdout.split(/\\r?\\n/).filter(line => !/^(diff --git |index |--- |\\+\\+\\+ |\\\\ No newline)/.test(line));
  while (lines.at(-1) === '') lines.pop();
  patch += '*** Update File: ' + target.replaceAll('\\\\', '/') + '\\n' + lines.map(line => /^@@/.test(line) ? '@@' : line).join('\\n') + '\\n';
}
patch += '*** End Patch\\n';
const patchPath = path.join(__dirname, 'close-denial-checkpoint-recovery-' + run + '.patch');
fs.writeFileSync(patchPath, patch, { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'close-denial-checkpoint-write-failure-' + run + '.json'), JSON.stringify({ at: new Date().toISOString(), reviewFile, stage: 'write-existing-register', error: 'UNKNOWN open error; register remained exact predecessor', originalRegister: hash(original), proposedRegister: hash(updated), progressWords: progress.split(/\\s+/).length, recovery: 'Apply retained patch with workspace file tool, then verify exact proposed file hashes' }, null, 2) + '\\n', { flag: 'wx' });
console.log(JSON.stringify({ patchPath, proposedRegister, proposedProgress, registerAfter: hash(updated), progressWords: progress.split(/\\s+/).length }));
`;
vm.runInNewContext(source, { require, __dirname, console, process, Buffer }, { filename: __filename });
