const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const files = [
  'services/purchase-order/purchase-order.service.ts',
  'services/purchase-order/purchase-order-authoring-contracts.ts',
  'services/purchase-order/purchase-order-authoring.service.ts',
  'services/purchase-order/__tests__/purchase-order-authoring.test.ts',
  'services/purchase-order/__tests__/purchase-order-clone-scope.service.test.ts',
  'services/purchase-order/__tests__/purchase-order.service.test.ts',
  'components/purchase-orders/DurableCreatePurchaseOrderForm.tsx',
  'components/purchase-orders/ModernCreatePurchaseOrderForm.tsx',
  'components/purchase-orders/PurchaseAuthoringPanel.tsx',
  'components/purchase-orders/use-purchase-authoring.ts',
  'components/purchase-orders/__tests__/purchase-authoring.test.tsx',
  'actions/purchaseOrderWorkflow/purchase-order-authoring.actions.ts',
  'actions/purchaseOrderWorkflow/__tests__/purchase-order-authoring.actions.test.ts',
  'app/[locale]/(dashboard)/dashboard/purchase-orders/new/page.tsx',
  'app/[locale]/(dashboard)/dashboard/purchase-orders/new/__tests__/page.test.tsx',
  'prisma/schema.prisma',
  'prisma/migrations/20261004130000_purchase_order_authoring/migration.sql',
];
const entries = files.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }));
fs.writeFileSync(path.join(__dirname, 'purchase-authoring-source-hashes.json'), JSON.stringify({ recordedAt: new Date().toISOString(), entries }, null, 2) + '\n');
