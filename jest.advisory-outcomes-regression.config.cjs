// AF08: isolated pure/mocked/component lane. No Next config, dotenv or database hooks.
const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/accounting/__tests__", "<rootDir>/components/accounting/__tests__", "<rootDir>/actions/accounting/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^@prisma/client$": "<rootDir>/.codex-tmp/af12-prisma/client" },
  testMatch: ["**/review-workpaper*.test.ts", "**/ReviewWorkpaperBinder.test.tsx",
    "**/close-evidence-acceptance-authority.service.test.ts", "**/balance-sheet*.test.ts", "**/ar-open-item-export*.test.ts"],
  testPathIgnorePatterns: ["\\.postgres\\.test\\.ts$"], testTimeout: 15000, collectCoverage: false,
})
