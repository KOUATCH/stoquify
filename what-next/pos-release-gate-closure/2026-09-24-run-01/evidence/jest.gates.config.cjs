const path = require('path')
module.exports = {
  rootDir: path.resolve(__dirname, '../../../..'),
  roots: ['<rootDir>/scripts'],
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/*.test.js'],
}
