const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = __dirname, repo = path.resolve(root, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const closureFile = 'evidence/signoff-closure-2026-09-27.json', closure = JSON.parse(read(closureFile));
const accepted = {
  'services/reconciliation/reconciliation-run-preparation.service.ts': 'b6d80cfc8e536f67e622bc0d04beaf674f3521569bdb2f643a9a3b5e8943a0f8',
  'components/finance/ReconciliationPreparationWorkbench.tsx': 'e6824d861835ed34cc2335ffa2bc054ed0d5ec38b95eb978a7703a4758beb5f7',
};
const sources = [];
for (const [file, before] of Object.entries(closure.sourceHashes)) {
  const after = hash(fs.readFileSync(path.join(repo, file)));
  if (after === before) continue;
  assert.equal(after, accepted[file], 'Unreviewed signing dependency change: ' + file);
  sources.push({ file, before, after });
}
assert.equal(sources.length, 2);
const copy = {
  en: 'Reconciliation is read-only or its required capabilities are unavailable. Ask your workspace administrator to review access, then refresh this review before retrying preparation.',
  fr: 'Le rapprochement est en lecture seule ou ses fonctionnalités requises sont indisponibles. Demandez à votre administrateur de vérifier les accès, puis actualisez cet examen avant de réessayer la préparation.',
};
const translations = closure.translations.map(row => {
  const namespace = JSON.parse(fs.readFileSync(path.join(repo, row.file)))[row.namespace];
  const after = hash(JSON.stringify(namespace)), locale = path.basename(row.file, '.json');
  assert.equal(namespace.runPreparation.blockers.MODULE_WRITE_REQUIRED, copy[locale]);
  delete namespace.runPreparation.blockers.MODULE_WRITE_REQUIRED;
  assert.equal(hash(JSON.stringify(namespace)), row.sha256, 'Unexpected translation change');
  return { ...row, after, addition: { key: 'runPreparation.blockers.MODULE_WRITE_REQUIRED', value: copy[locale] } };
});
const files = [
  'evidence/preparation-module-checks-489b6628-2364-42a6-808d-aa6f7daa96aa.json',
  'lanes/environment/preparation-module-boundary-c205af1f-641e-48c3-bbcb-f6d37b2c5be8.json',
  'lanes/environment/preparation-module-ordering-8fb31772-bcba-4f54-ab70-0ed6e565b96e.json',
  'lanes/environment/preparation-module-browser-97a38ad3-6488-4ae4-aa2c-d9a58cc3a1c1.json',
  'lanes/environment/signed-source-boundaries-21987f3a-d9e3-482f-9c3a-7d7bceb2cd9b.json',
];
const receipts = files.map(file => {
  const bytes = read(file), data = JSON.parse(bytes);
  assert.equal(data.sourceStable, true, file);
  if (data.steps) assert.ok(data.steps.every(step => step.status === 0));
  else assert.equal(data.passed, true, file);
  const bindings = data.sourceBefore ?? data.sourcesBefore; assert.ok(bindings, file);
  for (const row of sources) if (bindings[row.file]) assert.equal(bindings[row.file], row.after);
  return { file, sha256: hash(bytes) };
});
const browser = JSON.parse(read(files[3]));
assert.equal(browser.translationStable, true);
for (const row of translations) assert.equal(browser.translationBefore[path.basename(row.file, '.json')], row.after);
const screenshots = browser.journeys.flatMap(row => row.screenshots).map(name => {
  const file = 'lanes/environment/' + name; return { file, sha256: hash(read(file)) };
});
const report = {
  at: new Date().toISOString(), workflow: 'PR-19', preservesClosedWorkflow: 'PR-10',
  closure: { file: closureFile, sha256: hash(read(closureFile)) }, sources, translations, receipts, screenshots,
  review: 'Adds transaction-bound module admission before preparation reads, writes and retained replay; no changes to source validation, financial amounts, certificate construction, independent signing or exports. Refreshed callback/statement preparation-to-sign/export lifecycle, focused signing regression and EN/FR preparation recovery cover the changed dependency. All other signing closure sources and namespace values remain byte/hash-bound.',
  limits: ['PR-19 remains in progress: reviewer conflicts, history volume and legacy evidence review remain.', 'Browser axe found no violations in the new preview region but could not resolve contrast for its two paragraphs because of dashboard pseudo-elements; contrast remains pending.', 'PR-10 original native assistive-technology, production and notification-operation limits remain unchanged.'],
  passed: true,
};
const output = 'evidence/preparation-module-impact-2026-09-27.json';
fs.writeFileSync(path.join(root, output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, passed: true, changedSources: sources.length, receipts: receipts.length }));
