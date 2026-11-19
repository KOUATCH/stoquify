// Combine existing bounded lanes, deduplicate suites, and use the current isolated client.
const nextJest = require('next/jest')
const lanes = ['accountant-portfolio','firm-engagement','firm-engagement-workflows','delegated-evidence','provider-formats','review-workpaper','opening-position','opening-cutover','obligation-register','advisory-outcomes-regression','firm-practice-regression']
module.exports = async () => {
  const configs = []
  for (const lane of lanes) configs.push(await require(`./jest.${lane}.config.cjs`)())
  return nextJest()({ rootDir: __dirname, testEnvironment: 'node', roots: [...new Set(configs.flatMap(c => c.roots))],
    testMatch: [...new Set(configs.flatMap(c => c.testMatch))], testPathIgnorePatterns: ['\\.postgres\\.test\\.ts$'],
    moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1', '^@prisma/client$': '<rootDir>/.codex-tmp/af16-prisma/client', '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js' },
    testTimeout: 20000, collectCoverage: false })()
}
