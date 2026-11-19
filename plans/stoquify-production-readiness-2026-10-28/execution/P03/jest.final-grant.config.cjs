const path=require('node:path'),nextJest=require('next/jest');
const root=path.resolve(__dirname,'../../../..');
module.exports=nextJest()({
 rootDir:root, roots:['<rootDir>/services/accounting/__tests__','<rootDir>/actions/accounting/__tests__'],
 testEnvironment:'node', setupFilesAfterEnv:[path.join(__dirname,'environment-read-guard.cjs'),'<rootDir>/jest.setup.ts'],
 moduleNameMapper:{'^@prisma/client$':path.join(root,'.codex-tmp/p03-grant-20261028-r1/native-client/node_modules/.prisma/client/index.js'),'^@/(.*)$':'<rootDir>/$1'},
 testMatch:["<rootDir>/services/accounting/__tests__/accountant-grant-replay.service.test.ts","<rootDir>/services/accounting/__tests__/accountant-access.service.test.ts","<rootDir>/services/accounting/__tests__/accountant-client-invite.service.test.ts","<rootDir>/actions/accounting/__tests__/accountant-access.actions.test.ts"], testTimeout:15000, collectCoverage:false
});
