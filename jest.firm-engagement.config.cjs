// Focused mocked regression lane; no application config, dotenv or database hooks.
const nextJest = require('next/jest')
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: 'node',
  roots: ['<rootDir>/services/accounting/__tests__', '<rootDir>/actions/accounting/__tests__', '<rootDir>/components/accounting/__tests__'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js' },
  testMatch: ['**/firm-engagement.actions.test.ts', '**/managed-accountant-access.service.test.ts',
    '**/accountant-access.service.test.ts', '**/accountant-portfolio*.test.ts', '**/AccountantPortfolio*.test.tsx',
    '**/close-evidence-acceptance-authority.service.test.ts', '**/close-assurance.service.test.ts',
    '**/data-trust.service.test.ts', '**/data-trust.actions.test.ts', '**/accountant-work-desk*.test.ts',
    '**/accountant-notification-history.service.test.ts', '**/missing-close-evidence-accountant-review-queue.service.test.ts'],
  testTimeout: 15000, collectCoverage: false,
  testPathIgnorePatterns: ['\\.postgres\\.test\\.ts$'],
})
