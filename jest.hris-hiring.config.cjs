// Explicit mocked/pure lane; no Next config, environment loading or database client.
module.exports = {
 rootDir: '.', testEnvironment: 'node',
 roots: ['<rootDir>/services/hris/__tests__','<rootDir>/actions/payroll/__tests__'],
 moduleNameMapper: {'^@/(.*)$':'<rootDir>/$1','^server-only$':'<rootDir>/what-next/hris-implementation-2026-10-24/HR-21/development-09/server-only.cjs'},
 setupFilesAfterEnv: ['<rootDir>/what-next/hris-implementation-2026-10-24/HR-21/development-10/unit-setup.cjs'],
 transform: {'^.+\\.(js|jsx|ts|tsx)$':'next/dist/build/swc/jest-transformer'},
 testMatch: ['**/document-evidence.service.test.ts','**/lifecycle.service.test.ts','**/payroll-readiness-contract.test.ts','**/payroll-contract.actions.test.ts'], collectCoverage:false,
};
