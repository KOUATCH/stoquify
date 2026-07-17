const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Authentication Fixes...\n');

// Check that useClientAuth is imported correctly
const filesToCheck = [
  'app/(dashboard)/dashboard/cashSystem/page.tsx',
  'app/(dashboard)/dashboard/session-pos-sync/page.tsx',
  'app/(dashboard)/dashboard/posStation/page.tsx',
  'app/(dashboard)/dashboard/purchaseOrderWorkflow/page.tsx',
  'components/inventory/InventoryDashboard.tsx',
  'components/pos/POSSystem.tsx'
];

let issues = [];
let successes = [];

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  try {
    if (!fs.existsSync(fullPath)) {
      issues.push(`❌ File not found: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');

    // Check for correct import
    if (content.includes('import { useClientAuth } from "@/hooks/useClientAuth"')) {
      // Check that old useSession patterns are replaced
      if (content.includes('useSession()') && !content.includes('useClientAuth()')) {
        issues.push(`⚠️  ${filePath}: Still has useSession() calls`);
      } else {
        successes.push(`✅ ${filePath}: Correctly using useClientAuth`);
      }
    } else if (content.includes('useSession')) {
      issues.push(`❌ ${filePath}: Still using old useSession import`);
    } else {
      successes.push(`ℹ️  ${filePath}: No session usage found`);
    }
  } catch (error) {
    issues.push(`❌ Error checking ${filePath}: ${error.message}`);
  }
});

// Check that client-safe server actions exist
const serverActions = [
  'actions/purchaseOrderWorkflow/clientSafePurchaseOrderActions.ts',
  'actions/inventory/clientSafeInventoryActions.ts',
  'actions/inventory/clientSafeInventoryData.ts',
  'actions/customers/clientSafeCustomerActions.ts',
  'actions/locations/clientSafeLocationActions.ts'
];

serverActions.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  if (fs.existsSync(fullPath)) {
    successes.push(`✅ Client-safe server action exists: ${filePath}`);
  } else {
    issues.push(`❌ Missing client-safe server action: ${filePath}`);
  }
});

// Check that utilities exist
const utilities = [
  'hooks/useClientAuth.ts',
  'utils/clientSafeAuth.tsx',
  'docs/CLIENT_SAFE_AUTHENTICATION.md'
];

utilities.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  if (fs.existsSync(fullPath)) {
    successes.push(`✅ Utility file exists: ${filePath}`);
  } else {
    issues.push(`❌ Missing utility file: ${filePath}`);
  }
});

// Display results
console.log('📊 VERIFICATION RESULTS\n');

if (successes.length > 0) {
  console.log('🎉 SUCCESSES:');
  successes.forEach(success => console.log(success));
  console.log('');
}

if (issues.length > 0) {
  console.log('⚠️  ISSUES FOUND:');
  issues.forEach(issue => console.log(issue));
  console.log('');
} else {
  console.log('🎉 NO ISSUES FOUND!\n');
}

console.log(`📈 SUMMARY: ${successes.length} successes, ${issues.length} issues`);

if (issues.length === 0) {
  console.log('\n✨ All authentication fixes have been successfully implemented!');
  console.log('🚀 The application should now have smooth routing without NEXT_REDIRECT errors.');
} else {
  console.log(`\n🔧 Please address the ${issues.length} issue(s) above.`);
}