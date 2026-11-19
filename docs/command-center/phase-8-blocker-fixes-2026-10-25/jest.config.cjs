module.exports={
 rootDir:'../../..',testEnvironment:'node',setupFiles:[],setupFilesAfterEnv:[],
 roots:['<rootDir>/services/onboarding/__tests__','<rootDir>/scripts/__tests__'],
 moduleNameMapper:{'^@/(.*)$':'<rootDir>/$1'},
 transform:{'^.+\\.(js|jsx|ts|tsx)$':'next/dist/build/swc/jest-transformer'},
 testMatch:['<rootDir>/services/onboarding/__tests__/opening-position-contract.test.ts','<rootDir>/scripts/__tests__/prisma-migration-catalog-gate.test.js','<rootDir>/scripts/__tests__/prisma-production-migration-gate.test.js','<rootDir>/scripts/__tests__/prisma-migration-history-health-check.test.js'],
 collectCoverage:false,testTimeout:15000,
};
