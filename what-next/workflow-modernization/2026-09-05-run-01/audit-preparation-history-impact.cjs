const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..'), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const file = 'components/finance/ReconciliationPreparationWorkbench.tsx', raw = fs.readFileSync(path.join(repo, file), 'utf8');
const parentFile = 'evidence/preparation-module-impact-2026-09-27.json', parent = JSON.parse(fs.readFileSync(path.join(root, parentFile)));
const before = parent.sources.find(row => row.file === file).after;
let restored = raw.replace(', historyRegion = useRef<HTMLDivElement>(null)', '')
  .replace(/  async function navigateHistory\(query: ReconciliationPreparationQuery, previous: ReconciliationPreparationQuery\[\]\) \{\r?\n    try \{ await readHistory\(query, previous\) \}\r?\n    finally \{ historyRegion.current\?\.focus\(\) \}\r?\n  \}\r?\n/, '')
  .replace(/    <div ref=\{historyRegion\} role="region" aria-label=\{t\("history"\)\} tabIndex=\{-1\} className=\{regionClass\}>\r?\n/, '')
  .replaceAll('perform(() => navigateHistory(', 'perform(() => readHistory(')
  .replace(/    <\/div>\r?\n(?=  <\/section>)/, '');
assert.equal(hash(restored), before, 'Changes exceed the inspected history focus patch');
const receiptFiles = process.argv.slice(2); assert.equal(receiptFiles.length, 3, 'Pass checks, corrected browser, legacy receipts');
const receipts = receiptFiles.map(relative => {
  const bytes = fs.readFileSync(path.join(root, relative)), row = JSON.parse(bytes); assert.equal(row.passed, true, relative); assert.equal(row.sourceStable, true, relative);
  const sources = row.sourceBefore ?? row.sourcesBefore;
  if (sources[file]) assert.equal(sources[file], hash(raw));
  return { file: relative, sha256: hash(bytes) };
});
const browser = JSON.parse(fs.readFileSync(path.join(root, receiptFiles[1])));
assert.equal(browser.translationStable, true); assert.ok(browser.journeys.every(row => row.passed && row.focusAfterLastPage.tag === 'DIV'));
const artifacts = ['lanes/environment/preparation-reviewers-history-862f06cb-b70b-4bc2-9fb7-b0287798f3dd.json', ...browser.journeys.flatMap(row => row.screenshots.map(name => 'lanes/environment/' + name))].map(relative => ({ file: relative, sha256: hash(fs.readFileSync(path.join(root, relative))) }));
const report = { at: new Date().toISOString(), passed: true, workflow: 'PR-19', parent: { file: parentFile, sha256: hash(fs.readFileSync(path.join(root, parentFile))) }, source: { file, before, after: hash(raw), reconstructedBefore: hash(restored) }, receipts, artifacts,
  impact: 'Only adds a labeled, focusable history region and moves focus there after explicit page navigation succeeds or fails. Exact reconstruction reproduces the prior verified UI hash. Preparation submission, preview, authentication, pending drafts, signing handoff, server contracts and translations are unchanged. Current focused tests and EN/FR history failure/recovery revalidate the changed interaction; prior module/committed-response recovery and PR-10 closure remain applicable.',
  limitations: ['Original PR-10 closure limits remain.', 'This is a preparation milestone; final PR-19 criterion audit remains required.'] };
const output = 'evidence/preparation-history-impact-2026-09-27.json'; fs.writeFileSync(path.join(root, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ output, passed: true }));
