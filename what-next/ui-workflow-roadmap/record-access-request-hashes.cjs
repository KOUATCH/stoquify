const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const files = [
  'services/access-requests/access-request-contracts.ts',
  'services/access-requests/access-request.service.ts',
  'services/access-requests/access-request-entry.ts',
  'services/access-requests/__tests__/access-request-entry.test.ts',
  'services/access-requests/__tests__/access-request.service.test.ts',
  'actions/access-requests/access-request.actions.ts',
  'actions/access-requests/__tests__/access-request.actions.test.ts',
  'services/users/member-access.service.ts',
  'components/access-requests/AccessRequests.tsx',
  'components/access-requests/access-request-copy.ts',
  'components/access-requests/__tests__/AccessRequests.test.tsx',
  'components/UserDropdownMenu.tsx',
  'components/dashboard/Navbar.tsx',
  'messages/dashboard-shared/en.json',
  'messages/dashboard-shared/fr.json',
  'app/[locale]/(dashboard)/dashboard/access-requests/page.tsx',
  'app/[locale]/(dashboard)/dashboard/access-requests/__tests__/page.test.tsx',
  'app/[locale]/(dashboard)/dashboard/access-requests/__tests__/denial-entry.test.tsx',
  'app/[locale]/(dashboard)/dashboard/inventory/inventory-route-access.tsx',
  'prisma/schema.prisma',
  'prisma/migrations/20261004120000_access_requests/migration.sql',
  'what-next/ui-workflow-roadmap/add-access-request-schema.cjs',
  'what-next/ui-workflow-roadmap/access-request-schema.prisma',
];
const entries = files.map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }));
fs.writeFileSync(path.join(__dirname, 'access-request-source-hashes.json'), JSON.stringify({ recordedAt: new Date().toISOString(), entries }, null, 2) + '\n');
