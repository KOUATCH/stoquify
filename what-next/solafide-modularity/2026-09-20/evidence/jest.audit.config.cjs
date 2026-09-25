const path = require('path');
const root = path.resolve(__dirname, '../../../../');
const nextJest = require('next/jest');
const createJestConfig = nextJest({dir: root});
module.exports = createJestConfig({
  rootDir: root,
  roots: ['<rootDir>/services/modules/__tests__', '<rootDir>/actions/modules/__tests__', '<rootDir>/components/modules/__tests__'],
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.postgres\\.test\\.ts$'],
  moduleNameMapper: {'^@/(.*)$': '<rootDir>/$1'},
  transform: {'^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {presets:['next/babel']}]},
  moduleFileExtensions:['ts','tsx','js','jsx'],
  testMatch:['**/__tests__/**/*.(ts|tsx|js)','**/*.(test|spec).(ts|tsx|js)'],
  transformIgnorePatterns:['/node_modules/(?!(.*\\.mjs$|@testing-library|@faker-js))'],
  globals:{'ts-jest':{tsconfig:'tsconfig.json'}},
});
