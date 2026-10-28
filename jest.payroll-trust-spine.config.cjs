/**
 * Controlled Jest entry point for the Payroll Trust Spine program.
 *
 * The repository-level Next wrapper indexes large evidence and archived-workspace
 * trees before a focused test starts. Keeping roots on executable source makes
 * focused control tests bounded without changing their transforms or setup.
 */
module.exports = {
  rootDir: ".",
  roots: [
    "<rootDir>/__tests__",
    "<rootDir>/actions",
    "<rootDir>/app",
    "<rootDir>/components",
    "<rootDir>/config",
    "<rootDir>/hooks",
    "<rootDir>/lib",
    "<rootDir>/prisma",
    "<rootDir>/scripts",
    "<rootDir>/services",
  ],
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/e2e/",
    "<rootDir>/tests/e2e/",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/.pnpm-store/",
    "<rootDir>/docs/",
    "<rootDir>/what-next/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/scripts/server-only-node-shim.js",
  },
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "next/dist/build/swc/jest-transformer",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  testMatch: [
    "**/__tests__/**/*.(ts|tsx|js)",
    "**/*.(test|spec).(ts|tsx|js)",
  ],
  transformIgnorePatterns: [
    "/node_modules/(?!(.*\\.mjs$|@testing-library|@faker-js))",
  ],
}
