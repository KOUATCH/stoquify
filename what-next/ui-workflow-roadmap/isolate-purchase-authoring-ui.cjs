// Preserve the existing live form while the new path awaits rollout evidence.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const relative = 'components/purchase-orders/ModernCreatePurchaseOrderForm.tsx';
const target = path.join(root, relative);
const alternate = path.join(root, 'components/purchase-orders/DurableCreatePurchaseOrderForm.tsx');
if (fs.existsSync(alternate)) throw new Error('Already isolated; do not rerun.');
const current = fs.readFileSync(target, 'utf8');
const original = cp.execFileSync('git', ['show', ':' + relative], { cwd: root, encoding: 'utf8' });
if (!current.includes('const authoring = usePurchaseAuthoring(') || !original.includes('const handleGeneratePONumber = useCallback(')) throw new Error('Unexpected form state.');
fs.writeFileSync(alternate, current.replaceAll('ModernCreatePurchaseOrderForm', 'DurableCreatePurchaseOrderForm'));
fs.writeFileSync(target, original);
