const configure=require('next/jest')();
module.exports=configure({rootDir:'../..',roots:['<rootDir>/components/i18n/__tests__'],testEnvironment:'node',moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1'},testMatch:['**/message-boundaries.test.tsx'],collectCoverage:false});
