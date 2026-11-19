const path=require('node:path'),nextJest=require('next/jest');
const root=path.resolve(__dirname,'../../../..');
module.exports=nextJest()({
 rootDir:root, roots:['<rootDir>/components/accounting/__tests__'],
 testEnvironment:'jsdom', setupFilesAfterEnv:[path.join(__dirname,'environment-read-guard.cjs'),'<rootDir>/jest.setup.ts'],
 moduleNameMapper:{'^@prisma/client$':path.join(root,'.codex-tmp/p03-grant-20261028-r1/native-client/node_modules/.prisma/client/index.js'),'^@/(.*)$':'<rootDir>/$1'},
 testMatch:['<rootDir>/components/accounting/__tests__/AccountantAccessManager.recovery.test.tsx'], testTimeout:15000, collectCoverage:false
});
