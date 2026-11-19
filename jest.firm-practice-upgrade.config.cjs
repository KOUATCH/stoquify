const nextJest=require('next/jest')
module.exports=nextJest()({rootDir:__dirname,testEnvironment:'node',roots:['<rootDir>/services/accounting/__tests__'],
  moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1','^@prisma/client$':'<rootDir>/.codex-tmp/af13-prisma/client'},
  testMatch:['**/firm-practice-upgrade.postgres.test.ts'],testTimeout:90000,collectCoverage:false})
