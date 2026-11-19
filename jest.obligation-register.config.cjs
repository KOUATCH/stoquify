// Bounded pure/component and existing authority regressions; no application environment.
const nextJest = require("next/jest")
module.exports = nextJest()({ rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/compliance/__tests__", "<rootDir>/services/accounting/__tests__", "<rootDir>/components/accounting/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^@prisma/client$": "<rootDir>/.codex-tmp/af11-prisma/client", "^lucide-react$": "<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js" },
  testMatch: ["**/obligation-register-source.test.ts", "**/ObligationRegister.test.tsx", "**/close-evidence-acceptance-authority.service.test.ts", "**/AccountantWorkDesk.test.tsx"],
  testTimeout: 15000, collectCoverage: false,
})
