// Mocked components only; next/jest without dir does not load app config/env.
const configure=require('next/jest')();
module.exports=configure({rootDir:__dirname,roots:['<rootDir>/components/accounting/__tests__'],testEnvironment:'jsdom',setupFilesAfterEnv:['<rootDir>/jest.setup.ts'],moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1'},testMatch:['**/CloseAssuranceCenter.test.tsx'],testTimeout:15000});
