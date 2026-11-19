// Scoped component regression: Next/SWC transform without loading app config or environment.
const path=require('node:path');
const configure=require('next/jest')();
module.exports=configure({rootDir:path.resolve(__dirname,'..'),roots:['<rootDir>/components/accounting/__tests__'],testEnvironment:'jsdom',setupFilesAfterEnv:['<rootDir>/jest.setup.ts'],testMatch:['<rootDir>/components/accounting/__tests__/AccountantAccessManager.recovery.test.tsx'],moduleNameMapper:{...(process.env.AF16_GRANT_COUNTERFACTUAL==='1'?{'^\\.\\./AccountantAccessManager$':'<rootDir>/.codex-tmp/af16-original-grant.tsx'}:{}),'^@/(.*)$':'<rootDir>/$1'},testTimeout:15000,collectCoverage:false});
