const path=require("node:path");
const root=path.resolve(__dirname,"../../../..");
const nextJest=require("next/jest");
module.exports=nextJest({dir:root})({rootDir:root,roots:[__dirname],testEnvironment:"jsdom",setupFilesAfterEnv:["<rootDir>/jest.setup.ts"],moduleNameMapper:{"^@/(.*)$":"<rootDir>/$1"},testPathIgnorePatterns:["/node_modules/"],testMatch:["**/*.test.ts"],moduleFileExtensions:["ts","tsx","js","jsx"]});
