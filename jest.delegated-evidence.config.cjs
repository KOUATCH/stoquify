// AF06 scoped mocked/component regression lane; no application config or database setup.
const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/accounting/__tests__", "<rootDir>/actions/accounting/__tests__", "<rootDir>/components/accounting/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^lucide-react$": "<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js" },
  testMatch: ["**/delegated-evidence-desk*.test.ts", "**/DelegatedEvidenceDesk.test.tsx", "**/DelegatedEvidenceRecovery.test.tsx", "**/AccountantPortfolioWorkspace.test.tsx", "**/AccountantWorkDesk.test.tsx",
    "**/accountant-work-desk*.test.ts", "**/close-evidence-workflow*.test.ts", "**/CloseEvidenceWorkflowPanel.test.tsx",
    "**/close-evidence-replacement.service.test.ts", "**/close-evidence-request-tracking.test.ts",
    "**/close-evidence-recipient.service.test.ts", "**/missing-close-evidence*queue.service.test.ts",
    "**/accountant-notification-history.service.test.ts", "**/close-evidence-notification*.test.ts"],
  testPathIgnorePatterns: ["\\.postgres\\.test\\.ts$"], testTimeout: 15000, collectCoverage: false,
})
