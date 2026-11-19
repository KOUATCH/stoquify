// Pure/mocked server boundary checks; no application config, env or database.
const configure=require('next/jest')();
module.exports=configure({rootDir:'../..',roots:['<rootDir>/lib/__tests__','<rootDir>/app/api/uploadthing/__tests__'],testEnvironment:'node',moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1'},testMatch:['<rootDir>/lib/__tests__/public-session.test.ts','<rootDir>/app/api/uploadthing/__tests__/core.test.ts','<rootDir>/app/api/uploadthing/__tests__/metadata-loading.test.ts'],collectCoverage:false});
