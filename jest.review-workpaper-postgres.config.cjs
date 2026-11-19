const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/accounting/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^@prisma/client$": "<rootDir>/.codex-tmp/af07-prisma/client" },
  testMatch: ["**/review-workpaper.postgres.test.ts"],
  testTimeout: 60000, collectCoverage: false,
})
