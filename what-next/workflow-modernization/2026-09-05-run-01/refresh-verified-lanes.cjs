const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const pg = 'lanes/environment/retained-reports-location-run-f8f6da4962c5.json';
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
function update(lane, work) {
  const file = path.join(__dirname, 'lanes', lane, 'WORKFLOW_REGISTER.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')); work(doc); doc.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
}
update('inventory', doc => {
  const w = doc.workflows.find(row => row.id === 'IN-014'); if (!w) throw new Error('Missing IN-014');
  w.implementationStatus = 'request_authority_and_feedback_corrected_lifecycle_open';
  w.remaining = w.remaining.filter(line => !line.startsWith('High-priority actor/org/') && !line.startsWith('useInventoryReservation treats') && !line.startsWith('No module entitlement/admission'));
  w.remaining.push('Both manual-reservation actions now enforce trusted RBAC tenant/actor and the existing inventory write entitlement. Real action/session and stock-effect integration remain unverified.', 'Reviewed stop admission is not defined for manual reservations; request-boundary entitlement is not a transaction-level revocation lock.');
  w.evidence = [...new Set([...w.evidence, 'evidence/inventory-reservation-receipt.json', 'evidence/inventory-reservation-after.json'])];
  w.verificationNotes = ['21 failed/5 passed before correction; 69/69 focused and shared tests after. Five source/test files passed lint; full typecheck passed session23336/chunkdf0cab.', 'The real mutation hook is tested in EN/FR, including unknown-result no-retry. No production UI consumer was located, so this is not a completed manual reservation journey.'];
  doc.reservationRequestCorrection = { recordedAt: new Date().toISOString(), evidence: 'evidence/inventory-reservation-receipt.json', sources: ['actions/inventory/inventoryActions.ts', 'actions/inventory/inventoryMovementActions.ts', 'hooks/useInventoryMovementQueries.ts'].map(file => ({ path: file, sha256: sha(file) })) };
});
update('finance-accounting', doc => {
  for (const w of doc.workflows.filter(row => ['FA-ACCOUNTS', 'FA-TRIAL-BALANCE', 'FA-FINANCIAL-STATEMENTS', 'FA-GENERAL-LEDGER'].includes(row.id))) {
    w.evidence = [...new Set([...w.evidence, pg])];
    w.runtimeStatus = 'partial_real_postgres_verified';
    w.verificationNotes = [...(w.verificationNotes || []), 'Actual create/post/reverse/archive services retained identical nonzero reports and ledger after archiving four accounts. Draft777 excluded; cumulative730/730, assets590, net income90. Maker-checker, foreign/missing draft accounts and foreign period scope checked. Direct synthetic service proof only; UI/export/full lifecycle remain open.'];
  }
});
update('master-data', doc => {
  for (const w of doc.workflows.filter(row => ['MD-LOC-03', 'MD-LOC-04'].includes(row.id))) {
    w.evidence = [...new Set([...w.evidence, pg])];
    w.runtimeStatus = 'partial_real_postgres_verified';
    w.remaining = w.remaining.filter(line => !line.startsWith('Manager assignment service/action tests pass'));
    w.remaining.push('Real PostgreSQL manager assignment/denial/clearing now passes. Actual browser authority and concurrent identity-state changes remain unverified.');
  }
});
console.log('Updated inventory request correction and bounded accounting/location PostgreSQL evidence; whole-workflow completion remains false.');
