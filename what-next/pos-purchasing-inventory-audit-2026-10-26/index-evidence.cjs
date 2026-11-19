// Audit artifact only. Reads source and writes evidence into this directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = process.cwd();
const out = __dirname;
const roots = ['actions', 'services', 'app', 'components', 'hooks', 'lib', 'types', 'prisma', 'scripts'];
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', '.next', 'migrations'].includes(e.name)) walk(p);
    else if (e.isFile() && /\.(?:[cm]?js|tsx?)$/.test(e.name)) files.push(p.replaceAll('\\', '/'));
  }
}
roots.forEach(walk);
const models = new Set(['inventoryLevel','inventoryTransaction','stockTransfer','stockTransferLine','stockAdjustment','stockAdjustmentLine','stockCountSession','stockCountLine','purchaseOrder','purchaseOrderLine','goodsReceipt','goodsReceiptLine','goodsReceiptInspection','goodsReceiptInspectionResolution','purchaseReturn','purchaseReturnLine','supplierInvoice','supplierInvoiceLine','supplierPayment','supplierPaymentAllocation','supplierCreditNote','salesOrder','salesOrderLine','pOSSale','pOSSaleLine','posSale','posSaleLine','pOSSession','posSession','payment','paymentTransaction','businessEvent','businessEventOutbox','journalEntry','journalEntryLine','postingBatch']);
const writes = new Set(['create','createMany','createManyAndReturn','update','updateMany','updateManyAndReturn','upsert','delete','deleteMany']);
const boundary = /^(postInventoryReservation|postOpeningStock|postControlledOpeningStockInTx|postGoodsReceiptStock|postPurchaseReturnStock|postPOSStockIssue|postPOSStockReturn|postDeliveryOrderReservation|postDeliveryOrderStockIssue|postManualStockCorrection|postStockTransfer|transitionStockTransfer|postStockAdjustment|reverseStockAdjustment|commitPOSSale|refundPOSSale|voidPOSSale|createPurchaseOrderInTx|receiveItems|confirmPurchaseReceiving|confirmPaymentRelease|releaseSupplierPaymentWithControls|postSale|postRefund|postVoid|recordBusinessEventInTx)$/;
const mutations = [], calls = [], sources = [], tests = [], endpoints = [];
for (const file of files.sort()) {
  const source = fs.readFileSync(file, 'utf8');
  const test = /(__tests__|\.test\.|\.spec\.)/.test(file);
  if (test) { if (/inventory|purchas|pos|checkout|payment|receipt|stock|outbox/i.test(file)) tests.push(file); continue; }
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let relevant = /^(actions|services)\/(inventory|pos|purchasing|purchase-order|purchaseOrderWorkflow|payments|events|accounting)\//.test(file);
  const loc = n => tree.getLineAndCharacterOfPosition(n.getStart(tree)).line + 1;
  const group = /^(scripts|prisma)\//.test(file) ? 'operational / seed / fixture (not run)' : 'runtime source';
  function visit(n) {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const method = n.expression.name.text, object = n.expression.expression;
      if (ts.isPropertyAccessExpression(object) && models.has(object.name.text) && writes.has(method)) {
        relevant = true; mutations.push({file,line:loc(n),owner:object.name.text,method,group,code:n.expression.getText(tree)});
      }
    }
    if (ts.isCallExpression(n)) {
      const name = ts.isIdentifier(n.expression) ? n.expression.text : ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : '';
      if (boundary.test(name)) { relevant = true; calls.push({file,line:loc(n),callee:name,group}); }
    }
    if (ts.isTaggedTemplateExpression(n) && /(?:UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+["`]?\w*(?:inventory|stock_|purchase_|goods_receipt|supplier_|pos_|payment|journal|posting)/i.test(n.template.getText(tree))) {
      relevant=true; mutations.push({file,line:loc(n),owner:'raw SQL candidate',method:'inspect SQL',group,code:n.template.getText(tree).slice(0,240).replace(/\s+/g,' ')});
    }
    ts.forEachChild(n, visit);
  }
  visit(tree);
  if (/app\/api\/.*\/route\.ts$/.test(file)) endpoints.push({file,methods:[...source.matchAll(/export\s+(?:async\s+function|const)\s+(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\b/g)].map(x=>x[1])});
  if (relevant) sources.push({file,sha256:crypto.createHash('sha256').update(source).digest('hex'),lines:source.split(/\r?\n/).length});
}
const record = {recordedAt:new Date().toISOString(),roots,excluded:['prisma/migrations (schema inspected separately)','test implementations from mutation scan','generated/build directories','paths outside the listed roots'],limitations:'Static named-model and named-call discovery; aliases, dynamic model access and nonmatching raw SQL may evade this index. Reachability and authorization require the manual register. A hit is not a defect.',sourceFileCount:files.length,mutations,calls,endpoints,tests,sources};
fs.writeFileSync(path.join(out,'mutation-owner-index.json'),JSON.stringify(record,null,2)+'\n');
let md='# Mutation discovery appendix\n\nCompanion evidence for EVIDENCE_REGISTER.md; not a second findings register. Generated by index-evidence.cjs. '+record.limitations+'\n\n';
for(const group of ['runtime source','operational / seed / fixture (not run)']) {
  md+='## '+group+'\n\n| File | Named model writes / SQL candidates (line) |\n|---|---|\n';
  const byFile=new Map();
  for(const m of mutations.filter(x=>x.group===group)){if(!byFile.has(m.file))byFile.set(m.file,[]);byFile.get(m.file).push(m)}
  for(const [file,rows] of byFile)md+='| ['+file+'](<'+path.join(root,file).replaceAll('\\','/')+'>) | '+rows.map(x=>x.owner+'.'+x.method+' @'+x.line).join('; ')+' |\n';
}
md+='\n## Calls into business-effect boundaries\n\n| Caller | Called boundary |\n|---|---|\n';
for(const c of calls)md+='| ['+c.file+':'+c.line+'](<'+path.join(root,c.file).replaceAll('\\','/')+':'+c.line+'>) | '+c.callee+' |\n';
md+='\n## API surface inventory\n\n'+endpoints.map(e=>'- '+e.file+' — '+e.methods.join(', ')).join('\n')+'\n';
fs.writeFileSync(path.join(out,'MUTATION_DISCOVERY.md'),md);
console.log(JSON.stringify({files:files.length,mutationCandidates:mutations.length,boundaryCalls:calls.length,sourceHashes:sources.length,testFiles:tests.length}));
