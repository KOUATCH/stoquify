// Pure filesystem review-tool tests; no Next, environment files, app setup or DB.
module.exports = {
  rootDir: "..",
  roots: ["<rootDir>/scripts/__tests__"],
  testEnvironment: "node",
  transform: {},
  setupFiles: [],
  setupFilesAfterEnv: [],
  testMatch: [
    "<rootDir>/scripts/__tests__/statutory-country-pack-review-preflight.test.js",
    "<rootDir>/scripts/__tests__/statutory-country-pack-review-package.test.js",
    "<rootDir>/scripts/__tests__/statutory-country-pack-production-gate.test.js",
  ],
  collectCoverage: false,
};
