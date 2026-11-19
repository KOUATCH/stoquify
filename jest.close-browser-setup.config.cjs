// Mocked setup rendering only; no application env/config or database runner.
const configure = require('next/jest')();
module.exports = configure({ rootDir: __dirname, roots: ['<rootDir>/app/[locale]/(dashboard)/dashboard/accounting/setup/__tests__'], testEnvironment: 'jsdom', setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }, testMatch: ['**/page.test.tsx'], testTimeout: 15000 });
