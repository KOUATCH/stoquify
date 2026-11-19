const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node", roots: ["<rootDir>/services/onboarding/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^@prisma/client$": "<rootDir>/.codex-tmp/af09-prisma/client" },
  testMatch: ["**/opening-position.postgres.test.ts"], testTimeout: 60000, collectCoverage: false,
})
