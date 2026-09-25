const path = require('node:path');
const root = path.resolve(__dirname, '../../../../..');
const nextJest = require('next/jest');
// The repository's shared setup accesses window unconditionally. These HTTP
// boundaries need native Node Request/Response, with no global browser setup.
module.exports = nextJest({ dir: root })({
  rootDir: root,
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['<rootDir>/services/users/__tests__/self-profile-http.service.test.ts', '<rootDir>/app/api/auth/__tests__/self-profile-route.test.ts'],
});
