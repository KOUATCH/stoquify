// Bounded synthetic/mocked payroll checks. No Next config, dotenv, DB or browser.
const configure = require("next/jest")();
module.exports = configure({
  rootDir: "..",
  roots: ["<rootDir>/services/payroll/__tests__"],
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testMatch: [
    "<rootDir>/services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts",
    "<rootDir>/services/payroll/__tests__/payroll-control.service.test.ts",
    "<rootDir>/services/payroll/__tests__/payroll-production-admission.test.ts",
    "<rootDir>/services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts",
    "<rootDir>/services/payroll/__tests__/payroll-register.service.test.ts",
  ],
  collectCoverage: false,
});
