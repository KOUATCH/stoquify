const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..'), hash = value => crypto.createHash('sha256').update(value).digest('hex');
const file = 'components/finance/ReconciliationPreparationWorkbench.tsx', raw = fs.readFileSync(path.join(repo, file), 'utf8');
const parentFile = 'evidence/preparation-history-impact-2026-09-27.json', parent = JSON.parse(fs.readFileSync(path.join(root, parentFile)));
let restored = raw;
function reverse(before, after) { assert.equal(restored.split(before).length - 1, 1, before); restored = restored.replace(before, after); }
reverse('finally { if (mounted.current && ticket === epoch.current) { setBusy(false); region.current?.focus() } }', 'finally { if (mounted.current && ticket === epoch.current) setBusy(false) }');
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
reverse('  const primaryAction = useRef<HTMLButtonElement>(null), focusAfterAuthentication = useRef(false)' + newline, '');
reverse('function fail(error: unknown, failureMessage?: string)', 'function fail(error: unknown)');
reverse('text: failureMessage ?? t(code ===', 'text: t(code ===');
reverse('async function perform(work: () => Promise<void>, failureMessage?: string)', 'async function perform(work: () => Promise<void>)');
reverse('if (mounted.current) fail(error, failureMessage)', 'if (mounted.current) fail(error)');
reverse(['  useEffect(() => {', '    if (busy || needsAuth || !focusAfterAuthentication.current) return', '    focusAfterAuthentication.current = false', '    if (primaryAction.current && !primaryAction.current.disabled) primaryAction.current.focus()', '    else region.current?.focus()', '  }, [busy, needsAuth])', ''].join(newline), '');
reverse('focusAfterAuthentication.current = true; setNeedsAuth(false);', 'setNeedsAuth(false);');
reverse('}, common("suspenseWorkflow.review.authFailed")) }}><label htmlFor={`${runId}-preparation-password`}', '}) }}><label htmlFor={`${runId}-preparation-password`}');
reverse('<Button ref={primaryAction} className="dashboard-button-primary"', '<Button className="dashboard-button-primary"');
assert.equal(hash(restored), parent.source.after, 'Unexpected changes outside authentication/discovery focus patch');
const receiptFiles = process.argv.slice(2); assert.equal(receiptFiles.length, 4, 'Pass checks, authentication browser, discovery browser and financial lifecycle receipts');
const receipts = receiptFiles.map(relative => {
  const bytes = fs.readFileSync(path.join(root, relative)), row = JSON.parse(bytes);
  if (relative.includes('run-preparation-v114-')) { assert.ok(!row.error && row.checks.length === 5 && row.originalUnchanged); }
  else assert.equal(row.passed, true, relative);
  assert.equal(row.sourceStable, true, relative); const source = row.sourceBefore ?? row.sourcesBefore;
  if (source[file]) assert.equal(source[file], hash(raw), relative);
  return { file: relative, sha256: hash(bytes) };
});
const auth = JSON.parse(fs.readFileSync(path.join(root, receiptFiles[1]))), discovery = JSON.parse(fs.readFileSync(path.join(root, receiptFiles[2])));
assert.equal(auth.translationStable, true); assert.equal(auth.journeys.length, 2); assert.equal(discovery.journeys.length, 2);
assert.ok(auth.journeys.every(row => row.passed && row.authenticatedRetryFocusWithoutSubmission && row.rejectedPasswordClearedAndRefocused && row.authenticationTransportFailureRetainsCommand && row.responseLostAfterCommit && row.exactReplayRetainsOneReceiptAndAudit));
assert.ok(discovery.journeys.every(row => row.passed && row.lastPageFocusRestored && row.failedReadFocusRestored));
const screenshots = [...auth.journeys, ...discovery.journeys].flatMap(row => row.screenshots).map(name => { const relative = 'lanes/environment/' + name; return { file: relative, sha256: hash(fs.readFileSync(path.join(root, relative))) }; });
const report = { at: new Date().toISOString(), passed: true, workflow: 'PR-19', parent: { file: parentFile, sha256: hash(fs.readFileSync(path.join(root, parentFile))) }, source: { file, before: parent.source.after, after: hash(raw), reconstructedBefore: hash(restored) }, receipts, screenshots,
  impact: 'Only authentication focus/error presentation and run-discovery focus change. Removing the exact edits reconstructs the prior UI. Submission, validation, retained drafts, server authority and history persistence remain unchanged. Current EN/FR authentication and committed-response recovery, discovery and failure recovery, financial preparation/sign/export/reversal, tests/lint/typecheck cover affected behavior. Earlier module, history and PR-10 evidence remains applicable through the parent chain.',
  limitations: ['No professional certification or production deployment claim.', 'Original native speech/browser-chrome zoom and notification-operation limits remain.'] };
const output = 'evidence/preparation-auth-impact-2026-09-27.json'; fs.writeFileSync(path.join(root, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ output, passed: true }));
