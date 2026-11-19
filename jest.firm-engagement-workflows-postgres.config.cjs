// Explicit AF05 synthetic PostgreSQL service lane, no application environment/setup.
const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/accounting/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^@prisma/client$": "<rootDir>/node_modules/@prisma/client" },
  testMatch: ["**/firm-engagement-workflows.postgres.test.ts"],
  testTimeout: 30000, collectCoverage: false,
})
