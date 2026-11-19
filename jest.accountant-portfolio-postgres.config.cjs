// No app config or setup. Suite injects a real PrismaClient for the guarded target.
const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node", roots: ["<rootDir>/services/accounting/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testMatch: ["**/accountant-portfolio.postgres.test.ts"],
  testTimeout: 60000, collectCoverage: false,
})
