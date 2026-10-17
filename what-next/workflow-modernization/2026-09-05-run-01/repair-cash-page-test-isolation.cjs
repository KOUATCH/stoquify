const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const file = path.resolve(__dirname, '../../../app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx');
const original = fs.readFileSync(file, 'utf8');
const anchor = 'jest.mock("@/components/cash-command/CashCommandDashboard",';
if (!original.includes(anchor)) throw new Error('Missing page mock anchor');
const addition = `// Keep the real finance route guard; isolate the unused activation component's server imports.
jest.mock("@/components/modules/TenantModuleActivationButton", () => ({
  TenantModuleActivationButton: () => null,
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

`.replace(/\n/g, '\r\n');
const pending = file + '.pending-' + crypto.randomUUID();
fs.writeFileSync(pending,original.replace(anchor,addition+anchor),{flag:'wx'}); fs.renameSync(pending,file);
console.log('Isolated unused server dependencies; real route guard and assertions retained');
