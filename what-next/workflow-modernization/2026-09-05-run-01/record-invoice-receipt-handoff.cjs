const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript');
const root=__dirname,repo=path.resolve(root,'../../..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report='INVOICE_RECEIPT_HANDOFF_2026-09-30.md',reviewFile='evidence/invoice-receipt-handoff-review-2026-09-30.json';
const baselineFiles=['evidence/invoice-receipt-handoff-before-2026-09-30.json','evidence/receipt-handoff-tests-before-d35ff9e6-2681-43d2-bbe5-d7f1e0230d7a.json'];
const [checksFile,serviceFile,browserFile,directFile]=process.argv.slice(2);assert.ok(checksFile&&serviceFile&&browserFile&&directFile,'Pass four final receipts');
const receipts=[checksFile,serviceFile,browserFile],sourceHashes={};
const reused=read(checksFile).reusedFrom;
if(reused)assert.equal(hash(path.join(root,reused.file)),reused.sha256);
for(const file of receipts){const r=read(file);assert.ok(r.passed&&r.sourceStable,file);Object.assign(sourceHashes,r.sourceAfter??r.sourcesAfter);}
for(const[file,expected]of Object.entries(sourceHashes))assert.equal(hash(path.join(repo,file)),expected,file);
const direct=read(directFile);assert.ok(direct.passed&&direct.cases.length===2&&direct.cases[1].recoveredWithoutDuplicateLiability);assert.equal(direct.sourceHash,sourceHashes['services/purchasing/ap-control.service.ts']);
assert.equal(read(serviceFile).checks.length,6);assert.equal(read(browserFile).journeys.length,2);
const priorImpact=baselineFiles.flatMap(baseline=>read(baseline).map(row=>{assert.equal(crypto.createHash('sha256').update(row.content).digest('hex'),row.sha256);assert.ok(sourceHashes[row.path]);return {file:row.path,before:row.sha256,after:sourceHashes[row.path],baseline};}));
function declarations(text){const s=ts.createSourceFile('source.ts',text.replace(/\r\n/g,'\n'),ts.ScriptTarget.Latest,true);return new Map(s.statements.map((n,i)=>[ts.isImportDeclaration(n)?'import:'+n.moduleSpecifier.text:n.name?.text??(ts.isVariableStatement(n)?n.declarationList.declarations.map(d=>d.name.getText(s)).join(','):'statement-'+i),n.getText(s)]));}
const allowed={
 'services/purchasing/ap-control.service.ts':['conditionMatches','writeAPLedgerPosting','postSupplierInvoice','approveSupplierInvoice'],
 'services/purchasing/invoice-approval.service.ts':['plan'],
 'services/purchasing/invoice-ledger-recovery.service.ts':['source','plan','confirmInvoiceLedgerRecovery'],
 'services/accounting/default-posting-rules.ts':['DEFAULT_AP_POSTING_RULES'],
};
const declarationImpact=read(baselineFiles[0]).map(row=>{
 const before=declarations(row.content),after=declarations(fs.readFileSync(path.join(repo,row.path),'utf8'));
 const changed=[...before.keys()].filter(key=>after.has(key)&&before.get(key)!==after.get(key)),added=[...after.keys()].filter(key=>!before.has(key)),deleted=[...before.keys()].filter(key=>!after.has(key));
 assert.deepEqual(changed.sort(),allowed[row.path].sort());assert.deepEqual(deleted,[]);
 assert.deepEqual(added,row.path.endsWith('default-posting-rules.ts')?[]:['import:./invoice-receipt-recognition']);
 return {file:row.path,changed,added,deleted,allOtherDeclarationsExactlyPreserved:true};
});
const parent=read('evidence/receipt-posting-review-2026-09-30.json'),remaining=[...parent.remaining];
remaining[0]='Invoice approval and frozen ledger recovery now consume verified receipt accruals without duplicate inventory, including partial/mixed invoices and explicit variance. Complete the production receipt recognition date/source/replay contract and return/reversal allocation before enabling a receipt default; late legacy cutover remains a reconciliation case. Resolve CASH_DRAWER_CLOSE and EXPENSE_APPROVAL applicability, eligible close certification and current-configuration concurrency. Native accessibility, remaining order-page localization and representative latency remain open.';
const screenshots=read(browserFile).journeys.flatMap(row=>row.screenshots.map(s=>'lanes/environment/'+s.file));
const artifacts=[report,...baselineFiles,'run-invoice-receipt-handoff-checks.cjs','lanes/environment/verify-invoice-receipt-handoff.cjs','lanes/environment/verify-invoice-receipt-handoff-browser.cjs','lanes/environment/verify-direct-invoice-lifecycle.cjs',...screenshots];
const review={at:new Date().toISOString(),passed:true,workflow:'FA-CASH-COMMAND',report,sourceHashes,priorImpact,declarationImpact,remaining,verifiedSubcriteria:['invoice_receipt_accrual_partial_and_mixed_recognition','invoice_receipt_frozen_allocation_recovery','invoice_receipt_actual_account_rule_enforcement','invoice_receipt_en_fr_browser_accounting_handoff','immediate_invoice_derived_audit_recovery'],receipts:[...receipts,directFile,...(reused?[reused.file]:[])].map(file=>({file,sha256:hash(path.join(root,file))})),artifacts:artifacts.map(file=>({file,sha256:hash(path.join(root,file))}))};
const target=path.join(root,'reconcile-current-progress.cjs');let s=fs.readFileSync(target,'utf8');assert.ok(!s.includes('const invoiceReceiptHandoff ='));
const insert=`const invoiceReceiptHandoff = JSON.parse(fs.readFileSync(path.join(root, '${reviewFile}')));
for (const row of [...invoiceReceiptHandoff.receipts, ...invoiceReceiptHandoff.artifacts]) if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root, row.file))).digest('hex') !== row.sha256) throw new Error('Invoice receipt handoff evidence changed');
for (const [source, expected] of Object.entries(invoiceReceiptHandoff.sourceHashes)) if (crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root, '../../..', source))).digest('hex') !== expected) throw new Error('Invoice receipt handoff source changed: ' + source);
for (const row of invoiceReceiptHandoff.priorImpact) { const before = JSON.parse(fs.readFileSync(path.join(root, row.baseline), 'utf8').replace(/^\\uFEFF/, '')).find(item => item.path === row.file); if (before?.sha256 !== row.before || invoiceReceiptHandoff.sourceHashes[row.file] !== row.after) throw new Error('Invoice receipt handoff predecessor changed'); }
function invoiceReceiptExpected(source, expected) { const row = invoiceReceiptHandoff.priorImpact.find(row => row.file === source); if (!row) return expected; if (expected !== row.before && expected !== row.after) throw new Error('Unexpected invoice receipt predecessor: ' + source); return row.after; }
`;
s=s.replace('const receiptPostingTruth =',insert+'const receiptPostingTruth =');
s=s.replace("!== expected) throw new Error('Receipt posting source changed: ' + source)","!== invoiceReceiptExpected(source, expected)) throw new Error('Receipt posting source changed: ' + source)");
s=s.replace("if (!row) return expected; if (expected !== row.before && expected !== row.after) throw new Error('Unexpected receipt posting predecessor: ' + source); return row.after;","if (!row) return invoiceReceiptExpected(source, expected); if (expected !== row.before && expected !== row.after) throw new Error('Unexpected receipt posting predecessor: ' + source); return invoiceReceiptExpected(source, row.after);");
s=s.replace('cashRead.remaining = receiptPostingTruth.remaining;',`cashRead.remaining = invoiceReceiptHandoff.remaining;
cashRead.closureReview.invoiceReceiptHandoffBindingCurrent = true;
cashRead.closureReview.verifiedCriteria = [...new Set([...(cashRead.closureReview.verifiedCriteria ?? []), ...invoiceReceiptHandoff.verifiedSubcriteria])];
for (const report of [invoiceReceiptHandoff.report, '${reviewFile}']) if (!cashRead.evidence.includes(report)) cashRead.evidence.push(report);`);
s=s.replace('register.updatedAt = new Date().toISOString();',`const invoiceApprovalHandoff = register.workflows.find(w => w.id === 'PA-019');
if (!invoiceApprovalHandoff.services.includes('services/purchasing/invoice-receipt-recognition.ts')) invoiceApprovalHandoff.services.push('services/purchasing/invoice-receipt-recognition.ts');
for (const report of [invoiceReceiptHandoff.report, '${reviewFile}']) if (!invoiceApprovalHandoff.evidence.includes(report)) invoiceApprovalHandoff.evidence.push(report);
const receiptHandoffGap = 'Verified receipt-accrual invoice allocation and frozen recovery are delivered; production receipt recognition, returned/reversed allocation release and legacy cutover remain open. See INVOICE_RECEIPT_HANDOFF_2026-09-30.md for the bounded proof and limitations.';
if (!invoiceApprovalHandoff.remaining.includes(receiptHandoffGap)) invoiceApprovalHandoff.remaining.push(receiptHandoffGap);
register.updatedAt = new Date().toISOString();`);
s=s.replace('Implement receipt/invoice recognition handoff; retain other setup requirements','Complete receipt producer and return allocation; retain setup controls');
s=s.replace(/\*\*Since the previous report:\*\*[^\n]+/,'**Since the previous report:** Supplier invoices now clear verified receipt accruals instead of recognizing inventory twice. Partial/mixed receipts, frozen recovery, derived immediate-posting audit evidence, duplicate/stale submission and EN/FR application approval are verified. Focused tests, lint and TypeScript pass. [Evidence and operator guidance](INVOICE_RECEIPT_HANDOFF_2026-09-30.md). Receipt production and returns remain engineering work; no new workflow closed.');
fs.writeFileSync(path.join(root,reviewFile),JSON.stringify(review,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(target+'.retained-'+crypto.randomUUID(),fs.readFileSync(target),{flag:'wx'});
const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s))}finally{fs.closeSync(fd)}
console.log(JSON.stringify({reviewFile,declarationImpact}));
