// Filesystem/mocked-promotion fixtures only. No Next config, dotenv, app setup or DB.
const path = require('node:path');
module.exports = {
  rootDir: path.resolve(__dirname, '../../../../../..'),
  roots: ['<rootDir>/tests/s10-s11'],
  testEnvironment: 'node',
  transform: {},
  setupFiles: [],
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/tests/s10-s11/release-artifact.test.js', '<rootDir>/tests/s10-s11/release-artifact-private-uploads.test.js'],
  collectCoverage: false,
  cache: false,
};
