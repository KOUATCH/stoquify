const nextJest = require('next/jest')
module.exports = nextJest()({rootDir:__dirname,testEnvironment:'node',roots:['<rootDir>/services/accounting/__tests__','<rootDir>/components/accounting/__tests__'],
  moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1','^@prisma/client$':'<rootDir>/.codex-tmp/af13-prisma/client'},
  testMatch:['**/firm-practice.contract.test.ts','**/FirmPracticeDesk.test.tsx','**/close-evidence-acceptance-authority.service.test.ts'],
  testTimeout:15000,collectCoverage:false})
