const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../../../../..');
function edit(file,fn){const p=path.join(root,file),s=fs.readFileSync(p,'utf8'),a=fn(s);assert.notEqual(s,a,file);fs.writeFileSync(p,a)}
edit('components/purchase-orders/ModernPurchaseOrderDetailPage.tsx',s=>s.replace(/(\s+)Receipts\r?\n/,'$1{receivingText("history")}\n'));
edit('what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-receiving-browser.cjs',s=>s.replace("close=()=>click('close')","close=()=>dialog().getByRole('button',{name:t.close,exact:true}).first().click()"));
edit('services/purchase-order/__tests__/purchase-order-receive-batch.service.test.ts',s=>{
 s=s.replace('function receivingTx<T extends object>(input: T) {','const receivingTransactions = new WeakMap<object, object>()\nfunction receivingTx<T extends object>(input: T): T {\n  const cached = receivingTransactions.get(input); if (cached) return cached as T');
 s=s.replace('  return new Proxy(input, { get(target, property) {','  const proxy = new Proxy(input, { get(target, property) {');
 s=s.replace(/  \} \}\)\r?\n\}\r?\n\r?\nconst mockDb/,'  } })\n  receivingTransactions.set(input, proxy)\n  return proxy\n}\n\nconst mockDb');
 s=s.replace(/      tx,\r?\n    \)\r?\n    expect\(tx.goodsReceipt.create\)/,'      receivingTx(tx),\n    )\n    expect(tx.goodsReceipt.create)');
 s=s.replace('data: { receivedQuantity: { increment: 3 } },','data: { receivedQuantity: { increment: new Prisma.Decimal(3) } },');
 return s;
});
console.log('Corrected localized receipt-tab label, duplicate-close test locator and Decimal test expectations.');
