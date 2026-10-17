const path = require('node:path')
const root = path.resolve(__dirname, '../../../..')
const base = require(path.join(root, 'jest.payroll-trust-spine.config.cjs'))
module.exports = { ...base, rootDir: root, roots: [path.join(root, 'services/pos/__tests__')],
  testEnvironment: 'node', collectCoverage: false,
  testMatch: ['**/checkout-lifecycle.postgres.test.ts', '**/pos-full-commit.postgres.test.ts', '**/retention-offline-operator.browser-fixture.test.ts'] }
