const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), ts = require('typescript');
const root = __dirname, repo = path.resolve(root, '../../..'), read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '')), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const browser = process.argv[2]; assert.match(browser ?? '', /^lanes\/environment\/inventory-direction-browser-[a-f0-9-]+\.json$/);
const report = 'INVENTORY_DIRECTION_2026-09-30.md', reviewFile = 'evidence/inventory-direction-review-2026-09-30.json', baselineFile = 'evidence/inventory-direction-before-2026-09-30.json', baseline = read(baselineFile), parent = read('evidence/setup-rule-selection-review-2026-09-30.json');
const receipts = ['evidence/inventory-direction-checks-d1ddea86-3132-4313-98a8-fbfb066b8ef6.json', 'lanes/environment/inventory-direction-c67200e9-42a0-46d1-9da9-0a030e45de38.json', browser];
for (const file of receipts) assert.ok(read(file).passed && read(file).sourceStable);
assert.equal(read(browser).cases.length, 2);
const sourceHashes = Object.assign({}, ...receipts.map(file => read(file).sourceAfter));
for (const [file, expected] of Object.entries(sourceHashes)) assert.equal(hash(path.join(repo, file)), expected);
const priorImpact = Object.entries(baseline.sourceHashes).map(([file, before]) => ({ file, before, after: sourceHashes[file], priorReview: baselineFile }));
for (const row of priorImpact) { assert.ok(row.after && row.after !== row.before); assert.equal(crypto.createHash('sha256').update(baseline.sources[row.file]).digest('hex'), row.before); }
function declarations(text) { const s = ts.createSourceFile('source.ts', text.replace(/\r\n/g, '\n'), ts.ScriptTarget.Latest, true); return new Map(s.statements.map((n, i) => [ts.isImportDeclaration(n) ? 'import:' + n.moduleSpecifier.text : n.name?.text ?? (ts.isVariableStatement(n) ? n.declarationList.declarations.map(d => d.name.getText(s)).join(',') : 'statement-' + i), n.getText(s)])); }
const declarationImpact = [];
for (const [file, changes, additions] of [
  ['services/inventory/inventory-adjustment.service.ts', ['postAdjustmentLedgerOrBlock', 'postStockAdjustment'], ['adjustmentRuleSourceAmount']],
  ['services/accounting/default-posting-rules.ts', ['DEFAULT_POSTING_RULES'], ['DEFAULT_INVENTORY_POSTING_RULES']],
]) {
  const before = declarations(baseline.sources[file]), after = declarations(fs.readFileSync(path.join(repo, file), 'utf8'));
  const changed = [...before.keys()].filter(key => after.has(key) && before.get(key) !== after.get(key));
  const added = [...after.keys()].filter(key => !before.has(key)), deleted = [...before.keys()].filter(key => !after.has(key));
  assert.deepEqual(changed.sort(), changes.sort()); assert.deepEqual(added.sort(), additions.sort()); assert.deepEqual(deleted, []);
  declarationImpact.push({ file, changed, added, deleted, allOtherDeclarationsExactlyPreserved: true });
}
const remaining = [...parent.remaining];
remaining[0] = 'Inventory adjustment now has a directional default, actual gain/loss/mixed posting proof and evidence-backed replay status. Three required purposes still lack operational defaults/applicability reconciliation: CASH_DRAWER_CLOSE, GOODS_RECEIPT and EXPENSE_APPROVAL. Complete their producer/setup contracts, blocked-adjustment ledger recovery, eligible close certification, current-configuration concurrency, native accessibility and representative latency.';
const artifacts = [report, baselineFile, 'lanes/environment/verify-inventory-direction.cjs', 'lanes/environment/verify-inventory-direction-browser.cjs', 'run-inventory-direction-checks.cjs', ...read(browser).cases.map(row => 'lanes/environment/' + row.screenshot)];
const review = { at: new Date().toISOString(), passed: true, workflow: 'FA-CASH-COMMAND', report, sourceHashes, priorImpact, declarationImpact, remaining, verifiedSubcriteria: ['inventory_gross_gain_loss_direction', 'inventory_balanced_wrong_value_denial', 'inventory_maker_checker_and_no_duplicate_effects', 'inventory_replay_retained_posting_truth', 'inventory_template_en_fr_control_center'], receipts: receipts.map(file => ({ file, sha256: hash(path.join(root, file)) })), artifacts: artifacts.map(file => ({ file, sha256: hash(path.join(root, file)) })) };
const target = path.join(root, 'reconcile-current-progress.cjs'); let s = fs.readFileSync(target, 'utf8'); assert.ok(!s.includes('const inventoryDirection ='));
const insert = `const inventoryDirection = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...inventoryDirection.receipts, ...inventoryDirection.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Inventory direction evidence changed');
for (const [source, expected] of Object.entries(inventoryDirection.sourceHashes)) if (crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') !== expected) throw new Error('Inventory direction source changed: ' + source);
for (const row of inventoryDirection.priorImpact) if (JSON.parse(fs.readFileSync(path.join(root, row.priorReview), 'utf8').replace(/^\\uFEFF/, '')).sourceHashes[row.file] !== row.before || inventoryDirection.sourceHashes[row.file] !== row.after) throw new Error('Inventory direction predecessor changed');
function inventoryDirectionExpected(source, expected) { const row = inventoryDirection.priorImpact.find(row => row.file === source); if (!row) return expected; if (expected !== row.before && expected !== row.after) throw new Error('Unexpected inventory direction predecessor: ' + source); return row.after; }
`;
s = s.replace('const setupRuleSelection =', insert + 'const setupRuleSelection =');
s = s.replace("!== expected) throw new Error('Setup rule selection source changed: ' + source)", "!== inventoryDirectionExpected(source, expected)) throw new Error('Setup rule selection source changed: ' + source)");
s = s.replace("if (!row) return expected; if (expected !== row.before) throw new Error('Unexpected setup rule predecessor: ' + source); return row.after;", "if (!row) return inventoryDirectionExpected(source, expected); if (expected !== row.before) throw new Error('Unexpected setup rule predecessor: ' + source); return inventoryDirectionExpected(source, row.after);");
s = s.replace('cashRead.remaining = setupRuleSelection.remaining;', `cashRead.remaining = inventoryDirection.remaining;
cashRead.closureReview.inventoryDirectionBindingCurrent = true;
cashRead.closureReview.verifiedCriteria = [...new Set([...(cashRead.closureReview.verifiedCriteria ?? []), ...inventoryDirection.verifiedSubcriteria])];
for (const report of [inventoryDirection.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
s = s.replace('Resolve required-purpose applicability/defaults; verify eligible certification', 'Resolve remaining three purpose contracts and eligible certification');
const paragraph = /\*\*Since the previous report:\*\*[^\n]+/; assert.ok(paragraph.test(s));
s = s.replace(paragraph, '**Since the previous report:** Corrected inventory posting that ignored conditions and combined gains/losses, added a directional default, and repaired replay falsely reporting successful posting as blocked. 63 focused tests, lint, TypeScript and five actual database scenarios pass, including maker/checker denial and no duplicate effects. EN/FR control-center display is verified. [Evidence and guidance](INVENTORY_DIRECTION_2026-09-30.md). Three required purpose contracts/defaults, blocked-ledger recovery and eligible certification remain open. No whole workflow closed.');
fs.writeFileSync(path.join(root, reviewFile), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(target + '.retained-' + crypto.randomUUID(), fs.readFileSync(target), { flag: 'wx' });
const fd = fs.openSync(target, 'r+'); try { fs.writeFileSync(fd, s); fs.ftruncateSync(fd, Buffer.byteLength(s)); } finally { fs.closeSync(fd); }
console.log(JSON.stringify({ reviewFile, declarationImpact }));
