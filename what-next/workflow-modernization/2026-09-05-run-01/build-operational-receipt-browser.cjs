const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'lanes/environment');
let text=fs.readFileSync(path.join(dir,'verify-receipt-capacity-browser.cjs'),'utf8').replace(/\r\n/g,'\n');
function replace(from,to){assert.equal(text.split(from).length,2,from);text=text.replace(from,to);}
replace("const h = require('./verify-invoice-receipt-handoff.cjs');","const h = require('./verify-operational-receipt-recognition.cjs');");
replace("  productionReceiptProducerImplemented: false,","  productionReceiptProducerImplemented: true,");
replace("// This never fabricates receipt recognition or submits invoice approval/payment.","// Uses actual receipt/return posting and compares those financial effects before and after invoice preparation/correction. No invoice approval/payment.");
replace("No fabricated receipt journal, invoice approval, supplier liability, payment, external message, migration or certification.","Actual receipt and return journals; no fabricated recognition, invoice approval, supplier liability, payment, external message, migration or certification.");
replace("  assert.equal(result.purchaseReturn.journalEntryId, null, 'Unconfigured return accounting remains visibly unposted');","  assert.ok(result.purchaseReturn.journalEntryId, 'Return accounting comes from the actual source-bound producer');");
const start=text.indexOf('async function noFinancialEffects(x) {'),end=text.indexOf('async function signedContext',start);assert.ok(start>=0&&end>start);
text=text.slice(0,start)+`async function financialState(x) {
  const where={organizationId:x.organizationId};
  return f.hash(await Promise.all(['journalEntry','journalEntryLine','accountingSourceLink','supplierLedgerEntry','payment','supplierPayment'].map(model=>db[model].findMany({where,orderBy:{id:'asc'}}))));
}
async function noFinancialEffects(x) {
  assert.equal(await financialState(x),x.financialBefore,'Invoice preparation/correction does not change actual receipt/return accounting');
  for(const model of ['supplierLedgerEntry','payment','supplierPayment']) assert.equal(await db[model].count({where:{organizationId:x.organizationId}}),0);
  assert.equal((await db.supplier.findUniqueOrThrow({where:{id:x.supplierId}})).currentBalance.toString(),'0');
}
`+text.slice(end);
replace("    const receipt = await h.receive(x, 10);","    const {receipt} = await h.receive(x, 10);");
replace("    const invoiceId = kind === 'correction' ? await h.prepare(x, 'CAPACITY-CORRECTION-' + run + '-' + locale, [[receipt, 8]]) : null;","    const invoiceId = kind === 'correction' ? (await h.prepare(x, receipt, 8, 'CAPACITY-CORRECTION-' + run + '-' + locale)).invoiceId : null;");
replace("    const returnHash = f.hash(returned);","    const returnHash = f.hash(returned);\n    x.financialBefore = await financialState(x);");
replace("    const observed = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));",`    const observed = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      dialogs:[...document.querySelectorAll('[role="dialog"]')].filter(node=>node.getBoundingClientRect().width>0).map(node=>({width:node.clientWidth,scrollWidth:node.scrollWidth})) }));
    for(const dialog of observed.dialogs) assert.ok(dialog.scrollWidth<=dialog.width+1,'Long references stay within the actual dialog');`);
text=text.replaceAll('receipt-capacity-browser-','operational-receipt-browser-').replaceAll('verify-receipt-capacity-browser.cjs','verify-operational-receipt-browser.cjs');
text=text.replaceAll('with stock/return evidence retained and no journal/liability/payment','with receipt/return accounting retained and no new journal/liability/payment');
const target=path.join(dir,'verify-operational-receipt-browser.cjs');fs.writeFileSync(target,text,{flag:'wx'});console.log(target);
