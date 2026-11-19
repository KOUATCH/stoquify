const path=require('node:path')
const nextJest=require('next/jest')
// Four existing, inspected mocked suites only. No project dir/config/dotenv loading.
module.exports=nextJest()({
  rootDir:path.resolve(__dirname,'../../../../..'),
  roots:['<rootDir>/services/modules/__tests__','<rootDir>/services/accounting/__tests__','<rootDir>/lib/security/__tests__'],
  testEnvironment:'node',
  setupFilesAfterEnv:['<rootDir>/jest.setup.ts'],
  moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1'},
  testMatch:[
    '<rootDir>/services/modules/__tests__/module-stop-policy.service.test.ts',
    '<rootDir>/services/modules/__tests__/module-retention-access.test.ts',
    '<rootDir>/services/accounting/__tests__/accountant-access-retention-boundary.test.ts',
    '<rootDir>/lib/security/__tests__/rbac.test.ts',
  ],
  collectCoverage:false,
})
