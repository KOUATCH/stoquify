// No application Next config, environment files, global mocks or database.
const path = require('node:path');
const dependencyRoot = process.env.STOQUIFY_VERIFICATION_DEPS;
const configure = require(dependencyRoot ? path.join(dependencyRoot, 'node_modules/next/jest.js') : 'next/jest')();
module.exports = configure({
  testEnvironment: 'node',
  roots: ['<rootDir>/lib/security/__tests__', '<rootDir>/tests/s06-s07'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  moduleDirectories: dependencyRoot ? [path.join(dependencyRoot, 'node_modules'), 'node_modules'] : ['node_modules'],
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/tests/s06-s07/*.test.ts', '<rootDir>/lib/security/__tests__/middleware-routing.test.ts'],
});
