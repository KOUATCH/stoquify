const path = require('node:path')
const root = path.resolve(__dirname, '../../..')
// Reviewed bounded component lane: no Next config, .env, database or application setup.
module.exports = require(path.join(root, 'node_modules/next/jest'))()({
  rootDir: root,
  testEnvironment: 'jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js' },
  setupFilesAfterEnv: ['<rootDir>/components/manager-action-center/__tests__/phase1.setup.tsx'],
  roots: ['<rootDir>/components/manager-action-center/__tests__', '<rootDir>/services/manager-action-center/__tests__'],
  testMatch: [
    '<rootDir>/components/manager-action-center/__tests__/ManagerActionCenterDashboard.test.tsx',
    '<rootDir>/components/manager-action-center/__tests__/ManagerLocationActionCenterDashboard.test.tsx',
    '<rootDir>/components/manager-action-center/__tests__/PaymentReconciliationSignOffCommand.test.tsx',
    '<rootDir>/services/manager-action-center/__tests__/manager-action-center-query.service.test.ts',
  ],
  collectCoverage: false,
})
