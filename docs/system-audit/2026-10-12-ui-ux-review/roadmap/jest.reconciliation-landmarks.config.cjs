const base = require('./jest.reconciliation-recovery.config.cjs')
// Same isolated mocked lane, extended only for the shared error component.
module.exports = async () => {
  const config = await base()
  return {
    ...config,
    roots: [...config.roots, '<rootDir>/components/dashboard/__tests__'],
    testMatch: [...config.testMatch, '<rootDir>/components/dashboard/__tests__/DashboardErrorState.test.tsx'],
  }
}
