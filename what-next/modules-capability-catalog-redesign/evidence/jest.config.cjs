const base = require('../../../jest.payroll-trust-spine.config.cjs')
module.exports = {
  ...base,
  rootDir: '../../..',
  roots: ['<rootDir>/components/modules'],
  moduleNameMapper: {
    ...base.moduleNameMapper,
    '^.+\\.module\\.(css|sass|scss)$': 'next/dist/build/jest/object-proxy.js',
  },
}
