// AF07 pure/mocked tests: bounded roots, no app configuration or database hooks.
const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/payments/__tests__", "<rootDir>/services/reconciliation/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testMatch: ["**/mobile-money-hmac.adapter.test.ts", "**/statement-pilot-format.test.ts",
    "**/statement-import.service.test.ts", "**/account-close-coverage.test.ts",
    "**/payment-reconciliation-evidence.service.test.ts", "**/bank-balance-contract.test.ts",
    "**/no-activity-evidence*.test.ts", "**/provider-operations*.test.ts"],
  testTimeout: 15000, collectCoverage: false,
})
