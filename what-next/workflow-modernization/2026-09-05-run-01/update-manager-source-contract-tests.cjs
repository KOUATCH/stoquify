const fs = require('node:fs');
function update(file, before, after) {
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes(before)) throw new Error('Expected assertion missing: ' + file);
  const text = original.replace(before, after);
  const fd = fs.openSync(file, 'r+'); try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
}
update('services/manager-action-center/__tests__/manager-location-action-center.service.test.ts', 'metrics: { pendingPurchaseOrderCount: 2 },', 'metrics: { pendingPurchaseOrderCount: 2, overduePurchaseOrderCount: 2 },');
update('services/manager-action-center/__tests__/manager-action-center.service.test.ts', 'expect(data.summary.hiddenByPermission).toBe(actionQueue().filteredOutCount)', `// The real source queue with this role withholds payroll, stock-item and close actions.
    // The unrelated synthetic actionQueue() fixture does not describe these sources.
    expect(data.summary.hiddenByPermission).toBe(3)
    expect(data.actionItems.some(item => item.actionPath.includes("/payroll"))).toBe(false)
    expect(data.actionItems.some(item => item.actionPath.includes("/inventory/items"))).toBe(false)
    expect(data.actionItems.some(item => item.actionPath.includes("/accounting/close"))).toBe(false)
    expect(data.actionItems.some(item => item.actionPath.includes("/finance/reconciliation"))).toBe(true)`);
console.log('Updated stale manager fixtures while retaining current source and permission contracts.');
