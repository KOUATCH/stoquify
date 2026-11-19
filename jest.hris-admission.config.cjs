// Bounded mocked assurance/action checks. No Next config, dotenv or real database.
const shared = require('./jest.payroll-trust-spine.config.cjs');
module.exports = {
  ...shared,
  roots: [
    '<rootDir>/lib/security', '<rootDir>/services/security',
    '<rootDir>/services/_shared', '<rootDir>/actions/security', '<rootDir>/actions/hris',
  ],
};
