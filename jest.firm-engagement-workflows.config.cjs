// Scoped AF05 mocked component/service/action tests; no app config or database setup.
const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/accounting/__tests__", "<rootDir>/actions/accounting/__tests__", "<rootDir>/components/accounting/__tests__"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1", "^lucide-react$": "<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js" },
  testMatch: ["**/FirmEngagementWorkspace.test.tsx", "**/AccountantInvitationDelivery.test.tsx",
    "**/firm-engagement-workspace.service.test.ts", "**/firm-engagement.actions.test.ts",
    "**/accountant-work-desk.service.test.ts", "**/accountant-client-invite.service.test.ts", "**/accountant-access.service.test.ts"],
  testTimeout: 15000, collectCoverage: false,
})
