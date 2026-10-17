const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript');
const root=__dirname,repo=path.resolve(root,'../../..'),read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const [checksFile,serviceFile,browserFile]=process.argv.slice(2);assert.ok(checksFile&&serviceFile&&browserFile);
const receipts=[checksFile,serviceFile,browserFile],sourceHashes={};
for(const file of receipts){const r=read(file);assert.ok(r.passed&&r.sourceStable,file);const sources=r.sourceAfter??r.sourcesAfter;assert.ok(sources&&Object.keys(sources).length,file);for(const[source,expected]of Object.entries(sources)){assert.equal(hash(path.join(repo,source)),expected,file+': '+source);if(sourceHashes[source])assert.equal(sourceHashes[source],expected,source);sourceHashes[source]=expected;}}
for(const[file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
assert.equal(read(serviceFile).checks.length,10);assert.equal(read(browserFile).journeys.length,4);
const baselines=['evidence/receipt-capacity-before-02e7f18d-6032-43ea-b9e3-895e16d35939.json','evidence/receipt-replay-before-f16c9e77-9ceb-493b-8405-0778e1649dc9.json','evidence/accounting-settings-currency-before-2026-09-30.json'];
const priorImpact=baselines.flatMap(baseline=>read(baseline).map(row=>{const file=row.file??row.path;assert.equal(crypto.createHash('sha256').update(row.content).digest('hex'),row.sha256);assert.ok(sourceHashes[file],file);return{file,before:row.sha256,after:sourceHashes[file],baseline};}));
function declarations(text){const source=ts.createSourceFile('source.ts',text.replace(/\r\n/g,'\n'),ts.ScriptTarget.Latest,true);return new Map(source.statements.map((n,i)=>[ts.isImportDeclaration(n)?'import:'+n.moduleSpecifier.text:n.name?.text??(ts.isVariableStatement(n)?n.declarationList.declarations.map(d=>d.name.getText(source)).join(','):'statement-'+i),n.getText(source)]));}
const allowed={
 'services/purchasing/ap-control.service.ts':{changed:['buildInvoiceLinePlans'],added:['import:./receipt-invoice-capacity']},
 'services/purchasing/invoice-preparation.service.ts':{changed:['loadInvoicePreparationSources'],added:['import:./receipt-invoice-capacity']},
 'services/purchasing/invoice-correction.service.ts':{changed:['loadInvoiceCorrectionSource'],added:['import:./receipt-invoice-capacity']},
 'services/inventory/inventory-stock-event.service.ts':{changed:['import:@/services/_shared/action-errors','createLedgerBlocker','postInventoryStockEvent'],added:[]},
 'services/accounting/accounting-settings.service.ts':{changed:['import:@/services/_shared/action-errors','ensureAccountingSettings','updateAccountingSettings'],added:[]},
};
const declarationImpact=baselines.flatMap(b=>read(b)).filter(row=>allowed[row.file??row.path]).map(row=>{const file=row.file??row.path,before=declarations(row.content),after=declarations(fs.readFileSync(path.join(repo,file),'utf8'));
 const changed=[...before.keys()].filter(key=>after.has(key)&&before.get(key)!==after.get(key)),added=[...after.keys()].filter(key=>!before.has(key)),deleted=[...before.keys()].filter(key=>!after.has(key));
 assert.deepEqual(changed.sort(),allowed[file].changed.sort(),file);assert.deepEqual(added.sort(),allowed[file].added.sort(),file);assert.deepEqual(deleted,[],file);return{file,changed,added,deleted,allOtherDeclarationsExactlyPreserved:true};});
const settingsReviewFile='evidence/accounting-settings-currency-declaration-impact-2026-09-30.json',settings=read(settingsReviewFile);
for(const row of [...settings.reconstructionInputs,settings.predecessorSnapshot,settings.reviewScript])assert.equal(hash(path.join(root,row.file)),row.sha256,row.file);
const report='RECEIPT_REPLAY_AND_INVOICE_CAPACITY_2026-09-30.md',reviewFile='evidence/receipt-capacity-review-2026-09-30.json';
const remaining=[...read('evidence/invoice-receipt-handoff-review-2026-09-30.json').remaining];
remaining[0]='Receipt stock replay now preserves finalized accounting; invoice preparation/correction/approval subtract net uninvoiced returns with exact reversal checks. Complete the versioned whole-receipt recognition source/date contract and source-owned return cost/accrual release, including removal of the unverified hardcoded XAF return-posting assumption, before enabling receipt accounting. Legacy cutover, non-stock lines, CASH_DRAWER_CLOSE/EXPENSE_APPROVAL setup, eligible close certification, payroll obligations, native accessibility and representative latency remain open.';
remaining.push('Visual inspection of the EN desktop preparation review found the long supplier reference overflowing its dialog. Correct local text wrapping and verify long references at supported widths; document-wide overflow checks alone do not establish this.');
const verifiedSubcriteria=['receipt_posted_replay_preserves_accounting','receipt_finalized_source_rejects_novel_stock','invoice_net_uninvoiced_return_capacity','invoice_return_reversal_capacity_once','invoice_return_concurrency_and_stale_approval','invoice_return_en_fr_preparation_correction','accounting_settings_currency_dependency_review'];
const screenshots=read(browserFile).journeys.flatMap(j=>j.screenshots.map(s=>'lanes/environment/'+s.file));
const artifacts=[report,...baselines,settingsReviewFile,...settings.reconstructionInputs.map(r=>r.file),settings.reviewScript.file,'run-receipt-capacity-checks.cjs','lanes/environment/verify-receipt-invoice-capacity.cjs','lanes/environment/verify-receipt-capacity-browser.cjs','evidence/receipt-replay-before-tests-2026-10-01.json','evidence/receipt-capacity-checks-ca223c24-31d7-4233-808f-78509a7d075f.json','evidence/receipt-capacity-checks-d2269423-89e1-4394-9bea-f052c4c050b5.json','lanes/environment/receipt-capacity-browser-attempt-55ba415d-4f5c-4c51-8cd0-c1d3c5355ad2.json','lanes/environment/receipt-capacity-browser-df880e98-9a84-4bde-9060-b307d6dcd6b7.json',...screenshots];
const review={at:new Date().toISOString(),passed:true,workflow:'FA-CASH-COMMAND',report,sourceHashes,priorImpact,declarationImpact,remaining,verifiedSubcriteria,receipts:receipts.map(file=>({file,sha256:hash(path.join(root,file))})),artifacts:artifacts.map(file=>({file,sha256:hash(path.join(root,file))}))};
const target=path.join(root,'reconcile-current-progress.cjs');let text=fs.readFileSync(target,'utf8');assert.ok(!text.includes('const receiptCapacity ='));
const insert=`const receiptCapacity = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...receiptCapacity.receipts, ...receiptCapacity.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Receipt capacity evidence changed: ' + row.file);
for (const [source, expected] of Object.entries(receiptCapacity.sourceHashes)) if (crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') !== expected) throw new Error('Receipt capacity source changed: ' + source);
for (const row of receiptCapacity.priorImpact) { const before = JSON.parse(fs.readFileSync(path.join(root, row.baseline), 'utf8').replace(/^\\uFEFF/, '')).find(item => (item.file ?? item.path) === row.file); if (before?.sha256 !== row.before || receiptCapacity.sourceHashes[row.file] !== row.after) throw new Error('Receipt capacity predecessor changed'); }
function receiptCapacityExpected(source, expected) { const row = receiptCapacity.priorImpact.find(row => row.file === source); if (!row) return expected; if (expected !== row.before && expected !== row.after) throw new Error('Unexpected receipt capacity predecessor: ' + source); return row.after; }
`;
text=text.replace('const invoiceReceiptHandoff =',insert+'const invoiceReceiptHandoff =');
text=text.replace("!== expected) throw new Error('Invoice receipt handoff source changed: ' + source)","!== receiptCapacityExpected(source, expected)) throw new Error('Invoice receipt handoff source changed: ' + source)");
text=text.replace("if (!row) return expected; if (expected !== row.before && expected !== row.after) throw new Error('Unexpected invoice receipt predecessor: ' + source); return row.after;","if (!row) return receiptCapacityExpected(source, expected); if (expected !== row.before && expected !== row.after) throw new Error('Unexpected invoice receipt predecessor: ' + source); return receiptCapacityExpected(source, row.after);");
text=text.replace('cashRead.remaining = invoiceReceiptHandoff.remaining;',`cashRead.remaining = receiptCapacity.remaining;
cashRead.closureReview.receiptCapacityBindingCurrent = true;
cashRead.closureReview.verifiedCriteria = [...new Set([...(cashRead.closureReview.verifiedCriteria ?? []), ...receiptCapacity.verifiedSubcriteria])];
for (const file of [receiptCapacity.report, '${reviewFile}']) if (!cashRead.evidence.includes(file)) cashRead.evidence.push(file);`);
text=text.replace('register.updatedAt = new Date().toISOString();',`for (const workflow of register.workflows.filter(w => w.services?.some(file => ['services/purchasing/ap-control.service.ts', 'services/purchasing/invoice-preparation.service.ts', 'services/purchasing/invoice-correction.service.ts', 'services/inventory/inventory-stock-event.service.ts'].includes(file)))) {
  for (const file of [receiptCapacity.report, '${reviewFile}']) if (!workflow.evidence.includes(file)) workflow.evidence.push(file);
  if (workflow.services.some(file => file.startsWith('services/purchasing/')) && !workflow.services.includes('services/purchasing/receipt-invoice-capacity.ts')) workflow.services.push('services/purchasing/receipt-invoice-capacity.ts');
}
register.updatedAt = new Date().toISOString();`);
text=text.replace('Complete receipt producer and return allocation; retain setup controls','Complete receipt recognition source/date and return accounting');
text=text.replace(/\*\*Since the previous report:\*\*[^\n]+/,'**Since the previous report:** Stock replay now preserves finalized receipt accounting. Invoice preparation, correction and approval exclude net uninvoiced returns; exact reversals restore capacity once. Focused regressions, database concurrency/recovery and EN/FR preparation/correction evidence are recorded in [the correction report](RECEIPT_REPLAY_AND_INVOICE_CAPACITY_2026-09-30.md). The concurrent accounting-settings change has a reconstructed impact review and relevant regressions. Automatic receipt accounting and return accrual release remain engineering work; no new workflow closed.');
fs.writeFileSync(path.join(root,reviewFile),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(target+'.retained-'+crypto.randomUUID(),fs.readFileSync(target),{flag:'wx'});
const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd)}
console.log(JSON.stringify({reviewFile,declarationImpact}));
