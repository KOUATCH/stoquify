const configure = require('next/jest')()
// Isolated UI regressions: no Next config, .env loading, database or browser setup.
module.exports = configure({
  rootDir: __dirname,
  roots: ['<rootDir>/components/pos/__tests__'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js' },
  testMatch: ['**/ProfessionalPOSSystem.shift-close.test.tsx', '**/ProfessionalPOSSystem.receipt-token-visibility.test.tsx', '**/POSCheckoutShell.test.tsx', '**/POSCatalogCard.test.tsx', '**/POSOperationalDisclosures.test.tsx', '**/POSReturns.test.tsx'],
  collectCoverage: false,
})
