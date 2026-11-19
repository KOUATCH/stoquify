const nextJest = require("next/jest")
module.exports = nextJest()({ rootDir: __dirname, testEnvironment: "node", roots: ["<rootDir>/services/compliance/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^@prisma/client$": "<rootDir>/.codex-tmp/af11-prisma/client" },
  testMatch: ["**/obligation-register.postgres.test.ts"], testTimeout: 60000, collectCoverage: false,
})
