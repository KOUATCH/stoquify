// Bounded AF01 lane: installed SWC, no Next app config, dotenv, global setup or DB.
const nextJest = require("next/jest")
module.exports = nextJest()({
  rootDir: __dirname, testEnvironment: "node",
  roots: ["<rootDir>/services/accounting/__tests__", "<rootDir>/components/accounting/__tests__"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^lucide-react$": "<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js",
  },
  testMatch: [
    "**/accountant-access.service.test.ts",
    "**/accountant-portfolio.service.test.ts",
    "**/accountant-portfolio-proof.service.test.ts",
    "**/close-assurance-current-proof.test.ts",
    "**/close-assessment-order.service.test.ts",
    "**/close-assurance.service.test.ts",
    "**/AccountantPortfolio.test.tsx",
    "**/AccountantPortfolioWorkspace.test.tsx",
    "**/AccountantPortfolioPage.test.tsx",
  ],
  testTimeout: 15000, collectCoverage: false,
})
