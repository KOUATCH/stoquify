// Isolated component checks: no application config, dotenv, persistence or global setup.
const path = require("node:path")
module.exports = require("next/jest")()({
  rootDir: path.resolve(__dirname, "../../.."),
  testEnvironment: "jsdom",
  roots: ["<rootDir>/components/landing/__tests__"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^lucide-react$":
      "<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  testMatch: ["**/CinematicLanding.test.tsx"],
  collectCoverage: false,
})
