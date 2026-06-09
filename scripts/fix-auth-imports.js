const fs = require('fs');
const path = require('path');

// Files that need useSession replaced with useClientAuth
const filesToUpdate = [
  'app/(dashboard)/dashboard/app/sales/page.tsx',
  'app/(dashboard)/dashboard/app/sales/pos/cashDrawer/page.tsx',
  'app/(dashboard)/dashboard/app/sales/pos/page.tsx',
  'app/(dashboard)/dashboard/app/sales/pos/pagFormere.tsx',
  'app/(dashboard)/dashboard/cashDrawer/CashDrawerManagement.tsx',
  'app/(dashboard)/dashboard/cashDrawer/ModernCashDrawerManagement.tsx',
  'app/(dashboard)/dashboard/newPosSession/page.tsx',
  'app/(dashboard)/dashboard/newPosSession/pageaa22.tsx',
  'app/(dashboard)/dashboard/pos/page.tsx',
  'app/(dashboard)/dashboard/purchaseOrderWorkflow/pcdszxage.tsx',
  'components/cashDrawer/ComprehensiveCashDrawerDashboard.tsx',
  'components/inventory/InventoryAdjustmentModal.tsx',
  'components/inventory/InventoryDashboard.tsx',
  'components/inventory/movements/StockMovementDashboard.tsx',
  'components/inventory/ReorderLevelModal.tsx',
  'components/inventory/transfers/CreateTransferModal.tsx',
  'components/inventory/transfers/TransferDashboard.tsx',
  'components/inventory/transfers/TransferDetailsModal.tsx',
  'components/newInventory/InventoryAdjustmentModal.tsx',
  'components/newInventory/InventoryDashboard.tsx',
  'components/newInventory/movements/StockMovementDashboard.tsx',
  'components/newInventory/ReorderLevelModal.tsx',
  'components/newInventory/transfers/CreateTransferModal.tsx',
  'components/newInventory/transfers/TransferDashboard.tsx',
  'components/oldInventory/InventoryAdjustmentModal.tsx',
  'components/oldInventory/InventoryDashboard.tsx',
  'components/oldInventory/ReorderLevelModal.tsx',
  'components/pos/POSSystem.tsx',
  'components/posStation/pos-terminal-form.tsx',
  'components/posStation/PosStationForm.tsx',
  'components/purchase-orders/ModernPurchaseOrderDetailPage.tsx',
  'components/recentInventory/InventoryAdjustmentModal.tsx',
  'components/recentInventory/InventoryDashboard.tsx',
  'components/recentInventory/ReorderLevelModal.tsx'
];

function updateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let updated = false;

    // Replace import statement
    if (content.includes('import { useSession } from "@/lib/auth-client"')) {
      content = content.replace(
        'import { useSession } from "@/lib/auth-client"',
        'import { useClientAuth } from "@/hooks/useClientAuth"'
      );
      updated = true;
    }

    // Common patterns to replace
    const patterns = [
      // Pattern 1: const { data: session, status } = useSession()
      {
        search: /const\s+{\s*data:\s*session,\s*status\s*}\s*=\s*useSession\(\)/g,
        replace: 'const { session, status, user, organizationId, isAuthenticated, isLoading } = useClientAuth()'
      },
      // Pattern 2: const session = useSession()
      {
        search: /const\s+(\w+)\s*=\s*useSession\(\)/g,
        replace: 'const { session, user, organizationId } = useClientAuth()'
      },
      // Pattern 3: session?.user?.organizationId
      {
        search: /session\?\.\w+\?\.\w+\?\.\w+Id/g,
        replace: 'organizationId'
      },
      // Pattern 4: session?.user
      {
        search: /session\?\.\w+\?\.\w+/g,
        replace: 'user'
      }
    ];

    patterns.forEach(pattern => {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Run the updates
console.log('🚀 Starting batch auth import fixes...\n');
let successCount = 0;
let totalCount = filesToUpdate.length;

filesToUpdate.forEach(file => {
  if (updateFile(file)) {
    successCount++;
  }
});

console.log(`\n✨ Completed! Updated ${successCount}/${totalCount} files.`);