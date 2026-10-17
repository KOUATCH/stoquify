// Audit-only adapter: repository setup and Next SWC transformer, without nextJest async configuration discovery.
module.exports = {
 rootDir: process.cwd(), roots: ['<rootDir>/services','<rootDir>/lib'],
 testEnvironment: 'jsdom', setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
 moduleNameMapper: {'^@/(.*)$':'<rootDir>/$1','^server-only$':'next/dist/build/jest/__mocks__/empty.js','^.+\\.module\\.(css|sass|scss)$':'next/dist/build/jest/object-proxy.js','^.+\\.(css|sass|scss)$':'next/dist/build/jest/__mocks__/styleMock.js','^next/font/(.*)$':'next/dist/build/jest/__mocks__/nextFontMock.js'},
 transform: {'^.+\\.(js|jsx|ts|tsx|mjs)$':['next/dist/build/swc/jest-transformer',{serverComponents:true,isEsmProject:false}]},
 moduleFileExtensions:['ts','tsx','js','jsx','json'],
 testMatch:['**/*.test.ts','**/*.test.tsx'],
 transformIgnorePatterns:['/node_modules/'],
 testPathIgnorePatterns:['/node_modules/','/what-next/'],
 watchman:false,
};
