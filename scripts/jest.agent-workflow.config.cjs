// Isolated contract tests: no Next config, dotenv loading, application setup, or DB.
module.exports = {
  rootDir: "..",
  roots: ["<rootDir>/scripts/__tests__"],
  testEnvironment: "node",
  transform: {},
  setupFiles: [],
  setupFilesAfterEnv: [],
  testMatch: ["<rootDir>/scripts/__tests__/verify-agent-workflow-contract.test.js"],
  collectCoverage: false,
}
