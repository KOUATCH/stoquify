// Isolated mocked form checks: no Next configuration, application env or database.
const configure=require('next/jest')();
module.exports=configure({rootDir:'../..',roots:['<rootDir>/components/auth'],testEnvironment:'jsdom',setupFilesAfterEnv:['<rootDir>/jest.setup.ts'],moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1'},testMatch:['<rootDir>/components/auth/v2/__tests__/PasswordRecoveryForms.test.tsx','<rootDir>/components/auth/__tests__/LoginSubmissionSafety.test.tsx'],collectCoverage:false});
