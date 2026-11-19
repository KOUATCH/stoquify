// Bounded client recovery tests: mocked server actions, no Next config or database.
module.exports = {
  rootDir: '.', roots: ['<rootDir>/components/hris/__tests__'], testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/components/hris/__tests__/fresh-auth.setup.cjs'],
  moduleNameMapper: {'^@/(.*)$': '<rootDir>/$1', '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js'},
  transform: {'^.+\\.(js|jsx|ts|tsx)$': 'next/dist/build/swc/jest-transformer'},
  testMatch: ['**/HrisFreshAuth.test.tsx', '**/HrisPeopleAuthoring.test.tsx', '**/HrisControlledReview.test.tsx', '**/HrisRosterWorkspace.test.tsx', '**/HrisPayrollHandoff.test.tsx', '**/HrisPersonalCorrectionWorkspace.test.tsx', '**/HrisLifecycleTasks.test.tsx', '**/HrisOperationalTimeRequestPanel.test.tsx'], collectCoverage: false,
}
