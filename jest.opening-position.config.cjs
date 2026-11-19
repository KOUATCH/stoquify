// AF09 pure/component lane: no app config, dotenv or database setup.
const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/onboarding/__tests__", "<rootDir>/components/onboarding/__tests__", "<rootDir>/components/accounting/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^@prisma/client$": "<rootDir>/.codex-tmp/af09-prisma/client",
    "^lucide-react$": "<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js" },
  testMatch: ["**/opening-position*.test.ts", "**/opening-readiness.test.ts", "**/OpeningPositionWorkbench.test.tsx", "**/AccountantPortfolio.test.tsx"],
  testPathIgnorePatterns: ["\\.postgres\\.test\\.ts$"], testTimeout: 15000, collectCoverage: false,
})
