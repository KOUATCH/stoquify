const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const files = [
  'services/reconciliation/alert-scan-recovery.contracts.ts',
  'services/reconciliation/alert-scan-recovery.service.ts',
  'services/reconciliation/payment-reconciliation-alert-scan.service.ts',
  'services/reconciliation/payment-reconciliation-notifications.ts',
  'services/payments/payment-reconciliation-inbox-worker.service.ts',
  'actions/payments/alert-scan-recovery.actions.ts',
  'components/finance/AlertScanRecovery.tsx',
  'components/finance/PaymentReconciliationWorkbench.tsx',
  'services/reconciliation/__tests__/alert-scan-recovery.service.test.ts',
  'services/reconciliation/__tests__/alert-scan-page.test.ts',
  'services/reconciliation/__tests__/payment-reconciliation-alert-scan.service.test.ts',
  'services/reconciliation/__tests__/payment-reconciliation-notifications.test.ts',
  'services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts',
  'actions/payments/__tests__/alert-scan-recovery.actions.test.ts',
  'components/finance/__tests__/AlertScanRecovery.test.tsx',
  'components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx',
  'components/finance/__tests__/ReconciliationAlertProcessing.test.tsx',
  'scripts/__tests__/reconciliation-alert-worker.test.ts',
];
const entries = files.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }));
fs.writeFileSync(path.join(__dirname, 'alert-recovery-source-hashes.json'), JSON.stringify({ recordedAt: new Date().toISOString(), entries }, null, 2) + '\n');
