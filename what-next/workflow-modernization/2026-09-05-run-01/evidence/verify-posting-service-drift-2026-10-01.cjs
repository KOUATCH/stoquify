// Reconstruct one retained source version, then run only its focused mocked suite and lint.
// No product, historical receipt, register, migration, database or reconciler writes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../..'), run = path.dirname(__dirname);
const { diffArrays, createTwoFilesPatch } = require(path.join(repo, 'node_modules/diff'));
const ts = require(path.join(repo, 'node_modules/typescript'));
const service = 'services/accounting/posting.service.ts', test = 'services/accounting/__tests__/posting.service.test.ts';
const beforeHash = 'b75fb9e85657b6ee009be86055b96d53b1eb24f17fa6c6b7923167d26baa2f94', afterHash = '458ba5848af4fde0f0fc2731261a54bf20f10302b44dc201a2b529f81e2014e2';
const commit = '62a56036a5ac9b37236a20c9b148052199069479';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const bind = file => ({ file: path.relative(run, file).replaceAll('\\', '/'), sha256: hash(fs.readFileSync(file)) });
const priorReviewFile = path.join(run, 'evidence/cash-release-readiness-review-2026-09-30.json');
const priorReview = JSON.parse(fs.readFileSync(priorReviewFile, 'utf8'));
assert.equal(priorReview.sourceHashes[service], beforeHash);
const manifestFile = path.join(run, 'evidence/source-baseline-v160.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const retainedRecordIndex = manifest.sources.findIndex(row => row.path === service);
assert.equal(manifest.sources[retainedRecordIndex].sha256, beforeHash);
const current = read(service);
assert.equal(hash(current), afterHash);
const git = spawnSync('git', ['show', `${commit}:${service}`], { cwd: repo, windowsHide: true, maxBuffer: 1024 * 1024 });
assert.equal(git.status, 0);
assert.equal(hash(git.stdout), '75e4a08825fa7ecb04e7f643b62db7366b79a36cf61e5c8aa579128fd573964d');
const normalizedRetained = git.stdout.toString('utf8');
const oldLines = normalizedRetained.match(/[^\n]*\n|[^\n]+$/g), currentLines = current.match(/[^\n]*\n|[^\n]+$/g);
let currentIndex = 0, predecessor = '';
for (const part of diffArrays(oldLines.map(line => line.replace(/\r?\n$/, '')), currentLines.map(line => line.replace(/\r?\n$/, '')))) {
  if (part.added) currentIndex += part.count;
  else if (part.removed) predecessor += part.value.map(line => line + (line === '    assertBalancedJournalEntry(original.lines)' ? '\r\n' : '\n')).join('');
  else { predecessor += currentLines.slice(currentIndex, currentIndex + part.count).join(''); currentIndex += part.count; }
}
assert.equal(hash(predecessor), beforeHash, 'The complete retained source bytes must match the historical reviewed hash');
assert.equal(Buffer.byteLength(predecessor), manifest.sources[retainedRecordIndex].bytes);
assert.equal(predecessor.replace(/\r\n/g, '\n'), normalizedRetained, 'Reconstruction may restore line endings only to retained Git text');
function declarations(raw) {
  const text = raw.replace(/\r\n/g, '\n'), ast = ts.createSourceFile(service, text, ts.ScriptTarget.Latest, true);
  return ast.statements.map(node => ({ name: node.name?.text || `kind-${node.kind}`, text: text.slice(node.getStart(ast), node.end) }));
}
const previousNodes = declarations(predecessor), currentNodes = declarations(current);
assert.equal(previousNodes.length, currentNodes.length);
const changedDeclarations = previousNodes.flatMap((node, index) => {
  assert.equal(node.name, currentNodes[index].name);
  return node.text === currentNodes[index].text ? [] : [node.name];
});
assert.deepEqual(changedDeclarations, ['postJournalEntry', 'reverseJournalEntry']);
const files = [service, test, 'services/accounting/invariants.ts', 'services/accounting/periods.service.ts', 'services/accounting/source-link.service.ts', 'services/accounting/journal-close-invalidation.service.ts', 'services/accounting/close-assurance-pack.service.ts', 'services/controls/sensitive-action.service.ts', 'services/_shared/action-errors.ts', 'services/modules/module-admission.service.ts', 'prisma/schema.prisma', 'package.json', 'package-lock.json', 'jest.config.ts', 'jest.setup.ts', path.relative(repo, __filename).replaceAll('\\', '/')].sort();
const snapshot = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(repo, file)))]));
const startedAt = new Date().toISOString(), runId = crypto.randomUUID(), prefix = path.join(__dirname, `posting-service-drift-${runId}`), before = snapshot();
fs.writeFileSync(`${prefix}-predecessor.ts.txt`, predecessor, { flag: 'wx' });
fs.writeFileSync(`${prefix}.diff`, createTwoFilesPatch(service + '@reviewed', service + '@current', predecessor.replace(/\r\n/g, '\n'), current.replace(/\r\n/g, '\n')), { flag: 'wx' });
const commands = [];
function execute(name, args) {
  const result = spawnSync(process.execPath, args, { cwd: repo, encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(`${prefix}-${name}.log`, (result.stdout || '') + (result.stderr || ''), { flag: 'wx' });
  commands.push({ name, executable: process.execPath, args, exitCode: result.status, signal: result.signal, error: result.error?.code || null });
  return result;
}
execute('jest', ['node_modules/jest/bin/jest.js', '--runInBand', '--runTestsByPath', test, '--json', `--outputFile=${prefix}-jest.json`]);
execute('lint', ['node_modules/eslint/bin/eslint.js', service, test, '--format', 'json', '--output-file', `${prefix}-lint.json`]);
const after = snapshot(), sourceStable = JSON.stringify(before) === JSON.stringify(after);
const jest = fs.existsSync(`${prefix}-jest.json`) ? JSON.parse(fs.readFileSync(`${prefix}-jest.json`, 'utf8')) : null;
const lint = fs.existsSync(`${prefix}-lint.json`) ? JSON.parse(fs.readFileSync(`${prefix}-lint.json`, 'utf8')) : null;
const lintErrors = lint?.reduce((sum, row) => sum + row.errorCount + row.fatalErrorCount, 0), lintWarnings = lint?.reduce((sum, row) => sum + row.warningCount, 0);
const passed = commands.every(row => row.exitCode === 0 && !row.error) && sourceStable && jest?.success === true && lint?.length === 2 && lintErrors === 0 && lintWarnings === 0;
const review = {
  at: new Date().toISOString(), startedAt, runId, workflow: 'FA-CASH-COMMAND', passed, sourceStable,
  scope: 'Only the exact posting.service.ts predecessor transition and its current focused mocked service suite; no workflow closure or deployment.',
  sourceHashesBefore: before, sourceHashes: after,
  priorImpact: [{ file: service, before: beforeHash, after: afterHash, priorReview: path.relative(run, priorReviewFile).replaceAll('\\', '/'), snapshot: bind(`${prefix}-predecessor.ts.txt`) }],
  predecessor: { gitCommit: commit, gitPath: service, gitBlobSha256: hash(git.stdout), manifest: bind(manifestFile), recordPointer: `/sources/${retainedRecordIndex}`, method: 'Retained Git text with unchanged current line endings and the original CRLF on assertBalancedJournalEntry(original.lines). Exact whole historical SHA256 and byte count match; LF-normalized reconstruction is identical to retained Git text.', bytes: Buffer.byteLength(predecessor), sha256: hash(predecessor) },
  changedDeclarations,
  reviewFindings: [
    'Generic posting now accepts only explicitly MANUAL sources. Domain-owned and unattributed drafts cannot be relabelled by the manual command.',
    'Posting revalidates finite positive per-line FX rates, exact HALF_UP two-decimal recorded base amounts and functional balance before any financial posting effects. Invalid historical drafts require correction rather than silent relabelling.',
    'Generic reversal now rejects every non-MANUAL source, including null provenance, after current authority evaluation. It records a source-owned denial without financial effects and throws after the transaction so the denial audit can persist.',
    'Manual reversal refuses missing recorded base amounts and swaps the retained nominal and functional amounts without falling back to nominal values. Existing tenant scoping, source-recovery guards, period locking, batch identity and close invalidation declarations are unchanged.',
    'The focused suite covers all current non-MANUAL enum sources and null, missing base debit/credit, retained foreign base decimals, cross-tenant absence, source-owned drafts, invalid copied FX bases, existing period/authority/separation-of-duties rules, successful manual posting and reversal.',
  ],
  limitations: [
    'Prisma transactions are mocked. This review does not establish PostgreSQL concurrency, rollback, source-workflow completeness or the runtime persistence of denial audits.',
    'Manual reversal preserves recorded functional amounts; it does not certify historical amounts, reconstruct missing legacy proof or validate an external exchange-rate source.',
    'The existing PAYMENT_SUSPENSE denial text still says its linked correction workflow is not yet available. Dedicated source workflows exist in this repository; that explanatory text remains a reporting limitation, not a bypass of the manual-command boundary.',
    'Only this one production predecessor is eligible for a bridge. Any other drift requires a separate review, and the active fractional receipt work remains outside this evidence.',
  ],
  commands,
  results: { suites: jest?.numTotalTestSuites, passedTests: jest?.numPassedTests, failedTests: jest?.numFailedTests, skippedTests: jest?.numPendingTests, lintFiles: lint?.length, lintErrors, lintWarnings },
  receipts: ['-jest.log', '-jest.json', '-lint.log', '-lint.json'].filter(suffix => fs.existsSync(prefix + suffix)).map(suffix => bind(prefix + suffix)),
  artifacts: [bind(`${prefix}-predecessor.ts.txt`), bind(`${prefix}.diff`), bind(priorReviewFile), bind(manifestFile), bind(__filename)],
  conclusion: passed ? 'This exact production transition is supported for a separately pinned reconciliation bridge with the listed mocked-verification limits.' : 'A reconciliation bridge is not supported by passing focused current evidence.',
};
fs.writeFileSync(`${prefix}-review.json`, JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ review: bind(`${prefix}-review.json`), passed, sourceStable, results: review.results, commands }) + '\n');
process.exitCode = passed ? 0 : 1;
