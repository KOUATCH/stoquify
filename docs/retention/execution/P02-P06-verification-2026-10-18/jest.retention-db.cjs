const path=require('node:path')
module.exports={rootDir:path.resolve(__dirname,'../../../..'),roots:['<rootDir>/services/analytics/__tests__'],testEnvironment:'node',
  testMatch:['**/retention-outcomes.postgres.test.ts'],moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1','^server-only$':'<rootDir>/scripts/server-only-node-shim.js'},
  transform:{'^.+\\.(js|jsx|ts|tsx)$':'next/dist/build/swc/jest-transformer'},collectCoverage:false}
