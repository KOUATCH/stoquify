const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/payments/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testMatch: ["**/provider-formats.postgres.test.ts"],
  testTimeout: 60000, collectCoverage: false,
})
